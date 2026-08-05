const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
    });

    await user.save();

    const payload = {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    };

    const secret = process.env.JWT_SECRET || 'fallback_secret_interviewiq';
    jwt.sign(payload, secret, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      });
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    };

    const secret = process.env.JWT_SECRET || 'fallback_secret_interviewiq';
    jwt.sign(payload, secret, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      });
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Auth/me error:', err.message);
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
});

module.exports = router;
