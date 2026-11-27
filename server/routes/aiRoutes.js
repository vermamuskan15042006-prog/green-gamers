import express from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import authMiddleware from '../middleware/auth.js';
import { awardXp } from '../models/Reward.js';

const router = express.Router();

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

export const uploadImageMedia = async (file, fallbackUrl = '') => {
  if (!file) {
    return fallbackUrl || '';
  }

  if (hasCloudinaryConfig()) {
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });

      const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'green-gamers', resource_type: 'image' },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      if (uploaded?.secure_url) {
        return uploaded.secure_url;
      }
    } catch (err) {
      console.warn('Cloudinary upload failed, falling back to data URL:', err.message);
    }
  }

  const mime = file.mimetype || 'image/jpeg';
  const base64 = file.buffer.toString('base64');
  return `data:${mime};base64,${base64}`;
};

const DETERMINISTIC_SPECIES_PROFILES = [
  {
    detectedSpecies: 'Monstera deliciosa (Swiss Cheese Plant)',
    healthStatus: 'Healthy',
    issuesDetected: ['Minor dust accumulation on upper leaf blades'],
    careTips: [
      'Wipe leaves gently with a damp cloth to boost photosynthesis',
      'Water when top 3-5 cm of soil feels dry',
      'Keep in bright, indirect sunlight'
    ]
  },
  {
    detectedSpecies: 'Sansevieria trifasciata (Snake Plant)',
    healthStatus: 'Thriving',
    issuesDetected: ['No significant pests or nutrient deficiencies detected'],
    careTips: [
      'Avoid overwatering; allow soil to dry thoroughly between waterings',
      'Provide well-draining cactus or succulent potting mix',
      'Rotate pot bi-weekly for balanced upright growth'
    ]
  },
  {
    detectedSpecies: 'Azadirachta indica (Neem Sapling)',
    healthStatus: 'Healthy',
    issuesDetected: ['Slight lower-leaf yellowing typical of rapid canopy expansion'],
    careTips: [
      'Ensure at least 5-6 hours of direct sunlight daily',
      'Apply balanced organic compost every 2-3 weeks',
      'Maintain steady soil moisture without waterlogging'
    ]
  },
  {
    detectedSpecies: 'Epipremnum aureum (Golden Pothos)',
    healthStatus: 'Needs Water',
    issuesDetected: ['Mild leaf curl indicating moderate hydration deficit'],
    careTips: [
      'Deeply water the root zone until excess drains freely',
      'Mist foliage lightly in dry indoor air',
      'Trim leggy vines above nodes to encourage fuller canopy density'
    ]
  },
  {
    detectedSpecies: 'Ocimum tenuiflorum (Holy Basil / Tulsi)',
    healthStatus: 'Needs Attention',
    issuesDetected: ['Early signs of minor leaf-spot stress on older leaves'],
    careTips: [
      'Prune pinched flower spikes and affected lower leaves',
      'Increase airflow around the stem base and water at soil level',
      'Feed with diluted seaweed or vermicompost tea'
    ]
  }
];

const buildDeterministicDiagnosis = ({
  file,
  imageUrl = '',
  speciesHint = '',
  canopyCoveragePct = null,
  growthPercentage = null
}) => {
  const seedInput = `${speciesHint}|${file?.originalname || ''}|${file?.size || 0}|${imageUrl.slice(0, 64)}`;
  const hash = crypto.createHash('sha256').update(seedInput).digest();
  const baseProfile = DETERMINISTIC_SPECIES_PROFILES[hash[0] % DETERMINISTIC_SPECIES_PROFILES.length];

  let healthStatus = baseProfile.healthStatus;
  const issuesDetected = [...baseProfile.issuesDetected];
  const careTips = [...baseProfile.careTips];

  if (typeof canopyCoveragePct === 'number') {
    if (canopyCoveragePct >= 35 || (typeof growthPercentage === 'number' && growthPercentage > 5)) {
      healthStatus = 'Thriving';
    } else if (canopyCoveragePct < 8) {
      healthStatus = 'Needs Attention';
      issuesDetected.unshift('Low green canopy density detected in frame');
      careTips.unshift('Verify adequate sunlight exposure and check root hydration');
    }
  }

  return {
    detectedSpecies: speciesHint?.trim() ? speciesHint.trim() : baseProfile.detectedSpecies,
    healthStatus,
    issuesDetected: [...new Set(issuesDetected)],
    careTips: [...new Set(careTips)],
    provider: 'deterministic-fallback'
  };
};

