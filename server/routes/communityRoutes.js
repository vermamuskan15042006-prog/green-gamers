import express from 'express';
import crypto from 'node:crypto';
import authMiddleware from '../middleware/auth.js';
import Community, { ensureCommunitiesSeeded } from '../models/Community.js';
import User from '../models/User.js';
import { awardXp } from '../models/Reward.js';
import { sanitizeUser } from './authRoutes.js';

const router = express.Router();

router.use(authMiddleware);

const formatCommunity = (community, userId) => {
  const safeUserId = String(userId ?? '');
  const memberIds = (community?.members || [])
    .filter((m) => m != null)
    .map((m) => m?.toString?.() ?? String(m ?? ''));
  const posts = [...(community?.posts || [])].sort(
    (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
  );
  return {
    _id: community?._id,
    slug: community?.slug || '',
    name: community?.name || '',
    category: community?.category || 'General',
    description: community?.description || '',
    focusTags: community?.focusTags || [],
    memberCount: memberIds.length,
    isJoined: safeUserId !== '' && memberIds.includes(safeUserId),
    posts: posts.slice(0, 30)
  };
};

router.get('/', async (req, res, next) => {
  try {
    await ensureCommunitiesSeeded();
    const communities = await Community.find().sort({ name: 1 }).lean();
    return res.json({
      communities: communities.map((c) => formatCommunity(c, req.userId))
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:slug/join', async (req, res, next) => {
  try {
    await ensureCommunitiesSeeded();
    const community = await Community.findOneAndUpdate(
      { slug: req.params.slug },
      { $addToSet: { members: req.userId } },
      { new: true }
    ).lean();

    if (!community) {
      return res.status(404).json({ message: 'Community not found.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $addToSet: { joinedCommunities: community.slug } },
      { new: true }
    ).select('-password');

    return res.json({
      message: `Joined ${community.name}`,
      community: formatCommunity(community, req.userId),
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:slug/leave', async (req, res, next) => {
  try {
    const community = await Community.findOneAndUpdate(
      { slug: req.params.slug },
      { $pull: { members: req.userId } },
      { new: true }
    ).lean();

    if (!community) {
      return res.status(404).json({ message: 'Community not found.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $pull: { joinedCommunities: community.slug } },
      { new: true }
    ).select('-password');

    return res.json({
      message: `Left ${community.name}`,
      community: formatCommunity(community, req.userId),
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:slug/posts', async (req, res, next) => {
  try {
    await ensureCommunitiesSeeded();
    const { content, postType = 'Care Update', locationTag = '' } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Post content cannot be empty.' });
    }

    const [community, user] = await Promise.all([
      Community.findOne({ slug: req.params.slug }),
      User.findById(req.userId).select('-password')
    ]);

    if (!community) {
      return res.status(404).json({ message: 'Community not found.' });
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMember = (community.members || []).some(
      (m) => (m?.toString?.() ?? String(m ?? '')) === String(req.userId ?? '')
    );
    if (!isMember) {
      community.members.push(user._id);
      await User.findByIdAndUpdate(req.userId, {
        $addToSet: { joinedCommunities: community.slug }
      });
    }

    const allowedPostTypes = ['Care Update', 'Drive Announcement', 'Question', 'Milestone'];
    const safeType = allowedPostTypes.includes(postType) ? postType : 'Care Update';

    community.posts.push({
      userId: user._id,
      authorName: user.name,
      authorRole: user.role || 'individual',
      authorOrg: user.organizationName || '',
      postType: safeType,
      content: content.trim(),
      locationTag: locationTag.trim() || user.location || ''
    });

    await community.save();
    const savedPost = community.posts[community.posts.length - 1];

    const rewardResult = await awardXp({
      userId: req.userId,
      action: 'COMMUNITY_POST',
      xp: 10,
      eventKey: `community-post:${req.userId}:${savedPost?._id || crypto.randomUUID()}`,
      description: `Posted in ${community.name}`
    });

    return res.status(201).json({
      message: 'Update shared with community!',
      community: formatCommunity(community.toObject(), req.userId),
      xpAwarded: rewardResult.xpAwarded,
      newlyUnlockedBadges: rewardResult.newlyUnlockedBadges,
      user: sanitizeUser(rewardResult.user)
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
