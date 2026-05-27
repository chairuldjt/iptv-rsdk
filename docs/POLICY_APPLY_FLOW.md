# Policy Apply Flow — RSDK IPTV Player

Dokumen ini menjelaskan **hierarki dan alur penerapan konfigurasi** di proyek RSDK IPTV Player.

Konsepnya dimiripkan dengan **GPMC (Group Policy Management Console)** dan **DSA (Active Directory Users and Computers)** di Windows — yaitu ada hierarki scope, inheritance dari atas ke bawah, kemampuan override, dan satu titik resolusi akhir sebelum diterapkan ke objek (device).

---

## 1. Analogi GPMC / DSA

| Windows GPMC / DSA | RSDK IPTV Player |
|----|---|
| Forest / Domain | **Global Config** (berlaku untuk semua device) |
| OU (Organizational Unit) | **Device Group** (departemen / lantai / lokasi) |
| Computer Object | **Device** (STB individual) |
| Group Policy Object (GPO) | **Home Experience Config** (JSON konfigurasi) |
| GPO Link + Inheritance | **Merge: Global → Group → Device** |
| Resultant Set of Policy (RSoP) | **Effective Config** yang dikirim ke device |
| Block Inheritance | **Device Override** (nilai lokal memotong nilai group/global) |
| Domain Admin | **Web Admin** (dashboard Next.js) |
| Group Membership | **Device Group Assignment** |

---

## 2. Hierarki Scope

```
┌─────────────────────────────────────────────────┐
│                 GLOBAL CONFIG                   │  ← Scope terluas
│  (berlaku default untuk semua device)           │
└───────────────────────┬─────────────────────────┘
                        │ inheritance ↓
┌───────────────────────▼─────────────────────────┐
│               GROUP CONFIG                      │  ← Scope menengah
│  (per departemen, lantai, lokasi, atau segmen)  │
│  Contoh: ICU, Rawat Inap, Lobby, VIP            │
└───────────────────────┬─────────────────────────┘
                        │ inheritance ↓
┌───────────────────────▼─────────────────────────┐
│              DEVICE CONFIG                      │  ← Scope tersempit
│  (override untuk STB individual)                │
│  Contoh: STB-001, STB-ICU-3, STB-VIP-07        │
└─────────────────────────────────────────────────┘
                        │
                        ▼
           ┌────────────────────────┐
           │   EFFECTIVE CONFIG     │  ← RSoP: hasil merge akhir
           │   (dikirim ke device)  │
           └────────────────────────┘
```

---

## 3. Aturan Merge (Inheritance)

Prinsipnya sama seperti GPO inheritance di Active Directory:

```
Effective Config = Global ← merge ← Group ← merge ← Device
```

- **Global Config** dipakai sebagai base default.
- **Group Config** menimpa field yang didefinisikan di level group; field yang tidak didefinisikan di group tetap mewarisi nilai global.
- **Device Config** menimpa field yang didefinisikan secara eksplisit di level device; field yang tidak didefinisikan di device mewarisi dari group (atau global jika device tidak ber-group).
- Field yang bernilai `null` atau tidak ada dianggap **"tidak didefinisikan"** → diwarisi dari scope di atasnya.
- Field yang didefinisikan eksplisit (walau bernilai kosong `""` atau `false`) dianggap **override aktif** → memotong nilai parent.

### Pseudocode Merge Resolver

```typescript
function resolveEffectiveConfig(
  globalConfig: HomeExperience,
  groupConfig: HomeExperience | null,
  deviceConfig: HomeExperience | null
): HomeExperience {
  return deepMerge(
    globalConfig,           // base
    groupConfig  ?? {},     // layer 1 override
    deviceConfig ?? {}      // layer 2 override (paling prioritas)
  );
}
```

---

## 4. Alur Apply per Device (End-to-End)

