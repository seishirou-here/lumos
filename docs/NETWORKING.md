# Project Lumos - Networking Architecture (`docs/NETWORKING.md`)

**Document:** Networking & Connectivity Specification  
**Status:** Approved & Finalized  
**Primary Solution:** Direct Local LAN (Wi-Fi / Mobile Hotspot / mDNS) & Offline-First Sync  
**Authors:** Papa (Seishirou) & Lumi  

---

## 1. Overview & Architectural Philosophy

Project Lumos mengadopsi arsitektur jaringan **Direct Local Network (LAN / Wi-Fi / Hotspot)** murni tanpa ketergantungan pada layanan VPN/mesh pihak ketiga seperti Tailscale.

### Prinsip Utama:
1. **Zero Third-Party Dependency:** Komunikasi data sepenuhnya berada di bawah kendali Papa (HP langsung ke Laptop host). Tidak bergantung pada server koordinasi eksternal, akun cloud, atau pihak ketiga.
2. **True Offline & Intranet Resilience:** Sistem tetap berfungsi penuh meskipun koneksi internet publik mati. Cukup terhubung ke router Wi-Fi lokal yang sama atau tethering Mobile Hotspot langsung dari HP ke Laptop.
3. **Ultra-Low Latency:** Data ditransfer langsung melalui jaringan lokal berkecepatan tinggi tanpa routing VPN keluar.
4. **Local CalDAV & Data Sovereignty:** Server Radicale CalDAV dan database SQLite berjalan langsung pada host laptop, menjamin privasi penuh untuk catatan dan kalender akademik Papa.

---

## 2. Network Topology & Addressing

```text
┌────────────────────────────────────────────────────────┐
│                    HP Papa (Client)                    │
│                                                        │
│  - Lumos PWA (Mobile Browser / Installed App)          │
│  - Native Calendar App (iOS Calendar / Android DAVx⁵)  │
└───────────────────────────┬────────────────────────────┘
                            │
               Koneksi Wi-Fi LAN / Hotspot
             (Subnet Lokal: 192.168.x.x / mDNS)
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Laptop Papa (Host)                   │
│                                                        │
│  ┌──────────────────────────┐┌───────────────────────┐ │
│  │ Lumos Bridge Server      ││ Radicale CalDAV Daemon│ │
│  │ Port: 3030 (REST & SSE)  ││ Port: 5232 (CalDAV)   │ │
│  └──────────────────────────┘└───────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │ SQLite Archive: lumos.db (WAL Mode)               │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Metode Resolusi Alamat (Addressing):

| Metode | Format URL / Endpoint | Keunggulan |
| :--- | :--- | :--- |
| **mDNS (ZeroConf)** | `http://<nama-laptop>.local:3030` | Nama host stabil tanpa perlu menghafal IP (`dan-laptop.local`). Didukung native di iOS, Android modern, dan Windows. |
| **Static LAN IP** | `http://192.168.x.x:3030` | Alamat IP lokal laptop yang direservasi melalui DHCP router rumah/kost. |
| **Hotspot Tethering** | `http://192.168.43.x:3030` | Koneksi langsung saat di luar ruangan (HP mengaktifkan hotspot, laptop tersambung). |
| **Radicale CalDAV** | `http://<nama-laptop>.local:5232` | Endpoint CalDAV untuk sinkronisasi agenda dan kalender. |

---

## 3. PWA & HTTPS di Jaringan Lokal

Browser modern membatasi fitur Progressive Web App (seperti Service Worker dan Cache Storage) hanya pada **Secure Context** (`localhost` atau `https://`). Untuk pemakaian mobile di jaringan lokal:

### Solusi yang Didukung:

1. **Local Reverse Proxy dengan SSL (Rekomendasi untuk Produksi):**
   - Menggunakan reverse proxy lokal ringan seperti **Caddy** atau **Nginx** di laptop dengan sertifikat SSL lokal yang dibuat via `mkcert`.
   - Menghasilkan URL HTTPS lokal valid: `https://dan-laptop.local:3030` tanpa peringatan browser.
