/**
 * ====================================================================
 * ENGINE UJIAN SISWA CBT MIN 2 KOTA SURABAYA
 * ====================================================================
 * Menangani Sesi CBT Siswa, Timer, 4 Model Soal, Anti-Curang,
 * dan Auto-Save Realtime ke LocalStorage.
 */

const SiswaPortal = {
  jadwalList: [],
  selectedUjian: null,

  init: async function() {
    await this.loadJadwal();
  },

  loadJadwal: async function() {
    const user = Auth.getCurrentUser();
    const container = document.getElementById('siswa-ujian-list');
    if (!container) return;

    const res = await API.call('getJadwalUjian', {}, 'GET');
    if (res.success && res.data) {
      // Filter jadwal yang aktif dan sesuai kelas siswa
      this.jadwalList = res.data.filter(j => 
        j.status === 'Aktif' && 
        (!j.kelas || j.kelas === '-' || !user.kelas || j.kelas === user.kelas)
      );
    }

    if (this.jadwalList.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <i class="lucide-book-open text-2xl"></i>
          </div>
          <h4 class="font-bold text-slate-800 text-lg">Tidak Ada Ujian Aktif</h4>
          <p class="text-slate-500 text-sm mt-1">Saat ini belum ada jadwal ujian yang ditugaskan untuk kelas Anda (${user ? user.kelas : '-'}).</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.jadwalList.map(j => `
      <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
        <div class="flex items-start justify-between gap-4 mb-3">
          <div>
            <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              ${j.mata_pelajaran}
            </span>
            <h3 class="text-xl font-bold text-slate-800 mt-2">${j.judul}</h3>
            <p class="text-xs text-slate-500 mt-1">Target Kelas: <b>${j.kelas}</b> • Durasi: <b>${j.durasi} Menit</b></p>
          </div>
          <div class="text-right">
            <span class="text-xs font-semibold text-slate-400 block mb-1">Status:</span>
            <span class="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
              Tersedia
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
          <div class="text-xs text-slate-500 flex items-center gap-1.5">
            <i class="lucide-clock w-4 h-4 text-emerald-600"></i>
            Waktu pengerjaan: ${j.durasi} Menit
          </div>
          <button onclick="SiswaPortal.openTokenModal('${j.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition flex items-center gap-2">
            <span>Mulai Ujian</span>
            <i class="lucide-arrow-right w-4 h-4"></i>
          </button>
        </div>
      </div>
    `).join('');
  },

  openTokenModal: function(id_ujian) {
    this.selectedUjian = this.jadwalList.find(j => j.id === id_ujian);
    const modal = document.getElementById('modal-token-ujian');
    const titleEl = document.getElementById('token-modal-title');
    const tokenInput = document.getElementById('input-token-siswa');
    if (!modal) return;

    if (this.selectedUjian && titleEl) {
      titleEl.textContent = this.selectedUjian.judul;
    }
    if (tokenInput) tokenInput.value = '';

    modal.classList.remove('hidden');
  },

  closeTokenModal: function() {
    const modal = document.getElementById('modal-token-ujian');
    if (modal) modal.classList.add('hidden');
  },

  submitTokenAndStart: async function() {
    const tokenInput = document.getElementById('input-token-siswa');
    const token = tokenInput ? tokenInput.value.trim().toUpperCase() : '';
    const user = Auth.getCurrentUser();

    if (!token) {
      alert('Masukkan Token Ujian yang diberikan guru!');
      return;
    }

    const payload = {
      id_ujian: this.selectedUjian.id,
      token: token,
      id_siswa: user.id
    };

    const res = await API.call('getUjianDetail', payload);
    if (!res.success) {
      alert(res.message || 'Token salah atau ujian tidak aktif!');
      return;
    }

    this.closeTokenModal();
    UjianEngine.startExam(res.ujian, res.soal, user);
  }
};


// ====================================================================
// CBT EXAM ENGINE
// ====================================================================
const UjianEngine = {
  ujian: null,
  soalList: [],
  currentIndex: 0,
  jawaban: {}, // { [soalId]: userValue }
  ragu: {},    // { [soalId]: boolean }
  timerInterval: null,
  secondsLeft: 0,
  pelanggaranCount: 0,
  currentUser: null,

  startExam: function(ujian, soalList, user) {
    if (!soalList || soalList.length === 0) {
      alert('Ujian ini belum memiliki soal!');
      return;
    }

    this.ujian = ujian;
    this.soalList = soalList;
    this.currentIndex = 0;
    this.jawaban = {};
    this.ragu = {};
    this.pelanggaranCount = 0;
    this.currentUser = user;
    this.secondsLeft = (ujian.durasi || 60) * 60;

    // Simpan state awal ke localStorage
    this.saveStateToLocalStorage(true);

    this.setupUI();
    this.startTimer();
    this.bindAntiCheat();
    this.renderCurrentQuestion();
    this.renderPalette();
  },

  resumeExam: function(savedState) {
    this.ujian = savedState.ujian;
    this.soalList = savedState.soalList;
    this.currentIndex = savedState.currentIndex || 0;
    this.jawaban = savedState.jawaban || {};
    this.ragu = savedState.ragu || {};
    this.pelanggaranCount = savedState.pelanggaranCount || 0;
    this.currentUser = savedState.currentUser;
    this.secondsLeft = savedState.secondsLeft || 60;

    this.setupUI();
    this.startTimer();
    this.bindAntiCheat();
    this.renderCurrentQuestion();
    this.renderPalette();
  },

  setupUI: function() {
    // Sembunyikan navbar dan halaman umum
    const nav = document.getElementById('app-navbar');
    if (nav) nav.classList.add('hidden');

    ['section-login', 'section-admin', 'section-guru', 'section-siswa'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    const examView = document.getElementById('section-exam-active');
    if (examView) examView.classList.remove('hidden');

    // Set Header Ujian
    const titleEl = document.getElementById('exam-active-title');
    const siswaEl = document.getElementById('exam-active-siswa');
    if (titleEl) titleEl.textContent = this.ujian.judul;
    if (siswaEl) siswaEl.textContent = `${this.currentUser.nama} (${this.currentUser.kelas || '-'})`;
  },

  saveStateToLocalStorage: function(isActive = true) {
    const state = {
      ujian: this.ujian,
      soalList: this.soalList,
      currentIndex: this.currentIndex,
      jawaban: this.jawaban,
      ragu: this.ragu,
      secondsLeft: this.secondsLeft,
      pelanggaranCount: this.pelanggaranCount,
      currentUser: this.currentUser,
      id_siswa: this.currentUser.id,
      isActive: isActive
    };
    localStorage.setItem('cbt_current_exam_state', JSON.stringify(state));
  },

  // ==================================================================
  // TIMER COUNTDOWN & AUTO SUBMIT
  // ==================================================================
  startTimer: function() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const timerEl = document.getElementById('exam-timer-display');

    this.timerInterval = setInterval(() => {
      this.secondsLeft--;
      this.saveStateToLocalStorage(true);

      const m = Math.floor(this.secondsLeft / 60);
      const s = this.secondsLeft % 60;
      const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      if (timerEl) {
        timerEl.textContent = formatted;
        if (this.secondsLeft <= 300 && this.secondsLeft > 60) {
          timerEl.className = 'text-amber-600 font-mono font-black text-lg animate-pulse';
        } else if (this.secondsLeft <= 60) {
          timerEl.className = 'text-rose-600 font-mono font-black text-lg animate-pulse';
        } else {
          timerEl.className = 'text-emerald-700 font-mono font-black text-lg';
        }
      }

      if (this.secondsLeft <= 0) {
        clearInterval(this.timerInterval);
        alert('Waktu ujian telah habis! Jawaban Anda akan otomatis dikirim.');
        this.submitExam(true);
      }
    }, 1000);
  },

  // ==================================================================
  // ANTI-CHEAT (DETEKSI GANTI TAB / MINIMIZE)
  // ==================================================================
  bindAntiCheat: function() {
    if (!CONFIG.ANTI_CHEAT_ACTIVE) return;

    // Deteksi saat siswa membuka tab lain atau minimize
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.ujian) {
        this.handleViolation();
      }
    });

    window.addEventListener('blur', () => {
      if (this.ujian) {
        this.handleViolation();
      }
    });

    // Cegah klik kanan & inspect element sederhana
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  handleViolation: function() {
    this.pelanggaranCount++;
    this.saveStateToLocalStorage(true);

    const warnEl = document.getElementById('modal-cheat-warning');
    const countEl = document.getElementById('cheat-violation-count');
    if (warnEl) {
      if (countEl) countEl.textContent = this.pelanggaranCount;
      warnEl.classList.remove('hidden');
    }
  },

  dismissCheatWarning: function() {
    const warnEl = document.getElementById('modal-cheat-warning');
    if (warnEl) warnEl.classList.add('hidden');
  },

  // ==================================================================
  // RENDER SOAL (4 MODEL)
  // ==================================================================
  renderCurrentQuestion: function() {
    const q = this.soalList[this.currentIndex];
    if (!q) return;

    const noEl = document.getElementById('exam-current-no');
    const tipeEl = document.getElementById('exam-current-tipe');
    const textEl = document.getElementById('exam-question-text');
    const optionsContainer = document.getElementById('exam-options-container');
    const raguCheckbox = document.getElementById('exam-ragu-checkbox');

    if (noEl) noEl.textContent = `Soal No. ${this.currentIndex + 1} dari ${this.soalList.length}`;
    
    // Badge Tipe Soal
    if (tipeEl) {
      let tLabel = 'Pilihan Ganda';
      let tColor = 'bg-blue-100 text-blue-800';
      if (q.tipe === 'PG_KOMPLEKS') {
        tLabel = 'Pilihan Ganda Kompleks (Bisa pilih lebih dari 1)';
        tColor = 'bg-purple-100 text-purple-800';
      } else if (q.tipe === 'BENAR_SALAH') {
        tLabel = 'Benar / Salah';
        tColor = 'bg-amber-100 text-amber-800';
      } else if (q.tipe === 'MENJODOHKAN') {
        tLabel = 'Menjodohkan';
        tColor = 'bg-teal-100 text-teal-800';
      }
      tipeEl.className = `px-3 py-1 rounded-full text-xs font-bold ${tColor}`;
      tipeEl.textContent = tLabel;
    }

    if (textEl) textEl.innerHTML = q.pertanyaan;

    // Checkbox Ragu-ragu
    if (raguCheckbox) {
      raguCheckbox.checked = !!this.ragu[q.id];
    }

    // Render Opsi Jawaban berdasarkan Tipe
    if (optionsContainer) {
      optionsContainer.innerHTML = this.buildOptionsHtml(q);
    }

    // Update Navigasi Prev/Next
    const prevBtn = document.getElementById('exam-btn-prev');
    const nextBtn = document.getElementById('exam-btn-next');
    const finishBtn = document.getElementById('exam-btn-finish');

    if (prevBtn) prevBtn.disabled = (this.currentIndex === 0);
    if (nextBtn) {
      if (this.currentIndex === this.soalList.length - 1) {
        nextBtn.classList.add('hidden');
        if (finishBtn) finishBtn.classList.remove('hidden');
      } else {
        nextBtn.classList.remove('hidden');
        if (finishBtn) finishBtn.classList.add('hidden');
      }
    }

    this.renderPalette();
  },

  buildOptionsHtml: function(q) {
    const currentAns = this.jawaban[q.id];

    // 1. PILIHAN GANDA (PG)
    if (q.tipe === 'PG') {
      const opsi = Array.isArray(q.opsi_data) ? q.opsi_data : [];
      return `
        <div class="space-y-3">
          ${opsi.map((op, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = (currentAns === op);
            return `
              <div onclick="UjianEngine.selectPG('${q.id}', '${op.replace(/'/g, "\\'")}')" 
                   class="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition select-none ${isSelected ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold' : 'border-slate-200 hover:border-emerald-300 bg-white text-slate-800'}">
                <span class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}">
                  ${letter}
                </span>
                <span class="text-base leading-relaxed flex-1">${op}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // 2. PILIHAN GANDA KOMPLEKS (PG_KOMPLEKS)
    if (q.tipe === 'PG_KOMPLEKS') {
      const opsi = Array.isArray(q.opsi_data) ? q.opsi_data : [];
      const selectedArray = Array.isArray(currentAns) ? currentAns : [];
      return `
        <div class="space-y-3">
          ${opsi.map((op, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selectedArray.includes(op);
            return `
              <div onclick="UjianEngine.togglePGK('${q.id}', '${op.replace(/'/g, "\\'")}')" 
                   class="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition select-none ${isSelected ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold' : 'border-slate-200 hover:border-purple-300 bg-white text-slate-800'}">
                <span class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-purple-600 text-white' : 'border-2 border-slate-300 text-transparent'}">
                  ✓
                </span>
                <span class="text-base leading-relaxed flex-1">${op}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // 3. BENAR / SALAH
    if (q.tipe === 'BENAR_SALAH') {
      const items = Array.isArray(q.opsi_data) ? q.opsi_data : [];
      const ansObj = (typeof currentAns === 'object' && currentAns !== null) ? currentAns : {};

      return `
        <div class="space-y-3">
          ${items.map((item, idx) => {
            const choice = ansObj[idx];
            return `
              <div class="bg-white border-2 border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div class="text-slate-800 font-medium text-base flex-1">
                  ${idx + 1}. ${item.text || item}
                </div>
                <div class="flex items-center gap-2">
                  <button type="button" onclick="UjianEngine.setBenarSalah('${q.id}', ${idx}, 'Benar')"
                          class="px-5 py-2 rounded-lg font-bold text-sm transition ${choice === 'Benar' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
                    ✓ Benar
                  </button>
                  <button type="button" onclick="UjianEngine.setBenarSalah('${q.id}', ${idx}, 'Salah')"
                          class="px-5 py-2 rounded-lg font-bold text-sm transition ${choice === 'Salah' ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
                    ✕ Salah
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // 4. MENJODOHKAN
    if (q.tipe === 'MENJODOHKAN') {
      const data = q.opsi_data || { kiri: [], kanan: [] };
      const ansObj = (typeof currentAns === 'object' && currentAns !== null) ? currentAns : {};
      const optionsKanan = data.kanan || [];

      return `
        <div class="space-y-3">
          ${(data.kiri || []).map((kiriItem, idx) => {
            const selectedVal = ansObj[kiriItem] || '';
            return `
              <div class="bg-white border-2 border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="font-bold text-slate-800 text-base flex-1">
                  ${idx + 1}. ${kiriItem}
                </div>
                <div class="w-full md:w-64">
                  <select onchange="UjianEngine.setMenjodohkan('${q.id}', '${kiriItem.replace(/'/g, "\\'")}', this.value)"
                          class="w-full border-2 border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:border-teal-600 focus:outline-none bg-slate-50">
                    <option value="">-- Pilih Pasangan Cocok --</option>
                    ${optionsKanan.map(k => `
                      <option value="${k.replace(/"/g, '&quot;')}" ${selectedVal === k ? 'selected' : ''}>${k}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return '';
  },

  // Handlers Jawaban Siswa
  selectPG: function(soalId, val) {
    this.jawaban[soalId] = val;
    this.saveStateToLocalStorage(true);
    this.renderCurrentQuestion();
  },

  togglePGK: function(soalId, val) {
    let list = Array.isArray(this.jawaban[soalId]) ? [...this.jawaban[soalId]] : [];
    if (list.includes(val)) {
      list = list.filter(x => x !== val);
    } else {
      list.push(val);
    }
    this.jawaban[soalId] = list;
    this.saveStateToLocalStorage(true);
    this.renderCurrentQuestion();
  },

  setBenarSalah: function(soalId, idx, val) {
    if (!this.jawaban[soalId] || typeof this.jawaban[soalId] !== 'object') {
      this.jawaban[soalId] = {};
    }
    this.jawaban[soalId][idx] = val;
    this.saveStateToLocalStorage(true);
    this.renderCurrentQuestion();
  },

  setMenjodohkan: function(soalId, keyKiri, valKanan) {
    if (!this.jawaban[soalId] || typeof this.jawaban[soalId] !== 'object') {
      this.jawaban[soalId] = {};
    }
    if (valKanan) {
      this.jawaban[soalId][keyKiri] = valKanan;
    } else {
      delete this.jawaban[soalId][keyKiri];
    }
    this.saveStateToLocalStorage(true);
    this.renderCurrentQuestion();
  },

  toggleRagu: function() {
    const q = this.soalList[this.currentIndex];
    if (!q) return;
    this.ragu[q.id] = !this.ragu[q.id];
    this.saveStateToLocalStorage(true);
    this.renderPalette();
  },

  // Navigasi Soal
  prevQuestion: function() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderCurrentQuestion();
    }
  },

  nextQuestion: function() {
    if (this.currentIndex < this.soalList.length - 1) {
      this.currentIndex++;
      this.renderCurrentQuestion();
    }
  },

  jumpToQuestion: function(index) {
    if (index >= 0 && index < this.soalList.length) {
      this.currentIndex = index;
      this.renderCurrentQuestion();
    }
  },

  // Palet Nomor Soal
  renderPalette: function() {
    const container = document.getElementById('exam-palette-grid');
    if (!container) return;

    container.innerHTML = this.soalList.map((q, idx) => {
      const isCurrent = (this.currentIndex === idx);
      const isRagu = !!this.ragu[q.id];
      const hasAnswer = this.isQuestionAnswered(q);

      let btnClass = 'bg-slate-100 text-slate-700 border-slate-300';
      if (isRagu) {
        btnClass = 'bg-amber-400 text-amber-950 font-black border-amber-500';
      } else if (hasAnswer) {
        btnClass = 'bg-emerald-600 text-white font-black border-emerald-700';
      }

      const activeRing = isCurrent ? 'ring-4 ring-blue-400 ring-offset-2 scale-105 z-10' : '';

      return `
        <button onclick="UjianEngine.jumpToQuestion(${idx})"
                class="w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm transition transform ${btnClass} ${activeRing}">
          ${idx + 1}
        </button>
      `;
    }).join('');
  },

  isQuestionAnswered: function(q) {
    const a = this.jawaban[q.id];
    if (a === undefined || a === null || a === '') return false;
    if (Array.isArray(a)) return a.length > 0;
    if (typeof a === 'object') return Object.keys(a).length > 0;
    return true;
  },

  // ==================================================================
  // KONFIRMASI & SUBMIT UJIAN
  // ==================================================================
  openFinishModal: function() {
    const modal = document.getElementById('modal-finish-confirm');
    if (!modal) return;

    let answered = 0;
    let raguCount = 0;

    this.soalList.forEach(q => {
      if (this.isQuestionAnswered(q)) answered++;
      if (this.ragu[q.id]) raguCount++;
    });

    const unanswered = this.soalList.length - answered;

    document.getElementById('finish-stat-answered').textContent = answered;
    document.getElementById('finish-stat-unanswered').textContent = unanswered;
    document.getElementById('finish-stat-ragu').textContent = raguCount;

    const warnEl = document.getElementById('finish-unanswered-warning');
    if (warnEl) {
      if (unanswered > 0 || raguCount > 0) {
        warnEl.classList.remove('hidden');
      } else {
        warnEl.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
  },

  closeFinishModal: function() {
    const modal = document.getElementById('modal-finish-confirm');
    if (modal) modal.classList.add('hidden');
  },

  submitExam: async function(isAutoSubmit = false) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.closeFinishModal();

    const payload = {
      id_ujian: this.ujian.id,
      id_siswa: this.currentUser.id,
      nama_siswa: this.currentUser.nama,
      kelas: this.currentUser.kelas || '',
      jawaban: this.jawaban,
      pelanggaran_count: this.pelanggaranCount
    };

    const res = await API.call('submitUjian', payload);

    // Hapus sesi ujian yang sedang berjalan dari storage
    localStorage.removeItem('cbt_current_exam_state');

    if (res.success && res.hasil) {
      this.showResultModal(res.hasil);
    } else {
      alert(res.message || 'Ujian berhasil dikirim!');
      window.location.reload();
    }
  },

  showResultModal: function(hasil) {
    const modal = document.getElementById('modal-exam-result');
    if (!modal) {
      alert(`Ujian Selesai! Nilai Anda: ${hasil.nilai}`);
      window.location.reload();
      return;
    }

    document.getElementById('res-score-display').textContent = hasil.nilai;
    document.getElementById('res-benar-count').textContent = hasil.benar || 0;
    document.getElementById('res-salah-count').textContent = hasil.salah || 0;
    document.getElementById('res-cheat-count').textContent = this.pelanggaranCount || 0;

    modal.classList.remove('hidden');
  },

  backToPortal: function() {
    window.location.reload();
  }
};
