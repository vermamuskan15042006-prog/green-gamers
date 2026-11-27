import express from 'express';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth.js';
import Plant from '../models/Plant.js';
import ProgressUpdate from '../models/ProgressUpdate.js';
import Reminder from '../models/Reminder.js';
import { awardXp } from '../models/Reward.js';
import { upload, uploadImageMedia, runGeminiVisionDiagnosis } from './aiRoutes.js';

const router = express.Router();

router.use(authMiddleware);

const parseCoordinates = (body) => {
  let lng = 0;
  let lat = 0;

  if (body.location) {
    let loc = body.location;
    if (typeof loc === 'string') {
      try {
        loc = JSON.parse(loc);
      } catch {
        loc = null;
      }
    }
    if (loc && Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
      lng = Number(loc.coordinates[0]);
      lat = Number(loc.coordinates[1]);
    }
  } else if (body.lat !== undefined && body.lng !== undefined) {
    lat = Number(body.lat);
    lng = Number(body.lng);
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return [0, 0];
  }
  return [lng, lat];
};

const estimateImpactRates = (speciesName = '', initialHeightCm = 10) => {
  const lower = speciesName.toLowerCase();
  let co2 = 12;
  let oxygen = 8.5;

  if (lower.includes('neem') || lower.includes('peepal') || lower.includes('banyan') || lower.includes('oak')) {
    co2 = 24;
    oxygen = 18;
  } else if (lower.includes('bamboo') || lower.includes('palm') || lower.includes('ficus')) {
    co2 = 18;
    oxygen = 13.5;
  } else if (lower.includes('tulsi') || lower.includes('snake') || lower.includes('lily') || lower.includes('pothos')) {
    co2 = 9.5;
    oxygen = 7.2;
  }

  const scale = Math.max(0.8, Math.min(2.5, Number(initialHeightCm || 10) / 25 + 0.6));
  return {
    co2OffsetKgPerYear: Number((co2 * scale).toFixed(1)),
    oxygenKgPerYear: Number((oxygen * scale).toFixed(1))
  };
};

const verifyOwnershipOrFail = (doc, userId, res) => {
  if (!doc) {
    res.status(404).json({ message: 'Record not found.' });
    return false;
  }
  if ((doc.userId?.toString?.() ?? String(doc.userId ?? '')) !== String(userId ?? '')) {
    res.status(403).json({ message: 'Forbidden: you do not own this record.' });
    return false;
  }
  return true;
};

router.get('/', async (req, res, next) => {
  try {
    const plants = await Plant.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    return res.json({ plants });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid plant ID.' });
    }
    const plant = await Plant.findById(req.params.id);
    if (!verifyOwnershipOrFail(plant, req.userId, res)) return;

    const [updates, reminders] = await Promise.all([
      ProgressUpdate.find({ plantId: plant._id, userId: req.userId }).sort({ recordedAt: -1 }),
      Reminder.find({ plantId: plant._id, userId: req.userId }).sort({ dueDate: 1 })
    ]);

    return res.json({ plant, updates, reminders });
  } catch (error) {
    return next(error);
  }
});

