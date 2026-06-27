/**
 * Feed View — Home feed with compose + posts from followed users
 */
const FeedView = {
  page: 1,
  hasMore: true,
  loading: false,

  render() {
    return `
      <div class="view-enter">
        <div class="glass-card-static compose-card">
          <div class="compose-area">
            ${Components.avatar(App.currentUser.display_name, App.currentUser.avatar_color)}
            <div style="flex:1;">
              <textarea class="compose-textarea" id="feed-compose-textarea" placeholder="What's on your mind?" maxlength="500"></textarea>
              <div class="compose-footer">
                <span class="char-count" id="feed-char-count">0/500</span>
                <button class="btn btn-primary" id="feed-compose-btn">Post</button>
              </div>
            </div>
          </div>
        </div>
        <div id="feed-posts">
          ${Components.postSkeleton(3)}
        </div>
        <div id="feed-load-more" class="text-center mt-24 hidden">
          <button class="btn btn-secondary" id="load-more-btn">Load More</button>
        </div>
      </div>
    `;
  },

  async mount() {
    this.page = 1;
    this.hasMore = true;

    // Compose handlers
    const textarea = document.getElementById('feed-compose-textarea');
    const charCount = document.getElementById('feed-char-count');
    const composeBtn = document.getElementById('feed-compose-btn');

    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      charCount.textContent = `${len}/500`;
      charCount.className = 'char-count' + (len > 450 ? ' danger' : len > 400 ? ' warning' : '');
    });

    composeBtn.addEventListener('click', () => this.createPost(textarea, composeBtn));
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        this.createPost(textarea, composeBtn);
      }
    });

    // Load feed
    await this.loadPosts();

    // Load more
    document.getElementById('load-more-btn')?.addEventListener('click', () => this.loadMore());
  },

  async createPost(textarea, btn) {
    const content = textarea.value.trim();
    if (!content) return;

    btn.disabled = true;
    btn.textContent = 'Posting...';

    try {
      const data = await API.createPost({ content });
      textarea.value = '';
      document.getElementById('feed-char-count').textContent = '0/500';

      // Prepend new post
      const postsContainer = document.getElementById('feed-posts');
      const temp = document.createElement('div');
      temp.innerHTML = Components.postCard(data.post, App.currentUser.id);
      postsContainer.insertBefore(temp.firstElementChild, postsContainer.firstChild);

      Components.toast('Post published!', 'success');
    } catch (err) {
      Components.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Post';
    }
  },

  async loadPosts() {
    try {
      const data = await API.getFeed(this.page);
      const postsContainer = document.getElementById('feed-posts');

      if (this.page === 1) {
        if (data.posts.length === 0) {
          postsContainer.innerHTML = Components.emptyState(
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>`,
            'Your feed is empty',
            'Follow some users from the Explore page to see their posts here!'
          );
          return;
        }
        postsContainer.innerHTML = '';
      }

      data.posts.forEach(post => {
        postsContainer.insertAdjacentHTML('beforeend', Components.postCard(post, App.currentUser.id));
      });

      this.hasMore = data.has_more;
      const loadMoreContainer = document.getElementById('feed-load-more');
      if (this.hasMore) {
        loadMoreContainer.classList.remove('hidden');
      } else {
        loadMoreContainer.classList.add('hidden');
      }
    } catch (err) {
      Components.toast('Failed to load feed', 'error');
    }
  },

  async loadMore() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    this.page++;
    await this.loadPosts();
    this.loading = false;
  }
};
