# 💸 WifeyMoney - Frontend

WifeyMoney adalah aplikasi manajemen keuangan pribadi (*Personal Finance*) yang dibalut dengan fitur **Karakter AI Savage** sebagai pengawas keuangan. Aplikasi ini menonjolkan privasi maksimal karena **seluruh data transaksi dan gambar/avatar disimpan secara LOKAL** menggunakan sistem OPFS Browser API dan Local Storage.

Selain fitur utama pencatatan keuangan bulanan dan analitik, kamu bisa mengobrol atau *"di-roast"* oleh karakter AI (dengan persona yang bisa dimodifikasi!) apabila kamu terlalu boros menggunakan uangmu. 

Sudah mendukung **Progressive Web App (PWA)** sehingga bisa langsung di-install di layar *home screen* Handphone (Android iOS) seperti aplikasi standar asalkan dikunjungi menggunakan Browser!

---

## 🛠️ Tech Stack
- **Framework Utama:** React + TypeScript (Vite)
- **Styling:** Tailwind CSS V4
- **Database (Privasi Lokal):** 
  - `localStorage` untuk teks dan transaksi
  - OPFS (*Origin Private File System*) untuk penyimpanan file besar seperti Avatar dan Ekspresi wajah tanpa menyita *Quota Limit* web standar.
- **Icongraphy:** Lucide React
- **PWA:** vite-plugin-pwa

---

## 🚀 Instalasi & Menjalankan Lokal (Development)

1. Pastikan kamu sudah berada di *directory* `fe/` lalu jalankan instalasi Node modules.
```bash
npm install
```

2. Konfigurasi **Environment Variables**. 
Coba gandakan atau buat file baru bernama `.env`:
```env
VITE_API_URL=http://localhost:3001
```
*(Catatan: Biarkan kosong jika kamu sekadar menggunakan proxy web dev bawaan vite, dan isi URL Render API-mu saat sudah di-deploy)*

3. Jalankan *Development Server*.
```bash
npm run dev
```
*(Bila kamu ingin mencoba meng-install PWA-nya di HP secara langsung lewat jaringan Wi-Fi rumah, jalankan `npm run dev -- --host` dan buka IP Address Network-mu di HP).*

---

## 📦 Build untuk Production (Vercel)

Karena semua database di-_host_ secara lokal pada browser milik User (Browser Storage), maka mendeploy aplikasi ini gratis selamanya menggunakan layanan _static-hosting_ seperti Vercel, Netlify, atau Cloudflare Pages.

1. Hubungkan integrasi GitHub kamu dengan Vercel.
2. Atur **Root Directory** ke folder `fe`.
3. Sisipkan _Environment Variables_:
   - Key: `VITE_API_URL`
   - Value: `https://link-wifeymoney-backend-kamu.onrender.com`
4. Tekan **Deploy**!

---

## 🔒 Catatan Keamanan / OPFS
Seluruh fitur "Edit Karakter" (seperti mengunggah wajah sedih, senang, dan marah) tidak pernah mengirim file apa pun ke *server backend*. Semua foto di-_crop_, diproses, dan disimpan sepenuhnya di memori internal Handphone atau Komputer yang digunakan (Origin Private File System).
