import mongoose from 'mongoose';

const ReminderSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
      maxlength: 160
    },
    careType: {
      type: String,
      enum: ['Watering', 'Fertilizing', 'Pruning', 'Health Check', 'Custom'],
      default: 'Watering'
    },
    dueDate: {
      type: Date,
      required: true
    },
    intervalDays: {
      type: Number,
      default: 3,
      min: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export const Reminder = mongoose.model('Reminder', ReminderSchema);
export default Reminder;
