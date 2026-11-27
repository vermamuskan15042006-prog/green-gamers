import mongoose from 'mongoose';

const BatchLogSchema = new mongoose.Schema(
  {
    batchLabel: { type: String, required: true, trim: true },
    species: { type: String, required: true, trim: true },
    saplingsPlanted: { type: Number, required: true, min: 1 },
    saplingsSurvived: { type: Number, required: true, min: 0 },
    loggedBy: { type: String, default: '' },
    notes: { type: String, default: '' },
    loggedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const PlantationDriveSchema = new mongoose.Schema(
  {
    ngoUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    organizationName: {
      type: String,
      required: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Drive title is required'],
      trim: true,
      maxlength: 140
    },
    locationName: {
      type: String,
      required: [true, 'Drive location is required'],
      trim: true,
      maxlength: 140
    },
    coordinates: {
      lat: { type: Number, default: 28.6139 },
      lng: { type: Number, default: 77.209 }
    },
    targetSaplings: {
      type: Number,
      required: true,
      min: 1
    },
    plantedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    survivedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    survivalRatePct: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    speciesList: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['Planning', 'Active', 'Completed'],
      default: 'Active'
    },
    driveDate: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: '',
      maxlength: 1000
    },
    batchLogs: {
      type: [BatchLogSchema],
      default: []
    }
  },
  { timestamps: true }
);

export const PlantationDrive = mongoose.model('PlantationDrive', PlantationDriveSchema);
export default PlantationDrive;
