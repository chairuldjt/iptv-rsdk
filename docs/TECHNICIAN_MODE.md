# RSDK IPTV Player - Technician Mode Specification

Dokumen ini mendokumentasikan spesifikasi teknis, mekanisme keamanan, serta fungsionalitas dari **Technician Mode (Mode Teknisi)** pada aplikasi Android RSDK IPTV Player.

---

## 🔒 1. Filosofi & Keamanan PIN

Dalam skenario deployment massal (misalnya di hotel, rumah sakit, kost-kostan, atau STB pelanggan retail), pengguna biasa tidak boleh mengubah konfigurasi sistem secara tidak sengaja, terutama alamat URL Server API.

Jika kolom `lock_settings` diatur bernilai `true` oleh Web Admin:
*   Akses ke menu pengaturan utama dibatasi hanya untuk informasi baca-saja (*Read-Only*).
*   Seluruh input pengubahan URL Server, reset konfigurasi, dan modifikasi data disembunyikan atau dinonaktifkan.
*   **Hanya Teknisi** yang dapat membuka kunci kontrol penuh dengan memasuki **Technician Mode** menggunakan **PIN Teknisi** (Default: `2468`).

---

## 🚪 2. Cara Masuk ke Technician Mode

Aplikasi menyediakan tiga metode alternatif untuk memasuki Technician Mode guna mengakomodasi keterbatasan remote control TV/STB:

### Metode 1: Kombinasi D-pad Remote Control (Rekomendasi Utama)
Di halaman **Settings** biasa (atau di layar utama mana pun), teknisi dapat menekan kombinasi tombol remote control berikut secara berurutan:
$$\text{UP} \rightarrow \text{UP} \rightarrow \text{DOWN} \rightarrow \text{DOWN} \rightarrow \text{LEFT} \rightarrow \text{RIGHT} \rightarrow \text{LEFT} \rightarrow \text{RIGHT} \rightarrow \text{OK}$$

*Mekanisme Deteksi Kotlin:*
```kotlin
private val konamiCode = listOf(
    KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_UP,
    KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_DPAD_DOWN,
    KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT,
    KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT,
    KeyEvent.KEYCODE_DPAD_CENTER
)
private var inputHistory = mutableListOf<Int>()

override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode in konamiCode) {
        inputHistory.add(keyCode)
        if (inputHistory.size > konamiCode.size) {
            inputHistory.removeAt(0)
        }
        if (inputHistory == konamiCode) {
            inputHistory.clear()
            openPinDialog() // Pemicu Modal PIN Teknisi
            return true
        }
    } else {
        inputHistory.clear()
    }
    return super.onKeyDown(keyCode, event)
}
```

### Metode 2: Klik Cepat Tombol OK 5 Kali
Di halaman Settings utama, arahkan fokus ke informasi "App Version" lalu tekan tombol **OK** pada remote sebanyak **5 kali secara berurutan** dengan jeda maksimal antar klik 500ms.

### Metode 3: Menu Pintasan PIN
Pilih menu visual berlabel **"Technician Mode"** yang terletak di bagian bawah menu Settings, kemudian masukkan PIN teknisi.

---

## ⌨️ 3. Antarmuka Input PIN (PIN Dialog UI)

Karena STB TV tidak memiliki keyboard fisik dan keyboard virtual bawaan Android TV sering mengganggu visual layar, aplikasi menyediakan **Custom Grid PIN Dialog**:

*   Tampilan berupa pop-up modal dengan latar belakang blur (glassmorphism).
*   Menampilkan indikator bulatan sesuai panjang PIN yang dikonfigurasi.
*   Menyediakan grid angka 0-9 yang ramah navigasi D-pad remote (3 kolom x 4 baris, termasuk tombol *Clear* dan *Backspace*).
*   Mendukung input tombol angka `0-9` langsung dari remote, tanpa harus memindahkan fokus satu per satu.
*   Jika PIN yang dimasukkan cocok dengan konfigurasi (default `2468`, panjang 4-8 digit), kunci pengaturan langsung terbuka dan masuk ke antarmuka **Advanced Technician Panel**.

---

## 🛠️ 4. Fitur-Fitur di Mode Teknisi (Advanced Panel)

Setelah sukses masuk ke Mode Teknisi, menu-menu berikut akan diaktifkan untuk operasional teknisi lokal:

### 4.1. Server URL Override & Restore
*   **Override Server URL**: Teknisi dapat mengubah URL API default ke alamat server lokal baru di lapangan menggunakan keyboard virtual. Alamat baru disimpan langsung di DataStore lokal.
*   **Tombol "Restore Default URL"**: Menghapus data override di DataStore secara instan dan mengembalikan rujukan URL ke setelan bawaan APK (`BuildConfig.DEFAULT_API_BASE_URL`, default production: `https://iptv.teknisirsdk.my.id`).

### 4.2. Uji Koneksi Server (Test Connection)
*   Mengirimkan request ping / handshake HTTP cepat ke Server URL aktif.
*   Menampilkan dialog indikator langsung:
    *   🟢 **Sukses**: "Terhubung ke server! HTTP 200".
    *   🔴 **Gagal**: "Koneksi Gagal! HTTP Status 404 / Connection Timeout. Periksa kabel LAN / Wi-Fi".

### 4.3. Manajemen Device ID (UUID)
*   Menampilkan informasi Device ID saat ini secara jelas agar mudah dicatat oleh teknisi untuk keperluan verifikasi database.
*   **Tombol "Reset Device ID"** (Berwarna Merah / Danger):
    *   Menghapus UUID lama dari DataStore.
    *   Membuat UUID baru dari awal.
    *   Melakukan registrasi ulang otomatis ke server (`/api/device/register`).
    *   Sangat berguna jika STB dipindah tangan ke lokasi baru atau ingin mendaftarkan ulang sebagai entitas baru di backend.

### 4.4. Pembersihan Cache & Sinkronisasi Paksa
*   **Clear Channel Cache**: Menghapus seluruh record kategori dan channel dari database SQLite lokal (Room) tanpa menghapus setelan Device ID.
*   **Force Sync Now**: Melakukan request instan ke endpoint `/api/device/channels/{device_id}` untuk menarik daftar siaran terbaru dari server dan meng-cache ulang.

### 4.5. Reset Total Aplikasi (Factory Reset App)
*   Menghapus seluruh isi DataStore (Device ID, URL Override, Aspect Ratio, dll) dan membersihkan Room Database.
*   Setelah proses selesai, aplikasi akan otomatis tertutup atau melakukan restart sistem (`Process.killProcess`), mengembalikan kondisi aplikasi persis seperti baru pertama kali di-install dari Google Play Store / file APK mentah.

### 4.6. Penampil Log Lokal (Local Diagnostics Log)
*   Menampilkan 50 baris aktivitas sistem terbaru di layar TV (seperti log *success sync*, *player exceptions*, *network failure timestamps*).
*   Sangat mempermudah diagnosis langsung di lapangan tanpa perlu menghubungkan kabel ADB USB ke komputer laptop.
