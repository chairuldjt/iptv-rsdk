# Progress Checklist: Policy Apply Flow — Implementasi Lanjutan

Dokumen ini melacak progress **implementasi lanjutan** dari alur penerapan konfigurasi (policy apply flow) yang dijelaskan di [POLICY_APPLY_FLOW.md](./POLICY_APPLY_FLOW.md).

Fitur-fitur di sini adalah penyempurnaan dari sistem yang sudah berjalan (Global → Group → Device merge), fokus pada tiga area:

1. **Group sebagai entitas data terpisah** (bukan JSON embedded)
2. **RSoP preview** di dashboard Web Admin
3. **Push refresh** tanpa restart aplikasi
4. **Asset Manifest generik** untuk delivery non-APK

---

## Ruang Lingkup

- [ ] A. Group sebagai tabel Prisma terpisah
- [ ] B. RSoP preview di dashboard Web Admin
- [ ] C. Push refresh config tanpa restart aplikasi
- [ ] D. Asset Manifest generik

---

## A. Group sebagai Tabel Prisma Terpisah

**Kondisi sekarang**: Group disimpan di `app_settings` JSON (tidak ada tabel relasional terpisah untuk group).

**Target**: Group menjadi entitas data first-class di database — dengan ID, nama, deskripsi, dan relasi ke device — sehingga bisa diquery, difilter, dan diaudit dengan benar.

### A.1 — Backend / Database

- [ ] Buat model Prisma `DeviceGroup` dengan field: `id`, `name`, `description`, `home_experience` (JSON), `createdAt`, `updatedAt`
- [ ] Tambah field `groupId` (FK) ke model `Device` / `AppDevice`
- [ ] Buat migration Prisma untuk tabel baru
- [ ] Migrate data group existing dari `app_settings` JSON ke tabel baru
- [ ] Buat endpoint CRUD group:
  - [ ] `GET /api/groups` — list semua group
  - [ ] `GET /api/groups/{id}` — detail group
  - [ ] `POST /api/groups` — buat group baru
  - [ ] `PATCH /api/groups/{id}` — update group
  - [ ] `DELETE /api/groups/{id}` — hapus group (unassign device dulu)
- [ ] Buat endpoint assignment:
  - [ ] `PATCH /api/devices/{id}/group` — assign / pindah / cabut device dari group
- [ ] Update Merge Resolver di `GET /api/device/config/{deviceId}` untuk membaca dari tabel baru

### A.2 — Dashboard Web

- [ ] Halaman manajemen group (list, tambah, edit, hapus)
- [ ] Form assign device ke group di halaman Device Manager
- [ ] Indikator group pada daftar device (nama group, badge)
- [ ] Halaman detail group menampilkan daftar device anggota

### A.3 — Testing

- [ ] Buat group baru via dashboard
- [ ] Assign device ke group via dashboard
- [ ] Ubah config di level group → restart device → verifikasi merge tepat
- [ ] Cabut device dari group → restart → verifikasi device kembali ke global config saja

---

## B. RSoP Preview di Dashboard Web Admin

**Kondisi sekarang**: Ada checklist/preview status config efektif, tapi belum menampilkan RSoP (Resultant Set of Policy) yang menunjukkan dari mana setiap nilai berasal.

**Target**: Admin bisa melihat per device — nilai akhir setiap field, beserta keterangan apakah nilai itu datang dari Global, Group, atau Device override.

### B.1 — Backend

- [ ] Tambah field `resolved_from` per field ke response `GET /api/device/config/{deviceId}`:
  ```json
  {
    "home_experience": { "background_url": "https://..." },
    "resolved_from": {
      "background_url": "group:group-icu",
      "logo_url": "global",
      "running_text": "device:device-001"
    }
  }
  ```
- [ ] Buat endpoint RSoP khusus (opsional, bisa pakai endpoint config yang diperluas):
  - [ ] `GET /api/device/config/{deviceId}/rsop`

### B.2 — Dashboard Web

- [ ] Tambah tab atau panel "Effective Config / RSoP" di halaman detail device
- [ ] Tampilkan setiap field config beserta badge sumber: `Global`, `Group: <nama>`, `Device Override`
- [ ] Highlight field yang di-override di level device (warna berbeda)
- [ ] Highlight field yang di-override di level group
- [ ] Tombol "Preview as Device" — simulasi effective config jika device dipindah ke group lain

### B.3 — Testing

- [ ] Verifikasi badge sumber tepat untuk setiap field (global / group / device)
- [ ] Verifikasi perubahan group membership memperbarui RSoP preview
- [ ] Verifikasi device tanpa group hanya menampilkan badge `Global`

---

## C. Push Refresh Config Tanpa Restart Aplikasi

**Kondisi sekarang**: Perubahan config baru efektif setelah device restart aplikasi.

**Target**: Backend bisa mengirim sinyal ke device agar re-fetch config dan menerapkannya tanpa menunggu restart manual — mirip `gpupdate /force` di Windows.

### C.1 — Backend

- [ ] Buat endpoint trigger refresh:
  - [ ] `POST /api/devices/{id}/push-refresh` — kirim sinyal ke satu device
  - [ ] `POST /api/groups/{id}/push-refresh` — kirim sinyal ke semua device dalam group
  - [ ] `POST /api/devices/push-refresh-all` — broadcast ke semua device
- [ ] Pilih mekanisme push (pilih satu):
  - [ ] **Opsi A** — Polling interval lebih pendek (< 60 detik) + flag `config_updated_at` di heartbeat response
  - [ ] **Opsi B** — Server-Sent Events (SSE) endpoint per device
  - [ ] **Opsi C** — FCM (Firebase Cloud Messaging) push notification ke STB
