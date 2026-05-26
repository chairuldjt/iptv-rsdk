# Arsitektur Infrastruktur RSDK IPTV

Dokumen ini menjelaskan topologi infrastruktur yang dipakai untuk production/kantor dan development/rumah, termasuk batas akses jaringan, server IPTV, Web Admin/API, dan mekanisme relay on-demand.

---

## Ringkasan Komponen

### Kantor

| Komponen | Alamat | Peran | Catatan Akses |
| --- | --- | --- | --- |
| Web Admin/API IPTV | `iptv.teknisirsdk.my.id` | Server aplikasi Next.js, API Android client, dashboard, remote control, preview web, relay on-demand | Bisa diakses lewat internet |
| NIC `eno2` server aplikasi | `10.55.1.5` | Interface server aplikasi di jaringan kantor | Ada internet |
| NIC `eno1` server aplikasi | `10.0.0.199` | Interface server aplikasi ke jaringan IPTV/VLAN M3U | Ada internet dan bisa akses sumber IPTV lokal |
| Server IPTV M3U | `10.0.0.199` | Sumber playlist/stream IPTV lokal, contoh M3U `http://10.0.0.1/iptv/iptv_rsdk.m3u` atau stream `udp://...` sesuai playlist | Hanya bisa diakses dari VLAN yang sama |

Catatan: `10.0.0.199` muncul sebagai interface server aplikasi dan juga disebut sebagai server IPTV M3U. Jika secara fisik ini host yang sama, berarti server aplikasi juga menjadi gateway/host yang bisa menjangkau VLAN IPTV. Jika berbeda, pastikan dokumentasi IP sumber M3U disesuaikan.

### Rumah / Development

| Komponen | Alamat | Peran | Catatan Akses |
| --- | --- | --- | --- |
| Workspace development | `10.45.128.129` | Repo lokal, coding, build APK, testing web/app dari rumah | Tidak bisa akses local network kantor, tapi ada internet |
| Emulator Android | `10.45.128.132` | Test Android client via ADB | ADB aktif |
| HP fisik | Internet only | Test Android client real device | ADB off, tidak punya akses local network kantor |

---

## Topologi Logis

```text
Rumah / Development
  Workspace 10.45.128.129
  Emulator  10.45.128.132
  HP        Internet only
        |
        | Internet
        v
Kantor
  iptv.teknisirsdk.my.id
  Web Admin/API Next.js
  eno2: 10.55.1.5
  eno1: 10.0.0.199
        |
        | VLAN IPTV lokal
        v
  IPTV M3U / UDP streams
  hanya bisa diakses dari VLAN yang sama
```

Konsekuensi utama:

- Perangkat di rumah tidak bisa langsung mengakses sumber IPTV lokal kantor.
- Browser/HP/emulator dari rumah hanya bisa mengakses server publik `iptv.teknisirsdk.my.id`.
- Untuk preview atau playback dari luar VLAN IPTV, server kantor harus menjadi perantara.

---

## Mode Akses Stream

### 1. Direct UDP / Direct Source

Digunakan saat client berada di jaringan yang bisa langsung menjangkau sumber IPTV.

```text
Android STB -> udp://... atau URL IPTV lokal
```

Kelebihan:

- Beban server aplikasi paling kecil.
- Cocok untuk STB yang berada di VLAN/jaringan IPTV kantor.

Keterbatasan:

- Tidak bisa dipakai dari rumah jika jaringan rumah tidak punya akses ke VLAN IPTV.
- Browser web umumnya tidak bisa memutar `udp://` langsung.

### 2. API Server / On-Demand HLS Relay

Digunakan untuk development, preview web, emulator/HP dari luar VLAN, atau client yang tidak bisa akses UDP langsung.

```text
Client/Web
  -> https://iptv.teknisirsdk.my.id/api/stream/udp-hls/{channelId}/index.m3u8
  -> server start ffmpeg untuk channel itu saja
  -> HLS segment ditulis ke /var/www/html/landingpage/relay/{slug-id}/
  -> client membaca segment lewat HLS Relay Base URL
```

Karakteristik:

- Relay dibuat hanya saat channel diminta.
- Satu proses `ffmpeg` per channel aktif.
- Tidak lagi menjalankan semua channel sekaligus.
- Relay otomatis dimatikan setelah idle. Default saat ini: 10 menit.

Env penting:

```env
IPTV_ON_DEMAND_FFMPEG_BIN=/usr/bin/ffmpeg
IPTV_ON_DEMAND_LOCALADDR=10.0.0.199
IPTV_ON_DEMAND_OUTPUT_ROOT=/var/www/html/landingpage/relay
IPTV_ON_DEMAND_FIFO_SIZE=50000
IPTV_ON_DEMAND_IDLE_TIMEOUT_MS=600000
```

Minimal yang harus benar:

```env
IPTV_ON_DEMAND_LOCALADDR=10.0.0.199
```

`HLS Relay Base URL` di dashboard harus menunjuk ke folder segment yang diserve oleh web server, contoh:

```text
http://10.55.1.5/relay
```

atau domain publik jika segment harus diakses dari internet:

```text
https://iptv.teknisirsdk.my.id/relay
```

---

## Alur Web Preview

```text
Dashboard Channels
  -> tombol Preview
  -> /api/stream/udp-hls/{channelId}/index.m3u8
  -> Next.js mencari channel di database
  -> ffmpeg start jika belum aktif
  -> manifest HLS dikembalikan ke browser
  -> segment .ts dibaca dari HLS Relay Base URL
```

Catatan:

- Jika preview web normal, berarti server aplikasi bisa mengakses sumber UDP/IPTV.
- Jika web normal tapi Android gagal, cek apakah Android menerima URL relay terbaru, cache channel sudah disync ulang, dan URL segment bisa diakses dari jaringan Android.

---

## Alur Android Client

### Mode `api`

```text
Android
  -> GET /api/device/config/{deviceId}
  -> GET /api/device/channels/{deviceId}
  -> server mengirim stream_url asli
  -> Android memutar stream langsung
```

Cocok untuk:

- STB di jaringan kantor/VLAN IPTV.
- Perangkat yang memang bisa mengakses `udp://` atau sumber IPTV langsung.

### Mode `api` dengan playlist relay aktif

```text
Android
  -> GET /api/device/config/{deviceId}
  -> GET /api/device/channels/{deviceId}
  -> server mengirim stream_url on-demand:
     https://iptv.teknisirsdk.my.id/api/stream/udp-hls/{channelId}/index.m3u8
  -> Android ExoPlayer memutar HLS
```

Cocok untuk:

- Emulator/HP dari rumah.
- Perangkat yang hanya punya internet dan tidak punya akses VLAN IPTV.

Hal yang wajib setelah mengubah mode:

- Sync ulang config/channel di Android.
- Jika masih memakai URL lama, bersihkan cache channel device dari dashboard atau restart app.

---

## Service Relay Lama

Service lama:

```text
iptv-relay-all.service
```

Fungsi lama:

- Menjalankan relay HLS untuk semua channel sekaligus.
- Berat untuk RAM/CPU karena setiap channel punya proses `ffmpeg`.

Status rekomendasi:

- Tidak diperlukan untuk mode on-demand.
- Boleh dimatikan dan dihapus dari server production/dev.

Command cleanup:

```bash
sudo systemctl disable --now iptv-relay-all
sudo rm -f /etc/systemd/system/iptv-relay-all.service
sudo rm -f /etc/iptv-relay.env
sudo rm -f /usr/local/bin/iptv-relay-manager
sudo systemctl daemon-reload
sudo systemctl reset-failed
```

Bersihkan segment lama bila perlu:

```bash
sudo rm -rf /var/www/html/landingpage/relay/*
```

---

## Checklist Troubleshooting

### Web preview jalan, Android gagal

1. Pastikan device memakai mode `API Server`.
2. Pastikan Android sudah sync ulang channel dan menerima URL:

   ```text
   /api/stream/udp-hls/{channelId}/index.m3u8
   ```

3. Cek log server saat Android play. Harus muncul:

   ```text
   UDP HLS relay request: channel=... name="..." url=/api/stream/udp-hls/.../index.m3u8
   ```

4. Jika log tidak muncul, Android masih memakai cache URL lama atau tidak request server.
5. Jika log muncul tapi playback gagal, cek apakah URL segment `.ts` dari manifest bisa diakses oleh Android.

### Error permission output relay

Jika muncul:

```text
EACCES: permission denied, mkdir '/var/www/html/landingpage/relay/...'
```

Perbaiki permission folder relay:

```bash
sudo mkdir -p /var/www/html/landingpage/relay
sudo chown -R www-data:www-data /var/www/html/landingpage/relay
sudo chmod -R 775 /var/www/html/landingpage/relay
pm2 restart iptv-rsdk
```

Sesuaikan `www-data` dengan user yang menjalankan PM2 jika berbeda.

### ffmpeg log H264 PPS/no frame

Log seperti:

```text
non-existing PPS 0 referenced
decode_slice_header error
no frame!
```

Biasanya normal saat ffmpeg baru join stream H264 di tengah GOP. Jika setelah beberapa detik manifest dan segment muncul, ini bukan masalah fatal.

---

## Rekomendasi Operasional

- Untuk STB kantor yang bisa akses VLAN IPTV: gunakan mode `api` direct.
- Untuk emulator/HP/development dari rumah: gunakan mode `api`, lalu aktifkan relay pada playlist yang sumbernya perlu on-demand relay.
- Jangan jalankan `iptv-relay-all.service` kecuali memang ingin prewarm banyak channel.
- Pastikan `IPTV_ON_DEMAND_LOCALADDR` selalu mengarah ke interface server yang bisa join stream IPTV.
- Pastikan HLS Relay Base URL bisa diakses dari jaringan client yang memutar stream.