export const runGeminiVisionDiagnosis = async ({
  file = null,
  imageUrl = '',
  speciesHint = '',
  canopyCoveragePct = null,
  growthPercentage = null
}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildDeterministicDiagnosis({
      file,
      imageUrl,
      speciesHint,
      canopyCoveragePct,
      growthPercentage
    });
  }

  try {
    const parts = [
      {
        text: [
          'You are Green-Sense, an expert botanist and plant pathologist.',
          'Analyze the plant image/context and reply ONLY with strict valid JSON (no markdown fences) having keys:',
          'detectedSpecies (string),',
          'healthStatus (one of: "Healthy", "Thriving", "Needs Water", "Needs Attention", "Critical"),',
          'issuesDetected (array of short strings),',
          'careTips (array of 3 concise actionable strings).',
          speciesHint ? `Species hint from user: ${speciesHint}.` : '',
          canopyCoveragePct !== null ? `Measured green canopy coverage: ${canopyCoveragePct}%.` : '',
          growthPercentage !== null ? `Measured foliage growth delta: ${growthPercentage}%.` : ''
        ]
          .filter(Boolean)
          .join(' ')
      }
    ];

    if (file?.buffer) {
      parts.push({
        inlineData: {
          mimeType: file.mimetype || 'image/jpeg',
          data: file.buffer.toString('base64')
        }
      });
    } else if (imageUrl && imageUrl.startsWith('data:image/')) {
      const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const payload = await response.json();
    const rawText = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = rawText.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    const allowedStatuses = ['Healthy', 'Thriving', 'Needs Water', 'Needs Attention', 'Critical'];
    const normalizedStatus = allowedStatuses.includes(parsed.healthStatus)
      ? parsed.healthStatus
      : 'Healthy';

    return {
      detectedSpecies: parsed.detectedSpecies || speciesHint || 'Unidentified Botanical Specimen',
      healthStatus: normalizedStatus,
      issuesDetected: Array.isArray(parsed.issuesDetected) ? parsed.issuesDetected : [],
      careTips: Array.isArray(parsed.careTips) ? parsed.careTips : [],
      provider: 'gemini-2.5-flash'
    };
  } catch (error) {
    console.warn('Gemini Vision call failed, using deterministic fallback:', error.message);
    return buildDeterministicDiagnosis({
      file,
      imageUrl,
      speciesHint,
      canopyCoveragePct,
      growthPercentage
    });
  }
};

router.post('/diagnose', authMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    const { imageUrl: bodyImageUrl = '', speciesHint = '', scanId = '' } = req.body;

    if (!req.file && !bodyImageUrl) {
      return res.status(400).json({ message: 'Please provide an image file or imageUrl to diagnose.' });
    }

    const storedImageUrl = await uploadImageMedia(req.file, bodyImageUrl);
    const diagnosis = await runGeminiVisionDiagnosis({
      file: req.file,
      imageUrl: storedImageUrl,
      speciesHint
    });

    const uniqueScanKey = scanId
      ? `ai-scan:${req.userId}:${scanId}`
      : `ai-scan:${req.userId}:${crypto.randomUUID()}`;

    const rewardResult = await awardXp({
      userId: req.userId,
      action: 'AI_SCAN',
      xp: 15,
      eventKey: uniqueScanKey,
      description: `Green-Sense AI scan for ${diagnosis.detectedSpecies}`
    });

    return res.json({
      imageUrl: storedImageUrl,
      detectedSpecies: diagnosis.detectedSpecies,
      healthStatus: diagnosis.healthStatus,
      issuesDetected: diagnosis.issuesDetected,
      careTips: diagnosis.careTips,
      provider: diagnosis.provider,
      xpAwarded: rewardResult.xpAwarded,
      newlyUnlockedBadges: rewardResult.newlyUnlockedBadges,
      user: rewardResult.user
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
