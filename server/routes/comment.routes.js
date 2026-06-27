const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/posts/:postId/comments
router.get('/:postId/comments', (req, res) => {
  try {
    const postId = parseInt(req.params.postId);

    const comments = db.prepare(`
      SELECT c.*, u.username, u.display_name, u.avatar_color
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(postId);

    res.json({ comments });
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:postId/comments
router.post('/:postId/comments', requireAuth, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Comment must be 1-300 characters')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const postId = parseInt(req.params.postId);
    const { content } = req.body;

    // Check post exists
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const result = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)')
      .run(postId, req.session.userId, content);

    const comment = db.prepare(`
      SELECT c.*, u.username, u.display_name, u.avatar_color
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(postId).count;

    res.status(201).json({ comment, comment_count: commentCount });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/comments/:id
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const commentId = parseInt(req.params.id);

    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (comment.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    const postId = comment.post_id;
    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);

    const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(postId).count;

    res.json({ message: 'Comment deleted', comment_count: commentCount });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
