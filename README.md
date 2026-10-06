# CBT MIN 2 Kota Surabaya - Sistem Ujian Berbasis Komputer & Asesmen Madrasah

Aplikasi ujian online modern, responsif, dan ringan yang dirancang khusus untuk siswa **MIN 2 Kota Surabaya**. Dapat di-deploy secara **100% GRATIS** di **GitHub Pages** dan terintegrasi langsung dengan **Google Spreadsheet** sebagai database melalui Google Apps Script.

---

## 🌟 Fitur Utama

1. **Multi-Role Login**:
   - 👑 **Admin**: Manajemen data akun guru & siswa, monitoring statistik, pengaturan koneksi Google Spreadsheet.
   - 👨‍🏫 **Guru**: Bank soal lengkap (4 model), manajemen jadwal & token ujian, serta rekapitulasi nilai + ekspor ke Excel (CSV).
   - 🎓 **Siswa**: Ruang ujian CBT yang fokus, timer hitung mundur, status ragu-ragu, palet nomor soal, dan nilai langsung keluar otomatis.
2. **4 Model Soal Standar Asesmen Madrasah / ANBK**:
   - 🔘 **Pilihan Ganda (PG)**: Memilih 1 opsi benar dengan tombol bulat sentuh besar.
   - ☑️ **Pilihan Ganda Kompleks (PG Kompleks)**: Memilih lebih dari 1 jawaban yang benar (Checklist).
   - ⚖️ **Benar / Salah**: Menilai pernyataan benar atau salah per butir baris.
   - 🔗 **Menjodohkan**: Memilih pasangan yang cocok antara kolom kiri dan kanan.
3. **Fitur Keamanan Anti-Curang (Anti-Cheat)**:
   - Mendeteksi ketika siswa berpindah tab browser, meminimize jendela, atau membuka aplikasi lain.
   - Menghitung jumlah pelanggaran dan menampilkan peringatan tata tertib.
   - Mematikan klik kanan (*context menu*).
4. **Tahan Gangguan Jaringan (Offline-Resilient)**:
   - Jawaban otomatis tersimpan seketika di `localStorage` siswa.
   - Jika koneksi internet terputus atau halaman tidak sengaja ter-refresh, siswa dapat melanjutkan ujian tanpa kehilangan jawaban!

---

## 🚀 Uji Coba Cepat (Demo Mode)

Aplikasi ini sudah dilengkapi **Mode Demo Lokal** bawaan. Anda dapat langsung membuka file `index.html` di browser tanpa konfigurasi apapun!

### Akun Uji Coba:
| Role | Username | Password | Keterangan |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Akses penuh manajemen pengguna |
| **Guru** | `guru1` | `guru123` | Membuat soal & jadwal ujian |
| **Siswa** | `siswa01` | `123456` | Siswa Kelas 5A (Token: `MIN2SBY`) |
| **Siswa** | `siswa02` | `123456` | Siswa Kelas 5A |

*(Tersedia tombol pintas klik cepat di halaman login untuk langsung masuk tanpa mengetik!)*

---

## 📊 Menghubungkan ke Google Spreadsheet

1. Buka [Google Sheets](https://sheets.new) dan buat spreadsheet baru dengan 4 tab sheet: `Users`, `BankSoal`, `JadwalUjian`, dan `HasilUjian`.
2. Format kolom dapat dilihat secara lengkap pada file [`google-apps-script/SPREADSHEET_TEMPLATE.md`](google-apps-script/SPREADSHEET_TEMPLATE.md).
3. Buka menu **Ekstensi > Apps Script**, lalu salin seluruh isi file [`google-apps-script/Code.gs`](google-apps-script/Code.gs) ke editor script Google.
4. Klik **Terapkan (Deploy)** > **Penerapan Baru (New deployment)** > Pilih jenis **Aplikasi Web (Web app)**:
   - **Execute as:** `Me` (email Anda)
   - **Who has access:** `Anyone` (Siapa saja)
5. Salin URL Web App yang berakhiran `/exec`.
6. Hubungkan ke aplikasi web dengan salah satu cara berikut:
   - **Cara 1 (Tanpa ubah kode):** Login sebagai **Admin** di web CBT, tempelkan URL tersebut pada kolom *Koneksi Database Google Spreadsheet*, lalu klik **Simpan & Hubungkan**.
   - **Cara 2:** Buka file `js/config.js` lalu ubah nilai `API_URL` dengan URL tersebut.

---

## 🌐 Cara Memasang (Deploy) ke GitHub Pages

Ada 2 cara mudah untuk mengunggah proyek ini ke GitHub:

### Cara 1: Lewat Web GitHub (Paling Mudah & Cepat Tanpa Perlu Install Git)
1. Buka [GitHub.com](https://github.com) dan login ke akun Anda.
2. Buat repositori baru dengan mengklik **New** (beri nama misalnya: `cbt-min2-surabaya`).
3. Pilih **Public**, lalu centang **Add a README file** (atau langsung klik **Create repository**).
4. Di halaman repositori baru Anda, klik tombol **Add file** > pilih **Upload files**.
5. Buka folder proyek di komputer Anda:
   `C:\Users\LENOVO\.gemini\antigravity\scratch\cbt-min2-surabaya`
6. Tarik (drag & drop) seluruh file dan folder (`index.html`, `README.md`, folder `css`, `js`, `google-apps-script`) ke kotak upload di browser GitHub.
7. Klik tombol hijau **Commit changes**.
8. Masuk ke menu **Settings** (di tab atas repositori) > klik menu **Pages** di sebelah kiri.
9. Pada bagian **Branch**, pilih **main** (atau **master**) dan folder **/ (root)**, lalu klik **Save**.
10. Tunggu sekitar 1-2 menit, web ujian Anda sudah langsung aktif dan dapat diakses di:
    `https://USERNAME-ANDA.github.io/cbt-min2-surabaya/`

---

### Cara 2: Lewat Git Terminal (Bagi yang Terbiasa dengan Git CLI)
```bash
git init
git add .
git commit -m "CBT MIN 2 Kota Surabaya Terhubung Google Spreadsheet"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/cbt-min2-surabaya.git
git push -u origin main
```

---

## 📁 Struktur Direktori Proyek

```text
cbt-min2-surabaya/
├── index.html                 # Antarmuka Single Page App CBT
├── css/
│   └── custom.css             # Styling kustom & font Plus Jakarta Sans
├── js/
│   ├── config.js              # Konfigurasi nama sekolah & URL Web App Google
│   ├── api.js                 # API handler (GAS & LocalStorage Mock DB)
│   ├── auth.js                # Autentikasi dan sesi login
│   ├── admin.js               # Fitur dashboard admin & kelola user
│   ├── guru.js                # Fitur dashboard guru (4 model soal & rekap)
│   └── ujian.js               # Mesin ujian siswa (Timer, Anti-curang, Palet)
├── google-apps-script/
│   ├── Code.gs                # Kode backend Google Sheets (API Restful)
│   └── SPREADSHEET_TEMPLATE.md# Panduan kolom & data awal Google Sheets
└── README.md                  # Dokumentasi ini
```
