import mongoose from 'mongoose';

const CommunityPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    authorName: {
      type: String,
      required: true,
      trim: true
    },
    authorRole: {
      type: String,
      enum: ['individual', 'ngo'],
      default: 'individual'
    },
    authorOrg: {
      type: String,
      default: ''
    },
    postType: {
      type: String,
      enum: ['Care Update', 'Drive Announcement', 'Question', 'Milestone'],
      default: 'Care Update'
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 800
    },
    locationTag: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const CommunitySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      default: 'General'
    },
    description: {
      type: String,
      required: true
    },
    focusTags: {
      type: [String],
      default: []
    },
    members: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: []
    },
    posts: {
      type: [CommunityPostSchema],
      default: []
    }
  },
  { timestamps: true }
);

export const Community = mongoose.model('Community', CommunitySchema);

const SEED_COMMUNITIES = [
  {
    slug: 'urban-balcony-gardeners',
    name: 'Urban & Balcony Gardeners',
    category: 'Compact Spaces',
    description:
      'Tips on container gardening, vertical planters, shade-tolerant ornamentals, and city balcony microclimates.',
    focusTags: ['Balcony', 'Pothos', 'Indoor Air', 'Containers'],
    posts: [
      {
        authorName: 'Maya Lin',
        authorRole: 'individual',
        postType: 'Care Update',
        content:
          'Switched my balcony Areca Palm to a terracotta pot with 20% perlite—new fronds opened in 10 days!',
        locationTag: 'Bengaluru'
      }
    ]
  },
  {
    slug: 'medicinal-kitchen-herbs',
    name: 'Medicinal & Kitchen Herbs',
    category: 'Edible & Healing',
    description:
      'Grow Tulsi, Mint, Coriander, Aloe Vera, and Curry Leaf organically on kitchen windowsills and terraces.',
    focusTags: ['Tulsi', 'Aloe Vera', 'Herbs', 'Organic'],
    posts: [
      {
        authorName: 'Aarav Patel',
        authorRole: 'individual',
        postType: 'Milestone',
        content:
          'Pinched flower spikes off my Holy Basil weekly and canopy density jumped 28% on the Canvas tracker.',
        locationTag: 'Pune'
      }
    ]
  },
  {
    slug: 'native-trees-reforestation',
    name: 'Native Trees & Reforestation',
    category: 'Biodiversity',
    description:
      'Collaborate on native saplings (Neem, Peepal, Arjuna, Pongamia), mulching practices, and urban heat-island cooling.',
    focusTags: ['Native Trees', 'Carbon Capture', 'Mulching', 'Canopy'],
    posts: [
      {
        authorName: 'GreenRoots Collective',
        authorRole: 'ngo',
        authorOrg: 'GreenRoots Collective',
        postType: 'Drive Announcement',
        content:
          'Pre-monsoon pit digging is underway along Sector 14 green belt—seeking Neem & Pongamia volunteers for Saturday!',
        locationTag: 'New Delhi'
      }
    ]
  },
  {
    slug: 'ngo-campus-plantation-network',
    name: 'NGO & Campus Plantation Network',
    category: 'Group Drives',
    description:
      'Connects NGOs, school eco-clubs, and high-XP individual caretakers for coordinated neighborhood plantation drives.',
    focusTags: ['NGO Drives', 'Volunteers', 'Survival Audits', 'Campus'],
    posts: [
      {
        authorName: 'EcoPulse Foundation',
        authorRole: 'ngo',
        authorOrg: 'EcoPulse Foundation',
        postType: 'Drive Announcement',
        content:
          'Reached 91% sapling survival across 180 native saplings from our Riverbank Drive thanks to 14 local caretakers.',
        locationTag: 'Mumbai'
      }
    ]
  }
];

export const ensureCommunitiesSeeded = async () => {
  const count = await Community.countDocuments();
  if (count >= SEED_COMMUNITIES.length) return;

  await Promise.all(
    SEED_COMMUNITIES.map((comm) =>
      Community.updateOne({ slug: comm.slug }, { $setOnInsert: comm }, { upsert: true })
    )
  );
};

export default Community;