```
[Web Admin]                    [Backend]                   [Android Device]
     │                             │                              │
     │ 1. Admin ubah config        │                              │
     │    (Global / Group /        │                              │
     │     Device)                 │                              │
     ├────────────────────────────►│                              │
     │                             │ 2. Simpan ke database         │
     │                             │    (app_settings JSON)       │
     │                             │                              │
     │                             │ 3. Saat device request       │
     │                             │◄─────────────────────────────┤
     │                             │    GET /api/device/config/   │
     │                             │    {deviceId}               │
     │                             │                              │
     │                             │ 4. Backend jalankan          │
     │                             │    Merge Resolver:           │
     │                             │    Global → Group → Device   │
     │                             │                              │
     │                             │ 5. Kirim Effective Config    │
     │                             ├────────────────────────────►│
     │                             │    { home_experience: {...} }│
     │                             │                              │
     │                             │                              │ 6. Simpan ke DataStore
     │                             │                              │    (JSON lokal)
     │                             │                              │
     │                             │                              │ 7. Apply saat restart
     │                             │                              │    UI membaca DataStore
```

---

## 5. Object Model (Mirip DSA Object Properties)

### Global Config Object
```json
{
  "scope": "global",
  "home_experience": {
    "background_url": "https://...",
    "logo_url": "https://...",
    "menus": [...],
    "running_text": "...",
    "static_info": {...},
    "splash": {...},
    "sound": {...}
  }
}
```

### Group Object (Mirip OU di DSA)
```json
{
  "id": "group-icu",
  "name": "ICU",
  "description": "Perangkat di ruang ICU",
  "devices": ["device-001", "device-003"],
  "home_experience": {
    "background_url": "https://.../icu-bg.webp",
    "menus": [
      { "type": "tv", "visible": true },
      { "type": "info", "visible": true },
      { "type": "entertainment", "visible": false }
    ]
    // field lain → mewarisi dari Global
  }
}
```

### Device Object (Mirip Computer Object di DSA)
```json
{
  "id": "device-001",
  "name": "STB-ICU-01",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "group_id": "group-icu",
  "home_experience": {
    "running_text": "Selamat datang di ICU Bed 3"
    // field lain → mewarisi dari Group (ICU) dan Global
  }
}
```

### Effective Config (Mirip RSoP — Resultant Set of Policy)
```json
{
  "resolved_from": {
    "global": "v12",
    "group": "group-icu",
    "device": "device-001"
  },
  "home_experience": {
    "background_url": "https://.../icu-bg.webp",  // dari Group
    "logo_url": "https://.../logo.png",            // dari Global
    "menus": [...],                                // dari Group
    "running_text": "Selamat datang di ICU Bed 3", // dari Device
    "static_info": {...},                          // dari Global
    "splash": {...},                               // dari Global
    "sound": {...}                                 // dari Global
  }
}
```

---

## 6. Group Membership (Mirip Group Membership di DSA)

Setiap device dapat berada di **satu group** (mirip primary group di AD).

```
Device Assignment Rules:
 - Device tanpa group → hanya mendapat Global Config
 - Device ber-group  → mendapat merge Global + Group
 - Device ber-group + device override → merge Global + Group + Device
```

### Diagram Keanggotaan

```
Global Config
 ├── [Tanpa Group]
 │     ├── STB-Lobby-01
 │     └── STB-Cafe-02
 │
 ├── Group: ICU
 │     ├── STB-ICU-01  (+ device override: running_text)
 │     ├── STB-ICU-02
 │     └── STB-ICU-03
 │
 ├── Group: Rawat Inap
 │     ├── STB-RI-01
 │     └── STB-RI-02   (+ device override: background_url)
 │
 └── Group: VIP
       ├── STB-VIP-01  (+ device override: logo_url, menus)
       └── STB-VIP-02
```

---

## 7. Kapan Perubahan Diterapkan

| Skenario | Kapan Efektif |
|---|---|
| Admin ubah Global Config | Saat device **restart** berikutnya |
| Admin ubah Group Config | Saat device anggota group **restart** berikutnya |
| Admin ubah Device Config | Saat device tersebut **restart** berikutnya |
| Device dipindah ke group lain | Saat device **restart** berikutnya |
| Device dicabut dari group | Saat device **restart** berikutnya |
| OTA APK baru tersedia | Setelah user / sistem **install APK** baru |

