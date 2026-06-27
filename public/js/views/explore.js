/**
 * Explore View — Discover users and browse all posts
 */
const ExploreView = {
  searchTimeout: null,
  page: 1,
  hasMore: true,

  render() {
    return `
      <div class="view-enter">
        <div class="explore-search">
          <div class="search-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" class="search-input" id="explore-search-input" placeholder="Search users..." autocomplete="off">
          </div>
        </div>

        <div id="search-results" class="hidden mb-24"></div>

        <div id="explore-feed">
          <h2 class="explore-section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Recent Posts
          </h2>
          <div id="explore-posts">
            ${Components.postSkeleton(3)}
          </div>
          <div id="explore-load-more" class="text-center mt-24 hidden">
            <button class="btn btn-secondary" id="explore-load-more-btn">Load More</button>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    this.page = 1;
    this.hasMore = true;

    // Search handler with debounce
    const searchInput = document.getElementById('explore-search-input');
    searchInput.addEventListener('input', () => {
      clearTimeout(this.searchTimeout);
      const query = searchInput.value.trim();

      if (query.length === 0) {
        document.getElementById('search-results').classList.add('hidden');
        document.getElementById('explore-feed').classList.remove('hidden');
        return;
      }

      this.searchTimeout = setTimeout(() => this.search(query), 300);
    });

    // Load explore posts
    await this.loadPosts();

    // Load more
    document.getElementById('explore-load-more-btn')?.addEventListener('click', () => this.loadMore());
  },

  async search(query) {
    const resultsContainer = document.getElementById('search-results');
    const feedContainer = document.getElementById('explore-feed');

    try {
      const data = await API.searchUsers(query);
      resultsContainer.classList.remove('hidden');
      feedContainer.classList.add('hidden');

      if (data.users.length === 0) {
        resultsContainer.innerHTML = Components.emptyState(
          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>`,
          'No users found',
          `No results for "${Components.escapeHtml(query)}"`
        );
        return;
      }

      resultsContainer.innerHTML = `
        <h2 class="explore-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Search Results
        </h2>
        ${data.users.map(u => Components.userCard(u)).join('')}
      `;

      // Bind follow buttons
      this.bindFollowButtons(resultsContainer);
    } catch (err) {
      Components.toast('Search failed', 'error');
    }
  },

  async loadPosts() {
    try {
      const data = await API.getExplore(this.page);
      const postsContainer = document.getElementById('explore-posts');

      if (this.page === 1) {
        if (data.posts.length === 0) {
          postsContainer.innerHTML = Components.emptyState(
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>`,
            'No posts yet',
            'Be the first to share something on Nexus!'
          );
          return;
        }
        postsContainer.innerHTML = '';
      }

      data.posts.forEach(post => {
        postsContainer.insertAdjacentHTML('beforeend', Components.postCard(post, App.currentUser?.id));
      });

      this.hasMore = data.has_more;
      const loadMoreContainer = document.getElementById('explore-load-more');
      if (this.hasMore) {
        loadMoreContainer.classList.remove('hidden');
      } else {
        loadMoreContainer.classList.add('hidden');
      }
    } catch (err) {
      Components.toast('Failed to load posts', 'error');
    }
  },

  async loadMore() {
    if (!this.hasMore) return;
    this.page++;
    await this.loadPosts();
  },

  bindFollowButtons(container) {
    container.querySelectorAll('[data-action="follow"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const userId = parseInt(btn.dataset.userId);
        const isFollowing = btn.classList.contains('following');
        btn.disabled = true;

        try {
          if (isFollowing) {
            await API.unfollowUser(userId);
            btn.classList.remove('following');
            btn.textContent = 'Follow';
            Components.toast('Unfollowed', 'info');
          } else {
            await API.followUser(userId);
            btn.classList.add('following');
            btn.textContent = 'Following';
            Components.toast('Following!', 'success');
          }
        } catch (err) {
          Components.toast(err.message, 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }
};
