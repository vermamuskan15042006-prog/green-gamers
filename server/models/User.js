import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['individual', 'ngo'],
      default: 'individual'
    },
    organizationName: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120
    },
    location: {
      type: String,
      trim: true,
      default: 'New Delhi, India',
      maxlength: 120
    },
    bio: {
      type: String,
      trim: true,
      default: '',
      maxlength: 400
    },
    xp: {
      type: Number,
      default: 0,
      min: 0
    },
    level: {
      type: Number,
      default: 1,
      min: 1
    },
    badges: {
      type: [String],
      default: []
    },
    joinedChallenges: {
      type: [String],
      default: []
    },
    unlockedCourses: {
      type: [String],
      default: []
    },
    completedCourses: {
      type: [String],
      default: []
    },
    joinedCommunities: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

UserSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

UserSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', UserSchema);
export default User;
