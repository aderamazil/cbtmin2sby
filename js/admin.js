/**
 * ====================================================================
 * PORTAL ADMIN CBT MIN 2 KOTA SURABAYA
 * ====================================================================
 */

const AdminPortal = {
  users: [],
  currentTab: 'all',

  init: async function() {
    this.bindEvents();
    await this.loadUsers();
    this.updateStats();
    this.renderSettings();
  },

  bindEvents: function() {
    const searchInput = document.getElementById('admin-search-user');
    if (searchInput) {
      searchInput.oninput = () => this.renderUsers();
    }

    const roleFilter = document.getElementById('admin-filter-role');
    if (roleFilter) {
      roleFilter.onchange = (e) => {
        this.currentTab = e.target.value;
        this.renderUsers();
      };
    }
  },

  loadUsers: async function() {
    const res = await API.call('getUsers', {}, 'GET');
    if (res.success && res.data) {
      this.users = res.data;
      this.renderUsers();
      this.updateStats();
    }
  },

  updateStats: async function() {
    const elSiswa = document.getElementById('stat-total-siswa');
    const elGuru = document.getElementById('stat-total-guru');
    const elSoal = document.getElementById('stat-total-soal');
    const elUjian = document.getElementById('stat-total-ujian');

    if (elSiswa) elSiswa.textContent = this.users.filter(u => u.role === 'siswa').length;
    if (elGuru) elGuru.textContent = this.users.filter(u => u.role === 'guru').length;

    // Hitung soal & jadwal
    const resSoal = await API.call('getBankSoal', {}, 'GET');
    if (resSoal.success && elSoal) elSoal.textContent = (resSoal.data || []).length;

    const resJadwal = await API.call('getJadwalUjian', {}, 'GET');
    if (resJadwal.success && elUjian) elUjian.textContent = (resJadwal.data || []).length;
  },

  renderUsers: function() {
    const tbody = document.getElementById('admin-users-table-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('admin-search-user')?.value || '').toLowerCase();
    
    let filtered = this.users.filter(u => {
      const matchRole = (this.currentTab === 'all' || u.role === this.currentTab);
      const matchText = (u.nama || '').toLowerCase().includes(searchTerm) || 
                        (u.username || '').toLowerCase().includes(searchTerm) ||
                        (u.kelas || '').toLowerCase().includes(searchTerm);
      return matchRole && matchText;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-8 text-center text-slate-400">
            <i class="lucide-search text-3xl mx-auto mb-2 opacity-50 block"></i>
            Tidak ada pengguna ditemukan.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((u, idx) => {
      let roleBadge = 'bg-blue-100 text-blue-800';
      if (u.role === 'admin') roleBadge = 'bg-purple-100 text-purple-800';
      if (u.role === 'guru') roleBadge = 'bg-emerald-100 text-emerald-800';
      if (u.role === 'siswa') roleBadge = 'bg-amber-100 text-amber-800';

      const statusBadge = (u.status === 'Nonaktif') 
        ? 'bg-rose-100 text-rose-700' 
        : 'bg-green-100 text-green-700';

      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="px-6 py-3.5 text-sm font-medium text-slate-600">${idx + 1}</td>
          <td class="px-6 py-3.5">
            <div class="font-bold text-slate-800">${u.nama || '-'}</div>
            <div class="text-xs text-slate-400 font-mono">ID: ${u.id}</div>
          </td>
          <td class="px-6 py-3.5">
            <span class="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">${u.username}</span>
          </td>
          <td class="px-6 py-3.5">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${roleBadge}">${u.role}</span>
            ${u.kelas && u.kelas !== '-' ? `<span class="ml-1 text-xs text-slate-500 font-semibold">(${u.kelas})</span>` : ''}
          </td>
          <td class="px-6 py-3.5">
            <span class="px-2 py-0.5 rounded text-xs font-medium ${statusBadge}">${u.status || 'Aktif'}</span>
          </td>
          <td class="px-6 py-3.5 text-right space-x-2">
            <button onclick="AdminPortal.openUserModal('${u.id}')" class="text-indigo-600 hover:text-indigo-800 font-medium text-xs bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded transition">
              Edit
            </button>
            <button onclick="AdminPortal.deleteUser('${u.id}', '${u.nama}')" class="text-rose-600 hover:text-rose-800 font-medium text-xs bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded transition">
              Hapus
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Re-initialize lucide icons if available
    if (window.lucide) lucide.createIcons();
  },

  openUserModal: function(userId = null) {
    const modal = document.getElementById('modal-user-form');
    const titleEl = document.getElementById('modal-user-title');
    const form = document.getElementById('form-user-edit');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('user-edit-id').value = '';

    if (userId) {
      const u = this.users.find(x => x.id === userId);
      if (u) {
        titleEl.textContent = 'Edit Akun Pengguna';
        document.getElementById('user-edit-id').value = u.id;
        document.getElementById('user-edit-nama').value = u.nama || '';
        document.getElementById('user-edit-username').value = u.username || '';
        document.getElementById('user-edit-role').value = u.role || 'siswa';
        document.getElementById('user-edit-kelas').value = u.kelas || '';
        document.getElementById('user-edit-status').value = u.status || 'Aktif';
        document.getElementById('user-edit-password').placeholder = '(Biarkan kosong jika tidak diubah)';
      }
    } else {
      titleEl.textContent = 'Tambah Akun Baru';
      document.getElementById('user-edit-password').placeholder = 'Minimal 6 karakter';
    }

    modal.classList.remove('hidden');
  },

  closeUserModal: function() {
    const modal = document.getElementById('modal-user-form');
    if (modal) modal.classList.add('hidden');
  },

  saveUser: async function(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('user-edit-id').value;
    const nama = document.getElementById('user-edit-nama').value.trim();
    const username = document.getElementById('user-edit-username').value.trim();
    const password = document.getElementById('user-edit-password').value;
    const role = document.getElementById('user-edit-role').value;
    const kelas = document.getElementById('user-edit-kelas').value.trim();
    const status = document.getElementById('user-edit-status').value;

    if (!nama || !username) {
      alert('Nama dan Username wajib diisi!');
      return;
    }

    const payload = { id, nama, username, role, kelas, status };
    if (password) payload.password = password;

    const res = await API.call('saveUser', payload);
    if (res.success) {
      this.closeUserModal();
      await this.loadUsers();
      alert('Data user berhasil disimpan!');
    } else {
      alert('Gagal: ' + (res.message || 'Error'));
    }
  },

  deleteUser: async function(id, nama) {
    if (confirm(`Yakin ingin menghapus akun "${nama}"?`)) {
      const res = await API.call('deleteUser', { id });
      if (res.success) {
        await this.loadUsers();
      } else {
        alert(res.message || 'Gagal menghapus user');
      }
    }
  },

  renderSettings: function() {
    const apiInput = document.getElementById('setting-gas-url');
    const badgeMode = document.getElementById('setting-mode-badge');
    const customGas = localStorage.getItem('cbt_custom_gas_url');

    if (apiInput) {
      apiInput.value = customGas || (isDemoMode() ? '' : CONFIG.API_URL);
    }

    if (badgeMode) {
      if (isDemoMode() && !customGas) {
        badgeMode.innerHTML = `<span class="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold">⚡ Mode Demo Lokal (Data di browser)</span>`;
      } else {
        badgeMode.innerHTML = `<span class="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold">🌐 Terhubung ke Google Apps Script</span>`;
      }
    }
  },

  saveGasUrl: function() {
    const url = document.getElementById('setting-gas-url')?.value.trim();
    if (url) {
      localStorage.setItem('cbt_custom_gas_url', url);
      CONFIG.API_URL = url;
      alert('URL Google Apps Script berhasil disimpan! Aplikasi akan terhubung langsung ke Spreadsheet Anda.');
    } else {
      localStorage.removeItem('cbt_custom_gas_url');
      alert('Kembali ke Mode Demo Lokal.');
    }
    this.renderSettings();
  }
};
