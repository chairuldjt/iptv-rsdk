# Panduan Konfigurasi Default & Build

Dokumen ini berisi informasi mengenai lokasi konfigurasi default di dalam kode sumber (untuk mendukung fitur *Zero-Config*) serta panduan cara melakukan build APK dan instalasi ke perangkat.

---

## ⚙️ 1. Lokasi Konfigurasi Default

Beberapa nilai default tertanam di dalam kode untuk mendukung fitur **Auto-Active by Default**. Anda dapat mengubah nilai-nilai ini sebelum melakukan build APK untuk deployment massal.

### A. Default API Server URL
Alamat server backend utama yang akan dihubungi aplikasi saat pertama kali dijalankan.
- **Lokasi File**: `android-client/app/build.gradle.kts`
- **Env Android yang dipakai**:
  ```env
  DEFAULT_API_BASE_URL=https://iptv.teknisirsdk.my.id
  ```
- **Lokasi Env**: `.env` root proyek
- **Kode**:
  ```kotlin
  val defaultApiBaseUrl = optionalRootEnv("DEFAULT_API_BASE_URL")
      ?: "https://iptv.teknisirsdk.my.id"

  buildConfigField("String", "DEFAULT_API_BASE_URL", "\"$defaultApiBaseUrl\"")
  ```
- **Catatan**:
  - Isi di `.env` root proyek atau environment variable shell sebelum build.
  - Untuk server lokal, gunakan IP/hostname yang bisa dijangkau STB, misalnya `http://10.55.1.5:9000`, bukan `localhost`.
  - Nilai ini menjadi fallback BuildConfig. Setelah app terpasang, teknisi masih bisa override URL server dari Settings di STB.

### B. Default M3U Custom URL
Jika aplikasi digunakan dalam mode M3U (bukan mode API Server), Anda bisa menyetel URL playlist default.
- **Lokasi File**: `android-client/app/src/main/java/com/example/rsdkiptvplayer/data/datastore/DataStoreManager.kt`
- **Kode**:
  ```kotlin
  // Default yang tampil di Settings dan dipakai repository saat belum ada URL tersimpan:
  prefs[CUSTOM_M3U_URL] ?: "http://10.0.0.1/iptv/iptv_rsdk.m3u"
  ```
- **Catatan**: Default source APK saat ini adalah **Custom M3U**. URL M3U fallback ini akan dipakai jika belum ada URL M3U tersimpan di DataStore.
- **Web Admin**: Default config device baru juga mengikuti mode `custom` dengan URL yang sama, agar tampilan Web dan Settings Android sinkron.

### C. Default Mode Sinkronisasi (Sync Mode)
Menentukan apakah APK bawaan langsung mencari playlist dari Server API atau dari M3U Custom.
- **Lokasi File**: `DataStoreManager.kt`
- **Kode**:
  ```kotlin
  // Default saat ini:
  prefs[SYNC_MODE] ?: "custom"

  // Jika ingin default langsung pakai API Server:
  prefs[SYNC_MODE] ?: "api"
  ```
- **Pilihan value yang valid di sistem**:
  - `api` = channel diambil dari global playlist backend apa adanya.
- `api` = channel diambil dari global playlist backend. Jika playlist asal channel mengaktifkan relay, URL stream UDP akan diarahkan ke HLS relay server secara otomatis.
  - `custom` = device mengabaikan global playlist dan memakai `customM3uUrl` miliknya sendiri.
- **Catatan penting**: APK Android bawaan saat ini tetap fallback ke `custom` di sisi client lokal (`DEFAULT_SYNC_MODE` di `src/lib/defaults.ts` untuk web/backend juga `custom`), tetapi perangkat baru yang register ke backend akan mengikuti `IPTV_DEFAULT_SYNC_MODE` atau nilai yang disimpan di dashboard **Setup Defaults**. Jika masih ada nilai lama `api_relay` di `.env` atau database, backend akan memperlakukannya sebagai alias `api`.

### D. Nilai Env Device Default yang Valid
Nilai di bawah ini dibaca backend dari `.env` root proyek saat belum ada override dari dashboard **Setup Defaults**.

```env
IPTV_DEFAULT_SYNC_MODE="api"
IPTV_DEFAULT_CUSTOM_M3U_URL="http://10.0.0.1/iptv/iptv_rsdk.m3u"
IPTV_DEFAULT_ASPECT_RATIO="fit"
IPTV_DEFAULT_SYNC_INTERVAL="1800"
IPTV_DEFAULT_START_SCREEN="home_screen"
IPTV_DEFAULT_CATEGORY="Semua"
IPTV_DEFAULT_CHANNEL_ID=""
IPTV_DEFAULT_LOCK_SETTINGS="true"
IPTV_DEFAULT_AUTO_START_ON_BOOT="true"
IPTV_DEFAULT_TECHNICIAN_PIN="2468"
IPTV_DEFAULT_EDUCATION_VIDEO_PATH=""
IPTV_DEFAULT_EDUCATION_SMB_USERNAME=""
IPTV_DEFAULT_EDUCATION_SMB_PASSWORD=""
IPTV_DEFAULT_EDUCATION_SMB_DOMAIN=""
IPTV_DEFAULT_EDUCATION_REPEAT_MODE="all"
IPTV_DEFAULT_EDUCATION_PLAY_ORDER="alphabetical"
IPTV_DEFAULT_EDUCATION_SOURCE="smb"
IPTV_DEFAULT_EDUCATION_PLAYBACK_MODE="copy"
```

