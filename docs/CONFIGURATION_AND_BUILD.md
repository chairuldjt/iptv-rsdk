# Panduan Konfigurasi Default & Build

Dokumen ini berisi informasi mengenai lokasi konfigurasi default di dalam kode sumber (untuk mendukung fitur *Zero-Config*) serta panduan cara melakukan build APK dan instalasi ke perangkat.

---

## ⚙️ 1. Lokasi Konfigurasi Default

Beberapa nilai default tertanam di dalam kode untuk mendukung fitur **Auto-Active by Default**. Anda dapat mengubah nilai-nilai ini sebelum melakukan build APK untuk deployment massal.

### A. Default API Server URL
Alamat server backend utama yang akan dihubungi aplikasi saat pertama kali dijalankan.
- **Lokasi File**: `android-client/app/build.gradle.kts`
- **Kode**:
  ```kotlin
  buildConfigField("String", "DEFAULT_API_BASE_URL", "\"https://iptv.teknisirsdk.my.id\"")
  ```
- **Catatan**: Ubah value tersebut sebelum build APK jika deployment memakai server lain. Untuk server lokal, gunakan IP yang bisa dijangkau STB, misalnya `http://10.55.1.5:9000`, bukan `localhost`.

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
- **Catatan**: Walaupun default-nya `custom`, Android tetap melakukan config sync ke Web Admin. Jadi admin masih bisa mengubah device ke `API Server` dari remote config.

### D. Default Status Koneksi Server API (Enabled / Disabled)
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

### E. Default Lock Settings & PIN Teknisi
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

### B. Deploy otomatis
Setelah pull repo di server, jalankan:
```bash
./deploy.sh
```

Script ini akan menjalankan `npm ci`, Prisma generate/migrate, `npm run build`, reload PM2, dan health check ke `http://127.0.0.1:9000/login`.

---


## 🛠️ 3. Cara Build APK

Pastikan Anda sudah menginstal JDK 17+ dan Android SDK. Jalankan perintah berikut dari direktori utama proyek:

1. Masuk ke direktori client:
   ```powershell
   cd android-client
   ```
2. Jalankan build debug untuk testing:
   ```powershell
   ./gradlew assembleDebug
   ```
3. Jalankan build release untuk production:
   ```powershell
   ./gradlew assembleRelease
   ```
4. File APK yang dihasilkan akan berada di:
   `android-client/app/build/outputs/apk/debug/app-debug.apk`
   atau
   `android-client/app/build/outputs/apk/release/app-release.apk`

Build release sudah mengaktifkan minify/resource shrink dan signing dari `android-client/.env`.

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
- **Default M3U URL**: `DataStoreManager.kt`
- **Default Playlist Source**: `DataStoreManager.kt`
- **Default Server API Connection (Enabled/Disabled)**: `DataStoreManager.kt` & `SettingsViewModel.kt`
- **PM2 Config**: `ecosystem.config.cjs`
- **Deploy Script**: `deploy.sh`