router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const {
      plantName,
      speciesName,
      plantingDate,
      locationPlot = 'Home Garden',
      initialHeightCm = 12,
      currentHeightCm,
      wateringIntervalDays = 3,
      fertilizingIntervalDays = 14,
      status = 'Healthy',
      imageUrl = '',
      notes = '',
      isPriorityZone = false
    } = req.body;

    if (!plantName || !plantName.trim() || !speciesName || !speciesName.trim()) {
      return res.status(400).json({ message: 'plantName and speciesName are required.' });
    }

    const storedImageUrl = await uploadImageMedia(req.file, imageUrl);
    const coordinates = parseCoordinates(req.body);
    const initHeight = Number(initialHeightCm) || 12;
    const currHeight = currentHeightCm !== undefined && currentHeightCm !== '' ? Number(currentHeightCm) : initHeight;
    const wateringDays = Math.max(1, Number(wateringIntervalDays) || 3);
    const fertilizingDays = Math.max(1, Number(fertilizingIntervalDays) || 14);
    const priorityFlag = isPriorityZone === true || isPriorityZone === 'true';

    const impact = estimateImpactRates(speciesName, initHeight);

    const plant = await Plant.create({
      userId: req.userId,
      plantName: plantName.trim(),
      speciesName: speciesName.trim(),
      plantingDate: plantingDate ? new Date(plantingDate) : new Date(),
      locationPlot: locationPlot.trim() || 'Home Garden',
      location: {
        type: 'Point',
        coordinates
      },
      initialHeightCm: initHeight,
      currentHeightCm: currHeight,
      wateringIntervalDays: wateringDays,
      fertilizingIntervalDays: fertilizingDays,
      status,
      imageUrl: storedImageUrl,
      notes,
      isPriorityZone: priorityFlag,
      co2OffsetKgPerYear: impact.co2OffsetKgPerYear,
      oxygenKgPerYear: impact.oxygenKgPerYear
    });

    const nextWaterDate = new Date(Date.now() + wateringDays * 24 * 60 * 60 * 1000);
    const nextFertilizeDate = new Date(Date.now() + fertilizingDays * 24 * 60 * 60 * 1000);

    const [wateringReminder, fertilizingReminder] = await Promise.all([
      Reminder.create({
        plantId: plant._id,
        userId: req.userId,
        title: `Water ${plant.plantName}`,
        careType: 'Watering',
        dueDate: nextWaterDate,
        intervalDays: wateringDays,
        notes: `Scheduled automatically every ${wateringDays} day(s)`
      }),
      Reminder.create({
        plantId: plant._id,
        userId: req.userId,
        title: `Fertilize ${plant.plantName}`,
        careType: 'Fertilizing',
        dueDate: nextFertilizeDate,
        intervalDays: fertilizingDays,
        notes: `Nutrient schedule every ${fertilizingDays} day(s)`
      })
    ]);

    const registerReward = await awardXp({
      userId: req.userId,
      action: 'PLANT_REGISTERED',
      xp: 50,
      eventKey: `plant-register:${plant._id}`,
      description: `Registered plant: ${plant.plantName} (${plant.speciesName})`
    });

    let totalXpAwarded = registerReward.xpAwarded;
    const newlyUnlockedBadges = [...registerReward.newlyUnlockedBadges];
    let latestUser = registerReward.user;

    if (priorityFlag) {
      const bonusReward = await awardXp({
        userId: req.userId,
        action: 'PRIORITY_ZONE_PLANTATION',
        xp: 50,
        eventKey: `priority-zone:${plant._id}`,
        description: `Priority green-zone bonus for ${plant.plantName}`
      });
      totalXpAwarded += bonusReward.xpAwarded;
      newlyUnlockedBadges.push(...bonusReward.newlyUnlockedBadges);
      latestUser = bonusReward.user;
    }

    return res.status(201).json({
      plant,
      reminders: [wateringReminder, fertilizingReminder],
      xpAwarded: totalXpAwarded,
      newlyUnlockedBadges: [...new Set(newlyUnlockedBadges)],
      user: latestUser
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', upload.single('image'), async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid plant ID.' });
    }
    const plant = await Plant.findById(req.params.id);
    if (!verifyOwnershipOrFail(plant, req.userId, res)) return;

    const updatableFields = [
      'plantName',
      'speciesName',
      'plantingDate',
      'locationPlot',
      'initialHeightCm',
      'currentHeightCm',
      'wateringIntervalDays',
      'fertilizingIntervalDays',
      'status',
      'notes'
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        plant[field] = req.body[field];
      }
    }

    if (req.body.location || (req.body.lat !== undefined && req.body.lng !== undefined)) {
      plant.location = {
        type: 'Point',
        coordinates: parseCoordinates(req.body)
      };
    }

    if (req.file || req.body.imageUrl !== undefined) {
      plant.imageUrl = await uploadImageMedia(req.file, req.body.imageUrl || plant.imageUrl);
    }

    await plant.save();
    return res.json({ plant });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid plant ID.' });
    }
    const plant = await Plant.findById(req.params.id);
    if (!verifyOwnershipOrFail(plant, req.userId, res)) return;

    await Promise.all([
      ProgressUpdate.deleteMany({ plantId: plant._id }),
      Reminder.deleteMany({ plantId: plant._id }),
      plant.deleteOne()
    ]);

    return res.json({ message: 'Plant and associated logs removed successfully.' });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/updates', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid plant ID.' });
    }
    const plant = await Plant.findById(req.params.id);
    if (!verifyOwnershipOrFail(plant, req.userId, res)) return;

    const updates = await ProgressUpdate.find({ plantId: plant._id, userId: req.userId }).sort({
      recordedAt: 1
    });
    return res.json({ updates });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/updates', upload.single('image'), async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid plant ID.' });
    }
    const plant = await Plant.findById(req.params.id);
    if (!verifyOwnershipOrFail(plant, req.userId, res)) return;

    const greenPixels = Math.max(0, Number(req.body.greenPixels) || 0);
    const canopyCoveragePct = Math.min(100, Math.max(0, Number(req.body.canopyCoveragePct) || 0));
    const manualHeight =
      req.body.heightCm !== undefined && req.body.heightCm !== '' ? Number(req.body.heightCm) : null;
    const notes = req.body.notes || '';

    const storedImageUrl = await uploadImageMedia(req.file, req.body.imageUrl || plant.imageUrl);

    const previousUpdate = await ProgressUpdate.findOne({
      plantId: plant._id,
      userId: req.userId
    }).sort({ recordedAt: -1 });

    let growthPercentage = 0;
    if (previousUpdate && previousUpdate.greenPixels > 0) {
      growthPercentage = Number(
        (((greenPixels - previousUpdate.greenPixels) / previousUpdate.greenPixels) * 100).toFixed(2)
      );
    } else if (canopyCoveragePct > 0) {
      growthPercentage = Number((canopyCoveragePct * 0.25).toFixed(2));
    }

    const baseHeight = plant.currentHeightCm || plant.initialHeightCm || 10;
    let computedHeightCm;
    if (manualHeight !== null && Number.isFinite(manualHeight) && manualHeight > 0) {
      computedHeightCm = Number(manualHeight.toFixed(1));
    } else if (growthPercentage !== 0) {
      const clampedDelta = Math.max(-0.15, Math.min(0.6, growthPercentage / 100));
      computedHeightCm = Number(Math.max(1, baseHeight * (1 + clampedDelta)).toFixed(1));
    } else {
      computedHeightCm = Number((baseHeight + 0.5).toFixed(1));
    }

    const aiResult = await runGeminiVisionDiagnosis({
      file: req.file,
      imageUrl: storedImageUrl,
      speciesHint: plant.speciesName,
      canopyCoveragePct,
      growthPercentage
    });

    const update = await ProgressUpdate.create({
      plantId: plant._id,
      userId: req.userId,
      imageUrl: storedImageUrl,
      greenPixels,
      canopyCoveragePct,
      growthPercentage,
      heightCm: computedHeightCm,
      aiHealthStatus: aiResult.healthStatus,
      aiDetectedSpecies: aiResult.detectedSpecies,
      aiIssuesDetected: aiResult.issuesDetected,
      aiCareTips: aiResult.careTips,
      notes
    });

    plant.currentHeightCm = computedHeightCm;
    plant.status = aiResult.healthStatus;
    if (storedImageUrl) {
      plant.imageUrl = storedImageUrl;
    }
    await plant.save();

    const rewardResult = await awardXp({
      userId: req.userId,
      action: 'PROGRESS_UPDATE',
      xp: 20,
      eventKey: `progress-update:${update._id}`,
      description: `Visual canopy update for ${plant.plantName} (${growthPercentage}% growth)`
    });

    return res.status(201).json({
      update,
      plant,
      aiDiagnosis: aiResult,
      xpAwarded: rewardResult.xpAwarded,
      newlyUnlockedBadges: rewardResult.newlyUnlockedBadges,
      user: rewardResult.user
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
