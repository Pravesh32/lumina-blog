document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        users: JSON.parse(localStorage.getItem('lumina_users')) || [],
        posts: JSON.parse(localStorage.getItem('lumina_posts')) || [],
        currentUser: JSON.parse(localStorage.getItem('lumina_session')) || null,
        theme: localStorage.getItem('lumina_theme') || 'light'
    };

    // DOM Elements
    const els = {
        body: document.body,
        themeBtn: document.getElementById('theme-toggle'),
        authBtn: document.getElementById('auth-btn'),
        userMenu: document.getElementById('user-menu'),
        userAvatar: document.getElementById('user-avatar'),
        userUsername: document.getElementById('user-username'),
        logoutBtn: document.getElementById('logout-btn'),
        createSection: document.getElementById('create-post-section'),
        postForm: document.getElementById('post-form'),
        postsList: document.getElementById('posts-list'),
        postCount: document.getElementById('post-count'),
        emptyState: document.getElementById('empty-state'),
        searchInput: document.getElementById('search-input'),
        authModal: document.getElementById('auth-modal'),
        editModal: document.getElementById('edit-modal'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        editForm: document.getElementById('edit-form'),
        toastContainer: document.getElementById('toast-container')
    };

    // Initialize
    function init() {
        applyTheme();
        updateAuthUI();
        renderPosts();
        setupEventListeners();
    }

    // Theme
    function applyTheme() {
        els.body.setAttribute('data-theme', state.theme);
        els.themeBtn.textContent = state.theme === 'light' ? '🌙' : '☀️';
    }
    function toggleTheme() {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('lumina_theme', state.theme);
        applyTheme();
    }

    // Auth
    function updateAuthUI() {
        if (state.currentUser) {
            els.authBtn.classList.add('hidden');
            els.userMenu.classList.remove('hidden');
            els.createSection.classList.remove('hidden');
            els.userUsername.textContent = state.currentUser.username;
            els.userAvatar.textContent = state.currentUser.username.charAt(0).toUpperCase();
        } else {
            els.authBtn.classList.remove('hidden');
            els.userMenu.classList.add('hidden');
            els.createSection.classList.add('hidden');
        }
    }

    function handleAuth(e) {
        e.preventDefault();
        const isLogin = e.target.id === 'login-form';
        const username = isLogin ? document.getElementById('login-username').value.trim() : document.getElementById('reg-username').value.trim();
        const password = isLogin ? document.getElementById('login-password').value : document.getElementById('reg-password').value;

        if (isLogin) {
            const user = state.users.find(u => u.username === username && u.password === password);
            if (user) {
                state.currentUser = { id: user.id, username: user.username };
                localStorage.setItem('lumina_session', JSON.stringify(state.currentUser));
                updateAuthUI();
                closeModal(els.authModal);
                showToast(`Welcome back, ${username}! 👋`);
            } else {
                showToast('Invalid credentials', 'error');
            }
        } else {
            if (state.users.some(u => u.username === username)) {
                showToast('Username already exists', 'error');
                return;
            }
            const newUser = { id: Date.now().toString(), username, password };
            state.users.push(newUser);
            saveUsers();
            state.currentUser = { id: newUser.id, username: newUser.username };
            localStorage.setItem('lumina_session', JSON.stringify(state.currentUser));
            updateAuthUI();
            closeModal(els.authModal);
            showToast(`Account created! Welcome, ${username} 🎉`);
        }
    }

    function logout() {
        state.currentUser = null;
        localStorage.removeItem('lumina_session');
        updateAuthUI();
        showToast('Logged out successfully');
    }

    // Posts
    function saveUsers() { localStorage.setItem('lumina_users', JSON.stringify(state.users)); }
    function savePosts() { localStorage.setItem('lumina_posts', JSON.stringify(state.posts)); }

    function renderPosts() {
        const query = els.searchInput.value.toLowerCase();
        let filtered = state.posts;
        if (query) {
            filtered = state.posts.filter(p => 
                p.title.toLowerCase().includes(query) || 
                p.content.toLowerCase().includes(query) ||
                p.author.toLowerCase().includes(query)
            );
        }

        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        els.postsList.innerHTML = '';
        els.postCount.textContent = filtered.length;

        if (filtered.length === 0) {
            els.emptyState.classList.remove('hidden');
            return;
        }
        els.emptyState.classList.add('hidden');

        filtered.forEach(post => {
            const isAuthor = state.currentUser && state.currentUser.id === post.authorId;
            const isLiked = state.currentUser && post.likes.includes(state.currentUser.id);
            const date = new Date(post.date);
            const timeAgo = getTimeAgo(date);

            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <div class="post-header">
                    <div class="avatar">${post.author.charAt(0).toUpperCase()}</div>
                    <div class="post-meta">
                        <strong>${escapeHtml(post.author)}</strong> • ${timeAgo}
                    </div>
                </div>
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                <div class="post-content">${escapeHtml(post.content)}</div>
                <div class="post-actions">
                    <button class="action-btn like-btn ${isLiked ? 'active' : ''}" data-id="${post.id}">
                        ❤️ ${post.likes.length}
                    </button>
                    ${isAuthor ? `
                        <button class="action-btn edit-btn" data-id="${post.id}">✏️ Edit</button>
                        <button class="action-btn delete-btn" data-id="${post.id}">🗑️ Delete</button>
                    ` : ''}
                </div>
            `;
            els.postsList.appendChild(card);
        });
    }

    function handleCreatePost(e) {
        e.preventDefault();
        const title = document.getElementById('post-title').value.trim();
        const content = document.getElementById('post-content').value.trim();
        if (!state.currentUser) return showToast('Please sign in to post', 'error');

        const newPost = {
            id: Date.now().toString(),
            authorId: state.currentUser.id,
            author: state.currentUser.username,
            title,
            content,
            likes: [],
            date: new Date().toISOString()
        };

        state.posts.push(newPost);
        savePosts();
        renderPosts();
        e.target.reset();
        showToast('Post published! 🚀');
    }

    function handleEditPost(e) {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const title = document.getElementById('edit-title').value.trim();
        const content = document.getElementById('edit-content').value.trim();
        const post = state.posts.find(p => p.id === id);
        if (post && post.authorId === state.currentUser.id) {
            post.title = title;
            post.content = content;
            post.date = new Date().toISOString();
            savePosts();
            renderPosts();
            closeModal(els.editModal);
            showToast('Post updated! ✅');
        }
    }

    function handlePostActions(e) {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;
        const id = btn.dataset.id;

        if (btn.classList.contains('like-btn')) {
            if (!state.currentUser) return showToast('Sign in to like', 'error');
            const post = state.posts.find(p => p.id === id);
            const idx = post.likes.indexOf(state.currentUser.id);
            idx > -1 ? post.likes.splice(idx, 1) : post.likes.push(state.currentUser.id);
            savePosts();
            renderPosts();
        } else if (btn.classList.contains('delete-btn')) {
            if (confirm('Delete this post permanently?')) {
                state.posts = state.posts.filter(p => p.id !== id);
                savePosts();
                renderPosts();
                showToast('Post deleted 🗑️');
            }
        } else if (btn.classList.contains('edit-btn')) {
            const post = state.posts.find(p => p.id === id);
            document.getElementById('edit-id').value = id;
            document.getElementById('edit-title').value = post.title;
            document.getElementById('edit-content').value = post.content;
            openModal(els.editModal);
        }
    }

    // Modals & UI
    function openModal(modal) { modal.classList.remove('hidden'); }
    function closeModal(modal) { modal.classList.add('hidden'); }
    function showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '✅'}</span> ${msg}`;
        els.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Utilities
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'week', seconds: 604800 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 }
        ];
        for (let i = 0; i < intervals.length; i++) {
            const count = Math.floor(seconds / intervals[i].seconds);
            if (count > 0) return `${count} ${intervals[i].label}${count > 1 ? 's' : ''} ago`;
        }
        return 'Just now';
    }

    // Event Listeners
    function setupEventListeners() {
        els.themeBtn.addEventListener('click', toggleTheme);
        els.authBtn.addEventListener('click', () => openModal(els.authModal));
        els.logoutBtn.addEventListener('click', logout);
        els.postForm.addEventListener('submit', handleCreatePost);
        els.editForm.addEventListener('submit', handleEditPost);
        els.postsList.addEventListener('click', handlePostActions);
        els.searchInput.addEventListener('input', renderPosts);

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', e => closeModal(e.target.closest('.modal')));
        });
        document.querySelectorAll('.modal').forEach(m => {
            m.addEventListener('click', e => { if (e.target === m) closeModal(m); });
        });

        // Auth Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                els.loginForm.classList.toggle('hidden', tab !== 'login');
                els.registerForm.classList.toggle('hidden', tab !== 'register');
            });
        });

        els.loginForm.addEventListener('submit', handleAuth);
        els.registerForm.addEventListener('submit', handleAuth);
    }

    init();
});