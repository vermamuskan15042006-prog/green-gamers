import express from 'express';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth.js';
import PlantationDrive from '../models/PlantationDrive.js';
import Plant from '../models/Plant.js';
import User from '../models/User.js';
import { awardXp } from '../models/Reward.js';
import { sanitizeUser } from './authRoutes.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/overview', async (req, res) => {
  try {
    const currentUserId = req.userId ? String(req.userId) : '';

    const [drivesRes, contributorsRes, plantCountsRes] = await Promise.all([
      PlantationDrive.find().sort({ createdAt: -1 }).lean().catch(() => []),
      User.find({ role: { $ne: 'ngo' } })
        .select('name location bio xp level badges')
        .sort({ xp: -1 })
        .limit(20)
        .lean()
        .catch(() => []),
      Plant.aggregate([
        { $match: { userId: { $ne: null } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ]).catch(() => [])
    ]);

    const drives = Array.isArray(drivesRes) ? drivesRes : [];
    const contributors = Array.isArray(contributorsRes) ? contributorsRes : [];
    const plantCounts = Array.isArray(plantCountsRes) ? plantCountsRes : [];

    const plantCountMap = new Map(
      plantCounts
        .filter((item) => item && item._id != null)
        .map((item) => [item._id?.toString?.() ?? String(item._id ?? ''), Number(item.count) || 0])
    );

    const enrichedContributors = contributors
      .filter((c) => c && c._id != null)
      .map((c) => ({
        ...c,
        name: c.name || 'Green Gamer',
        location: c.location || 'Local Volunteer',
        xp: Number(c.xp) || 0,
        level: Number(c.level) || 1,
        badges: Array.isArray(c.badges) ? c.badges : [],
        plantCount: plantCountMap.get(c._id?.toString?.() ?? String(c._id ?? '')) || 0
      }));

    const ownDrives = drives.filter(
      (d) => (d?.ngoUserId?.toString?.() ?? String(d?.ngoUserId ?? '')) === currentUserId
    );
    const activeSummarySource = ownDrives.length > 0 ? ownDrives : drives;

    const totalTargetSaplings = activeSummarySource.reduce(
      (acc, d) => acc + (Number(d?.targetSaplings) || 0),
      0
    );
    const totalPlanted = activeSummarySource.reduce(
      (acc, d) => acc + (Number(d?.plantedCount) || 0),
      0
    );
    const totalSurvived = activeSummarySource.reduce(
      (acc, d) => acc + (Number(d?.survivedCount) || 0),
      0
    );
    const averageSurvivalRatePct =
      totalPlanted > 0 ? Number(((totalSurvived / totalPlanted) * 100).toFixed(1)) : 100;

    return res.status(200).json({
      drives: drives
        .filter(Boolean)
        .map((d) => ({
          ...d,
          isOwner:
            currentUserId !== '' &&
            (d?.ngoUserId?.toString?.() ?? String(d?.ngoUserId ?? '')) === currentUserId
        })),
      summary: {
        totalDrives: activeSummarySource.length,
        totalTargetSaplings,
        totalPlanted,
        averageSurvivalRatePct
      },
      contributors: enrichedContributors
    });
  } catch (error) {
    console.error('NGO overview fallback error:', error);
    return res.status(200).json({
      drives: [],
      summary: {
        totalDrives: 0,
        totalTargetSaplings: 0,
        totalPlanted: 0,
        averageSurvivalRatePct: 100
      },
      contributors: []
    });
  }
});

router.post('/drives', async (req, res, next) => {
  try {
    const {
      title,
      locationName,
      lat = 28.6139,
      lng = 77.209,
      targetSaplings,
      speciesList = [],
      driveDate,
      notes = '',
      organizationName
    } = req.body;

    if (!title || !title.trim() || !locationName || !locationName.trim() || !targetSaplings) {
      return res
        .status(400)
        .json({ message: 'Drive title, locationName, and targetSaplings are required.' });
    }

    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const parsedSpecies = Array.isArray(speciesList)
      ? speciesList.map((s) => String(s).trim()).filter(Boolean)
      : String(speciesList)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    const drive = await PlantationDrive.create({
      ngoUserId: req.userId,
      organizationName:
        organizationName?.trim() || user.organizationName || `${user.name} Plantation Group`,
      title: title.trim(),
      locationName: locationName.trim(),
      coordinates: {
        lat: Number(lat) || 28.6139,
        lng: Number(lng) || 77.209
      },
      targetSaplings: Math.max(1, Number(targetSaplings)),
      speciesList: parsedSpecies,
      driveDate: driveDate ? new Date(driveDate) : new Date(),
      notes: notes.trim()
    });

    const rewardResult = await awardXp({
      userId: req.userId,
      action: 'NGO_DRIVE_CREATED',
      xp: 35,
      eventKey: `ngo-drive-create:${drive._id}`,
      description: `Launched plantation drive: ${drive.title}`
    });

    return res.status(201).json({
      drive: { ...drive.toObject(), isOwner: true },
      xpAwarded: rewardResult.xpAwarded,
      newlyUnlockedBadges: rewardResult.newlyUnlockedBadges,
      user: sanitizeUser(rewardResult.user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/drives/:id/batches', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid drive ID.' });
    }

    const drive = await PlantationDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ message: 'Plantation drive not found.' });
    }
    if ((drive.ngoUserId?.toString?.() ?? String(drive.ngoUserId ?? '')) !== String(req.userId ?? '')) {
      return res.status(403).json({ message: 'Forbidden: you do not manage this drive.' });
    }

    const { batchLabel, species, saplingsPlanted, saplingsSurvived, notes = '' } = req.body;
    const plantedNum = Math.max(1, Number(saplingsPlanted) || 0);
    const survivedNum = Math.min(
      plantedNum,
      Math.max(0, saplingsSurvived !== undefined && saplingsSurvived !== '' ? Number(saplingsSurvived) : plantedNum)
    );

    if (!batchLabel || !batchLabel.trim() || !species || !species.trim() || !plantedNum) {
      return res
        .status(400)
        .json({ message: 'batchLabel, species, and saplingsPlanted are required.' });
    }

    const user = await User.findById(req.userId).select('-password');

    drive.batchLogs.push({
      batchLabel: batchLabel.trim(),
      species: species.trim(),
      saplingsPlanted: plantedNum,
      saplingsSurvived: survivedNum,
      loggedBy: user?.organizationName || user?.name || 'Coordinator',
      notes: notes.trim()
    });

    drive.plantedCount += plantedNum;
    drive.survivedCount += survivedNum;
    drive.survivalRatePct =
      drive.plantedCount > 0
        ? Number(((drive.survivedCount / drive.plantedCount) * 100).toFixed(1))
        : 100;
    if (drive.plantedCount >= drive.targetSaplings) {
      drive.status = 'Completed';
    }
    if (!drive.speciesList.includes(species.trim())) {
      drive.speciesList.push(species.trim());
    }

    await drive.save();
    const lastBatch = drive.batchLogs[drive.batchLogs.length - 1];

    const rewardResult = await awardXp({
      userId: req.userId,
      action: 'NGO_BATCH_LOGGED',
      xp: 25,
      eventKey: `ngo-batch:${drive._id}:${lastBatch._id}`,
      description: `Logged ${plantedNum} saplings in ${drive.title}`
    });

    return res.status(201).json({
      drive: { ...drive.toObject(), isOwner: true },
      xpAwarded: rewardResult.xpAwarded,
      newlyUnlockedBadges: rewardResult.newlyUnlockedBadges,
      user: sanitizeUser(rewardResult.user)
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
