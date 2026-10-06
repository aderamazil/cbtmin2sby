/**
 * ====================================================================
 * BACKEND CBT MIN 2 KOTA SURABAYA (Google Apps Script)
 * ====================================================================
 * Script ini berfungsi sebagai API RESTful untuk aplikasi ujian berbasis web.
 * Dihubungkan dengan Google Spreadsheet sebagai database.
 */

// Konfigurasi Nama-nama Sheet di Google Spreadsheet
const SHEETS = {
  USERS: 'Users',
  BANK_SOAL: 'BankSoal',
  JADWAL_UJIAN: 'JadwalUjian',
  HASIL_UJIAN: 'HasilUjian'
};

/**
 * Handle HTTP GET Request
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const response = handleAction(action, e.parameter, null);
    return createJsonResponse(response);
  } catch (err) {
    return createJsonResponse({ success: false, message: err.toString() });
  }
}

/**
 * Handle HTTP POST Request
 */
function doPost(e) {
  try {
    let postData = {};
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }
    const action = postData.action || e.parameter.action;
    const response = handleAction(action, e.parameter, postData);
    return createJsonResponse(response);
  } catch (err) {
    return createJsonResponse({ success: false, message: err.toString() });
  }
}

/**
 * Router untuk berbagai action API
 */
function handleAction(action, queryParams, payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets(ss);

  switch (action) {
    case 'login':
      return apiLogin(ss, payload);
    
    // USERS (Admin)
    case 'getUsers':
      return apiGetUsers(ss);
    case 'saveUser':
      return apiSaveUser(ss, payload);
    case 'deleteUser':
      return apiDeleteUser(ss, payload);

    // BANK SOAL (Guru)
    case 'getBankSoal':
      return apiGetBankSoal(ss, queryParams);
    case 'saveSoal':
      return apiSaveSoal(ss, payload);
    case 'deleteSoal':
      return apiDeleteSoal(ss, payload);

    // JADWAL UJIAN
    case 'getJadwalUjian':
      return apiGetJadwalUjian(ss, queryParams);
    case 'saveJadwalUjian':
      return apiSaveJadwalUjian(ss, payload);
    case 'deleteJadwalUjian':
      return apiDeleteJadwalUjian(ss, payload);

    // UJIAN SISWA
    case 'getUjianDetail':
      return apiGetUjianDetail(ss, payload || queryParams);
    case 'submitUjian':
      return apiSubmitUjian(ss, payload);

    // HASIL & REKAP
    case 'getHasilUjian':
      return apiGetHasilUjian(ss, queryParams);

    case 'ping':
      return { success: true, message: 'CBT MIN 2 Kota Surabaya Backend Online!' };

    default:
      return { success: false, message: 'Action tidak dikenal: ' + action };
  }
}

