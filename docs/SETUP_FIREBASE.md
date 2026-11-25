# Firebase Setup Guide — Project Lumos (Spark Free / $0)

Panduan cepat (~2 menit) untuk menyambungkan Project Lumos ke project Firebase baru. **Tidak perlu kartu kredit (Spark Plan gratis).**

---

## 1. Buat Firebase Project Baru
1. Buka [Firebase Console](https://console.firebase.google.com/) → klik **Create a project** (misal `project-lumos`).
2. Google Analytics boleh dimatikan biar lebih cepat → klik **Create project**.

## 2. Aktifkan Authentication (Google Sign-In)
1. Di sidebar kiri: **Build → Authentication → Get started**.
2. Tab **Sign-in method** → klik **Google** → **Enable**.
3. Pilih email support → **Save**.

## 3. Aktifkan Cloud Firestore
1. Di sidebar kiri: **Build → Firestore Database → Create database**.
2. Pilih lokasi terdekat (misal `asia-southeast2` Jakarta atau `asia-southeast1` Singapore).
3. Pilih **Start in production mode** → **Create**.

## 4. Siapkan Config Lokal (`.env`, `firestore.rules`, `.firebaserc`)
1. Klik ikon ⚙️ (**Project settings**) → bagian **Your apps** → klik ikon Web `</>` → daftarkan app `lumos-web`.
2. Salin `src/web/.env.example` menjadi `src/web/.env` lalu isi nilai `firebaseConfig`:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_ALLOWED_EMAIL=your-email@gmail.com
   ```
3. Salin `firestore.rules.example` → `firestore.rules` dan ganti `YOUR_EMAIL@gmail.com` dengan email Google kamu.
4. Salin `.firebaserc.example` → `.firebaserc` dan ganti `your-firebase-project-id` dengan Firebase Project ID kamu.

## 5. Ambil Service Account JSON untuk Laptop Watcher
1. Masih di **Project settings** → tab **Service accounts**.
2. Klik **Generate new private key** → **Generate key** (akan mengunduh file `.json`).
3. Simpan/rename file JSON tersebut menjadi:
   ```text
   src/watcher/service-account.json
   ```
   *(File ini otomatis di-ignore oleh `.gitignore` dan tidak akan pernah ter-commit.)*

## 6. Deploy & Nyalakan Watcher Always-On
Jalankan di root repository:
```powershell
npm install
npx firebase-tools login
npm run deploy           # build PWA + deploy Hosting & Firestore Rules
npm run watcher:install  # daftarkan auto-start Windows & langsung nyalakan watcher
```

Buka URL `https://<your-project-id>.web.app` di HP → Login Google → *Add to Home Screen*.

### Kontrol Watcher Kapan Saja
- `npm run watcher:status` — cek status watcher, auto-start, & jumlah memo `#agy` pending.
- `npm run watcher:stop` — matikan watcher & nonaktifkan auto-start.
- `npm run watcher:start` — hidupkan lagi & aktifkan kembali auto-start.
- `npm run inbox:list` — lihat semua memo `#agy` yang masih pending.
- `npm run inbox:toast` — tes native Windows Toast notification.
