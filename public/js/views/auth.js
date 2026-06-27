/**
 * Auth View — Login & Register
 */
const AuthView = {
  currentTab: 'login',

  render() {
    return `
      <div class="auth-container view-enter">
        <div class="auth-header">
          <h1>Welcome to Nexus</h1>
          <p>Connect, share, and engage with your community</p>
        </div>
        <div class="glass-card auth-card">
          <div class="auth-tabs">
            <button class="auth-tab ${this.currentTab === 'login' ? 'active' : ''}" data-tab="login">Sign In</button>
            <button class="auth-tab ${this.currentTab === 'register' ? 'active' : ''}" data-tab="register">Sign Up</button>
          </div>
          <div id="auth-form-container">
            ${this.currentTab === 'login' ? this.loginForm() : this.registerForm()}
          </div>
        </div>
      </div>
    `;
  },

  loginForm() {
    return `
      <form class="auth-form" id="login-form">
        <div class="form-group">
          <label for="login-username">Username</label>
          <input type="text" class="form-input" id="login-username" placeholder="Enter your username" required autocomplete="username">
        </div>
        <div class="form-group">
          <label for="login-password">Password</label>
          <input type="password" class="form-input" id="login-password" placeholder="Enter your password" required autocomplete="current-password">
        </div>
        <div id="login-error" class="form-error hidden"></div>
        <button type="submit" class="btn btn-primary auth-submit-btn" id="login-submit">Sign In</button>
      </form>
    `;
  },

  registerForm() {
    return `
      <form class="auth-form" id="register-form">
        <div class="form-group">
          <label for="reg-display-name">Display Name</label>
          <input type="text" class="form-input" id="reg-display-name" placeholder="Your full name" required maxlength="50">
        </div>
        <div class="form-group">
          <label for="reg-username">Username</label>
          <input type="text" class="form-input" id="reg-username" placeholder="Choose a username" required maxlength="20" pattern="^[a-zA-Z0-9_]+$">
        </div>
        <div class="form-group">
          <label for="reg-email">Email</label>
          <input type="email" class="form-input" id="reg-email" placeholder="your@email.com" required>
        </div>
        <div class="form-group">
          <label for="reg-password">Password</label>
          <input type="password" class="form-input" id="reg-password" placeholder="At least 6 characters" required minlength="6" autocomplete="new-password">
        </div>
        <div id="register-error" class="form-error hidden"></div>
        <button type="submit" class="btn btn-primary auth-submit-btn" id="register-submit">Create Account</button>
      </form>
    `;
  },

  mount() {
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentTab = tab.dataset.tab;
        // Update active tab
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        // Render form
        document.getElementById('auth-form-container').innerHTML =
          this.currentTab === 'login' ? this.loginForm() : this.registerForm();
        this.bindForms();
      });
    });

    this.bindForms();
  },

  bindForms() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('login-submit');
        const errorEl = document.getElementById('login-error');
        btn.disabled = true;
        btn.textContent = 'Signing in...';
        errorEl.classList.add('hidden');

        try {
          const data = await API.login({
            username: document.getElementById('login-username').value.trim(),
            password: document.getElementById('login-password').value,
          });
          App.currentUser = data.user;
          Components.toast('Welcome back, ' + data.user.display_name + '!', 'success');
          App.navigate('#/feed');
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('hidden');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Sign In';
        }
      });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('register-submit');
        const errorEl = document.getElementById('register-error');
        btn.disabled = true;
        btn.textContent = 'Creating account...';
        errorEl.classList.add('hidden');

        try {
          const data = await API.register({
            displayName: document.getElementById('reg-display-name').value.trim(),
            username: document.getElementById('reg-username').value.trim(),
            email: document.getElementById('reg-email').value.trim(),
            password: document.getElementById('reg-password').value,
          });
          App.currentUser = data.user;
          Components.toast('Account created! Welcome to Nexus!', 'success');
          App.navigate('#/feed');
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('hidden');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Create Account';
        }
      });
    }
  }
};