Keterangan pilihan value:
- `IPTV_DEFAULT_SYNC_MODE`: `api`, `custom`
- `IPTV_DEFAULT_ASPECT_RATIO`: `fit`, `stretch`, `zoom`, `16_9`, `4_3`
- `IPTV_DEFAULT_START_SCREEN`: `live_tv`, `category_list`, `home_screen`
- `IPTV_DEFAULT_LOCK_SETTINGS`: `true` / `false`
- `IPTV_DEFAULT_AUTO_START_ON_BOOT`: `true` / `false`
- `IPTV_DEFAULT_EDUCATION_REPEAT_MODE`: `all`, `one`, `none`
- `IPTV_DEFAULT_EDUCATION_PLAY_ORDER`: `alphabetical`, `random`, `shuffle`
- `IPTV_DEFAULT_EDUCATION_SOURCE`: `smb`, `web`
- `IPTV_DEFAULT_EDUCATION_PLAYBACK_MODE`: `copy`, `stream`
- `IPTV_DEFAULT_CHANNEL_ID`: kosongkan untuk `null`, atau isi ID channel numerik yang sudah ada di database

- **Rekomendasi operasional**:
  - Pakai `api` lalu aktifkan relay di playlist jika sumber siaran banyak memakai UDP multicast atau stream yang hanya bisa dibaca server relay.
  - Pakai `api` jika STB bisa mengakses stream asli secara langsung tanpa relay.
  - Pakai `custom` jika tiap perangkat atau grup perangkat memakai URL M3U berbeda.

### E. Default Status Koneksi Server API (Enabled / Disabled)
Menentukan apakah saat pertama kali aplikasi diinstal, koneksi ke backend server langsung aktif atau tidak (offline).
- **Lokasi File**: `android-client/app/src/main/java/com/example/rsdkiptvplayer/data/datastore/DataStoreManager.kt`
- **Kode**:
  ```kotlin
  // Cari baris ini (default true = aktif):
  val serverApiEnabledFlow: Flow<Boolean> = context.dataStore.data.map { prefs ->
      prefs[SERVER_API_ENABLED] ?: true
  }

  // Ubah ke false jika ingin default nonaktif (offline mode bawaan):
  prefs[SERVER_API_ENABLED] ?: false
  ```
- **Catatan Tambahan**: Ubah juga nilai inisialisasi awal di `SettingsViewModel.kt` jika diinginkan:
  ```kotlin
  // Lokasi: SettingsViewModel.kt
  private val _serverApiEnabled = MutableStateFlow(true) // Ubah ke false
  ```

### F. Default Lock Settings & PIN Teknisi
Menu Settings Android terkunci secara default untuk deployment STB.
- **Default lock**: `true`
- **Default PIN**: `2468`
- **Sumber remote**: Web Admin dapat mengubah `lockSettings` dan `technicianPin` per device.
- **Input remote**: PIN bisa dimasukkan dengan D-pad grid maupun tombol angka `0-9` langsung pada remote.

---

## 🌐 2. Deploy Backend Production

Backend production disiapkan untuk berjalan di port `9000` melalui PM2.

### A. Environment wajib
File `.env` di server minimal harus berisi:
```env
DATABASE_URL="mysql://username:password@localhost:3306/iptv_rsdk"
SESSION_SECRET="isi-random-panjang-minimal-32-karakter"
```

`SESSION_SECRET` wajib ada. Build akan gagal jika env ini kosong.

Untuk default device config yang lebih lengkap, bisa mulai dari [`.env.example`](/e:/Project/xampp/htdocs/iptv-rsdk/.env.example).

### B. Deploy otomatis
Setelah pull repo di server, jalankan:
```bash
./deploy.sh
```

Script ini akan menjalankan `npm ci`, Prisma generate/migrate, `npm run build`, reload PM2, dan health check ke `http://127.0.0.1:9000/login`.

---


## 🛠️ 3. Cara Build APK

Pastikan Anda sudah menginstal JDK 17+ dan Android SDK. Android client saat ini **tidak memakai product flavor/channel terpisah**; build debug dan release memakai package yang sama, dan update check hanya membandingkan `versionCode`.

Versi APK diambil otomatis dari Git:
- `versionCode`: hasil `git rev-list --count HEAD`.
- `versionName`: hasil `git describe --tags --always`.

