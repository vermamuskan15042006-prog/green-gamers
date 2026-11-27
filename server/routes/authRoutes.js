import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authMiddleware, { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

const signToken = (user) =>
  jwt.sign(
    { userId: user?._id?.toString?.() ?? String(user?._id ?? ''), email: user?.email ?? '' },
    process.env.JWT_SECRET || JWT_SECRET,
    { expiresIn: '7d' }
  );

export const sanitizeUser = (user) => {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'individual',
    organizationName: user.organizationName || '',
    location: user.location || 'New Delhi, India',
    bio: user.bio || '',
    xp: user.xp || 0,
    level: user.level || 1,
    badges: Array.isArray(user.badges) ? user.badges : [],
    joinedChallenges: Array.isArray(user.joinedChallenges) ? user.joinedChallenges : [],
    unlockedCourses: Array.isArray(user.unlockedCourses) ? user.unlockedCourses : [],
    completedCourses: Array.isArray(user.completedCourses) ? user.completedCourses : [],
    joinedCommunities: Array.isArray(user.joinedCommunities) ? user.joinedCommunities : [],
    createdAt: user.createdAt
  };
};

router.post('/register', async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role = 'individual',
      organizationName = '',
      location = 'New Delhi, India',
      bio = ''
    } = req.body;

    if (!name || !name.trim() || !email || !email.trim() || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const safeRole = role === 'ngo' ? 'ngo' : 'individual';

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: safeRole,
      organizationName:
        safeRole === 'ngo' ? (organizationName?.trim() || `${name.trim()} Green Group`) : '',
      location: location?.trim() || 'New Delhi, India',
      bio: bio?.trim() || ''
    });

    const token = signToken(user);
    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    return res.json({
      message: 'Login successful',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { name, role, organizationName, location, bio } = req.body;
    if (name && name.trim()) user.name = name.trim();
    if (role === 'individual' || role === 'ngo') user.role = role;
    if (organizationName !== undefined) user.organizationName = String(organizationName).trim();
    if (user.role === 'ngo' && !user.organizationName) {
      user.organizationName = `${user.name} Plantation Group`;
    }
    if (location !== undefined) user.location = String(location).trim() || 'New Delhi, India';
    if (bio !== undefined) user.bio = String(bio).trim();

    await user.save();
    return res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
