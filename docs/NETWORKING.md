# Project Lumos - Networking Architecture (`docs/NETWORKING.md`)

**Document:** Networking & Connectivity Specification  
**Status:** Approved & Finalized  
**Primary Solution:** Tailscale Mesh VPN (Zero-Config WireGuard)  
**Authors:** Papa (Seishirou) & Lumi  

---

## 1. Overview & Architectural Choice

To ensure seamless, secure, and boundary-free communication between Papa's mobile phone and the laptop host, **Tailscale** is chosen as the primary networking backbone.

### Why Tailscale?
1. **Anywhere Connectivity:** Sync works across any network (cellular data, campus Wi-Fi, home Wi-Fi) without requiring public IP exposure or router port forwarding.
2. **Stable Identity (MagicDNS & Static IP):** The laptop receives a static private IP (`100.x.y.z`) and a friendly hostname (e.g. `http://dan-laptop:3030`), eliminating issues caused by home router DHCP resets.
3. **End-to-End Encryption:** Traffic travels over private WireGuard tunnels directly between authorized personal devices.
4. **Native HTTPS & PWA Compatibility:** Using `tailscale serve`, the host can effortlessly expose valid TLS certificates (`https://<machine>.<tailnet>.ts.net`), satisfying modern mobile browser requirements for Progressive Web Apps (PWA Service Workers, Cache API, and Add-to-Home-Screen).

---

## 2. Network Topology & Ports

```text
┌────────────────────────────┐               ┌────────────────────────────┐
│      HP Papa (Client)      │               │     Laptop Papa (Host)     │
│                            │               │                            │
│  - Tailscale App (Active)  │               │  - Tailscale Node Running  │
│  - Lumos PWA in Browser    │               │  - Lumos Bridge Server     │
│    (Targeting MagicDNS)    │ ────────────► │    Port: 3030 (HTTP)       │
│                            │   WireGuard   │    Optional: 443 (Serve)   │
└────────────────────────────┘   Encrypted   └────────────────────────────┘
```

* **Default Internal Port:** `3030` (configurable via `.env`).
* **Addressing:**
  * Direct Tailscale IP: `http://100.x.y.z:3030`
  * MagicDNS Hostname: `http://<laptop-name>.<tailnet>.ts.net:3030`
  * Tailscale Serve (HTTPS): `https://<laptop-name>.<tailnet>.ts.net`

---

## 3. Communication Protocol & Sync Lifecycle

### A. Heartbeat & Health Check
* The mobile client issues periodic background `GET /api/health` pings (e.g., every 15–30 seconds when app is in focus).
* **Response payload:**
  ```json
  {
    "status": "ok",
    "service": "lumos-bridge",
    "version": "1.0.0",
    "kanban_connected": true
  }
  ```

### B. Offline ➔ Online Sync Flow
1. **Offline State:**
   - Laptop is closed/offline or HP has no network:
   - PWA displays a subtle yellow indicator: `🟡 Offline (Tersimpan di HP)`.
   - New memos append immediately into local IndexedDB with `sync_status: "pending"`.
2. **Reconnection State:**
   - HP detects successful response from `/api/health`.
   - Status updates to: `🟢 Terhubung ke Laptop`.
   - Client triggers batch sync (`POST /api/memos/dump`) sending all pending items.
3. **Sync Acknowledgment:**
   - Server processes memos, formats them via Lumi Refinement, and injects into Hermes Kanban.
   - Server returns list of successfully ingested UUIDs.
   - Client marks items as `sync_status: "synced"` in IndexedDB.

---

## 4. Security & Access Control

Even though traffic is confined inside Papa's private Tailnet, standard defense-in-depth measures will be applied:

1. **Bearer Token Authentication:**
   - Simple shared secret token configured in `.env` (`LUMOS_AUTH_TOKEN`).
   - Mobile PWA stores this token in localStorage upon initial pairing.
   - Sent via header: `Authorization: Bearer <LUMOS_AUTH_TOKEN>`.
2. **CORS Whitelisting:**
   - Server restricts incoming origins to the Tailscale domain and local development origins (`localhost`, `127.0.0.1`, `*.ts.net`).
