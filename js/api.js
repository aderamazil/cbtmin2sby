/**
 * ====================================================================
 * API CLIENT CBT MIN 2 KOTA SURABAYA
 * ====================================================================
 * Menghubungkan Frontend ke Google Apps Script / Local Mock DB
 */

const API = {
  // Inisialisasi Mock Data jika berjalan di Demo Mode
  initMockDatabase: function() {
    if (!localStorage.getItem('cbt_users')) {
      const defaultUsers = [
        { id: 'USR-001', username: 'admin', password: 'admin123', nama: 'Administrator MIN 2', role: 'admin', kelas: '-', status: 'Aktif' },
        { id: 'USR-002', username: 'guru1', password: 'guru123', nama: 'Ustadz Ahmad, S.Pd.I', role: 'guru', kelas: '5A', status: 'Aktif' },
        { id: 'USR-003', username: 'siswa01', password: '123456', nama: 'Muhammad Fatih', role: 'siswa', kelas: '5A', status: 'Aktif' },
        { id: 'USR-004', username: 'siswa02', password: '123456', nama: 'Aisyah Humaira', role: 'siswa', kelas: '5A', status: 'Aktif' }
      ];
      localStorage.setItem('cbt_users', JSON.stringify(defaultUsers));
    }

    if (!localStorage.getItem('cbt_bank_soal')) {
      const defaultSoal = [
        {
          id: 'SOAL-001',
          mata_pelajaran: 'Akidah Akhlak',
          kelas: '5A',
          tipe: 'PG',
          pertanyaan: 'Rukun Iman yang pertama dan merupakan pondasi utama akidah Islam bagi seorang muslim adalah beriman kepada...',
          opsi_data: [
            'Allah Subhanahu Wa Ta\'ala',
            'Malaikat-malaikat Allah',
            'Kitab-kitab suci Allah',
            'Hari Kiamat / Akhir zaman'
          ],
          kunci_jawaban: 'Allah Subhanahu Wa Ta\'ala',
          bobot: 20,
          created_by: 'guru1'
        },
        {
          id: 'SOAL-002',
          mata_pelajaran: 'Fikih',
          kelas: '5A',
          tipe: 'PG_KOMPLEKS',
          pertanyaan: 'Perhatikan amalan shalat berikut! Pilihlah 2 (dua) yang termasuk rukun shalat fardhu (jawaban benar lebih dari satu):',
          opsi_data: [
            'Membaca Niat dan Takbiratul Ihram',
            'Membaca Surat Pendek setelah Al-Fatihah',
            'Membaca Surat Al-Fatihah',
            'Mengusap kedua telinga'
          ],
          kunci_jawaban: [
            'Membaca Niat dan Takbiratul Ihram',
            'Membaca Surat Al-Fatihah'
          ],
          bobot: 25,
          created_by: 'guru1'
        },
        {
          id: 'SOAL-003',
          mata_pelajaran: 'Sejarah Kebudayaan Islam (SKI)',
          kelas: '5A',
          tipe: 'BENAR_SALAH',
          pertanyaan: 'Tentukan Benar atau Salah pada setiap pernyataan sejarah Islam di bawah ini!',
          opsi_data: [
            { id: 0, text: 'Nabi Muhammad SAW dilahirkan di Kota Makkah pada Tahun Gajah.' },
            { id: 1, text: 'Wahyu Al-Qur\'an pertama kali diturunkan di Gua Tsur.' },
            { id: 2, text: 'Kota tujuan hijrah kaum muslimin pertama kali dipimpin Nabi adalah Madinah (Yatsrib).' }
          ],
          kunci_jawaban: {
            '0': 'Benar',
            '1': 'Salah',
            '2': 'Benar'
          },
          bobot: 25,
          created_by: 'guru1'
        },
        {
          id: 'SOAL-004',
          mata_pelajaran: 'Bahasa Arab',
          kelas: '5A',
          tipe: 'MENJODOHKAN',
          pertanyaan: 'Jodohkanlah kosa kata benda di lingkungan madrasah berikut dengan artinya dalam Bahasa Indonesia yang tepat!',
          opsi_data: {
            kiri: ['Madrasatun ( مَدْرَسَةٌ )', 'Faslun ( فَصْلٌ )', 'Kitabun ( كِتَابٌ )', 'Ustadzun ( أُسْتَاذٌ )'],
            kanan: ['Sekolah / Madrasah', 'Ruang Kelas', 'Buku Pelajaran', 'Bapak Guru']
          },
          kunci_jawaban: {
            'Madrasatun ( مَدْرَسَةٌ )': 'Sekolah / Madrasah',
            'Faslun ( فَصْلٌ )': 'Ruang Kelas',
            'Kitabun ( كِتَابٌ )': 'Buku Pelajaran',
            'Ustadzun ( أُسْتَاذٌ )': 'Bapak Guru'
          },
          bobot: 30,
          created_by: 'guru1'
        }
      ];
      localStorage.setItem('cbt_bank_soal', JSON.stringify(defaultSoal));
    }

    if (!localStorage.getItem('cbt_jadwal_ujian')) {
      const defaultJadwal = [
        {
          id: 'UJN-001',
          judul: 'Asesmen Madrasah Semester Genap (PAI & Bahasa Arab)',
          mata_pelajaran: 'Pendidikan Agama Islam & B. Arab',
          kelas: '5A',
          durasi: 45,
          token: 'MIN2SBY',
          status: 'Aktif',
          soal_ids: ['SOAL-001', 'SOAL-002', 'SOAL-003', 'SOAL-004'],
          tgl_mulai: '2026-10-01',
          tgl_selesai: '2026-10-31',
          created_by: 'guru1'
        }
      ];
      localStorage.setItem('cbt_jadwal_ujian', JSON.stringify(defaultJadwal));
    }

    if (!localStorage.getItem('cbt_hasil_ujian')) {
      localStorage.setItem('cbt_hasil_ujian', JSON.stringify([]));
    }
  },

  // Request Runner (Otomatis deteksi GAS / Demo Mode)
  call: async function(action, payload = {}, method = 'POST') {
    if (isDemoMode()) {
      return this.mockHandler(action, payload);
    }

    try {
      let url = CONFIG.API_URL;
      let options = {
        method: method,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } // GAS lebih stabil dengan text/plain pada CORS
      };

      if (method === 'GET') {
        const params = new URLSearchParams({ action, ...payload });
        url += (url.includes('?') ? '&' : '?') + params.toString();
      } else {
        options.body = JSON.stringify({ action, ...payload });
      }

      const res = await fetch(url, options);
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn('Gagal menghubungi GAS, beralih ke local fallback:', err);
      return this.mockHandler(action, payload);
    }
  },

  // Mock Engine saat GAS belum aktif / mode offline
  mockHandler: function(action, payload) {
    this.initMockDatabase();
    return new Promise((resolve) => {
      setTimeout(() => {
        switch (action) {
          case 'login': {
            const users = JSON.parse(localStorage.getItem('cbt_users') || '[]');
            const user = users.find(u => 
              u.username.toLowerCase() === String(payload.username).trim().toLowerCase() && 
              String(u.password) === String(payload.password)
            );
            if (user) {
              if (user.status === 'Nonaktif') {
                resolve({ success: false, message: 'Akun Anda dinonaktifkan!' });
              } else {
                resolve({
                  success: true,
                  user: {
                    id: user.id,
                    username: user.username,
                    nama: user.nama,
                    role: user.role,
                    kelas: user.kelas
                  }
                });
              }
            } else {
              resolve({ success: false, message: 'Username atau kata sandi salah!' });
            }
            break;
          }

          case 'getUsers': {
            const users = JSON.parse(localStorage.getItem('cbt_users') || '[]');
            resolve({ success: true, data: users });
            break;
          }

          case 'saveUser': {
            let users = JSON.parse(localStorage.getItem('cbt_users') || '[]');
            if (payload.id) {
              users = users.map(u => u.id === payload.id ? { ...u, ...payload } : u);
            } else {
              const newId = 'USR-' + Math.random().toString(36).substr(2, 6).toUpperCase();
              users.push({ ...payload, id: newId, status: payload.status || 'Aktif' });
            }
            localStorage.setItem('cbt_users', JSON.stringify(users));
            resolve({ success: true, message: 'Data user berhasil disimpan' });
            break;
          }

          case 'deleteUser': {
            let users = JSON.parse(localStorage.getItem('cbt_users') || '[]');
            users = users.filter(u => u.id !== payload.id);
            localStorage.setItem('cbt_users', JSON.stringify(users));
            resolve({ success: true, message: 'User berhasil dihapus' });
            break;
          }

          case 'getBankSoal': {
            const soal = JSON.parse(localStorage.getItem('cbt_bank_soal') || '[]');
            resolve({ success: true, data: soal });
            break;
          }

          case 'saveSoal': {
            let soalList = JSON.parse(localStorage.getItem('cbt_bank_soal') || '[]');
            if (payload.id) {
              soalList = soalList.map(s => s.id === payload.id ? { ...s, ...payload } : s);
            } else {
              const newId = 'SOAL-' + Math.random().toString(36).substr(2, 6).toUpperCase();
              soalList.push({ ...payload, id: newId });
            }
            localStorage.setItem('cbt_bank_soal', JSON.stringify(soalList));
            resolve({ success: true, message: 'Soal berhasil disimpan' });
            break;
          }

          case 'deleteSoal': {
            let soalList = JSON.parse(localStorage.getItem('cbt_bank_soal') || '[]');
            soalList = soalList.filter(s => s.id !== payload.id);
            localStorage.setItem('cbt_bank_soal', JSON.stringify(soalList));
            resolve({ success: true, message: 'Soal berhasil dihapus' });
            break;
          }

          case 'getJadwalUjian': {
            const jadwal = JSON.parse(localStorage.getItem('cbt_jadwal_ujian') || '[]');
            resolve({ success: true, data: jadwal });
            break;
          }

          case 'saveJadwalUjian': {
            let jadwalList = JSON.parse(localStorage.getItem('cbt_jadwal_ujian') || '[]');
            if (payload.id) {
              jadwalList = jadwalList.map(j => j.id === payload.id ? { ...j, ...payload } : j);
            } else {
              const newId = 'UJN-' + Math.random().toString(36).substr(2, 6).toUpperCase();
              jadwalList.push({ ...payload, id: newId });
            }
            localStorage.setItem('cbt_jadwal_ujian', JSON.stringify(jadwalList));
            resolve({ success: true, message: 'Jadwal ujian berhasil disimpan' });
            break;
          }

          case 'deleteJadwalUjian': {
            let jadwalList = JSON.parse(localStorage.getItem('cbt_jadwal_ujian') || '[]');
            jadwalList = jadwalList.filter(j => j.id !== payload.id);
            localStorage.setItem('cbt_jadwal_ujian', JSON.stringify(jadwalList));
            resolve({ success: true, message: 'Jadwal berhasil dihapus' });
            break;
          }

          case 'getUjianDetail': {
            const jadwalList = JSON.parse(localStorage.getItem('cbt_jadwal_ujian') || '[]');
            const ujian = jadwalList.find(j => j.id === payload.id_ujian);
            if (!ujian) return resolve({ success: false, message: 'Ujian tidak ditemukan!' });
            if (ujian.status !== 'Aktif') return resolve({ success: false, message: 'Ujian tidak aktif!' });
            if (ujian.token && String(ujian.token).toUpperCase() !== String(payload.token).trim().toUpperCase()) {
              return resolve({ success: false, message: 'Token ujian salah!' });
            }

            // Cek apakah sudah pernah mengerjakan
            const hasilList = JSON.parse(localStorage.getItem('cbt_hasil_ujian') || '[]');
            const sudah = hasilList.find(h => h.id_ujian === payload.id_ujian && h.id_siswa === payload.id_siswa);
            if (sudah) {
              return resolve({ success: false, message: 'Anda sudah pernah mengerjakan ujian ini!', sudah_mengerjakan: true });
            }

            const allSoal = JSON.parse(localStorage.getItem('cbt_bank_soal') || '[]');
            const soalMap = {};
            ujian.soal_ids.forEach(id => soalMap[id] = true);

            // Filter & hapus kunci jawaban untuk privasi siswa
            const studentSoal = allSoal
              .filter(s => soalMap[s.id])
              .map(s => {
                const copy = { ...s };
                delete copy.kunci_jawaban;
                return copy;
              });

            resolve({
              success: true,
              ujian: {
                id: ujian.id,
                judul: ujian.judul,
                mata_pelajaran: ujian.mata_pelajaran,
                durasi: ujian.durasi
              },
              soal: studentSoal
            });
            break;
          }

          case 'submitUjian': {
            const allSoal = JSON.parse(localStorage.getItem('cbt_bank_soal') || '[]');
            const masterMap = {};
            allSoal.forEach(s => masterMap[s.id] = s);

            let totalBobot = 0;
            let perolehanSkor = 0;
            let benarCount = 0;
            let salahCount = 0;

            for (const soalId in masterMap) {
              if (payload.jawaban[soalId] !== undefined) {
                const q = masterMap[soalId];
                totalBobot += (q.bobot || 1);
                const userAns = payload.jawaban[soalId];
                const correctAns = q.kunci_jawaban;
                let isBenar = false;

                if (q.tipe === 'PG') {
                  if (String(userAns).trim() === String(correctAns).trim()) isBenar = true;
                } else if (q.tipe === 'PG_KOMPLEKS') {
                  if (Array.isArray(userAns) && Array.isArray(correctAns)) {
                    const u = [...userAns].sort().join('|');
                    const c = [...correctAns].sort().join('|');
                    if (u === c) isBenar = true;
                  }
                } else if (q.tipe === 'BENAR_SALAH') {
                  let ok = true;
                  for (const key in correctAns) {
                    if (userAns[key] !== correctAns[key]) { ok = false; break; }
                  }
                  if (ok) isBenar = true;
                } else if (q.tipe === 'MENJODOHKAN') {
                  let ok = true;
                  for (const key in correctAns) {
                    if (userAns[key] !== correctAns[key]) { ok = false; break; }
                  }
                  if (ok) isBenar = true;
                }

                if (isBenar) {
                  perolehanSkor += (q.bobot || 1);
                  benarCount++;
                } else {
                  salahCount++;
                }
              }
            }

            const nilaiAkhir = totalBobot > 0 ? Math.round((perolehanSkor / totalBobot) * 100) : 0;
            const now = new Date().toLocaleString('id-ID');
            const newHasil = {
              id: 'RES-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
              id_ujian: payload.id_ujian,
              id_siswa: payload.id_siswa,
              nama_siswa: payload.nama_siswa,
              kelas: payload.kelas,
              nilai: nilaiAkhir,
              benar: benarCount,
              salah: salahCount,
              pelanggaran: payload.pelanggaran_count || 0,
              jawaban: payload.jawaban,
              waktu_submit: now
            };

            let hasilList = JSON.parse(localStorage.getItem('cbt_hasil_ujian') || '[]');
            hasilList.push(newHasil);
            localStorage.setItem('cbt_hasil_ujian', JSON.stringify(hasilList));

            resolve({
              success: true,
              message: 'Ujian berhasil diselesaikan!',
              hasil: {
                nilai: nilaiAkhir,
                benar: benarCount,
                salah: salahCount,
                waktu: now
              }
            });
            break;
          }

          case 'getHasilUjian': {
            const hasilList = JSON.parse(localStorage.getItem('cbt_hasil_ujian') || '[]');
            resolve({ success: true, data: hasilList });
            break;
          }

          default:
            resolve({ success: false, message: 'Action tidak dikenal: ' + action });
        }
      }, 150); // Delay halus untuk simulasi network
    });
  }
};

// Inisialisasi Mock DB saat script dimuat
API.initMockDatabase();
