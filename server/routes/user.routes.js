const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/search?q=query
router.get('/search', requireAuth, (req, res) => {
  try {
    const query = req.query.q || '';
    if (query.length < 1) {
      return res.json({ users: [] });
    }

    const users = db.prepare(`
      SELECT id, username, display_name, bio, avatar_color, created_at
      FROM users
      WHERE username LIKE ? OR display_name LIKE ?
      ORDER BY username
      LIMIT 20
    `).all(`%${query}%`, `%${query}%`);

    // Add follow status for each user
    const usersWithStatus = users.map(user => {
      const isFollowing = db.prepare(
        'SELECT id FROM followers WHERE follower_id = ? AND following_id = ?'
      ).get(req.session.userId, user.id);

      return {
        ...user,
        is_following: !!isFollowing,
        is_self: user.id === req.session.userId
      };
    });

    res.json({ users: usersWithStatus });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error during search' });
  }
});

// GET /api/users/:username — Get user profile
router.get('/:username', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, display_name, bio, avatar_color, created_at
      FROM users WHERE username = ?
    `).get(req.params.username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get stats
    const postCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(user.id).count;
    const followerCount = db.prepare('SELECT COUNT(*) as count FROM followers WHERE following_id = ?').get(user.id).count;
    const followingCount = db.prepare('SELECT COUNT(*) as count FROM followers WHERE follower_id = ?').get(user.id).count;

    // Check if current user follows this user
    let isFollowing = false;
    let isSelf = false;
    if (req.session && req.session.userId) {
      isFollowing = !!db.prepare(
        'SELECT id FROM followers WHERE follower_id = ? AND following_id = ?'
      ).get(req.session.userId, user.id);
      isSelf = req.session.userId === user.id;
    }

    res.json({
      user: {
        ...user,
        post_count: postCount,
        follower_count: followerCount,
        following_count: followingCount,
        is_following: isFollowing,
        is_self: isSelf
      }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/profile — Update own profile
router.put('/profile', requireAuth, [
  body('displayName').trim().isLength({ min: 1, max: 50 }).withMessage('Display name must be 1-50 characters'),
  body('bio').trim().isLength({ max: 200 }).withMessage('Bio must be under 200 characters')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { displayName, bio } = req.body;

    db.prepare('UPDATE users SET display_name = ?, bio = ? WHERE id = ?')
      .run(displayName, bio || '', req.session.userId);

    const user = db.prepare(
      'SELECT id, username, email, display_name, bio, avatar_color, created_at FROM users WHERE id = ?'
    ).get(req.session.userId);

    res.json({ user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/:id/follow — Follow a user
router.post('/:id/follow', requireAuth, (req, res) => {
  try {
    const targetId = parseInt(req.params.id);

    if (targetId === req.session.userId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check target exists
    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existing = db.prepare(
      'SELECT id FROM followers WHERE follower_id = ? AND following_id = ?'
    ).get(req.session.userId, targetId);

    if (existing) {
      return res.status(409).json({ error: 'Already following this user' });
    }

    db.prepare('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)')
      .run(req.session.userId, targetId);

    const followerCount = db.prepare('SELECT COUNT(*) as count FROM followers WHERE following_id = ?').get(targetId).count;

    res.status(201).json({ message: 'Followed successfully', follower_count: followerCount });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:id/follow — Unfollow a user
router.delete('/:id/follow', requireAuth, (req, res) => {
  try {
    const targetId = parseInt(req.params.id);

    db.prepare('DELETE FROM followers WHERE follower_id = ? AND following_id = ?')
      .run(req.session.userId, targetId);

    const followerCount = db.prepare('SELECT COUNT(*) as count FROM followers WHERE following_id = ?').get(targetId).count;

    res.json({ message: 'Unfollowed successfully', follower_count: followerCount });
  } catch (err) {
    console.error('Unfollow error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id/followers
router.get('/:id/followers', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const followers = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.bio, u.avatar_color
      FROM followers f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `).all(userId);

    res.json({ users: followers });
  } catch (err) {
    console.error('Get followers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id/following
router.get('/:id/following', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const following = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.bio, u.avatar_color
      FROM followers f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
    `).all(userId);

    res.json({ users: following });
  } catch (err) {
    console.error('Get following error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
