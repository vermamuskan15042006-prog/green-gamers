import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    checklist: { type: [String], default: [] }
  },
  { _id: false }
);

const CourseSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      default: 'General Ecology'
    },
    description: {
      type: String,
      required: true
    },
    requiredXp: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    rewardXp: {
      type: Number,
      default: 25,
      min: 0
    },
    badgeName: {
      type: String,
      required: true
    },
    durationMinutes: {
      type: Number,
      default: 15
    },
    lessons: {
      type: [LessonSchema],
      default: []
    }
  },
  { timestamps: true }
);

export const Course = mongoose.model('Course', CourseSchema);

const SEED_COURSES = [
  {
    slug: 'balcony-indoor-plant-basics',
    title: 'Balcony & Indoor Plant Basics',
    category: 'Indoor & Urban Care',
    description:
      'Master light zones, drainage fundamentals, and watering rhythms for thriving apartment and balcony gardens.',
    requiredXp: 0,
    rewardXp: 25,
    badgeName: 'Balcony Botanist',
    durationMinutes: 12,
    lessons: [
      {
        title: '1. Reading Light & Microclimates',
        content:
          'Match plant placement to bright indirect light, morning sun, or shade. Rotate pots 90 degrees weekly so stems grow evenly rather than leaning.',
        checklist: [
          'Observe sunlight hours across your balcony or windowsill',
          'Group humidity-loving species like Peace Lily and Pothos together'
        ]
      },
      {
        title: '2. Drainage & Smart Watering',
        content:
          'Overwatering suffocates roots faster than underwatering. Always use pots with bottom drainage holes and check soil moisture 3–5 cm below the surface before watering.',
        checklist: [
          'Perform the finger-knuckle soil moisture test before watering',
          'Empty saucer runoff after 15 minutes to prevent root rot'
        ]
      }
    ]
  },
  {
    slug: 'organic-soil-composting',
    title: 'Organic Soil & Composting',
    category: 'Soil Science',
    description:
      'Build living, aerated potting mixes and turn household kitchen scraps into nutrient-rich black gold.',
    requiredXp: 30,
    rewardXp: 35,
    badgeName: 'Soil Alchemist',
    durationMinutes: 18,
    lessons: [
      {
        title: '1. Crafting the Ideal Potting Blend',
        content:
          'Combine cocopeat or garden loam with compost for nutrition and perlite or coarse sand for aeration so roots access oxygen as well as moisture.',
        checklist: [
          'Use a balanced 40% compost / 40% coco-loam / 20% aeration blend',
          'Top-dress potted plants with worm castings every 4 weeks'
        ]
      },
      {
        title: '2. Home Composting Ratios',
        content:
          'Balance nitrogen-rich greens (vegetable peels, coffee grounds) with carbon-rich browns (dry leaves, shredded cardboard) at roughly 1:2 to prevent odors.',
        checklist: [
          'Keep compost damp like a wrung sponge, never dripping wet',
          'Aerate the bin weekly to fuel beneficial aerobic microbes'
        ]
      }
    ]
  },
  {
    slug: 'pest-leaf-disease-mastery',
    title: 'Pest & Leaf Disease Mastery',
    category: 'Plant Pathology',
    description:
      'Spot early nutrient deficiencies, fungal spots, aphids, and mealybugs—and treat them safely with organic remedies.',
    requiredXp: 60,
    rewardXp: 45,
    badgeName: 'Plant Physician',
    durationMinutes: 20,
    lessons: [
      {
        title: '1. Decoding Leaf Symptoms',
        content:
          'Uniform lower-leaf yellowing often points to nitrogen depletion or overwatering, while crispy brown leaf tips indicate low humidity or mineral buildup.',
        checklist: [
          'Inspect leaf undersides weekly for webbing, scale, or aphids',
          'Isolate newly acquired plants for 10 days before mixing collections'
        ]
      },
      {
        title: '2. Neem & Gentle Bio-Sprays',
        content:
          'Mix cold-pressed neem oil (5 ml/L) with a drop of mild liquid soap and spray at dusk so pollinators stay safe and leaves do not scorch in midday sun.',
        checklist: [
          'Prune heavily infected leaves with sanitized shears',
          'Use Green-Sense AI scans to verify recovery across 2 weeks'
        ]
      }
    ]
  },
  {
    slug: 'large-scale-native-plantation',
    title: 'Large-Scale Native Plantation & Sapling Survival',
    category: 'Reforestation & NGO Ops',
    description:
      'Plan community drives, select climate-matched native saplings, and raise first-year sapling survival rates above 85%.',
    requiredXp: 100,
    rewardXp: 60,
    badgeName: 'Reforestation Steward',
    durationMinutes: 25,
    lessons: [
      {
        title: '1. Native Species & Site Selection',
        content:
          'Native trees like Neem, Peepal, Pongamia, and Arjuna support local pollinators and require far less supplemental irrigation once established.',
        checklist: [
          'Verify AQI and nearby green density with Location Advisor before a drive',
          'Dig 45x45x45 cm pits enriched with organic compost prior to planting'
        ]
      },
      {
        title: '2. Post-Plantation Mulching & Survival Audits',
        content:
          'The first 12 months determine sapling survival. Apply a 5–8 cm dry-leaf mulch ring around the base (keeping bark clear) and install tree guards in high-traffic zones.',
        checklist: [
          'Log batch survival counts at Day 30, Day 90, and Day 180',
          'Pair each drive with local individual caretakers from the directory'
        ]
      }
    ]
  }
];

export const ensureCoursesSeeded = async () => {
  const count = await Course.countDocuments();
  if (count >= SEED_COURSES.length) return;

  await Promise.all(
    SEED_COURSES.map((course) =>
      Course.updateOne({ slug: course.slug }, { $setOnInsert: course }, { upsert: true })
    )
  );
};

export default Course;
