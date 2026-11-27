import mongoose from 'mongoose';

const PlantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    plantName: {
      type: String,
      required: [true, 'Plant name is required'],
      trim: true,
      maxlength: 120
    },
    speciesName: {
      type: String,
      required: [true, 'Species name is required'],
      trim: true,
      maxlength: 120
    },
    plantingDate: {
      type: Date,
      default: Date.now
    },
    locationPlot: {
      type: String,
      trim: true,
      default: 'Home Garden'
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    initialHeightCm: {
      type: Number,
      default: 10,
      min: 0
    },
    currentHeightCm: {
      type: Number,
      default: 10,
      min: 0
    },
    wateringIntervalDays: {
      type: Number,
      default: 3,
      min: 1
    },
    fertilizingIntervalDays: {
      type: Number,
      default: 14,
      min: 1
    },
    status: {
      type: String,
      enum: ['Healthy', 'Thriving', 'Needs Water', 'Needs Attention', 'Critical', 'Dormant'],
      default: 'Healthy'
    },
    imageUrl: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: '',
      maxlength: 1000
    },
    isPriorityZone: {
      type: Boolean,
      default: false
    },
    lastWateredAt: {
      type: Date,
      default: Date.now
    },
    lastFertilizedAt: {
      type: Date,
      default: Date.now
    },
    co2OffsetKgPerYear: {
      type: Number,
      default: 12
    },
    oxygenKgPerYear: {
      type: Number,
      default: 8.5
    }
  },
  { timestamps: true }
);

PlantSchema.index({ location: '2dsphere' });

export const Plant = mongoose.model('Plant', PlantSchema);
export default Plant;
