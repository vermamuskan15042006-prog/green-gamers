import mongoose from 'mongoose';

const ProgressUpdateSchema = new mongoose.Schema(
  {
    plantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plant',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    imageUrl: {
      type: String,
      default: ''
    },
    greenPixels: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    canopyCoveragePct: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0
    },
    growthPercentage: {
      type: Number,
      default: 0
    },
    heightCm: {
      type: Number,
      required: true,
      min: 0
    },
    aiHealthStatus: {
      type: String,
      default: 'Healthy'
    },
    aiDetectedSpecies: {
      type: String,
      default: ''
    },
    aiIssuesDetected: {
      type: [String],
      default: []
    },
    aiCareTips: {
      type: [String],
      default: []
    },
    notes: {
      type: String,
      default: ''
    },
    recordedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export const ProgressUpdate = mongoose.model('ProgressUpdate', ProgressUpdateSchema);
export default ProgressUpdate;
