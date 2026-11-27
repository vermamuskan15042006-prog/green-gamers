import express from 'express';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import Plant from '../models/Plant.js';
import ProgressUpdate from '../models/ProgressUpdate.js';
import Reminder from '../models/Reminder.js';
import Reward, { awardXp } from '../models/Reward.js';
import { sanitizeUser } from './authRoutes.js';

const router = express.Router();

const ECO_CHALLENGES = [
  {
    id: 'urban-canopy-sprint',
    title: 'Urban Canopy Sprint',
    description: 'Register a new plant in an under-greened zone and track its canopy growth.',
    rewardXp: 25,
    badge: 'Challenge Champion'
  },
  {
    id: 'zero-miss-watering',
    title: 'Zero-Miss Hydration Week',
    description: 'Complete 3 consecutive watering reminders on time to keep your saplings thriving.',
    rewardXp: 25,
    badge: 'Hydration Hero'
  },
  {
    id: 'green-sense-detective',
    title: 'Green-Sense Health Detective',
    description: 'Run AI leaf diagnostics across your collection to spot stress before it spreads.',
    rewardXp: 25,
    badge: 'Botanical Analyst'
  }
];

router.use(authMiddleware);

router.get('/dashboard', async (req, res, next) => {
  try {
    const [user, plants, updates, reminders, rewards, leaderboard] = await Promise.all([
      User.findById(req.userId).select('-password'),
      Plant.find({ userId: req.userId }).sort({ createdAt: -1 }).lean(),
      ProgressUpdate.find({ userId: req.userId }).sort({ recordedAt: 1 }).lean(),
      Reminder.find({ userId: req.userId })
        .populate('plantId', 'plantName speciesName status')
        .sort({ completed: 1, dueDate: 1 })
        .lean(),
      Reward.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(25).lean(),
      User.find().select('name role organizationName location xp level badges').sort({ xp: -1 }).limit(10).lean()
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const totalPlants = plants.length;
    const completedReminders = reminders.filter((r) => r.completed).length;
    const pendingReminders = reminders.filter((r) => !r.completed);
    const aiScanRewards = rewards.filter((r) => r.action === 'AI_SCAN').length;
    const careActivities = completedReminders + updates.length + aiScanRewards;

    const estimatedCo2OffsetKg = Number(
      plants
        .reduce((acc, p) => {
          const growthFactor = Math.max(1, (p.currentHeightCm || 10) / Math.max(1, p.initialHeightCm || 10));
          return acc + (p.co2OffsetKgPerYear || 12) * Math.min(2, growthFactor);
        }, 0)
        .toFixed(1)
    );

    const estimatedOxygenKg = Number(
      plants
        .reduce((acc, p) => {
          const growthFactor = Math.max(1, (p.currentHeightCm || 10) / Math.max(1, p.initialHeightCm || 10));
          return acc + (p.oxygenKgPerYear || 8.5) * Math.min(2, growthFactor);
        }, 0)
        .toFixed(1)
    );

    const speciesList = [...new Set(plants.map((p) => p.speciesName).filter(Boolean))];
    const healthBreakdown = plants.reduce((acc, p) => {
      const st = p.status || 'Healthy';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {});

    const healthyCount = (healthBreakdown.Healthy || 0) + (healthBreakdown.Thriving || 0);
    const readinessScore = Math.min(
      100,
      totalPlants * 15 +
        updates.length * 10 +
        completedReminders * 8 +
        Math.min(30, Math.round((user.xp || 0) / 10))
    );
    let readinessTier = 'Seedling Volunteer';
    if (readinessScore >= 75) readinessTier = 'Lead Drive Mentor';
    else if (readinessScore >= 40) readinessTier = 'Verified Caretaker';

    const ngoVolunteerReadiness = {
      readinessTier,
      readinessScore,
      verifiedPlants: totalPlants,
      healthyPlantsCount: healthyCount,
      growthLogsCount: updates.length,
      completedRemindersCount: completedReminders,
      aiScansCount: aiScanRewards,
      eligibleForDrives: readinessScore >= 30 || totalPlants >= 1
    };

    const plantCarePortfolio = {
      totalPlants,
      uniqueSpeciesCount: speciesList.length,
      speciesList,
      healthBreakdown,
      growthLogsCount: updates.length,
      latestGrowthUpdateAt: updates.length > 0 ? updates[updates.length - 1].recordedAt : null
    };

    const plantNameMap = new Map(
      (plants || [])
        .filter((p) => p?._id != null)
        .map((p) => [p._id?.toString?.() ?? String(p._id ?? ''), p.plantName])
    );
    let growthSeries = (updates || []).map((u) => ({
      date: new Date(u?.recordedAt || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      plantName: plantNameMap.get(u?.plantId?.toString?.() ?? String(u?.plantId ?? '')) || 'Plant',
      heightCm: u?.heightCm ?? 0,
      canopyCoveragePct: u?.canopyCoveragePct ?? 0,
      growthPercentage: u?.growthPercentage ?? 0
    }));

    if (growthSeries.length === 0 && plants.length > 0) {
      growthSeries = plants.slice(0, 6).map((p) => ({
        date: new Date(p.plantingDate || p.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        plantName: p.plantName,
        heightCm: p.currentHeightCm || p.initialHeightCm || 10,
        canopyCoveragePct: 18,
        growthPercentage: 0
      }));
    }

    const challenges = ECO_CHALLENGES.map((c) => ({
      ...c,
      joined: (user.joinedChallenges || []).includes(c.id)
    }));

    return res.json({
      user: {
        ...sanitizeUser(user),
        nextLevelXp: (user.level || 1) * 100
      },
      summary: {
        totalPlants,
        careActivities,
        estimatedCo2OffsetKg,
        estimatedOxygenKg,
        pendingRemindersCount: pendingReminders.length
      },
      plantCarePortfolio,
      ngoVolunteerReadiness,
      growthSeries,
      pendingReminders,
      allReminders: reminders,
      leaderboard,
      challenges,
      recentRewards: rewards
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/reminders', async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ userId: req.userId })
      .populate('plantId', 'plantName speciesName status')
      .sort({ completed: 1, dueDate: 1 });
    return res.json({ reminders });
  } catch (error) {
    return next(error);
  }
});

router.post('/reminders', async (req, res, next) => {
  try {
    const { plantId, title, careType = 'Custom', dueDate, intervalDays = 0, notes = '' } = req.body;
    if (!plantId || !title || !title.trim() || !dueDate) {
      return res.status(400).json({ message: 'plantId, title, and dueDate are required.' });
    }
    if (!mongoose.Types.ObjectId.isValid(plantId)) {
      return res.status(400).json({ message: 'Invalid plantId.' });
    }

    const plant = await Plant.findById(plantId);
    if (!plant) {
      return res.status(404).json({ message: 'Plant not found.' });
    }
    if ((plant.userId?.toString?.() ?? String(plant.userId ?? '')) !== String(req.userId ?? '')) {
      return res.status(403).json({ message: 'Forbidden: you do not own this plant.' });
    }

    const reminder = await Reminder.create({
      plantId: plant._id,
      userId: req.userId,
      title: title.trim(),
      careType,
      dueDate: new Date(dueDate),
      intervalDays: Math.max(0, Number(intervalDays) || 0),
      notes
    });

    const populated = await reminder.populate('plantId', 'plantName speciesName status');
    return res.status(201).json({ reminder: populated });
  } catch (error) {
    return next(error);
  }
});

const handleCompleteReminder = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid reminder ID.' });
    }

    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found.' });
    }
    if ((reminder.userId?.toString?.() ?? String(reminder.userId ?? '')) !== String(req.userId ?? '')) {
      return res.status(403).json({ message: 'Forbidden: you do not own this reminder.' });
    }

    if (reminder.completed) {
      const user = await User.findById(req.userId).select('-password');
      return res.json({
        reminder,
        nextReminder: null,
        xpAwarded: 0,
        duplicate: true,
        newlyUnlockedBadges: [],
        user
      });
    }

    reminder.completed = true;
    reminder.completedAt = new Date();
    await reminder.save();

    const plant = await Plant.findById(reminder.plantId);
    if (plant && (plant.userId?.toString?.() ?? String(plant.userId ?? '')) === String(req.userId ?? '')) {
      if (reminder.careType === 'Watering') {
        plant.lastWateredAt = new Date();
        if (plant.status === 'Needs Water') plant.status = 'Healthy';
      } else if (reminder.careType === 'Fertilizing') {
        plant.lastFertilizedAt = new Date();
      }
      await plant.save();
    }

    let nextReminder = null;
    if (reminder.intervalDays > 0) {
      nextReminder = await Reminder.create({
        plantId: reminder.plantId,
        userId: req.userId,
        title: reminder.title,
        careType: reminder.careType,
        dueDate: new Date(Date.now() + reminder.intervalDays * 24 * 60 * 60 * 1000),
        intervalDays: reminder.intervalDays,
        notes: reminder.notes
      });
    }

    const rewardResult = await awardXp({
      userId: req.userId,
      action: 'REMINDER_COMPLETED',
      xp: 20,
      eventKey: `reminder-complete:${reminder._id}`,
      description: `Completed care task: ${reminder.title}`
    });

    return res.json({
      reminder,
      nextReminder,
      xpAwarded: rewardResult.xpAwarded,
      newlyUnlockedBadges: rewardResult.newlyUnlockedBadges,
      user: rewardResult.user
    });
  } catch (error) {
    return next(error);
  }
};

router.patch('/reminders/:id/complete', handleCompleteReminder);
router.post('/reminders/:id/complete', handleCompleteReminder);

router.delete('/reminders/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid reminder ID.' });
    }
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found.' });
    }
    if ((reminder.userId?.toString?.() ?? String(reminder.userId ?? '')) !== String(req.userId ?? '')) {
      return res.status(403).json({ message: 'Forbidden: you do not own this reminder.' });
    }
    await reminder.deleteOne();
    return res.json({ message: 'Reminder deleted.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/challenges/:challengeId/join', async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const challenge = ECO_CHALLENGES.find((c) => c.id === challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { joinedChallenges: challenge.id }
    });

    const rewardResult = await awardXp({
      userId: req.userId,
      action: 'CHALLENGE_JOINED',
      xp: 25,
      eventKey: `challenge-join:${req.userId}:${challenge.id}`,
      description: `Joined challenge: ${challenge.title}`,
      badge: challenge.badge
    });

    return res.json({
      challengeId: challenge.id,
      xpAwarded: rewardResult.xpAwarded,
      duplicate: rewardResult.duplicate,
      newlyUnlockedBadges: rewardResult.newlyUnlockedBadges,
      user: rewardResult.user
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/leaderboard', async (_req, res, next) => {
  try {
    const leaderboard = await User.find()
      .select('name role organizationName location xp level badges')
      .sort({ xp: -1 })
      .limit(15)
      .lean();
    return res.json({ leaderboard });
  } catch (error) {
    return next(error);
  }
});

router.get('/rewards', async (req, res, next) => {
  try {
    const rewards = await Reward.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ rewards });
  } catch (error) {
    return next(error);
  }
});

export default router;