/**
 * Helper JSON Response dengan CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ====================================================================
// FITUR AUTENTIKASI (LOGIN)
// ====================================================================
function apiLogin(ss, payload) {
  const { username, password } = payload;
  const sheet = ss.getSheetByName(SHEETS.USERS);
  if (!sheet) return { success: false, message: 'Sheet Users belum dibuat' };

  const data = sheet.getDataRange().getValues();
  // Header: [id, username, password, nama, role, kelas, status]
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[1]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      if (String(row[2]) === String(password)) {
        if (row[6] && String(row[6]).toLowerCase() === 'nonaktif') {
          return { success: false, message: 'Akun Anda dinonaktifkan. Hubungi admin!' };
        }
        return {
          success: true,
          user: {
            id: row[0],
            username: row[1],
            nama: row[3],
            role: row[4], // admin, guru, siswa
            kelas: row[5] || ''
          }
        };
      } else {
        return { success: false, message: 'Kata sandi salah!' };
      }
    }
  }
  return { success: false, message: 'Username tidak ditemukan!' };
}

// ====================================================================
// FITUR USER MANAGEMENT (Admin)
// ====================================================================
function apiGetUsers(ss) {
  const sheet = ss.getSheetByName(SHEETS.USERS);
  if (!sheet) return { success: false, data: [] };
  const rows = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < rows.length; i++) {
    users.push({
      id: rows[i][0],
      username: rows[i][1],
      nama: rows[i][3],
      role: rows[i][4],
      kelas: rows[i][5],
      status: rows[i][6] || 'Aktif'
    });
  }
  return { success: true, data: users };
}

function apiSaveUser(ss, payload) {
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const rows = sheet.getDataRange().getValues();
  const id = payload.id || 'USR-' + Utilities.getUuid().slice(0, 8);
  let foundRow = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      foundRow = i + 1;
      break;
    }
  }

  const rowData = [
    id,
    payload.username,
    payload.password || '123456',
    payload.nama,
    payload.role,
    payload.kelas || '',
    payload.status || 'Aktif'
  ];

  if (foundRow > 0) {
    if (!payload.password) rowData[2] = rows[foundRow - 1][2]; // simpan password lama
    sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return { success: true, message: 'Data user berhasil disimpan', id: id };
}

function apiDeleteUser(ss, payload) {
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === payload.id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'User berhasil dihapus' };
    }
  }
  return { success: false, message: 'User tidak ditemukan' };
}

// ====================================================================
// FITUR BANK SOAL (Guru)
// 4 Model Soal: PG, PG_KOMPLEKS, BENAR_SALAH, MENJODOHKAN
// ====================================================================
function apiGetBankSoal(ss, queryParams) {
  const sheet = ss.getSheetByName(SHEETS.BANK_SOAL);
  if (!sheet) return { success: true, data: [] };
  const rows = sheet.getDataRange().getValues();
  const list = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // id, mata_pelajaran, kelas, tipe, pertanyaan, opsi_data, kunci_jawaban, bobot, created_by
    if (queryParams && queryParams.mapel && row[1] !== queryParams.mapel) continue;
    if (queryParams && queryParams.kelas && row[2] !== queryParams.kelas) continue;

    list.push({
      id: row[0],
      mata_pelajaran: row[1],
      kelas: row[2],
      tipe: row[3], // 'PG', 'PG_KOMPLEKS', 'BENAR_SALAH', 'MENJODOHKAN'
      pertanyaan: row[4],
      opsi_data: safeJsonParse(row[5]),
      kunci_jawaban: safeJsonParse(row[6]),
      bobot: Number(row[7]) || 1,
      created_by: row[8] || ''
    });
  }
  return { success: true, data: list };
}

function apiSaveSoal(ss, payload) {
  const sheet = ss.getSheetByName(SHEETS.BANK_SOAL);
  const rows = sheet.getDataRange().getValues();
  const id = payload.id || 'SOAL-' + Utilities.getUuid().slice(0, 8);
  let foundRow = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      foundRow = i + 1;
      break;
    }
  }

  const rowData = [
    id,
    payload.mata_pelajaran,
    payload.kelas,
    payload.tipe, // PG, PG_KOMPLEKS, BENAR_SALAH, MENJODOHKAN
    payload.pertanyaan,
    JSON.stringify(payload.opsi_data || []),
    JSON.stringify(payload.kunci_jawaban || []),
    Number(payload.bobot) || 1,
    payload.created_by || ''
  ];

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return { success: true, message: 'Soal berhasil disimpan', id: id };
}

function apiDeleteSoal(ss, payload) {
  const sheet = ss.getSheetByName(SHEETS.BANK_SOAL);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === payload.id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Soal berhasil dihapus' };
    }
  }
  return { success: false, message: 'Soal tidak ditemukan' };
}

// ====================================================================
// FITUR JADWAL UJIAN
// ====================================================================
function apiGetJadwalUjian(ss, queryParams) {
  const sheet = ss.getSheetByName(SHEETS.JADWAL_UJIAN);
  if (!sheet) return { success: true, data: [] };
  const rows = sheet.getDataRange().getValues();
  const list = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // id, judul, mata_pelajaran, kelas, durasi, token, status, soal_ids, tgl_mulai, tgl_selesai, created_by
    list.push({
      id: row[0],
      judul: row[1],
      mata_pelajaran: row[2],
      kelas: row[3],
      durasi: Number(row[4]) || 60, // menit
      token: row[5],
      status: row[6] || 'Aktif',
      soal_ids: safeJsonParse(row[7]),
      tgl_mulai: row[8],
      tgl_selesai: row[9],
      created_by: row[10] || ''
    });
  }
  return { success: true, data: list };
}

function apiSaveJadwalUjian(ss, payload) {
  const sheet = ss.getSheetByName(SHEETS.JADWAL_UJIAN);
  const rows = sheet.getDataRange().getValues();
  const id = payload.id || 'UJN-' + Utilities.getUuid().slice(0, 8);
  let foundRow = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      foundRow = i + 1;
      break;
    }
  }

  const rowData = [
    id,
    payload.judul,
    payload.mata_pelajaran,
    payload.kelas,
    Number(payload.durasi) || 60,
    payload.token,
    payload.status || 'Aktif',
    JSON.stringify(payload.soal_ids || []),
    payload.tgl_mulai || '',
    payload.tgl_selesai || '',
    payload.created_by || ''
  ];

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return { success: true, message: 'Jadwal ujian berhasil disimpan', id: id };
}

function apiDeleteJadwalUjian(ss, payload) {
  const sheet = ss.getSheetByName(SHEETS.JADWAL_UJIAN);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === payload.id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Jadwal berhasil dihapus' };
    }
  }
  return { success: false, message: 'Jadwal tidak ditemukan' };
}

// ====================================================================
// FITUR UJIAN SISWA (AMBIL SOAL TANPA KUNCI & SUBMIT JAWABAN)
// ====================================================================
function apiGetUjianDetail(ss, payload) {
  const { id_ujian, token, id_siswa } = payload;
  const sheetJadwal = ss.getSheetByName(SHEETS.JADWAL_UJIAN);
  const rowsJadwal = sheetJadwal.getDataRange().getValues();

  let targetUjian = null;
  for (let i = 1; i < rowsJadwal.length; i++) {
    if (rowsJadwal[i][0] === id_ujian) {
      targetUjian = {
        id: rowsJadwal[i][0],
        judul: rowsJadwal[i][1],
        mata_pelajaran: rowsJadwal[i][2],
        kelas: rowsJadwal[i][3],
        durasi: Number(rowsJadwal[i][4]),
        token: rowsJadwal[i][5],
        status: rowsJadwal[i][6],
        soal_ids: safeJsonParse(rowsJadwal[i][7])
      };
      break;
    }
  }

  if (!targetUjian) return { success: false, message: 'Ujian tidak ditemukan!' };
  if (targetUjian.status !== 'Aktif') return { success: false, message: 'Ujian sedang tidak aktif!' };
  if (targetUjian.token && String(targetUjian.token).toUpperCase() !== String(token).toUpperCase()) {
    return { success: false, message: 'Token ujian salah!' };
  }

  // Cek apakah siswa sudah pernah mengerjakan
  const sheetHasil = ss.getSheetByName(SHEETS.HASIL_UJIAN);
  if (sheetHasil) {
    const rowsHasil = sheetHasil.getDataRange().getValues();
    for (let i = 1; i < rowsHasil.length; i++) {
      if (rowsHasil[i][1] === id_ujian && rowsHasil[i][2] === id_siswa) {
        return { success: false, message: 'Anda sudah pernah mengerjakan ujian ini!', sudah_mengerjakan: true };
      }
    }
  }

  // Ambil list soal (Hapus kunci jawaban untuk keamanan!)
  const sheetSoal = ss.getSheetByName(SHEETS.BANK_SOAL);
  const rowsSoal = sheetSoal.getDataRange().getValues();
  const soalList = [];

  const soalIdMap = {};
  targetUjian.soal_ids.forEach(id => soalIdMap[id] = true);

  for (let i = 1; i < rowsSoal.length; i++) {
    const row = rowsSoal[i];
    if (soalIdMap[row[0]]) {
      soalList.push({
        id: row[0],
        mata_pelajaran: row[1],
        kelas: row[2],
        tipe: row[3],
        pertanyaan: row[4],
        opsi_data: safeJsonParse(row[5]),
        // Kunci jawaban TIDAK dikirim ke browser siswa!
        bobot: Number(row[7]) || 1
      });
    }
  }

  // Acak urutan soal untuk siswa (Opsional / Standard CBT)
  // shuffleArray(soalList);

  return {
    success: true,
    ujian: {
      id: targetUjian.id,
      judul: targetUjian.judul,
      mata_pelajaran: targetUjian.mata_pelajaran,
      durasi: targetUjian.durasi
    },
    soal: soalList
  };
}

function apiSubmitUjian(ss, payload) {
  const { id_ujian, id_siswa, nama_siswa, kelas, jawaban, pelanggaran_count } = payload;
  const sheetHasil = ss.getSheetByName(SHEETS.HASIL_UJIAN);
  if (!sheetHasil) return { success: false, message: 'Sheet HasilUjian belum disiapkan' };

  // Ambil data kunci jawaban dari BankSoal
  const sheetSoal = ss.getSheetByName(SHEETS.BANK_SOAL);
  const rowsSoal = sheetSoal.getDataRange().getValues();
  const masterSoal = {};

  for (let i = 1; i < rowsSoal.length; i++) {
    masterSoal[rowsSoal[i][0]] = {
      tipe: rowsSoal[i][3],
      kunci: safeJsonParse(rowsSoal[i][6]),
      bobot: Number(rowsSoal[i][7]) || 1
    };
  }

  // Hitung Skor
  let totalBobot = 0;
  let perolehanSkor = 0;
  let benarCount = 0;
  let salahCount = 0;

  for (const soalId in masterSoal) {
    if (jawaban[soalId] !== undefined) {
      const q = masterSoal[soalId];
      totalBobot += q.bobot;
      const userAns = jawaban[soalId];
      const correctAns = q.kunci;

      let isBenar = false;

      // 1. Tipe PG (Single choice)
      if (q.tipe === 'PG') {
        if (String(userAns).trim() === String(correctAns).trim()) {
          isBenar = true;
        }
      }
      // 2. Tipe PG KOMPLEKS (Multi choice array)
      else if (q.tipe === 'PG_KOMPLEKS') {
        if (Array.isArray(userAns) && Array.isArray(correctAns)) {
          const sortedUser = [...userAns].sort();
          const sortedKey = [...correctAns].sort();
          if (JSON.stringify(sortedUser) === JSON.stringify(sortedKey)) {
            isBenar = true;
          }
        }
      }
      // 3. Tipe BENAR_SALAH
      else if (q.tipe === 'BENAR_SALAH') {
        // userAns format: { 0: "Benar", 1: "Salah", ... }
        // correctAns format: { 0: "Benar", 1: "Salah", ... }
        let allCorrect = true;
        for (const idx in correctAns) {
          if (userAns[idx] !== correctAns[idx]) {
            allCorrect = false;
            break;
          }
        }
        if (allCorrect) isBenar = true;
      }
      // 4. Tipe MENJODOHKAN
      else if (q.tipe === 'MENJODOHKAN') {
        // userAns format: { "A": "Pasangan 1", "B": "Pasangan 2" }
        let allMatch = true;
        for (const itemKey in correctAns) {
          if (userAns[itemKey] !== correctAns[itemKey]) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) isBenar = true;
      }

      if (isBenar) {
        perolehanSkor += q.bobot;
        benarCount++;
      } else {
        salahCount++;
      }
    }
  }

  // Hitung Nilai Skala 0 - 100
  const nilaiAkhir = totalBobot > 0 ? Math.round((perolehanSkor / totalBobot) * 100) : 0;
  const idHasil = 'RES-' + Utilities.getUuid().slice(0, 8);
  const waktuSubmit = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

  const rowData = [
    idHasil,
    id_ujian,
    id_siswa,
    nama_siswa,
    kelas,
    nilaiAkhir,
    benarCount,
    salahCount,
    Number(pelanggaran_count) || 0,
    JSON.stringify(jawaban),
    waktuSubmit
  ];

  sheetHasil.appendRow(rowData);

  return {
    success: true,
    message: 'Jawaban berhasil dikirim!',
    hasil: {
      nilai: nilaiAkhir,
      benar: benarCount,
      salah: salahCount,
      waktu: waktuSubmit
    }
  };
}

// ====================================================================
// FITUR REKAP NILAI (Guru / Admin)
// ====================================================================
function apiGetHasilUjian(ss, queryParams) {
  const sheet = ss.getSheetByName(SHEETS.HASIL_UJIAN);
  if (!sheet) return { success: true, data: [] };
  const rows = sheet.getDataRange().getValues();
  const list = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // idHasil, id_ujian, id_siswa, nama_siswa, kelas, nilai, benar, salah, pelanggaran, jawaban, waktu
    if (queryParams && queryParams.id_ujian && row[1] !== queryParams.id_ujian) continue;
    if (queryParams && queryParams.kelas && row[4] !== queryParams.kelas) continue;

    list.push({
      id: row[0],
      id_ujian: row[1],
      id_siswa: row[2],
      nama_siswa: row[3],
      kelas: row[4],
      nilai: row[5],
      benar: row[6],
      salah: row[7],
      pelanggaran: row[8],
      waktu_submit: row[10]
    });
  }
  return { success: true, data: list };
}

// ====================================================================
// UTILITAS
// ====================================================================
function safeJsonParse(str) {
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

/**
 * Otomatis membuat 4 sheet (Users, BankSoal, JadwalUjian, HasilUjian)
 * beserta data awal contoh jika belum tersedia di Google Spreadsheet.
 */