2. **Flag Browser Mobile (Pengembangan & Testing Cepat):**
   - Pada Google Chrome Android, buka `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
   - Masukkan origin HTTP lokal (misal: `http://192.168.1.50:3030`), restart browser, dan PWA Service Worker akan langsung aktif tanpa sertifikat SSL.
3. **Tunnel Pribadi Opsional (Akses Jarak Jauh Di Luar LAN):**
   - Jika Papa membutuhkan akses saat laptop ditinggal di rumah dan HP di luar jangkauan Wi-Fi, dapat dipasangkan Cloudflare Tunnel (`cloudflared`) atau reverse SSH/bore pribadi tanpa perlu mengubah kode internal Lumos.

---

## 4. Siklus Sinkronisasi Offline-to-Online

```text
[ HP Menangkap Ide di Luar Jangkauan ]
                  │
                  ▼
[ Tersimpan di IndexedDB (Status: pending) ]
                  │
                  ▼
[ HP Terhubung ke Wi-Fi / Hotspot Laptop ]
                  │
                  ├──► PWA Ping GET /api/health ──► [ Terhubung ]
                  │
                  ├──► PUSH: POST /api/memos/dump ──► [ Simpan ke SQLite lumos.db ]
                  │
                  ├──► PULL: GET /api/memos ───────► [ Update Feed Lokal ]
                  │
                  └──► LISTEN: GET /api/memos/events (SSE) ──► [ Real-time Live Stream ]
```

1. **Kondisi Terputus (Offline / Di Luar Rumah):**
   - Laptop tertutup atau HP tidak berada dalam satu jaringan Wi-Fi:
   - Header aplikasi menampilkan badge: `🟡 Offline (Tersimpan di HP)`.
   - Memo yang diketik langsung tersimpan di IndexedDB lokal browser dengan status `pending`.
2. **Kondisi Tersambung Kembali (Online Reconnection):**
   - Begitu HP masuk ke jangkauan Wi-Fi yang sama atau tethering aktif:
   - Polling berkala `GET /api/health` mendeteksi host laptop.
   - Status berubah seketika: `🟢 Connected`.
   - PWA secara otomatis mem-flush semua memo antrean lokal ke `POST /api/memos/dump`.
3. **Konfirmasi & Penyimpanan:**
   - Server memvalidasi payload dan menyimpannya secara atomik ke database SQLite `lumos.db`.
   - Klien menandai item lokal sebagai `synced`.

---

## 5. Real-Time Multi-Device Sync (Server-Sent Events)

Lumos menggunakan koneksi persisten **Server-Sent Events (SSE)** untuk sinkronisasi instan antar-perangkat di jaringan lokal:

* **Endpoint:** `GET /api/memos/events`
* **Mekanisme:**
  - Klien membuka `EventSource` ke server.
  - Setiap kali ada memo baru yang di-*dump* (baik dari HP maupun langsung di laptop), server memancarkan event `memos_updated`.
  - Semua perangkat yang sedang membuka Lumos di jaringan lokal menerima update secara *real-time* tanpa perlu me-refresh halaman.
  - Heartbeat `:keepalive` dikirim setiap 15 detik untuk mencegah pemutusan koneksi oleh router.

---

## 6. Keamanan & Kebijakan CORS

Meskipun berjalan pada jaringan lokal tertutup, keamanan tetap diterapkan secara berlapis:

1. **Subnet Whitelisting:**
   - Kebijakan CORS server secara otomatis mengizinkan asal dari rentang alamat privat standar RFC 1918:
     - `192.168.0.0/16`
     - `10.0.0.0/8`
     - `172.16.0.0/12`
     - `localhost`, `127.0.0.1`, dan domain `.local`
2. **Optional Pre-Shared Auth Token:**
   - Server dapat dikonfigurasi menggunakan header `Authorization: Bearer <LUMOS_AUTH_TOKEN>` yang disimpan di storage lokal klien untuk mencegah akses tidak sah dari perangkat lain yang berada di Wi-Fi yang sama (misal di jaringan kampus/kafe).
