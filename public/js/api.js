/**
 * API Client — Fetch wrapper for all backend communication
 */
const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Network error. Please check your connection.');
      }
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  // ---- Auth ----
  register(data) { return this.post('/auth/register', data); },
  login(data) { return this.post('/auth/login', data); },
  logout() { return this.post('/auth/logout'); },
  getMe() { return this.get('/auth/me'); },

  // ---- Users ----
  getUser(username) { return this.get(`/users/${encodeURIComponent(username)}`); },
  updateProfile(data) { return this.put('/users/profile', data); },
  followUser(id) { return this.post(`/users/${id}/follow`); },
  unfollowUser(id) { return this.delete(`/users/${id}/follow`); },
  getFollowers(id) { return this.get(`/users/${id}/followers`); },
  getFollowing(id) { return this.get(`/users/${id}/following`); },
  searchUsers(query) { return this.get(`/users/search?q=${encodeURIComponent(query)}`); },

  // ---- Posts ----
  getFeed(page = 1) { return this.get(`/posts/feed?page=${page}`); },
  getExplore(page = 1) { return this.get(`/posts/explore?page=${page}`); },
  getUserPosts(userId, page = 1) { return this.get(`/posts/user/${userId}?page=${page}`); },
  createPost(data) { return this.post('/posts', data); },
  deletePost(id) { return this.delete(`/posts/${id}`); },
  likePost(id) { return this.post(`/posts/${id}/like`); },
  unlikePost(id) { return this.delete(`/posts/${id}/like`); },

  // ---- Comments ----
  getComments(postId) { return this.get(`/posts/${postId}/comments`); },
  createComment(postId, data) { return this.post(`/posts/${postId}/comments`, data); },
  deleteComment(id) { return this.delete(`/comments/${id}`); },
};
