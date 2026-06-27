/**
 * Profile View — User profile with stats, posts, follow
 */
const ProfileView = {
  profileUser: null,

  render(username) {
    return `
      <div class="view-enter" id="profile-view">
        <div class="glass-card-static profile-header" id="profile-header-card">
          ${Components.postSkeleton(1)}
        </div>
        <div id="profile-posts">
          ${Components.postSkeleton(2)}
        </div>
        <div id="profile-load-more" class="text-center mt-24 hidden">
          <button class="btn btn-secondary" id="profile-load-more-btn">Load More</button>
        </div>
      </div>
    `;
  },

  async mount(username) {
    // If no username, show own profile
    if (!username && App.currentUser) {
      username = App.currentUser.username;
    }

    try {
      const data = await API.getUser(username);
      this.profileUser = data.user;
      this.renderHeader(data.user);
      await this.loadPosts(data.user.id);
    } catch (err) {
      document.getElementById('profile-header-card').innerHTML = Components.emptyState(
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>`,
        'User not found',
        'This profile doesn\'t exist or has been removed.'
      );
      document.getElementById('profile-posts').innerHTML = '';
    }
  },

  renderHeader(user) {
    const isSelf = user.is_self;
    const headerEl = document.getElementById('profile-header-card');

    headerEl.innerHTML = `
      <div class="profile-avatar-wrapper">
        ${Components.avatar(user.display_name, user.avatar_color, 'avatar-xl')}
      </div>
      <div class="profile-display-name">${Components.escapeHtml(user.display_name)}</div>
      <div class="profile-username">@${Components.escapeHtml(user.username)}</div>
      ${user.bio ? `<div class="profile-bio">${Components.escapeHtml(user.bio)}</div>` : '<div class="profile-bio" style="color:var(--text-tertiary);font-style:italic;">No bio yet</div>'}
      <div class="profile-stats">
        <div class="profile-stat">
          <div class="profile-stat-value" id="stat-posts">${user.post_count}</div>
          <div class="profile-stat-label">Posts</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value" id="stat-followers">${user.follower_count}</div>
          <div class="profile-stat-label">Followers</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value" id="stat-following">${user.following_count}</div>
          <div class="profile-stat-label">Following</div>
        </div>
      </div>
      <div class="profile-actions">
        ${isSelf ? `
          <button class="btn btn-secondary" id="edit-profile-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Profile
          </button>
        ` : `
          <button class="btn ${user.is_following ? 'btn-follow following' : 'btn-follow'}" id="profile-follow-btn" data-user-id="${user.id}">
            ${user.is_following ? 'Following' : 'Follow'}
          </button>
        `}
      </div>
    `;

    // Bind events
    if (isSelf) {
      document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
        this.openEditProfile(user);
      });
    } else {
      document.getElementById('profile-follow-btn')?.addEventListener('click', (e) => {
        this.toggleFollow(e.currentTarget, user);
      });
    }
  },

  async loadPosts(userId) {
    try {
      const data = await API.getUserPosts(userId);
      const container = document.getElementById('profile-posts');

      if (data.posts.length === 0) {
        container.innerHTML = Components.emptyState(
          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>`,
          'No posts yet',
          this.profileUser?.is_self ? 'Share your first thought with the world!' : 'This user hasn\'t posted yet.'
        );
        return;
      }

      container.innerHTML = data.posts.map(post =>
        Components.postCard(post, App.currentUser?.id)
      ).join('');
    } catch (err) {
      Components.toast('Failed to load posts', 'error');
    }
  },

  openEditProfile(user) {
    const modal = document.getElementById('edit-profile-modal');
    document.getElementById('edit-display-name').value = user.display_name;
    document.getElementById('edit-bio').value = user.bio || '';
    modal.classList.add('active');

    // Save handler
    const saveBtn = document.getElementById('edit-profile-save');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.addEventListener('click', async () => {
      newSaveBtn.disabled = true;
      newSaveBtn.textContent = 'Saving...';

      try {
        const data = await API.updateProfile({
          displayName: document.getElementById('edit-display-name').value.trim(),
          bio: document.getElementById('edit-bio').value.trim(),
        });
        App.currentUser = data.user;
        this.profileUser = { ...this.profileUser, display_name: data.user.display_name, bio: data.user.bio };
        this.renderHeader({ ...this.profileUser, is_self: true });
        modal.classList.remove('active');
        Components.toast('Profile updated!', 'success');
      } catch (err) {
        Components.toast(err.message, 'error');
      } finally {
        newSaveBtn.disabled = false;
        newSaveBtn.textContent = 'Save Changes';
      }
    });
  },

  async toggleFollow(btn, user) {
    const isFollowing = btn.classList.contains('following');
    btn.disabled = true;

    try {
      if (isFollowing) {
        const data = await API.unfollowUser(user.id);
        btn.classList.remove('following');
        btn.textContent = 'Follow';
        document.getElementById('stat-followers').textContent = data.follower_count;
        Components.toast(`Unfollowed @${user.username}`, 'info');
      } else {
        const data = await API.followUser(user.id);
        btn.classList.add('following');
        btn.textContent = 'Following';
        document.getElementById('stat-followers').textContent = data.follower_count;
        Components.toast(`Following @${user.username}!`, 'success');
      }
    } catch (err) {
      Components.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }
};
