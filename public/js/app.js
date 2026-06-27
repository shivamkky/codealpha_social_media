/**
 * App — Main application controller, router, and global event handlers
 */
const App = {
  currentUser: null,
  currentView: null,

  async init() {
    // Check if user is logged in
    try {
      const data = await API.getMe();
      this.currentUser = data.user;
    } catch (err) {
      this.currentUser = null;
    }

    // Set up routing
    window.addEventListener('hashchange', () => this.route());

    // Set up global event listeners
    this.setupGlobalListeners();

    // Initial route
    this.route();
  },

  navigate(hash) {
    window.location.hash = hash;
  },

  route() {
    const hash = window.location.hash || '#/';
    const navbar = document.getElementById('navbar');
    const fab = document.getElementById('fab-compose');

    // Parse route
    let view, param;
    if (hash.startsWith('#/profile/')) {
      view = 'profile';
      param = hash.replace('#/profile/', '');
    } else if (hash === '#/profile') {
      view = 'profile';
      param = null;
    } else if (hash === '#/feed') {
      view = 'feed';
    } else if (hash === '#/explore') {
      view = 'explore';
    } else if (hash === '#/login' || hash === '#/register') {
      view = 'auth';
    } else {
      view = this.currentUser ? 'feed' : 'auth';
    }

    // Auth guard
    if (!this.currentUser && view !== 'auth' && view !== 'explore') {
      this.navigate('#/login');
      return;
    }

    // Update navbar state
    if (this.currentUser) {
      navbar.classList.remove('logged-out');
      fab.classList.remove('hidden');
    } else {
      navbar.classList.add('logged-out');
      fab.classList.add('hidden');
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      const linkHash = link.getAttribute('href');
      if (view === 'feed' && linkHash === '#/feed') link.classList.add('active');
      if (view === 'explore' && linkHash === '#/explore') link.classList.add('active');
      if (view === 'profile' && linkHash === '#/profile') link.classList.add('active');
    });

    // Hide FAB on auth page
    if (view === 'auth') {
      fab.classList.add('hidden');
    }

    // Render view
    const mainContent = document.getElementById('main-content');
    this.currentView = view;

    switch (view) {
      case 'auth':
        mainContent.innerHTML = AuthView.render();
        AuthView.mount();
        break;
      case 'feed':
        mainContent.innerHTML = FeedView.render();
        FeedView.mount();
        break;
      case 'profile':
        mainContent.innerHTML = ProfileView.render(param);
        ProfileView.mount(param);
        break;
      case 'explore':
        mainContent.innerHTML = ExploreView.render();
        ExploreView.mount();
        break;
    }

    // Scroll to top on navigation
    window.scrollTo(0, 0);
  },

  setupGlobalListeners() {
    // Logout
    document.getElementById('nav-logout-btn').addEventListener('click', async () => {
      try {
        await API.logout();
        this.currentUser = null;
        Components.toast('Logged out successfully', 'info');
        this.navigate('#/login');
      } catch (err) {
        Components.toast('Logout failed', 'error');
      }
    });

    // FAB — Compose post modal
    document.getElementById('fab-compose').addEventListener('click', () => {
      const modal = document.getElementById('compose-modal');
      modal.classList.add('active');
      document.getElementById('compose-textarea').focus();
    });

    // Compose modal close
    document.getElementById('compose-modal-close').addEventListener('click', () => {
      document.getElementById('compose-modal').classList.remove('active');
    });

    // Edit profile modal close
    document.getElementById('edit-profile-close').addEventListener('click', () => {
      document.getElementById('edit-profile-modal').classList.remove('active');
    });
    document.getElementById('edit-profile-cancel').addEventListener('click', () => {
      document.getElementById('edit-profile-modal').classList.remove('active');
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });

    // Close modals on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    });

    // Compose modal char counter
    const composeTextarea = document.getElementById('compose-textarea');
    const composeCharCount = document.getElementById('compose-char-count');
    composeTextarea.addEventListener('input', () => {
      const len = composeTextarea.value.length;
      composeCharCount.textContent = `${len}/500`;
      composeCharCount.className = 'char-count' + (len > 450 ? ' danger' : len > 400 ? ' warning' : '');
    });

    // Compose modal submit
    document.getElementById('compose-submit-btn').addEventListener('click', async () => {
      const textarea = document.getElementById('compose-textarea');
      const content = textarea.value.trim();
      if (!content) return;

      const btn = document.getElementById('compose-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Posting...';

      try {
        await API.createPost({ content });
        textarea.value = '';
        composeCharCount.textContent = '0/500';
        document.getElementById('compose-modal').classList.remove('active');
        Components.toast('Post published!', 'success');

        // Refresh current view if it shows posts
        if (this.currentView === 'feed' || this.currentView === 'explore') {
          this.route();
        }
      } catch (err) {
        Components.toast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Post';
      }
    });

    // Global post action delegation (like, comment, delete)
    document.getElementById('main-content').addEventListener('click', async (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (!actionBtn) return;

      const action = actionBtn.dataset.action;
      const postId = actionBtn.dataset.postId;

      switch (action) {
        case 'like':
          await this.handleLike(actionBtn, postId);
          break;
        case 'comment':
          await this.handleToggleComments(postId);
          break;
        case 'delete':
          await this.handleDeletePost(postId);
          break;
      }
    });

    // Global comment submission (delegation)
    document.getElementById('main-content').addEventListener('click', async (e) => {
      if (e.target.classList.contains('comment-submit-btn')) {
        const postId = e.target.dataset.postId;
        const input = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
        if (input) {
          await this.handleAddComment(postId, input);
        }
      }
      if (e.target.classList.contains('comment-delete-btn')) {
        const commentId = e.target.dataset.commentId;
        const postId = e.target.dataset.postId;
        await this.handleDeleteComment(commentId, postId);
      }
    });

    // Comment input Enter key
    document.getElementById('main-content').addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.shiftKey && e.target.classList.contains('comment-input')) {
        e.preventDefault();
        const postId = e.target.dataset.postId;
        await this.handleAddComment(postId, e.target);
      }
    });
  },

  async handleLike(btn, postId) {
    if (!this.currentUser) {
      Components.toast('Please log in to like posts', 'error');
      return;
    }

    const isLiked = btn.classList.contains('liked');
    const countEl = btn.querySelector('.like-count');

    try {
      if (isLiked) {
        const data = await API.unlikePost(postId);
        btn.classList.remove('liked');
        btn.querySelector('svg').removeAttribute('fill');
        countEl.textContent = data.like_count;
      } else {
        const data = await API.likePost(postId);
        btn.classList.add('liked');
        btn.querySelector('svg').setAttribute('fill', 'currentColor');
        countEl.textContent = data.like_count;
      }
    } catch (err) {
      Components.toast(err.message, 'error');
    }
  },

  async handleToggleComments(postId) {
    if (!this.currentUser) {
      Components.toast('Please log in to view comments', 'error');
      return;
    }

    const container = document.getElementById(`comments-${postId}`);
    if (!container) return;

    // Toggle: if comments already shown, hide them
    if (container.innerHTML.trim()) {
      container.innerHTML = '';
      return;
    }

    // Load and show comments
    try {
      const data = await API.getComments(postId);
      container.innerHTML = Components.commentsSection(data.comments, postId, this.currentUser.id);
    } catch (err) {
      Components.toast('Failed to load comments', 'error');
    }
  },

  async handleAddComment(postId, input) {
    const content = input.value.trim();
    if (!content) return;

    const submitBtn = document.querySelector(`.comment-submit-btn[data-post-id="${postId}"]`);
    if (submitBtn) submitBtn.disabled = true;

    try {
      const data = await API.createComment(postId, { content });
      input.value = '';

      // Refresh comments
      const commentsData = await API.getComments(postId);
      const container = document.getElementById(`comments-${postId}`);
      container.innerHTML = Components.commentsSection(commentsData.comments, postId, this.currentUser.id);

      // Update comment count on the post
      const postCard = document.querySelector(`[data-post-id="${postId}"] .comment-count`);
      if (postCard) postCard.textContent = data.comment_count;

    } catch (err) {
      Components.toast(err.message, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  },

  async handleDeleteComment(commentId, postId) {
    try {
      const data = await API.deleteComment(commentId);

      // Refresh comments
      const commentsData = await API.getComments(postId);
      const container = document.getElementById(`comments-${postId}`);
      container.innerHTML = Components.commentsSection(commentsData.comments, postId, this.currentUser.id);

      // Update comment count
      const postCard = document.querySelector(`[data-post-id="${postId}"] .comment-count`);
      if (postCard) postCard.textContent = data.comment_count;

      Components.toast('Comment deleted', 'info');
    } catch (err) {
      Components.toast(err.message, 'error');
    }
  },

  async handleDeletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await API.deletePost(postId);
      const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (postCard) {
        postCard.style.opacity = '0';
        postCard.style.transform = 'scale(0.95)';
        postCard.style.transition = 'all 0.3s ease';
        setTimeout(() => postCard.remove(), 300);
      }
      Components.toast('Post deleted', 'info');
    } catch (err) {
      Components.toast(err.message, 'error');
    }
  }
};

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
