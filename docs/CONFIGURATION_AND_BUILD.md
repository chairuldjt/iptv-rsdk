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
  buildConfigField("String", "DEFAULT_API_BASE_URL", "\"http://10.0.2.2:3000\"")
  ```
- **Catatan**: Ubah value tersebut jika ingin mengganti server default (misalnya ke IP server lokal/produksi Anda).

### B. Default M3U Custom URL
Jika aplikasi digunakan dalam mode M3U (bukan mode API Server), Anda bisa menyetel URL playlist default.
- **Lokasi File**: `android-client/app/src/main/java/com/example/rsdkiptvplayer/data/datastore/DataStoreManager.kt`
- **Kode**:
  ```kotlin
  // Cari baris ini:
  prefs[CUSTOM_M3U_URL] ?: ""

  // Ubah menjadi misalnya:
  prefs[CUSTOM_M3U_URL] ?: "http://10.0.0.1/iptv/iptv_rsdk.m3u"
  ```

### C. Default Mode Sinkronisasi (Sync Mode)
Menentukan apakah APK bawaan langsung mencari playlist dari Server API atau dari M3U Custom.
- **Lokasi File**: `DataStoreManager.kt`
- **Kode**:
  ```kotlin
  // Cari baris ini (defaultnya "server"):
  prefs[SYNC_MODE] ?: "server"

  // Jika ingin default langsung pakai M3U custom:
  prefs[SYNC_MODE] ?: "custom_m3u"
  ```

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

---


## 🛠️ 2. Cara Build APK

Pastikan Anda sudah menginstal JDK 17+ dan Android SDK. Jalankan perintah berikut dari direktori utama proyek:

1. Masuk ke direktori client:
   ```powershell
   cd android-client
   ```
2. Jalankan Build menggunakan Gradle Wrapper:
   ```powershell
   ./gradlew assembleDebug
   ```
3. File APK yang dihasilkan akan berada di:
   `android-client/app/build/outputs/apk/debug/app-debug.apk`

---

## 📲 3. Cara Instalasi ke Perangkat (via ADB)

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