function ensureSheets(ss) {
  // 1. Sheet Users
  let sUsers = ss.getSheetByName(SHEETS.USERS);
  if (!sUsers) {
    sUsers = ss.insertSheet(SHEETS.USERS);
    sUsers.appendRow(['id', 'username', 'password', 'nama', 'role', 'kelas', 'status']);
    sUsers.appendRow(['USR-001', 'admin', 'admin123', 'Administrator MIN 2', 'admin', '-', 'Aktif']);
    sUsers.appendRow(['USR-002', 'guru1', 'guru123', 'Ustadz Ahmad, S.Pd.I', 'guru', '5A', 'Aktif']);
    sUsers.appendRow(['USR-003', 'siswa01', '123456', 'Muhammad Fatih', 'siswa', '5A', 'Aktif']);
    sUsers.appendRow(['USR-004', 'siswa02', '123456', 'Aisyah Humaira', 'siswa', '5A', 'Aktif']);
  }

  // 2. Sheet BankSoal
  let sSoal = ss.getSheetByName(SHEETS.BANK_SOAL);
  if (!sSoal) {
    sSoal = ss.insertSheet(SHEETS.BANK_SOAL);
    sSoal.appendRow(['id', 'mata_pelajaran', 'kelas', 'tipe', 'pertanyaan', 'opsi_data', 'kunci_jawaban', 'bobot', 'created_by']);
    sSoal.appendRow([
      'SOAL-001', 'Akidah Akhlak', '5A', 'PG', 
      'Rukun Iman yang pertama dan merupakan pondasi utama akidah Islam bagi seorang muslim adalah beriman kepada...', 
      JSON.stringify(['Allah Subhanahu Wa Ta\'ala', 'Malaikat-malaikat Allah', 'Kitab-kitab suci Allah', 'Hari Kiamat / Akhir zaman']), 
      JSON.stringify('Allah Subhanahu Wa Ta\'ala'), 
      20, 'guru1'
    ]);
    sSoal.appendRow([
      'SOAL-002', 'Fikih', '5A', 'PG_KOMPLEKS', 
      'Perhatikan amalan shalat berikut! Pilihlah 2 (dua) yang termasuk rukun shalat fardhu (jawaban benar lebih dari satu):', 
      JSON.stringify(['Membaca Niat dan Takbiratul Ihram', 'Membaca Surat Pendek setelah Al-Fatihah', 'Membaca Surat Al-Fatihah', 'Mengusap kedua telinga']), 
      JSON.stringify(['Membaca Niat dan Takbiratul Ihram', 'Membaca Surat Al-Fatihah']), 
      25, 'guru1'
    ]);
    sSoal.appendRow([
      'SOAL-003', 'Sejarah Kebudayaan Islam (SKI)', '5A', 'BENAR_SALAH', 
      'Tentukan Benar atau Salah pada setiap pernyataan sejarah Islam di bawah ini!', 
      JSON.stringify([
        { id: 0, text: 'Nabi Muhammad SAW dilahirkan di Kota Makkah pada Tahun Gajah.' },
        { id: 1, text: 'Wahyu Al-Qur\'an pertama kali diturunkan di Gua Tsur.' },
        { id: 2, text: 'Kota tujuan hijrah kaum muslimin pertama kali dipimpin Nabi adalah Madinah (Yatsrib).' }
      ]), 
      JSON.stringify({ '0': 'Benar', '1': 'Salah', '2': 'Benar' }), 
      25, 'guru1'
    ]);
    sSoal.appendRow([
      'SOAL-004', 'Bahasa Arab', '5A', 'MENJODOHKAN', 
      'Jodohkanlah kosa kata benda di lingkungan madrasah berikut dengan artinya dalam Bahasa Indonesia yang tepat!', 
      JSON.stringify({
        kiri: ['Madrasatun ( مَدْرَسَةٌ )', 'Faslun ( فَصْلٌ )', 'Kitabun ( كِتَابٌ )', 'Ustadzun ( أُسْتَاذٌ )'],
        kanan: ['Sekolah / Madrasah', 'Ruang Kelas', 'Buku Pelajaran', 'Bapak Guru']
      }), 
      JSON.stringify({
        'Madrasatun ( مَدْرَسَةٌ )': 'Sekolah / Madrasah',
        'Faslun ( فَصْلٌ )': 'Ruang Kelas',
        'Kitabun ( كِتَابٌ )': 'Buku Pelajaran',
        'Ustadzun ( أُسْتَاذٌ )': 'Bapak Guru'
      }), 
      30, 'guru1'
    ]);
  }

  // 3. Sheet JadwalUjian
  let sJadwal = ss.getSheetByName(SHEETS.JADWAL_UJIAN);
  if (!sJadwal) {
    sJadwal = ss.insertSheet(SHEETS.JADWAL_UJIAN);
    sJadwal.appendRow(['id', 'judul', 'mata_pelajaran', 'kelas', 'durasi', 'token', 'status', 'soal_ids', 'tgl_mulai', 'tgl_selesai', 'created_by']);
    sJadwal.appendRow([
      'UJN-001', 'Asesmen Madrasah Semester Genap (PAI & Bahasa Arab)', 'Pendidikan Agama Islam & B. Arab', '5A', 45, 'MIN2SBY', 'Aktif',
      JSON.stringify(['SOAL-001', 'SOAL-002', 'SOAL-003', 'SOAL-004']), '2026-10-01', '2026-10-31', 'guru1'
    ]);
  }

  // 4. Sheet HasilUjian
  let sHasil = ss.getSheetByName(SHEETS.HASIL_UJIAN);
  if (!sHasil) {
    sHasil = ss.insertSheet(SHEETS.HASIL_UJIAN);
    sHasil.appendRow(['id', 'id_ujian', 'id_siswa', 'nama_siswa', 'kelas', 'nilai', 'benar', 'salah', 'pelanggaran', 'jawaban_json', 'waktu_submit']);
  }
}
