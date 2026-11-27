import express from 'express';
import authMiddleware from '../middleware/auth.js';
import Course, { ensureCoursesSeeded } from '../models/Course.js';
import User from '../models/User.js';
import { awardXp } from '../models/Reward.js';
import { sanitizeUser } from './authRoutes.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    await ensureCoursesSeeded();
    const [courses, user] = await Promise.all([
      Course.find().sort({ requiredXp: 1 }).lean(),
      User.findById(req.userId).select('-password')
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const unlockedSet = new Set(user.unlockedCourses || []);
    const completedSet = new Set(user.completedCourses || []);

    const enriched = courses.map((course) => {
      const eligibleToUnlock = (user.xp || 0) >= course.requiredXp;
      const unlocked = unlockedSet.has(course.slug) || course.requiredXp === 0;
      const completed = completedSet.has(course.slug);
      return {
        ...course,
        unlocked,
        eligibleToUnlock,
        completed
      };
    });

    return res.json({
      courses: enriched,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:slug/unlock', async (req, res, next) => {
  try {
    await ensureCoursesSeeded();
    const [course, user] = await Promise.all([
      Course.findOne({ slug: req.params.slug }),
      User.findById(req.userId).select('-password')
    ]);

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if ((user.xp || 0) < course.requiredXp) {
      return res.status(400).json({
        message: `You need ${course.requiredXp} XP to unlock "${course.title}". Current XP: ${user.xp || 0}.`
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $addToSet: { unlockedCourses: course.slug } },
      { new: true }
    ).select('-password');

    return res.json({
      message: `Unlocked "${course.title}"!`,
      courseSlug: course.slug,
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:slug/complete', async (req, res, next) => {
  try {
    await ensureCoursesSeeded();
    const [course, user] = await Promise.all([
      Course.findOne({ slug: req.params.slug }),
      User.findById(req.userId).select('-password')
    ]);

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if ((user.xp || 0) < course.requiredXp) {
      return res.status(400).json({
        message: `Earn ${course.requiredXp} XP before completing this course.`
      });
    }

    await User.findByIdAndUpdate(req.userId, {
      $addToSet: {
        unlockedCourses: course.slug,
        completedCourses: course.slug
      }
    });

    const rewardResult = await awardXp({
      userId: req.userId,
      action: 'COURSE_COMPLETED',
      xp: course.rewardXp || 25,
      eventKey: `course-complete:${req.userId}:${course.slug}`,
      description: `Completed Eco-Academy course: ${course.title}`,
      badge: course.badgeName
    });

    return res.json({
      message: rewardResult.duplicate
        ? `Course "${course.title}" already completed.`
        : `Completed "${course.title}"!`,
      courseSlug: course.slug,
      xpAwarded: rewardResult.xpAwarded,
      duplicate: rewardResult.duplicate,
      newlyUnlockedBadges: rewardResult.newlyUnlockedBadges,
      user: sanitizeUser(rewardResult.user)
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
