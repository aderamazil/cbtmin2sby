# Panduan Struktur Google Spreadsheet & Setup Backend

Panduan ini menjelaskan cara membuat database Google Sheets untuk **CBT MIN 2 Kota Surabaya** dan menghubungkannya dengan Google Apps Script.

---

## 1. Buat Google Spreadsheet Baru

1. Buka [Google Sheets](https://sheets.new) di browser Anda.
2. Beri nama file, misalnya: `DATABASE CBT MIN 2 KOTA SURABAYA`.
3. Buat 4 buah Sheet (Tab) di bagian bawah dengan nama yang persis sama berikut ini:
   - `Users`
   - `BankSoal`
   - `JadwalUjian`
   - `HasilUjian`

---

## 2. Struktur Kolom Tiap Sheet

### Sheet 1: `Users`
Baris pertama (Header):
| A (id) | B (username) | C (password) | D (nama) | E (role) | F (kelas) | G (status) |
|---|---|---|---|---|---|---|
| USR-001 | admin | admin123 | Administrator MIN 2 | admin | - | Aktif |
| USR-002 | guru1 | guru123 | Ustadz Ahmad, S.Pd.I | guru | 5A | Aktif |
| USR-003 | siswa01 | 123456 | Muhammad Fatih | siswa | 5A | Aktif |
| USR-004 | siswa02 | 123456 | Aisyah Humaira | siswa | 5A | Aktif |

*Keterangan role: `admin`, `guru`, atau `siswa`.*

---

### Sheet 2: `BankSoal`
Baris pertama (Header):
| A (id) | B (mata_pelajaran) | C (kelas) | D (tipe) | E (pertanyaan) | F (opsi_data) | G (kunci_jawaban) | H (bobot) | I (created_by) |
|---|---|---|---|---|---|---|---|---|
| SOAL-001 | Akidah Akhlak | 5A | PG | Rukun iman yang pertama adalah iman kepada... | `["Allah SWT","Malaikat","Kitab","Rasul"]` | `"Allah SWT"` | 10 | guru1 |
| SOAL-002 | Fikih | 5A | PG_KOMPLEKS | Manakah yang termasuk rukun shalat fardhu? (Pilih 2) | `["Niat","Takbiratul Ihram","Makan kurma","Bersiul"]` | `["Niat","Takbiratul Ihram"]` | 15 | guru1 |
| SOAL-003 | Sejarah Kebudayaan Islam | 5A | BENAR_SALAH | Tentukan Benar atau Salah pernyataan berikut! | `[{"t":"Nabi Muhammad SAW lahir di Kota Makkah"},{"t":"Nabi Muhammad SAW wafat di Kota Kairo"}]` | `{"0":"Benar","1":"Salah"}` | 15 | guru1 |
| SOAL-004 | Bahasa Arab | 5A | MENJODOHKAN | Jodohkan kosa kata berikut dengan artinya yang tepat! | `{"kiri":["Madrasatun","Ustadzun","Kitabun"],"kanan":["Sekolah","Guru","Buku"]}` | `{"Madrasatun":"Sekolah","Ustadzun":"Guru","Kitabun":"Buku"}` | 20 | guru1 |

---

### Sheet 3: `JadwalUjian`
Baris pertama (Header):
| A (id) | B (judul) | C (mata_pelajaran) | D (kelas) | E (durasi) | F (token) | G (status) | H (soal_ids) | I (tgl_mulai) | J (tgl_selesai) | K (created_by) |
|---|---|---|---|---|---|---|---|---|---|---|
| UJN-001 | Asesmen Madrasah Semester Genap | PAI & Bahasa Arab | 5A | 60 | MIN2SBY | Aktif | `["SOAL-001","SOAL-002","SOAL-003","SOAL-004"]` | 2026-10-06 | 2026-10-10 | guru1 |

---

### Sheet 4: `HasilUjian`
Baris pertama (Header):
| A (id) | B (id_ujian) | C (id_siswa) | D (nama_siswa) | E (kelas) | F (nilai) | G (benar) | H (salah) | I (pelanggaran) | J (jawaban_json) | K (waktu_submit) |
|---|---|---|---|---|---|---|---|---|---|---|
*(Sheet ini akan terisi otomatis setiap kali siswa menyelesaikan ujian)*

---

## 3. Cara Memasang Google Apps Script

1. Di dalam Google Spreadsheet Anda, klik menu **Ekstensi (Extensions)** > **Apps Script**.
2. Hapus semua kode bawaan di file `Code.gs`.
3. Buka file `Code.gs` dari folder proyek ini, lalu salin (**Copy**) dan tempel (**Paste**) seluruh isinya.
4. Klik tombol **Simpan (Save)** (ikon disket).
5. Klik tombol **Terapkan (Deploy)** di pojok kanan atas > pilih **Penerapan Baru (New deployment)**.
6. Klik ikon gerigi (Select type) > pilih **Aplikasi Web (Web app)**.
7. Isi form:
   - **Deskripsi:** CBT MIN 2 Surabaya Backend API
   - **Jalankan sebagai (Execute as):** Saya (email Anda / `Me`)
   - **Siapa yang memiliki akses (Who has access):** **Siapa saja (Anyone)** *(Penting agar browser siswa bisa mengirim jawaban)*
8. Klik **Terapkan (Deploy)**.
9. Berikan izin akses Google (Pilih email Anda > Klik *Advanced* > Klik *Go to CBT MIN 2 (unsafe)* > Klik *Allow*).
10. Salin **URL Aplikasi Web (Web App URL)** yang berakhiran `/exec`.
11. Tempel URL tersebut ke file `js/config.js` di baris `API_URL: "URL_ANDA_DISINI"`.