> **Catatan**: Mirip dengan GPMC, perubahan policy baru efektif setelah **"refresh"** — di sini berarti restart aplikasi. Mekanisme push/hot-reload tanpa restart direncanakan di tahap berikutnya (lihat [POLICY_APPLY_PROGRESS.md](./POLICY_APPLY_PROGRESS.md)).

---

## 8. Alur Resolusi di Backend (Merge Resolver)

```
GET /api/device/config/{deviceId}

Step 1: Ambil data device
  → device.group_id ?
      Ya → ambil group config
      Tidak → skip group

Step 2: Ambil global config

Step 3: Jalankan deepMerge
  base    = globalConfig.home_experience
  layer1  = groupConfig?.home_experience  ?? {}
  layer2  = deviceConfig?.home_experience ?? {}
  result  = deepMerge(base, layer1, layer2)

Step 4: Tambahkan metadata resolusi
  resolved_from = { global: version, group: id, device: id }

Step 5: Return response
  Konfigurasi efektif diserialisasi sebagai string JSON
  dan dikirim di `data.home_experience_json`,
  `data.running_text_json`, dan `data.video_broadcast_json`
  pada response `GET /api/device/config/{deviceId}`.
```

---

## 9. Alur di Android Client

```
App Start
  │
  ├── [Online]
  │     ├── Fetch config dari backend
  │     ├── Validasi response
  │     ├── Simpan ke DataStore (JSON)
  │     └── Lanjut render UI
  │
  └── [Offline]
        ├── Baca DataStore (cache terakhir)
        └── Render UI dari cache

Render UI
  └── Baca DataStore
        ├── home_experience.background_url → AssetResolver → file lokal / drawable fallback
        ├── home_experience.logo_url       → AssetResolver → file lokal / drawable fallback
        ├── home_experience.menus[]        → build menu dinamis
        ├── home_experience.running_text   → tampilkan ticker
        ├── home_experience.static_info    → halaman statis
        └── home_experience.sound         → splash sound / selection sound
```

---

## 10. Catatan Implementasi Saat Ini

| Aspek | Status |
|---|---|
| Global Config | Sudah ada (via `app_settings`, profile-based) |
| Group Config | Sudah ada (via `app_settings`, profile-based) |
| Device Override | Sudah ada (via `app_settings`, profile-based) |
| Merge Resolver di backend | Sudah ada (`resolveEffectiveHomeExperience`, `resolveEffectiveRunningText`, `resolveEffectiveVideoBroadcast`) |
| Profile Library (Home / Running Text / Video Broadcast) | Sudah ada — lihat `app_settings` keys `homeExperience.profiles`, `runningText.profiles`, `videoBroadcast.profiles` |
| Group sebagai tabel Prisma terpisah | Belum — masih via `app_settings` (`device.groups`, `device.groupAssignments`) |
| Push refresh tanpa restart | Direncanakan — lihat progress doc |
| RSoP preview di dashboard | Direncanakan — lihat progress doc |
| Asset Manifest generik | Direncanakan — lihat progress doc |

Detail rencana dan status implementasi lanjutan: [POLICY_APPLY_PROGRESS.md](./POLICY_APPLY_PROGRESS.md)

---

## 11. Referensi Dokumen Terkait

- [POLICY_APPLY_PROGRESS.md](./POLICY_APPLY_PROGRESS.md) — progress implementasi lanjutan alur apply
- [HOME_EXPERIENCE_PROGRESS.md](./HOME_EXPERIENCE_PROGRESS.md) — checklist progress home experience
- [SERVER_DRIVEN_UPDATES.md](./SERVER_DRIVEN_UPDATES.md) — strategi dan arsitektur server-driven
- [ANDROID_ARCHITECTURE.md](./ANDROID_ARCHITECTURE.md) — arsitektur Android client
- [BACKEND_DATABASE.md](./BACKEND_DATABASE.md) — schema database dan relasi
