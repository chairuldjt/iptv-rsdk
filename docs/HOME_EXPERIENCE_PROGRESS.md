# Progress Checklist: Server-Driven Home Experience

Dokumen ini melacak progress implementasi konfigurasi **asset-driven / server-driven** untuk home experience Android TV client. Target akhirnya adalah perubahan mayoritas tampilan dan perilaku home dapat diatur dari Web Admin, lalu diterapkan saat aplikasi Android **restart** tanpa perlu reinstall APK.

## Ruang Lingkup

Target fitur:

- [x] 1. Background homescreen
- [x] 2. Logo
- [x] 3. Hide / show menu dari homescreen
- [x] 4. Informasi halaman statis
- [x] 5. Running text live global
- [x] 6. Splashscreen
- [x] 7. Icon, nama menu, sub teks, warna teks, dan border selection per menu
- [x] 8. Tambah menu baru di homescreen
- [~] 9. Sound effect
- [~] 10. Force tampilkan video overlay dari menu mana pun, lalu kembali ke layar sebelumnya
- [x] 11. Group di device manager
- [x] 12. Semua poin 1-10 bisa di-apply per device / per group

## Aturan Penerapan

- [x] Konfigurasi dibaca dari server.
- [x] Konfigurasi efektif disimpan lokal di Android.
- [x] Perubahan diterapkan saat aplikasi restart.
- [x] OTA APK hanya dipakai untuk menambah kemampuan shell baru, bukan untuk mengganti konten harian.

## Tahap Implementasi

### A. Dokumentasi & Desain

- [x] Dokumen strategi server-driven updates dibuat
- [x] Dokumen checklist progress dibuat
- [x] Struktur JSON config home experience disepakati
- [x] Prioritas merge config `global -> group -> device` didokumentasikan

### B. Backend & Data Model

- [~] Tambah entity `DeviceGroup`
- [x] Tambah relasi device ke group
- [x] Storage config global di backend
- [x] Storage config per group di backend
- [x] Storage config per device di backend
- [x] Merge resolver config efektif untuk device
- [x] Endpoint config device mengirim `home_experience`

### C. Dashboard Web

- [x] Menu sidebar baru untuk pengaturan home experience
- [x] Halaman global config
- [x] Halaman group config
- [x] Halaman device override config
- [x] Manajemen device group dari Device Manager
- [x] Upload field untuk asset image/audio/video terkait home experience
- [x] Checklist/preview status config efektif

### D. Android Client Shell

- [x] DataStore menyimpan JSON home experience
- [x] Repository sync config menyimpan `home_experience`
- [x] Splash screen membaca config server-driven
- [x] Home background membaca config server-driven
- [x] Home menu membaca daftar item dinamis
- [x] Hide / show menu aktif
- [x] Label, subtitle, icon, warna, border per menu aktif
- [x] Halaman statis aktif
- [x] Running text global aktif
- [~] Sound effect configurable
- [~] Video overlay paksa aktif
- [x] Kembali ke layar sebelumnya setelah video overlay selesai

### E. Asset & Delivery

- [x] Asset image disajikan dari backend/public uploads
- [x] Asset audio disajikan dari backend/public uploads
- [x] Asset video overlay disajikan dari backend/public uploads
- [x] Client punya fallback default bila asset kosong / gagal dimuat
- [x] Asset non-kritis tidak membuat app gagal render

### F. Testing

- [x] Build backend lulus
- [x] Build Android lulus
- [x] Uji merge config global/group/device
- [x] Uji restart aplikasi memuat config baru
- [x] Uji hide/show menu
- [x] Uji halaman statis
- [x] Uji running text
- [~] Uji force video overlay
- [x] Uji device group assignment
- [x] Uji langsung via ADB pada device online

## Catatan Operasional

- Device saat ini hanya menerapkan perubahan setelah restart aplikasi.
- `Sound effect` saat ini sudah mendukung enable/disable dan remote URL untuk splash serta selection sound, tetapi belum ada library soundboard / multi-event audio yang lebih lengkap.
- `Force video overlay` saat ini sudah bisa dipicu dari profile saat app start dan kembali ke layar sebelumnya setelah selesai. Trigger live penuh tanpa restart dari screen mana pun masih perlu tahap lanjutan.
- Group dan assignment saat ini disimpan di backend melalui `app_settings` JSON, belum menjadi tabel Prisma terpisah.
- Beberapa poin membutuhkan kemampuan shell Android baru terlebih dahulu. Setelah kemampuan itu ditanam ke APK, perubahan berikutnya dapat dilakukan dari server tanpa update APK lagi.
