# 💸 WifeyMoney - Backend

Backend mikro dari **WifeyMoney** ini bertanggung jawab penuh sebagai "Jembatan Otak" antara aplikasi (Frontend) dengan server API AI (LLM / GPT-like models).

Karena aplikasi WifeyMoney dirancang sebagai layanan berbasis **Privasi (Lokal / No-DB)**, maka _Backend_ ini **tidak memiliki Database** sama sekali! Node Express server ini 100% *stateless* dan hanya memproses hitungan data *expenses* (yang dikirim langsung oleh *Frontend*) lalu mengubahnya jadi format *Prompt* instruksi Roleplay ke mesin AI.

Terdapat dua layanan utama aplikasi:
1. `/api/quick-roast`: Menghasilkan balasan ucapan "celotehan" 1-2 kalimat (sebentuk notifikasi pendek) beserta ekspresi emosinya saat tombol avatar ditekan di layar Dashboard. Termasuk memberikan sentilan bila ada 5 tagihan/transaksi nyeleneh terbaru.
2. `/api/roast`: Menghasilkan ulasan makian *roasting* finansial penuh sepanjang 3-5 kalimat, lengkap dengan *"Score Finansial"* dan rekomendasi kejam berdasarkan analitik bulanan pengguna. 

---

## 🛠️ Tech Stack
- **Framework:** Node.js Express (TypeScript)
- **Modul AI:** API Fetcher standar (dikustomisasi agar mendukung berbagai Model Gateway, seperti OpenAI, OpenRouter API, dll).

---

## 🚀 Instalasi & Menjalankan Lokal

1. Masuk ke dalam direktori `be/` dan instal ketergantungan paket-paket NodeJS.
```bash
npm install
```

2. Buat file `.env` di _root_ direktori backend kamu (`be/.env`) yang berisi konfigurasi AI Gateway. Contoh strukturnya:
```env
PORT=3001
AI_GATEWAY=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxx
AI_MODEL=nousresearch/hermes-3-llama-3.1-405b
```

3. Jalankan server di *Development Mode* dengan fasilitas *hot-reload*.
```bash
npm run dev
```

Server kini akan mendengarkan port `3001`. Silakan sambungkan *Frontend* WifeyMoney kamu kemari!

---

## 🌐 Saran Deployment Production
Idealnya _backend_ ringan dan tanpa database begini ditaruh menggunakan servis "Serverless" atau kontainer platform gratis yang bisa menyala 24/7 jika diperlukan:

- **Render.com** (Web Service, Paling direkomendasikan & kompatibel).
- **Railway.app**

**Catatan Deploy:**
Pastikan saat melakukan konfigurasi Build/Install di panel _deployment_ Render/Railway, *command* yang dimasukkan adalah:
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start` 
(Jangan lupa salin nilai _Environment Variables_ AI kamu di Menu Dashboard _hosting_-nya!).
