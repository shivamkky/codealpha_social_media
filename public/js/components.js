/**
 * Reusable UI Components
 */
const Components = {

  /**
   * Generate avatar HTML with initials
   */
  avatar(displayName, color, sizeClass = '') {
    const initials = displayName
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return `<div class="avatar ${sizeClass}" style="background: ${color}">${initials}</div>`;
  },

  /**
   * Format a date/time string to relative time
   */
  timeAgo(dateStr) {
    const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  /**
   * Render a post card
   */
  postCard(post, currentUserId) {
    const isOwn = post.user_id === currentUserId;
    const likedClass = post.is_liked ? 'liked' : '';
    const heartFill = post.is_liked ? 'fill="currentColor"' : '';

    return `
      <article class="glass-card post-card" data-post-id="${post.id}">
        <div class="post-header">
          ${this.avatar(post.display_name, post.avatar_color)}
          <div class="post-author-info">
            <a class="post-author-name" href="#/profile/${post.username}">${this.escapeHtml(post.display_name)}</a>
            <div class="post-username">@${this.escapeHtml(post.username)} · ${this.timeAgo(post.created_at)}</div>
          </div>
        </div>
        <div class="post-content">${this.escapeHtml(post.content)}</div>
        <div class="post-actions">
          <button class="post-action-btn ${likedClass}" data-action="like" data-post-id="${post.id}" title="Like">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${heartFill}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span class="like-count">${post.like_count || 0}</span>
          </button>
          <button class="post-action-btn" data-action="comment" data-post-id="${post.id}" title="Comment">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="comment-count">${post.comment_count || 0}</span>
          </button>
          ${isOwn ? `
            <button class="post-action-btn post-delete-btn" data-action="delete" data-post-id="${post.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          ` : ''}
        </div>
        <div class="comments-container" id="comments-${post.id}"></div>
      </article>
    `;
  },

  /**
   * Render comments section for a post
   */
  commentsSection(comments, postId, currentUserId) {
    const commentItems = comments.map(c => this.commentItem(c, currentUserId)).join('');

    return `
      <div class="comments-section">
        ${commentItems}
        <div class="comment-form">
          <input type="text" class="comment-input" data-post-id="${postId}" placeholder="Write a comment..." maxlength="300">
          <button class="comment-submit-btn" data-post-id="${postId}">Reply</button>
        </div>
      </div>
    `;
  },

  /**
   * Render a single comment
   */
  commentItem(comment, currentUserId) {
    const isOwn = comment.user_id === currentUserId;
    return `
      <div class="comment-item" data-comment-id="${comment.id}">
        ${this.avatar(comment.display_name, comment.avatar_color, 'avatar-sm')}
        <div class="comment-body">
          <a class="comment-author" href="#/profile/${comment.username}">${this.escapeHtml(comment.display_name)}</a>
          <div class="comment-text">${this.escapeHtml(comment.content)}</div>
          <div class="comment-meta">
            <span class="comment-time">${this.timeAgo(comment.created_at)}</span>
            ${isOwn ? `<button class="comment-delete-btn" data-comment-id="${comment.id}" data-post-id="${comment.post_id}">Delete</button>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render a user card (for explore/search)
   */
  userCard(user, showFollowBtn = true) {
    let actionBtn = '';
    if (showFollowBtn && !user.is_self) {
      const btnClass = user.is_following ? 'btn-follow following' : 'btn-follow';
      const btnText = user.is_following ? 'Following' : 'Follow';
      actionBtn = `<button class="${btnClass} btn btn-sm" data-action="follow" data-user-id="${user.id}">${btnText}</button>`;
    }

    return `
      <div class="glass-card user-card" data-username="${user.username}">
        ${this.avatar(user.display_name, user.avatar_color)}
        <div class="user-card-info" onclick="window.location.hash = '#/profile/${user.username}'">
          <div class="user-card-name">${this.escapeHtml(user.display_name)}</div>
          <div class="user-card-username">@${this.escapeHtml(user.username)}</div>
          ${user.bio ? `<div class="user-card-bio">${this.escapeHtml(user.bio)}</div>` : ''}
        </div>
        ${actionBtn}
      </div>
    `;
  },

  /**
   * Loading skeleton for posts
   */
  postSkeleton(count = 3) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
      skeletons += `
        <div class="glass-card-static skeleton-post">
          <div style="display:flex;gap:12px;margin-bottom:14px;">
            <div class="skeleton skeleton-avatar"></div>
            <div style="flex:1;">
              <div class="skeleton skeleton-text short"></div>
              <div class="skeleton skeleton-text" style="width:25%;height:10px;"></div>
            </div>
          </div>
          <div class="skeleton skeleton-text long"></div>
          <div class="skeleton skeleton-text medium"></div>
          <div class="skeleton skeleton-text short" style="margin-bottom:0;"></div>
        </div>
      `;
    }
    return skeletons;
  },

  /**
   * Empty state
   */
  emptyState(icon, title, message) {
    return `
      <div class="empty-state">
        ${icon}
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
    `;
  },

  /**
   * Show a toast notification
   */
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ'
    };

    toast.innerHTML = `<span>${icons[type] || ''}</span> ${this.escapeHtml(message)}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
