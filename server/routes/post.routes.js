const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/posts/feed — Posts from followed users (+ own posts)
router.get('/feed', requireAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const posts = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar_color,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id IN (
        SELECT following_id FROM followers WHERE follower_id = ?
      ) OR p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.session.userId, req.session.userId, req.session.userId, limit, offset);

    const formattedPosts = posts.map(p => ({
      ...p,
      is_liked: p.is_liked > 0
    }));

    res.json({ posts: formattedPosts, page, has_more: posts.length === limit });
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/explore — All recent posts
router.get('/explore', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const currentUserId = req.session?.userId || 0;

    const posts = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar_color,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(currentUserId, limit, offset);

    const formattedPosts = posts.map(p => ({
      ...p,
      is_liked: p.is_liked > 0
    }));

    res.json({ posts: formattedPosts, page, has_more: posts.length === limit });
  } catch (err) {
    console.error('Explore error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/user/:userId — Posts by a specific user
router.get('/user/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const currentUserId = req.session?.userId || 0;

    const posts = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar_color,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(currentUserId, userId, limit, offset);

    const formattedPosts = posts.map(p => ({
      ...p,
      is_liked: p.is_liked > 0
    }));

    res.json({ posts: formattedPosts, page, has_more: posts.length === limit });
  } catch (err) {
    console.error('User posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts — Create a new post
router.post('/', requireAuth, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Post content must be 1-500 characters')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { content } = req.body;

    const result = db.prepare('INSERT INTO posts (user_id, content) VALUES (?, ?)')
      .run(req.session.userId, content);

    const post = db.prepare(`
      SELECT p.*, u.username, u.display_name, u.avatar_color,
        0 as like_count, 0 as comment_count, 0 as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    post.is_liked = false;

    res.status(201).json({ post });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posts/:id — Delete own post
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);

    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:id/like — Like a post
router.post('/:id/like', requireAuth, (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    // Check post exists
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already liked
    const existing = db.prepare(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?'
    ).get(req.session.userId, postId);

    if (existing) {
      return res.status(409).json({ error: 'Already liked' });
    }

    db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)')
      .run(req.session.userId, postId);

    const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(postId).count;

    res.status(201).json({ like_count: likeCount, is_liked: true });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posts/:id/like — Unlike a post
router.delete('/:id/like', requireAuth, (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?')
      .run(req.session.userId, postId);

    const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(postId).count;

    res.json({ like_count: likeCount, is_liked: false });
  } catch (err) {
    console.error('Unlike error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
