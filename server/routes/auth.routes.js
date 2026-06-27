const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Avatar color palette
const AVATAR_COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1'
];

function getRandomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// POST /api/auth/register
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-20 characters, letters, numbers, and underscores only'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Display name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, email, password, displayName } = req.body;

    // Check if username or email already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const avatarColor = getRandomColor();

    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, display_name, avatar_color) VALUES (?, ?, ?, ?, ?)'
    ).run(username, email, passwordHash, displayName, avatarColor);

    // Auto-login after register
    req.session.userId = result.lastInsertRowid;

    const user = db.prepare('SELECT id, username, email, display_name, bio, avatar_color, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({ user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user.id;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        bio: user.bio,
        avatar_color: user.avatar_color,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = db.prepare(
    'SELECT id, username, email, display_name, bio, avatar_color, created_at FROM users WHERE id = ?'
  ).get(req.session.userId);

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  res.json({ user });
});

module.exports = router;
