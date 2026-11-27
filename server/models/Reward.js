import mongoose from 'mongoose';
import User from './User.js';

const RewardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    xp: {
      type: Number,
      required: true,
      min: 0
    },
    eventKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    badgeUnlocked: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export const Reward = mongoose.model('Reward', RewardSchema);

const ACTION_BADGE_MAP = {
  PLANT_REGISTERED: 'Seedling Starter',
  PRIORITY_ZONE_PLANTATION: 'Priority Planter',
  PROGRESS_UPDATE: 'Canopy Tracker',
  REMINDER_COMPLETED: 'Eco Caretaker',
  AI_SCAN: 'Green-Sense Scout',
  CHALLENGE_JOINED: 'Challenge Champion',
  COURSE_COMPLETED: 'Eco Scholar',
  COMMUNITY_POST: 'Community Voice',
  NGO_DRIVE_CREATED: 'Drive Initiator',
  NGO_BATCH_LOGGED: 'Canopy Multiplier'
};

export const calculateLevel = (xp) => Math.floor(Math.max(0, xp) / 100) + 1;

export const awardXp = async ({ userId, action, xp, eventKey, description = '', badge = '' }) => {
  const existing = await Reward.findOne({ eventKey });
  if (existing) {
    const user = await User.findById(userId).select('-password');
    return {
      awarded: false,
      duplicate: true,
      xpAwarded: 0,
      reward: existing,
      newlyUnlockedBadges: [],
      user
    };
  }

  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new Error('User not found while awarding XP');
  }

  const nextXp = (user.xp || 0) + xp;
  const nextLevel = calculateLevel(nextXp);

  const candidateBadges = [];
  const mappedBadge = badge || ACTION_BADGE_MAP[action];
  if (mappedBadge) candidateBadges.push(mappedBadge);
  if (nextXp >= 250) candidateBadges.push('Carbon Crusher');
  if (nextXp >= 500) candidateBadges.push('Forest Guardian');
  if (nextLevel >= 3) candidateBadges.push('Canopy Ranger');

  const existingBadges = Array.isArray(user.badges) ? user.badges : [];
  const newlyUnlockedBadges = candidateBadges.filter((b) => !existingBadges.includes(b));

  try {
    const reward = await Reward.create({
      userId,
      action,
      xp,
      eventKey,
      badgeUnlocked: newlyUnlockedBadges[0] || '',
      description
    });

    const updateFields = {
      xp: nextXp,
      level: nextLevel
    };
    if (newlyUnlockedBadges.length > 0) {
      updateFields.badges = [...existingBadges, ...newlyUnlockedBadges];
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    return {
      awarded: true,
      duplicate: false,
      xpAwarded: xp,
      reward,
      newlyUnlockedBadges,
      user: updatedUser
    };
  } catch (error) {
    if (error.code === 11000) {
      const duplicateReward = await Reward.findOne({ eventKey });
      const freshUser = await User.findById(userId).select('-password');
      return {
        awarded: false,
        duplicate: true,
        xpAwarded: 0,
        reward: duplicateReward,
        newlyUnlockedBadges: [],
        user: freshUser
      };
    }
    throw error;
  }
};

export default Reward;
