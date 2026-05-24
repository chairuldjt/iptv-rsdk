# Panduan Memulai (Getting Started Guide)

Dokumen ini menjelaskan langkah-langkah lengkap untuk mengkloning proyek, menyiapkan backend, hingga menjalankan aplikasi Android TV Client.

---

## 📋 1. Prasyarat (Prerequisites)

Pastikan perangkat Anda sudah terinstal:
- **Node.js** (v18 atau lebih baru) & **npm**
- **Java JDK 17** (untuk Android build)
- **Android SDK** (atau Android Studio)
- **Git**
- **ADB** (Android Debug Bridge) yang sudah dikonfigurasi di PATH

---

## 🚀 2. Kloning Repositori

Buka terminal dan jalankan:
```bash
git clone https://github.com/chairuldjt/iptv-rsdk.git
cd iptv-rsdk
```

---

## 🌐 3. Menjalankan Backend (Web Admin & API)

Backend dibangun menggunakan Next.js dan Prisma.

1. **Instal Dependensi**:
   ```bash
   npm install
   ```
2. **Konfigurasi Database**:
   Secara default proyek ini menggunakan MySQL (lihat `prisma/schema.prisma`). Pastikan server database Anda aktif, lalu buat file `.env` di root folder:
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/iptv_rsdk"
   SESSION_SECRET="isi-random-panjang-minimal-32-karakter"
   ```
3. **Setup Database (Prisma)**:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   ```
4. **Jalankan Server Development**:
   ```bash
   npm run dev
   ```
   Akses Web Admin di: `http://localhost:9000`

### Deploy production dengan PM2
Di server production, gunakan script bawaan:
```bash
git pull origin master
./deploy.sh
```

Script akan menjalankan install dependency, Prisma migration, build Next.js, reload PM2, dan health check. Aplikasi production berjalan di port `9000`.

---

## 📱 4. Menyiapkan Client (Android TV)

1. **Konfigurasi Server URL**:
   Buka file `android-client/app/build.gradle.kts` dan sesuaikan `DEFAULT_API_BASE_URL` dengan IP komputer/server Anda:
   ```kotlin
   buildConfigField("String", "DEFAULT_API_BASE_URL", "\"https://iptv.teknisirsdk.my.id\"")
   ```
   *Catatan: Gunakan domain/IP yang bisa dijangkau STB. Untuk server lokal, contoh: `http://10.55.1.5:9000`. Jangan gunakan `localhost` karena Android menganggap `localhost` adalah dirinya sendiri.*

2. **Build APK**:
   ```bash
   cd android-client
   ./gradlew assembleDebug
   ```
   Hasil build ada di: `android-client/app/build/outputs/apk/debug/app-debug.apk`

   Untuk APK production:
   ```bash
   ./gradlew assembleRelease
   ```
   Hasil build ada di: `android-client/app/build/outputs/apk/release/app-release.apk`

   Catatan versi:
   - `versionCode` APK otomatis mengikuti jumlah commit Git.
   - `versionName` otomatis mengikuti `git describe --tags --always`.
   - Build release membutuhkan keystore di `android-client/.env` (`KEYSTORE_FILE`, `KEYSTORE_STORE_PASSWORD`, `KEYSTORE_KEY_ALIAS`, `KEYSTORE_KEY_PASSWORD`).

3. **Deploy OTA APK dari Dashboard**:
   Buka `/dashboard/updates`, pilih APK release, lalu dashboard akan membaca `versionCode` dan `versionName` otomatis dari manifest. Upload akan masuk sebagai draft; klik **Deploy Version** untuk menjadikannya versi OTA aktif yang dicek Android melalui `/api/app-update/check`.

---

## 📲 5. Instalasi ke Perangkat (ADB)

1. **Hubungkan Perangkat**: Pastikan USB Debugging aktif di STB/Android TV.
2. **Cek Koneksi**:
   ```bash
   adb devices
   ```
3. **Instal APK**:
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

---

## 🛠️ Troubleshooting Ringkas
- **Gagal Build Android**: Pastikan variabel lingkungan `JAVA_HOME` mengarah ke JDK 17.
- **API Tidak Terhubung**: Pastikan Firewall/reverse proxy mengizinkan akses ke port 9000 atau domain production.
- **Prisma Error**: Pastikan MySQL sudah berjalan dan kredensial di `.env` sudah benar.
- **Build Next gagal karena SESSION_SECRET**: Tambahkan `SESSION_SECRET` ke `.env`.
