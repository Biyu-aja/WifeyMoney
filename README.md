# 💸 WifeyMoney

**WifeyMoney** adalah aplikasi manajemen keuangan pribadi (Personal Finance) bergaya *gamified* dengan bumbu komedi, di mana kamu dicatat dan dievaluasi oleh karakter AI "Savage" yang akan me-roast atau memuji kebiasaan belanjamu.

Aplikasi ini mengusung privasi maksimal; seluruh data transaksi bulananmu tidak pernah keluar dari perangkatmu (Zero-Database Cloud). AI hanya menerima ringkasan perhitungan angka secara otomatis, menjadikannya cepat, ringan, dan aman.

![WifeyMoney Banner](https://img.shields.io/badge/Status-Active-success)
![React](https://img.shields.io/badge/Frontend-React_Vite-61DAFB?logo=react)
![NodeJS](https://img.shields.io/badge/Backend-Node__Express-339933?logo=nodedotjs)
![PWA Ready](https://img.shields.io/badge/App-PWA_Ready-blueviolet)

## 📌 Fitur Utama
- 📊 **Tracker Keuangan Luring:** Catat uang masuk dan keluar secepat kilat (Data 100% melingkar di Local Storage HP/PC).
- 🤖 **Fitur AI Roasting (Quick & Deep):** Dapatkan sentilan pedas, lucu, atau pujian berdasarkan analis finansial bulan ini dan transaksi terakhirmu.
- 🎨 **Kustomisasi Karakter AI:** Bosan dengan karakter *default*? Kamu bisa masuk ke Lab Pembuat Karakter, mengupload foto/waifu kamu sendiri, mengatur *prompt* wataknya sendiri, hingga memasang foto ekspresinya yang akan tersimpan menggunakan **OPFS (Origin Private File System)** tanpa menyita kuota memori web biasa!
- 🎚️ **Mode Manajemen Dual:** Kamu bisa memakai mode "Target Budget Bulanan" yang ketat, atau sekadar mode "Free Flow Tracker" dengan mematikan Budget di pengaturan.
- 📱 **Progressive Web App (PWA):** Dapat di-_install_ (Add to Home Screen) layaknya sebuah aplikasi asli di Android dan iOS tanpa melewati App Store/Play Store (dengan tampilan UI layaknya aplikasi standar!).

## 🏗️ Struktur Proyek
WifeyMoney dirancang menggunakan konsep _Monorepo_ sederhana yang dibagi menjadi dua bagian terpisah secara teknis dan proses.

- **`/fe`**: *Frontend* - Antarmuka pengguna (React TypeScript, Vite, Tailwind CSS V4).
- **`/be`**: *Backend* - Otak Jembatan API (Express JS Serverless) untuk menyambungkan hasil perhitungan dan meramunya ke dalam Prompt untuk AI Gateway Model (OpenRouter/OpenAI-like).

_(Silakan masuk ke folder masing-masing untuk membaca `README.md` yang lebih mendalam seputar teknis kode di sisi Frontend dan Backend)._

## 🚀 Panduan Memulai Cepat (Local Development)

Kamu butuh menjalankan dua terminal (satu untuk FE, satu untuk BE).

### 1. Menjalankan Backend (Jembatan AI)
```bash
cd be
npm install

# Buat file .env dan isi dengan:
# AI_GATEWAY=https://openrouter.ai/api/v1
# AI_API_KEY=sk-or-...
# AI_MODEL=nama/model

npm run dev
```
Server Backend akan menyala di `http://localhost:3001`

### 2. Menjalankan Frontend (UI Aplikasi)
Buka tab terminal baru:
```bash
cd fe
npm install

# Buat file .env dan isikan (bila tak ada, akan pakai proxy Vite bawaan):
# VITE_API_URL=http://localhost:3001

npm run dev
```

Kini kamu tinggal membuka `http://localhost:5173` di browser-mu, WifeyMoney siap dipakai! ✨

---
_A financial health app that hits you hard with reality, built over a weekend._ 💜