Karena itu, buat tag Git jika ingin `versionName` yang tampil di dashboard/Android lebih rapi, misalnya `v1.2.3`.

### A. Release signing
Build release wajib memiliki credential signing di `android-client/.env` atau environment variables:

```env
KEYSTORE_FILE=app/keystore/rsdk-release.jks
KEYSTORE_STORE_PASSWORD=...
KEYSTORE_KEY_ALIAS=...
KEYSTORE_KEY_PASSWORD=...
```

`KEYSTORE_FILE` relatif terhadap folder `android-client`.

Contoh lengkap env root ada di [`.env.example`](/e:/Project/xampp/htdocs/iptv-rsdk/.env.example), sedangkan contoh env signing release ada di [android-client/.env.example](/e:/Project/xampp/htdocs/iptv-rsdk/android-client/.env.example).

### B. BuildConfig Android yang tertanam
Saat ini APK Android membaca dua default penting dari `.env` root proyek atau environment variable:

```env
DEFAULT_API_BASE_URL=https://iptv.teknisirsdk.my.id
HOME_LOW_EFFECT_MODE=true
```

Lalu nilainya ditanam ke `BuildConfig` lewat `android-client/app/build.gradle.kts`:

```kotlin
buildConfigField("String", "DEFAULT_API_BASE_URL", "\"$defaultApiBaseUrl\"")
buildConfigField("boolean", "HOME_LOW_EFFECT_MODE", homeLowEffectMode.toString())
```

Arti masing-masing:
- `DEFAULT_API_BASE_URL`: URL backend bawaan jika teknisi belum mengisi override server URL di STB.
- `HOME_LOW_EFFECT_MODE`: `true` untuk animasi home yang lebih ringan, `false` untuk efek visual home yang lebih penuh.

### C. Build debug dan release
Jalankan perintah berikut dari direktori utama proyek:

1. Masuk ke direktori client:
   ```powershell
   cd android-client
   ```
2. Isi env root proyek untuk BuildConfig Android bila perlu:
   ```env
   DEFAULT_API_BASE_URL=http://10.55.1.5:9000
   HOME_LOW_EFFECT_MODE=true
   ```
3. Isi `android-client/.env` untuk signing release:
   ```env
   KEYSTORE_FILE=app/keystore/rsdk-release.jks
   KEYSTORE_STORE_PASSWORD=...
   KEYSTORE_KEY_ALIAS=...
   KEYSTORE_KEY_PASSWORD=...
   ```
4. Jalankan build debug untuk testing:
   ```powershell
   ./gradlew assembleDebug
   ```
5. Jalankan build release untuk production:
   ```powershell
   ./gradlew assembleRelease
   ```
6. File APK yang dihasilkan akan berada di:
   `android-client/app/build/outputs/apk/debug/app-debug.apk`
   atau
   `android-client/app/build/outputs/apk/release/app-release.apk`

Build release sudah mengaktifkan minify/resource shrink dan signing dari `android-client/.env`.

### D. Upload OTA dari Web Admin
Dashboard **Updates** membaca `versionCode` dan `versionName` langsung dari manifest APK di browser sebelum upload. APK yang di-upload disimpan sebagai **Draft** lebih dulu. Klik **Deploy Version** untuk menjadikannya versi OTA aktif.

Hanya satu record `app_updates.isDeployed=true` yang dipakai endpoint update check. Update yang di-upload saat ini otomatis diset `isMandatory=true`.

---

## 📲 4. Cara Instalasi ke Perangkat (via ADB)

Setelah APK berhasil di-build, Anda dapat menginstalnya ke STB atau Android TV menggunakan ADB.

1. **Cek Perangkat Terhubung**:
   ```powershell
   adb devices
   ```
2. **Instal APK**:
   ```powershell
   # Jika hanya ada satu perangkat:
   adb install android-client/app/build/outputs/apk/debug/app-debug.apk

   # Jika ada lebih dari satu perangkat (gunakan Serial Number):
   adb -s <SERIAL_NUMBER> install android-client/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## 📝 Ringkasan Lokasi Cepat
- **Default API URL**: `android-client/app/build.gradle.kts`
- **Env BuildConfig Android**: `.env` root proyek / `.env.example`
- **Default M3U URL**: `DataStoreManager.kt`
- **Default Playlist Source**: `DataStoreManager.kt`
- **Default device env fallback**: `.env` root proyek / `.env.example`
- **Default Server API Connection (Enabled/Disabled)**: `DataStoreManager.kt` & `SettingsViewModel.kt`
- **Android versionCode/versionName**: otomatis dari Git di `android-client/app/build.gradle.kts`
- **Release signing env**: `android-client/.env` / `android-client/.env.example`
- **PM2 Config**: `ecosystem.config.cjs`
- **Deploy Script**: `deploy.sh`

