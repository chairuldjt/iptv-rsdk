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
   Akses Web Admin di: `http://localhost:3000`

---

## 📱 4. Menyiapkan Client (Android TV)

1. **Konfigurasi Server URL**:
   Buka file `android-client/app/build.gradle.kts` dan sesuaikan `DEFAULT_API_BASE_URL` dengan IP komputer/server Anda:
   ```kotlin
   buildConfigField("String", "DEFAULT_API_BASE_URL", "\"http://192.168.1.5:3000\"")
   ```
   *Catatan: Gunakan IP lokal asli, jangan `localhost` karena Android menganggap `localhost` adalah dirinya sendiri.*

2. **Build APK**:
   ```bash
   cd android-client
   ./gradlew assembleDebug
   ```
   Hasil build ada di: `android-client/app/build/outputs/apk/debug/app-debug.apk`

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
- **API Tidak Terhubung**: Pastikan Firewall di komputer Anda mengizinkan akses ke port 3000 atau matikan sementara untuk testing.
- **Prisma Error**: Pastikan MySQL sudah berjalan dan kredensial di `.env` sudah benar.