- [ ] Simpan `config_version` atau `config_updated_at` per device di database
- [ ] Sertakan `config_version` di setiap response heartbeat

### C.2 — Android Client

- [ ] Tambah deteksi perubahan `config_version` di heartbeat loop
- [ ] Jika `config_version` berubah → trigger re-fetch config tanpa restart
- [ ] Setelah fetch sukses → apply perubahan hot ke UI yang sedang ditampilkan:
  - [ ] Perbarui `running_text` secara live
  - [ ] Perbarui background (jika tidak sedang diputar konten)
  - [ ] Perbarui menu visibility tanpa keluar dari home
- [ ] Perubahan yang memerlukan restart tetap diminta restart (misal: perubahan splash config)
- [ ] Tampilkan notifikasi/toast kecil "Konfigurasi diperbarui" bila ada perubahan yang diterapkan

### C.3 — Dashboard Web

- [ ] Tombol "Push Refresh" di halaman detail device
- [ ] Tombol "Push Refresh Semua" di halaman detail group
- [ ] Status indikator last refresh per device

### C.4 — Testing

- [ ] Ubah `running_text` di global config → push refresh → verifikasi tampil di device tanpa restart
- [ ] Ubah `background_url` → push refresh → verifikasi background berubah
- [ ] Ubah `menu visibility` → push refresh → verifikasi menu tampil/tersembunyi
- [ ] Simulasi device offline saat push → verifikasi device apply saat online kembali

---

## D. Asset Manifest Generik

**Kondisi sekarang**: Asset image dan audio diakses langsung via URL dari config. Tidak ada manifest terpusat, tidak ada checksum, tidak ada cache lokal yang terkoordinasi.

**Target**: Ada manifest terpusat yang memungkinkan device mengetahui asset mana yang berubah, mendownload hanya yang perlu, dan menyimpan ke local storage — mirip patch system / WSUS.

### D.1 — Backend

- [ ] Buat endpoint asset manifest:
  - [ ] `GET /api/device/assets/{deviceId}` — manifest asset efektif per device (setelah merge)
- [ ] Format response manifest:
  ```json
  {
    "manifest_version": 12,
    "generated_at": "2026-05-27T10:00:00Z",
    "assets": [
      {
        "key": "home.background",
        "category": "image",
        "url": "https://.../home-bg.webp",
        "hash": "sha256:abc123",
        "size": 312045,
        "required": false
      }
    ]
  }
  ```
- [ ] Tambah field `hash` (sha256) ke metadata file upload di dashboard
- [ ] Tambah versioning manifest (`manifest_version` auto-increment saat ada perubahan asset)

### D.2 — Android Client

- [ ] Buat `AssetSyncManager.kt` generik:
  - [ ] Fetch manifest dari endpoint
  - [ ] Bandingkan hash/size file lokal vs manifest
  - [ ] Download hanya asset yang berubah atau belum ada
  - [ ] Simpan ke `.tmp` → verifikasi hash → rename ke file final
  - [ ] Hapus asset lokal yang tidak lagi ada di manifest
- [ ] Buat `AssetResolver.kt`:
  - [ ] UI tidak lagi langsung menggunakan URL → semua lewat resolver
  - [ ] Resolver: `file lokal → URL langsung → drawable fallback`
- [ ] Simpan metadata lokal: `manifest_version`, hash per asset, waktu sync, daftar gagal
- [ ] Struktur penyimpanan lokal:
  ```
  Android/data/<package>/files/server_assets/
    manifest.json
    home/
    logos/
    entertainment/
    education/
    info/
  ```
- [ ] Tambah cleanup policy: hapus file yang tidak lagi ada di manifest

### D.3 — Dashboard Web

- [ ] Tampilkan hash checksum saat upload file asset
- [ ] Tampilkan `manifest_version` saat ini per group / global
- [ ] Tombol "Rebuild Manifest" jika perlu regenerasi manual

### D.4 — Testing

- [ ] Ganti background → manifest versi baru → device download hanya file itu
- [ ] Simulasi file korup di device → verifikasi re-download saat sync berikutnya
- [ ] Simulasi device offline saat manifest berubah → verifikasi cache lama dipakai sampai online
- [ ] Verifikasi cleanup asset lama berjalan setelah update manifest

---

## Catatan Dependensi Antar Fitur

```
A (Group Prisma) ──────────────────┐
                                   ├──► B (RSoP Preview) — butuh group ID terstruktur
                                   │
A (Group Prisma) ──────────────────┤
                                   └──► C (Push Refresh) — push per group butuh relasi device-group
                                   
D (Asset Manifest) ─── independen, bisa dikerjakan paralel dengan A/B/C
```

---

## Urutan Implementasi yang Disarankan

1. **A** terlebih dahulu — fondasi data. RSoP dan Push Refresh lebih mudah dibangun di atas relasi yang benar.
2. **B** setelah A selesai — frontend visibility, tidak ada perubahan besar di Android.
3. **D** paralel dengan A/B — backend + Android, independen dari group.
4. **C** terakhir — butuh keduanya (A untuk push per group, D untuk notifikasi asset baru).

---

## Referensi

- [POLICY_APPLY_FLOW.md](./POLICY_APPLY_FLOW.md) — arsitektur dan alur apply
- [HOME_EXPERIENCE_PROGRESS.md](./HOME_EXPERIENCE_PROGRESS.md) — checklist home experience
- [SERVER_DRIVEN_UPDATES.md](./SERVER_DRIVEN_UPDATES.md) — strategi server-driven
- [ANDROID_ARCHITECTURE.md](./ANDROID_ARCHITECTURE.md) — arsitektur Android client
- [BACKEND_DATABASE.md](./BACKEND_DATABASE.md) — schema database
