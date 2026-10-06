/**
 * ====================================================================
 * KONFIGURASI CBT MIN 2 KOTA SURABAYA
 * ====================================================================
 */

const CONFIG = {
  // NAMA SEKOLAH & APLIKASI
  APP_NAME: "CBT MIN 2 Kota Surabaya",
  SUB_TITLE: "Sistem Asesmen Berbasis Komputer & Madrasah Digital",
  KOTA: "Kota Surabaya",

  // URL WEB APP GOOGLE APPS SCRIPT
  // Terhubung langsung ke database Google Spreadsheet MIN 2 Kota Surabaya
  API_URL: "https://script.google.com/macros/s/AKfycbzeiD_4x057nOxCgec8esXtOjLENMzDlVV9UpWruDK2Gy5on7cHOHXY0hEgPDHJAFpl/exec",

  // KETIKA BELUM ADA GOOGLE APPS SCRIPT (MODAL DEMO LOKAL OTOMATIS AKTIF)
  DEMO_MODE_DEFAULT: false,

  // SETELAN UJIAN
  ANTI_CHEAT_ACTIVE: true, // Peringatan saat ganti tab / minimize
  MAX_TOLERANSI_CURANG: 3,  // Batas toleransi ganti tab sebelum peringatan keras
  AUTO_SAVE_INTERVAL: 1000 // Milidetik (Auto-save jawaban ke LocalStorage)
};

// Cek apakah mode demo aktif
function isDemoMode() {
  return !CONFIG.API_URL || CONFIG.API_URL.includes("SAMPLE_DEPLOYMENT_ID");
}
