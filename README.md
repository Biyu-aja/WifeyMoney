# 💸 WifeyMoney

**WifeyMoney** adalah aplikasi manajemen keuangan pribadi bergaya *gamified* dengan bumbu komedi, di mana kamu dicatat dan dievaluasi oleh karakter AI "Savage" yang akan me-roast atau memuji kebiasaan belanjamu.

Aplikasi ini mengusung privasi maksimal — seluruh data transaksi bulananmu tidak pernah keluar dari perangkatmu (**Zero-Database Cloud**). AI hanya menerima ringkasan angka secara otomatis, menjadikannya cepat, ringan, dan aman.

![Status](https://img.shields.io/badge/Status-Active-success)
![React](https://img.shields.io/badge/Frontend-React_Vite-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node_Express-339933?logo=nodedotjs)
![PWA](https://img.shields.io/badge/App-PWA_Ready-blueviolet)

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 📊 **Tracker Keuangan Luring** | Catat pemasukan & pengeluaran secepat kilat. Data 100% tersimpan di Local Storage perangkatmu. |
| 🤖 **AI Roasting (Quick & Deep)** | Sentilan pedas, lucu, atau pujian berdasarkan analisis finansial bulan ini dan transaksi terakhirmu. |
| 🎨 **Kustomisasi Karakter AI** | Upload foto/waifu sendiri, atur prompt wataknya, pasang foto ekspresi — semua tersimpan via **OPFS** tanpa menyita kuota storage web biasa. |
| 🎚️ **Mode Manajemen Dual** | Pakai mode **Target Budget Bulanan** yang ketat, atau **Free Flow Tracker** tanpa batasan budget. |
| 📱 **Progressive Web App (PWA)** | Install langsung via *Add to Home Screen* di Android & iOS — tanpa App Store, tampil layaknya aplikasi native. |

---

## 🏗️ Struktur Proyek

WifeyMoney menggunakan arsitektur **Monorepo** sederhana dengan dua bagian yang terpisah secara teknis:

```
WifeyMoney/
├── fe/   # Frontend — React TypeScript, Vite, Tailwind CSS v4
└── be/   # Backend  — Express JS (Serverless), AI Gateway Bridge
```

> Masuk ke masing-masing folder untuk membaca `README.md` yang lebih mendalam seputar teknis kode di sisi Frontend dan Backend.

---

## 🚀 Panduan Memulai (Local Development)

Kamu butuh **dua terminal** yang berjalan bersamaan — satu untuk Frontend, satu untuk Backend.

### 1. Backend (AI Bridge)

```bash
cd be
npm install
```

Buat file `.env` di folder `/be`:

```env
AI_GATEWAY=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-...
AI_MODEL=nama/model
```

```bash
npm run dev
```

Backend akan berjalan di `http://localhost:3001`.

---

### 2. Frontend (UI Aplikasi)

Buka terminal baru:

```bash
cd fe
npm install
```

Buat file `.env` di folder `/fe` *(opsional — jika tidak ada, akan memakai proxy Vite bawaan)*:

```env
VITE_API_URL=http://localhost:3001
```

```bash
npm run dev
```

Buka `http://localhost:5173` di browser. WifeyMoney siap dipakai! ✨

---

*A financial health app that hits you hard with reality, built over a weekend.* 💜
