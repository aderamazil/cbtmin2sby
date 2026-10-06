/**
 * ====================================================================
 * PORTAL GURU CBT MIN 2 KOTA SURABAYA
 * ====================================================================
 * Mengelola 4 Jenis Soal, Jadwal Ujian, dan Rekapitulasi Nilai Siswa
 */

const GuruPortal = {
  activeTab: 'soal', // 'soal' | 'jadwal' | 'nilai'
  bankSoal: [],
  jadwalList: [],
  hasilList: [],
  editingSoalId: null,

  init: async function() {
    this.bindEvents();
    this.switchTab('soal');
    await this.loadAll();
  },

  bindEvents: function() {
    // Dynamic question type changer in Modal Soal
    const tipeSelect = document.getElementById('soal-tipe-select');
    if (tipeSelect) {
      tipeSelect.onchange = (e) => this.renderQuestionBuilderFields(e.target.value);
    }
  },

  switchTab: function(tabName) {
    this.activeTab = tabName;
    ['soal', 'jadwal', 'nilai'].forEach(t => {
      const btn = document.getElementById(`guru-tab-btn-${t}`);
      const sec = document.getElementById(`guru-sec-${t}`);
      if (btn && sec) {
        if (t === tabName) {
          btn.className = "flex items-center gap-2 px-4 py-2.5 border-b-2 border-emerald-600 text-emerald-700 font-bold text-sm";
          sec.classList.remove('hidden');
        } else {
          btn.className = "flex items-center gap-2 px-4 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-700 font-medium text-sm";
          sec.classList.add('hidden');
        }
      }
    });

    if (tabName === 'soal') this.renderBankSoal();
    if (tabName === 'jadwal') this.renderJadwalUjian();
    if (tabName === 'nilai') this.renderRekapNilai();
  },

  loadAll: async function() {
    const resSoal = await API.call('getBankSoal', {}, 'GET');
    if (resSoal.success) this.bankSoal = resSoal.data || [];

    const resJadwal = await API.call('getJadwalUjian', {}, 'GET');
    if (resJadwal.success) this.jadwalList = resJadwal.data || [];

    const resHasil = await API.call('getHasilUjian', {}, 'GET');
    if (resHasil.success) this.hasilList = resHasil.data || [];

    this.renderBankSoal();
    this.renderJadwalUjian();
    this.renderRekapNilai();
  },

  // ==================================================================
  // 1. BANK SOAL (PG, PG Kompleks, Benar/Salah, Menjodohkan)
  // ==================================================================
  renderBankSoal: function() {
    const container = document.getElementById('guru-soal-list');
    if (!container) return;

    if (this.bankSoal.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-10 text-center border border-slate-200">
          <p class="text-slate-500 mb-4">Belum ada soal dibuat. Klik tombol di bawah untuk membuat soal baru!</p>
          <button onclick="GuruPortal.openSoalModal()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm">
            + Buat Soal Pertama
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.bankSoal.map((soal, idx) => {
      let badgeColor = 'bg-blue-100 text-blue-800';
      let labelTipe = 'Pilihan Ganda';
      if (soal.tipe === 'PG_KOMPLEKS') {
        badgeColor = 'bg-purple-100 text-purple-800';
        labelTipe = 'PG Kompleks';
      } else if (soal.tipe === 'BENAR_SALAH') {
        badgeColor = 'bg-amber-100 text-amber-800';
        labelTipe = 'Benar / Salah';
      } else if (soal.tipe === 'MENJODOHKAN') {
        badgeColor = 'bg-teal-100 text-teal-800';
        labelTipe = 'Menjodohkan';
      }

      return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition">
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-800">#${idx + 1}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeColor}">${labelTipe}</span>
              <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">${soal.mata_pelajaran} (Kelas ${soal.kelas})</span>
              <span class="text-xs text-slate-400">Bobot: ${soal.bobot || 1}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="GuruPortal.openSoalModal('${soal.id}')" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded font-medium">Edit</button>
              <button onclick="GuruPortal.deleteSoal('${soal.id}')" class="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded font-medium">Hapus</button>
            </div>
          </div>

          <div class="text-slate-800 font-medium mb-3 text-sm leading-relaxed">${soal.pertanyaan}</div>

          <!-- Preview Opsi & Kunci -->
          <div class="bg-slate-50 rounded-lg p-3 text-xs border border-slate-100">
            ${this.renderSoalPreviewSnippet(soal)}
          </div>
        </div>
      `;
    }).join('');
  },

  renderSoalPreviewSnippet: function(soal) {
    if (soal.tipe === 'PG') {
      const opsi = Array.isArray(soal.opsi_data) ? soal.opsi_data : [];
      return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          ${opsi.map((op, i) => {
            const isKey = (op === soal.kunci_jawaban);
            return `
              <div class="flex items-center gap-2 ${isKey ? 'font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded' : 'text-slate-600'}">
                <span class="w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${isKey ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}">
                  ${String.fromCharCode(65 + i)}
                </span>
                <span>${op}</span>
                ${isKey ? '<span class="text-[10px] ml-auto bg-emerald-200 text-emerald-800 px-1 rounded">Kunci</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (soal.tipe === 'PG_KOMPLEKS') {
      const opsi = Array.isArray(soal.opsi_data) ? soal.opsi_data : [];
      const keys = Array.isArray(soal.kunci_jawaban) ? soal.kunci_jawaban : [];
      return `
        <div class="space-y-1">
          <div class="text-slate-500 font-semibold mb-1">Opsi Checklist:</div>
          ${opsi.map(op => {
            const isKey = keys.includes(op);
            return `
              <div class="flex items-center gap-2 ${isKey ? 'font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded' : 'text-slate-600'}">
                <span class="w-3.5 h-3.5 rounded text-[10px] flex items-center justify-center ${isKey ? 'bg-purple-600 text-white' : 'border border-slate-300'}">✓</span>
                <span>${op}</span>
                ${isKey ? '<span class="text-[10px] ml-auto bg-purple-200 text-purple-800 px-1 rounded">Kunci</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (soal.tipe === 'BENAR_SALAH') {
      const items = Array.isArray(soal.opsi_data) ? soal.opsi_data : [];
      const keys = soal.kunci_jawaban || {};
      return `
        <div class="space-y-1">
          <div class="text-slate-500 font-semibold mb-1">Pernyataan & Kunci:</div>
          ${items.map((item, idx) => `
            <div class="flex items-center justify-between text-slate-700 border-b border-slate-100 py-0.5">
              <span>• ${item.text || item}</span>
              <span class="font-bold px-2 py-0.5 rounded text-[11px] ${keys[idx] === 'Benar' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                ${keys[idx] || '-'}
              </span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (soal.tipe === 'MENJODOHKAN') {
      const data = soal.opsi_data || { kiri: [], kanan: [] };
      const keys = soal.kunci_jawaban || {};
      return `
        <div class="space-y-1">
          <div class="text-slate-500 font-semibold mb-1">Pasangan Jodoh:</div>
          ${(data.kiri || []).map(k => `
            <div class="flex items-center gap-2 text-slate-700">
              <span class="font-medium text-slate-800">${k}</span>
              <span class="text-slate-400">➔</span>
              <span class="bg-teal-50 text-teal-800 px-2 py-0.5 rounded font-bold">${keys[k] || '-'}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    return '';
  },

  openSoalModal: function(soalId = null) {
    this.editingSoalId = soalId;
    const modal = document.getElementById('modal-soal-form');
    const titleEl = document.getElementById('modal-soal-title');
    if (!modal) return;

    const tipeSelect = document.getElementById('soal-tipe-select');
    const mapelInput = document.getElementById('soal-mapel-input');
    const kelasInput = document.getElementById('soal-kelas-input');
    const bobotInput = document.getElementById('soal-bobot-input');
    const teksInput = document.getElementById('soal-pertanyaan-input');

    if (soalId) {
      titleEl.textContent = 'Edit Soal';
      const s = this.bankSoal.find(x => x.id === soalId);
      if (s) {
        tipeSelect.value = s.tipe;
        mapelInput.value = s.mata_pelajaran;
        kelasInput.value = s.kelas;
        bobotInput.value = s.bobot || 10;
        teksInput.value = s.pertanyaan;
        this.renderQuestionBuilderFields(s.tipe, s);
      }
    } else {
      titleEl.textContent = 'Buat Soal Baru';
      teksInput.value = '';
      bobotInput.value = '10';
      this.renderQuestionBuilderFields(tipeSelect.value);
    }

    modal.classList.remove('hidden');
  },

  closeSoalModal: function() {
    const modal = document.getElementById('modal-soal-form');
    if (modal) modal.classList.add('hidden');
  },

  renderQuestionBuilderFields: function(tipe, existingData = null) {
    const container = document.getElementById('soal-dynamic-builder-container');
    if (!container) return;

    if (tipe === 'PG') {
      const opsi = (existingData && Array.isArray(existingData.opsi_data)) ? existingData.opsi_data : ['', '', '', ''];
      const kunci = existingData ? existingData.kunci_jawaban : '';

      container.innerHTML = `
        <div class="space-y-3">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide">Pilihan Jawaban (Pilih radio button untuk Kunci Benar)</label>
          ${[0, 1, 2, 3].map(i => {
            const letter = String.fromCharCode(65 + i);
            const val = opsi[i] || '';
            const isChecked = (val && val === kunci);
            return `
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-1.5 cursor-pointer text-sm font-bold text-slate-700">
                  <input type="radio" name="pg-kunci" value="${i}" ${isChecked ? 'checked' : ''} class="w-4 h-4 text-emerald-600 focus:ring-emerald-500">
                  <span>${letter}.</span>
                </label>
                <input type="text" id="pg-opsi-${i}" value="${val.replace(/"/g, '&quot;')}" placeholder="Pilihan jawaban ${letter}" class="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500">
              </div>
            `;
          }).join('')}
        </div>
      `;
    } 
    else if (tipe === 'PG_KOMPLEKS') {
      const opsi = (existingData && Array.isArray(existingData.opsi_data)) ? existingData.opsi_data : ['', '', '', ''];
      const keys = (existingData && Array.isArray(existingData.kunci_jawaban)) ? existingData.kunci_jawaban : [];

      container.innerHTML = `
        <div class="space-y-3">
          <label class="block text-xs font-bold text-purple-800 uppercase tracking-wide">Pilihan Checklist (Centang kotak untuk Jawaban Benar - Lebih dari 1)</label>
          ${[0, 1, 2, 3].map(i => {
            const letter = String.fromCharCode(65 + i);
            const val = opsi[i] || '';
            const isChecked = keys.includes(val);
            return `
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-1.5 cursor-pointer text-sm font-bold text-purple-700">
                  <input type="checkbox" name="pgk-kunci" value="${i}" ${isChecked ? 'checked' : ''} class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500">
                  <span>${letter}.</span>
                </label>
                <input type="text" id="pgk-opsi-${i}" value="${val.replace(/"/g, '&quot;')}" placeholder="Pernyataan opsi ${letter}" class="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500">
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
    else if (tipe === 'BENAR_SALAH') {
      const items = (existingData && Array.isArray(existingData.opsi_data)) ? existingData.opsi_data : [
        { id: 0, text: '' }, { id: 1, text: '' }
      ];
      const keys = (existingData && existingData.kunci_jawaban) ? existingData.kunci_jawaban : {};

      container.innerHTML = `
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <label class="block text-xs font-bold text-amber-800 uppercase tracking-wide">Daftar Pernyataan & Kunci (Benar / Salah)</label>
            <button type="button" onclick="GuruPortal.addBenarSalahRow()" class="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold px-2.5 py-1 rounded">
              + Tambah Baris
            </button>
          </div>
          <div id="bs-rows-container" class="space-y-2">
            ${items.map((item, idx) => `
              <div class="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 bs-row-item">
                <input type="text" class="flex-1 text-sm border border-slate-300 rounded px-2.5 py-1.5 bs-text-input" value="${(item.text || item).replace(/"/g, '&quot;')}" placeholder="Pernyataan ${idx + 1}">
                <select class="text-xs border border-slate-300 rounded px-2 py-1.5 font-bold bs-val-select">
                  <option value="Benar" ${keys[idx] === 'Benar' ? 'selected' : ''}>Benar</option>
                  <option value="Salah" ${keys[idx] === 'Salah' ? 'selected' : ''}>Salah</option>
                </select>
                <button type="button" onclick="this.closest('.bs-row-item').remove()" class="text-rose-500 hover:text-rose-700 text-xs px-1 font-bold">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    else if (tipe === 'MENJODOHKAN') {
      const data = (existingData && existingData.opsi_data) ? existingData.opsi_data : {
        kiri: ['', ''],
        kanan: ['', '']
      };
      const pairs = (data.kiri || []).map((k, idx) => ({
        kiri: k,
        kanan: (existingData && existingData.kunci_jawaban) ? existingData.kunci_jawaban[k] || data.kanan[idx] || '' : data.kanan[idx] || ''
      }));

      container.innerHTML = `
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <label class="block text-xs font-bold text-teal-800 uppercase tracking-wide">Pasangan Menjodohkan (Kiri ➔ Kanan)</label>
            <button type="button" onclick="GuruPortal.addMatchRow()" class="text-xs bg-teal-100 hover:bg-teal-200 text-teal-900 font-semibold px-2.5 py-1 rounded">
              + Tambah Pasangan
            </button>
          </div>
          <div id="match-rows-container" class="space-y-2">
            ${pairs.map((p, idx) => `
              <div class="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 match-row-item">
                <input type="text" class="flex-1 text-sm border border-slate-300 rounded px-2.5 py-1.5 match-left-input" value="${p.kiri.replace(/"/g, '&quot;')}" placeholder="Pernyataan/Istilah ${idx + 1}">
                <span class="text-slate-400 font-bold">➔</span>
                <input type="text" class="flex-1 text-sm border border-slate-300 rounded px-2.5 py-1.5 match-right-input" value="${p.kanan.replace(/"/g, '&quot;')}" placeholder="Pasangan Jawaban Cocok">
                <button type="button" onclick="this.closest('.match-row-item').remove()" class="text-rose-500 hover:text-rose-700 text-xs px-1 font-bold">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  },

  addBenarSalahRow: function() {
    const container = document.getElementById('bs-rows-container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = "flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 bs-row-item";
    div.innerHTML = `
      <input type="text" class="flex-1 text-sm border border-slate-300 rounded px-2.5 py-1.5 bs-text-input" placeholder="Tulis pernyataan baru...">
      <select class="text-xs border border-slate-300 rounded px-2 py-1.5 font-bold bs-val-select">
        <option value="Benar">Benar</option>
        <option value="Salah">Salah</option>
      </select>
      <button type="button" onclick="this.closest('.bs-row-item').remove()" class="text-rose-500 hover:text-rose-700 text-xs px-1 font-bold">✕</button>
    `;
    container.appendChild(div);
  },

  addMatchRow: function() {
    const container = document.getElementById('match-rows-container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = "flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 match-row-item";
    div.innerHTML = `
      <input type="text" class="flex-1 text-sm border border-slate-300 rounded px-2.5 py-1.5 match-left-input" placeholder="Pernyataan / Istilah Kiri">
      <span class="text-slate-400 font-bold">➔</span>
      <input type="text" class="flex-1 text-sm border border-slate-300 rounded px-2.5 py-1.5 match-right-input" placeholder="Jawaban Pasangan Kanan">
      <button type="button" onclick="this.closest('.match-row-item').remove()" class="text-rose-500 hover:text-rose-700 text-xs px-1 font-bold">✕</button>
    `;
    container.appendChild(div);
  },

  saveSoalForm: async function(e) {
    if (e) e.preventDefault();
    const tipe = document.getElementById('soal-tipe-select').value;
    const mapel = document.getElementById('soal-mapel-input').value.trim();
    const kelas = document.getElementById('soal-kelas-input').value.trim();
    const bobot = Number(document.getElementById('soal-bobot-input').value) || 10;
    const pertanyaan = document.getElementById('soal-pertanyaan-input').value.trim();
    const user = Auth.getCurrentUser();

    if (!pertanyaan) {
      alert('Pertanyaan tidak boleh kosong!');
      return;
    }

    let opsi_data = [];
    let kunci_jawaban = null;

    if (tipe === 'PG') {
      const opts = [0, 1, 2, 3].map(i => document.getElementById(`pg-opsi-${i}`)?.value.trim() || '').filter(Boolean);
      if (opts.length < 2) return alert('Isi minimal 2 pilihan jawaban!');
      const selectedRadio = document.querySelector('input[name="pg-kunci"]:checked');
      if (!selectedRadio) return alert('Pilih salah satu kunci jawaban benar!');
      const keyIndex = Number(selectedRadio.value);
      kunci_jawaban = document.getElementById(`pg-opsi-${keyIndex}`)?.value.trim();
      opsi_data = opts;
    } 
    else if (tipe === 'PG_KOMPLEKS') {
      const opts = [0, 1, 2, 3].map(i => document.getElementById(`pgk-opsi-${i}`)?.value.trim() || '').filter(Boolean);
      if (opts.length < 2) return alert('Isi minimal 2 pilihan pernyataan!');
      const checkedBoxes = Array.from(document.querySelectorAll('input[name="pgk-kunci"]:checked'));
      if (checkedBoxes.length < 1) return alert('Centang minimal 1 jawaban benar!');
      kunci_jawaban = checkedBoxes.map(cb => document.getElementById(`pgk-opsi-${cb.value}`)?.value.trim()).filter(Boolean);
      opsi_data = opts;
    }
    else if (tipe === 'BENAR_SALAH') {
      const rows = document.querySelectorAll('.bs-row-item');
      if (rows.length < 1) return alert('Tambahkan minimal 1 pernyataan Benar/Salah!');
      opsi_data = [];
      kunci_jawaban = {};
      rows.forEach((r, idx) => {
        const text = r.querySelector('.bs-text-input')?.value.trim();
        const val = r.querySelector('.bs-val-select')?.value;
        if (text) {
          opsi_data.push({ id: idx, text: text });
          kunci_jawaban[String(idx)] = val;
        }
      });
    }
    else if (tipe === 'MENJODOHKAN') {
      const rows = document.querySelectorAll('.match-row-item');
      if (rows.length < 1) return alert('Tambahkan minimal 1 pasangan menjodohkan!');
      const kiri = [];
      const kanan = [];
      kunci_jawaban = {};
      rows.forEach(r => {
        const left = r.querySelector('.match-left-input')?.value.trim();
        const right = r.querySelector('.match-right-input')?.value.trim();
        if (left && right) {
          kiri.push(left);
          kanan.push(right);
          kunci_jawaban[left] = right;
        }
      });
      opsi_data = { kiri, kanan };
    }

    const payload = {
      id: this.editingSoalId,
      mata_pelajaran: mapel,
      kelas: kelas,
      tipe: tipe,
      pertanyaan: pertanyaan,
      opsi_data: opsi_data,
      kunci_jawaban: kunci_jawaban,
      bobot: bobot,
      created_by: user ? user.username : 'guru'
    };

    const res = await API.call('saveSoal', payload);
    if (res.success) {
      this.closeSoalModal();
      await this.loadAll();
      alert('Soal berhasil disimpan!');
    } else {
      alert('Gagal: ' + res.message);
    }
  },

  deleteSoal: async function(id) {
    if (confirm('Yakin ingin menghapus soal ini?')) {
      const res = await API.call('deleteSoal', { id });
      if (res.success) {
        await this.loadAll();
      } else {
        alert(res.message || 'Gagal menghapus soal');
      }
    }
  },

  // ==================================================================
  // 2. JADWAL UJIAN
  // ==================================================================
  renderJadwalUjian: function() {
    const container = document.getElementById('guru-jadwal-list');
    if (!container) return;

    if (this.jadwalList.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-10 text-center border border-slate-200">
          <p class="text-slate-500 mb-4">Belum ada sesi ujian dibuat.</p>
          <button onclick="GuruPortal.openJadwalModal()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm">
            + Jadwalkan Ujian Baru
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.jadwalList.map(j => {
      const countSoal = (j.soal_ids || []).length;
      return `
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div class="flex items-start justify-between gap-4 mb-2">
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-slate-800 text-base">${j.judul}</h4>
                <span class="px-2 py-0.5 rounded text-xs font-bold ${j.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                  ${j.status}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-1">${j.mata_pelajaran} • Kelas ${j.kelas} • Durasi: <b>${j.durasi} Menit</b></p>
            </div>
            <div class="text-right">
              <span class="text-xs text-slate-400 block mb-1">Token Ujian:</span>
              <span class="bg-amber-100 text-amber-900 border border-amber-300 font-mono font-black text-sm px-3 py-1 rounded tracking-wider">
                ${j.token}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-slate-100 pt-3 mt-3 text-xs text-slate-500">
            <div><i class="lucide-file-text"></i> Total Soal Terpilih: <b>${countSoal} butir</b></div>
            <div class="space-x-2">
              <button onclick="GuruPortal.deleteJadwal('${j.id}')" class="text-rose-600 hover:underline">Hapus Sesi</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openJadwalModal: function() {
    const modal = document.getElementById('modal-jadwal-form');
    if (!modal) return;

    // Render checkbox pilihan soal dari bankSoal
    const containerSoal = document.getElementById('jadwal-soal-selector');
    if (containerSoal) {
      if (this.bankSoal.length === 0) {
        containerSoal.innerHTML = '<div class="text-xs text-rose-500">Belum ada bank soal. Buat soal terlebih dahulu!</div>';
      } else {
        containerSoal.innerHTML = this.bankSoal.map(s => `
          <label class="flex items-start gap-2 p-2 hover:bg-slate-50 rounded border border-slate-200 cursor-pointer">
            <input type="checkbox" name="jadwal-soal-pick" value="${s.id}" checked class="mt-1 w-4 h-4 text-emerald-600 rounded">
            <div class="text-xs">
              <span class="font-bold text-slate-700">[${s.tipe}]</span>
              <span class="text-slate-600">${s.pertanyaan.substring(0, 70)}...</span>
            </div>
          </label>
        `).join('');
      }
    }

    // Auto token random
    const tokenInput = document.getElementById('jadwal-token-input');
    if (tokenInput && !tokenInput.value) {
      tokenInput.value = 'MIN2' + Math.random().toString(36).substr(2, 4).toUpperCase();
    }

    modal.classList.remove('hidden');
  },

  closeJadwalModal: function() {
    const modal = document.getElementById('modal-jadwal-form');
    if (modal) modal.classList.add('hidden');
  },

  saveJadwalForm: async function(e) {
    if (e) e.preventDefault();
    const judul = document.getElementById('jadwal-judul-input').value.trim();
    const mapel = document.getElementById('jadwal-mapel-input').value.trim();
    const kelas = document.getElementById('jadwal-kelas-input').value.trim();
    const durasi = Number(document.getElementById('jadwal-durasi-input').value) || 60;
    const token = document.getElementById('jadwal-token-input').value.trim().toUpperCase();
    const user = Auth.getCurrentUser();

    const checkedBoxes = Array.from(document.querySelectorAll('input[name="jadwal-soal-pick"]:checked'));
    const soal_ids = checkedBoxes.map(cb => cb.value);

    if (!judul || !token) {
      alert('Judul dan Token wajib diisi!');
      return;
    }
    if (soal_ids.length === 0) {
      alert('Pilih minimal satu soal untuk sesi ujian!');
      return;
    }

    const payload = {
      judul,
      mata_pelajaran: mapel,
      kelas,
      durasi,
      token,
      status: 'Aktif',
      soal_ids,
      created_by: user ? user.username : 'guru'
    };

    const res = await API.call('saveJadwalUjian', payload);
    if (res.success) {
      this.closeJadwalModal();
      await this.loadAll();
      alert('Jadwal ujian berhasil diaktifkan!');
    } else {
      alert('Gagal: ' + res.message);
    }
  },

  deleteJadwal: async function(id) {
    if (confirm('Yakin ingin menghapus jadwal ujian ini?')) {
      const res = await API.call('deleteJadwalUjian', { id });
      if (res.success) {
        await this.loadAll();
      }
    }
  },

  // ==================================================================
  // 3. REKAP NILAI & EKSPOR EXCEL
  // ==================================================================
  renderRekapNilai: function() {
    const tbody = document.getElementById('guru-rekap-table-body');
    if (!tbody) return;

    if (this.hasilList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-8 text-center text-slate-400">
            Belum ada data nilai ujian siswa yang masuk.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.hasilList.map((h, idx) => {
      let scoreColor = 'text-emerald-700 bg-emerald-50';
      if (h.nilai < 70) scoreColor = 'text-rose-700 bg-rose-50';

      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-sm">
          <td class="px-5 py-3 font-medium text-slate-500">${idx + 1}</td>
          <td class="px-5 py-3 font-bold text-slate-800">${h.nama_siswa}</td>
          <td class="px-5 py-3 text-slate-600 font-semibold">${h.kelas}</td>
          <td class="px-5 py-3 text-center">
            <span class="px-3 py-1 rounded-full font-black text-sm ${scoreColor}">${h.nilai}</span>
          </td>
          <td class="px-5 py-3 text-center text-xs text-slate-600">
            <span class="text-emerald-600 font-bold">${h.benar || 0} Benar</span> / 
            <span class="text-rose-600 font-bold">${h.salah || 0} Salah</span>
          </td>
          <td class="px-5 py-3 text-center">
            ${h.pelanggaran > 0 ? `<span class="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-bold">⚠️ ${h.pelanggaran}x Pindah Tab</span>` : `<span class="text-emerald-600 text-xs font-semibold">Tertib (0)</span>`}
          </td>
          <td class="px-5 py-3 text-xs text-slate-400 font-mono">${h.waktu_submit}</td>
        </tr>
      `;
    }).join('');
  },

  exportToCSV: function() {
    if (this.hasilList.length === 0) {
      alert('Tidak ada data nilai untuk diekspor!');
      return;
    }

    const headers = ['No', 'Nama Siswa', 'Kelas', 'Nilai Akhir', 'Benar', 'Salah', 'Pelanggaran Pindah Tab', 'Waktu Selesai'];
    const rows = this.hasilList.map((h, i) => [
      i + 1,
      `"${h.nama_siswa}"`,
      `"${h.kelas}"`,
      h.nilai,
      h.benar || 0,
      h.salah || 0,
      h.pelanggaran || 0,
      `"${h.waktu_submit}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Nilai_CBT_MIN2_Surabaya_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
