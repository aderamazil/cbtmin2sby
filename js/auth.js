/**
 * ====================================================================
 * AUTENTIKASI & SESI CBT MIN 2 KOTA SURABAYA
 * ====================================================================
 */

const Auth = {
  getCurrentUser: function() {
    try {
      const data = localStorage.getItem('cbt_session');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser: function(user) {
    if (user) {
      localStorage.setItem('cbt_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('cbt_session');
    }
  },

  login: async function(username, password) {
    try {
      const res = await API.call('login', { username, password });
      if (res.success && res.user) {
        this.setCurrentUser(res.user);
        this.applySessionView();
        return { success: true, user: res.user };
      } else {
        return { success: false, message: res.message || 'Login gagal' };
      }
    } catch (err) {
      return { success: false, message: 'Terjadi kesalahan jaringan' };
    }
  },

  logout: function() {
    this.setCurrentUser(null);
    // Hapus sisa ujian yang sedang berlangsung jika ada
    localStorage.removeItem('cbt_current_exam_state');
    window.location.reload();
  },

  applySessionView: function() {
    const user = this.getCurrentUser();
    const loginSection = document.getElementById('section-login');
    const adminSection = document.getElementById('section-admin');
    const guruSection = document.getElementById('section-guru');
    const siswaSection = document.getElementById('section-siswa');
    const examSection = document.getElementById('section-exam-active');
    const navbarUser = document.getElementById('navbar-user-info');

    // Sembunyikan semua section terlebih dahulu
    [loginSection, adminSection, guruSection, siswaSection, examSection].forEach(el => {
      if (el) el.classList.add('hidden');
    });

    if (!user) {
      if (loginSection) loginSection.classList.remove('hidden');
      if (navbarUser) navbarUser.classList.add('hidden');
      return;
    }

    // Tampilkan info user di navbar
    if (navbarUser) {
      navbarUser.classList.remove('hidden');
      const nameEl = document.getElementById('nav-user-name');
      const roleEl = document.getElementById('nav-user-role');
      if (nameEl) nameEl.textContent = user.nama || user.username;
      if (roleEl) {
        let badgeColor = 'bg-blue-100 text-blue-800';
        if (user.role === 'admin') badgeColor = 'bg-purple-100 text-purple-800';
        if (user.role === 'guru') badgeColor = 'bg-emerald-100 text-emerald-800';
        if (user.role === 'siswa') badgeColor = 'bg-amber-100 text-amber-800';

        roleEl.className = `px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${badgeColor}`;
        roleEl.textContent = user.role + (user.kelas && user.kelas !== '-' ? ` (${user.kelas})` : '');
      }
    }

    // Cek apakah siswa punya ujian yang belum selesai (auto restore)
    const savedExamState = localStorage.getItem('cbt_current_exam_state');
    if (user.role === 'siswa' && savedExamState) {
      try {
        const state = JSON.parse(savedExamState);
        if (state && state.id_siswa === user.id && state.isActive) {
          UjianEngine.resumeExam(state);
          return;
        }
      } catch (e) {
        localStorage.removeItem('cbt_current_exam_state');
      }
    }

    // Route berdasarkan Role
    if (user.role === 'admin') {
      if (adminSection) adminSection.classList.remove('hidden');
      AdminPortal.init();
    } else if (user.role === 'guru') {
      if (guruSection) guruSection.classList.remove('hidden');
      GuruPortal.init();
    } else if (user.role === 'siswa') {
      if (siswaSection) siswaSection.classList.remove('hidden');
      SiswaPortal.init();
    }
  }
};
