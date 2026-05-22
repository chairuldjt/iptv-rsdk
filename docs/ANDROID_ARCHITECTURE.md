# RSDK IPTV Player - Android Client Architecture

Dokumen ini menjelaskan struktur arsitektur, modul data, konfigurasi network, serta detail implementasi aplikasi **RSDK IPTV Player** pada platform Android TV/STB.

---

## 🏗️ 1. Arsitektur Utama (MVVM & Clean Architecture)

Aplikasi Android dibangun menggunakan **Model-View-ViewModel (MVVM)** yang bersih, terpisah antara UI (Activities/Fragments), Business Logic (ViewModels), dan Data Layer (Repositories & Cache).

```
   ┌────────────────────────────────────────────────────────┐
   │                     VIEW LAYER                         │
   │    LiveTvActivity / SettingsActivity / BootReceiver    │
   └──────────────────────────┬─────────────────────────────┘
                              │ Observes UI State
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │                   VIEWMODEL LAYER                      │
   │      TvPlayerViewModel / SettingsViewModel             │
   └──────────────────────────┬─────────────────────────────┘
                              │ Requests Data
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │                  REPOSITORY LAYER                      │
   │      IptvRepository (Manages Cache & API Sync)         │
   └───────────────────────┬───────────────┬────────────────┘
                           │               │
      Reads/Writes Cache   ▼               ▼   API Network Requests
     ┌───────────────────────┐           ┌──────────────────────┐
     │      LOCAL CACHE      │           │    REMOTE DATA       │
     │  - Room DB (Channels) │           │  - Retrofit HTTP     │
     │  - DataStore (Configs)│           │  - OkHttpClient      │
     └───────────────────────┘           └──────────────────────┘
```

---

## 🔒 2. DataStore & Local Storage (Penyimpanan Konfigurasi)

Untuk menyimpan status dan konfigurasi yang persisten, aplikasi menggunakan **Jetpack DataStore (Preferences)**, bukan SharedPreferences lama yang lambat dan sinkron.

### Data yang disimpan di DataStore:
1. **Device ID (UUID)**: Di-generate sekali saat aplikasi dibuka pertama kali.
2. **Server URL Override**: Menyimpan URL baru jika teknisi mengubah server URL secara manual.
3. **Last Selected Channel ID**: Mengingat channel terakhir yang ditonton untuk diputar langsung saat startup.
4. **App Settings Cache**: Menyimpan nilai offline untuk `aspect_ratio`, `sync_interval`, `lock_settings`, `technician_pin`, `sync_mode`, `custom_m3u_url`, konfigurasi SMB edukasi, dan `auto_start_on_boot`.
5. **Last Sync Timestamp**: Kapan terakhir kali sukses melakukan sinkronisasi dengan API.

### Logic Pemilihan Server URL:
```kotlin
suspend fun getServerUrl(): String {
    // 1. Cek override di DataStore
    val overrideUrl = dataStore.data.first()[PreferencesKeys.SERVER_URL_OVERRIDE]
    if (!overrideUrl.isNullOrEmpty()) {
        return overrideUrl
    }
    // 2. Gunakan BuildConfig jika tidak ada override
    return BuildConfig.DEFAULT_API_BASE_URL
}
```

Default `BuildConfig.DEFAULT_API_BASE_URL` saat ini adalah:
```kotlin
https://iptv.teknisirsdk.my.id
```

Untuk deployment LAN, value ini dapat diganti sebelum build APK, misalnya:
```kotlin
http://10.55.1.5:9000
```

### Mode Sinkronisasi
- `api`: default. Channel diambil dari Web Admin/API global playlist.
- `custom`: channel diambil dari URL M3U custom per device.

Fallback custom M3U lokal saat mode `custom` aktif dan belum ada URL tersimpan:
```kotlin
http://10.0.0.1/iptv/iptv_rsdk.m3u
```

---

## 🗄️ 3. Room SQLite Database (Cache Daftar Channel)

Untuk mendukung **Offline Mode**, seluruh kategori dan channel yang sukses diunduh dari server akan disimpan ke dalam database SQLite lokal menggunakan **Jetpack Room**.

### Entitas Database Room:
```kotlin
@Entity(tableName = "channels")
data class ChannelEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val logo: String,
    val groupName: String, // Berperan sebagai kategori
    val streamUrl: String,
    val sortOrder: Int,
    val isActive: Boolean
)
```

Jika server backend offline atau tidak terjangkau, repository akan langsung membaca `List<ChannelEntity>` dari Room DB, sehingga pengguna TV tetap bisa menonton siaran menggunakan playlist yang di-cache sebelumnya.

Jika device dihapus dari Web Admin, APK versi terbaru akan mencoba register ulang otomatis saat heartbeat berikutnya. Dengan heartbeat default 30 detik, device biasanya muncul lagi tanpa reinstall. APK lama mungkin membutuhkan restart aplikasi agar registrasi awal berjalan kembali.

---

## 📺 4. Integrasi Media3 ExoPlayer & Fitur Aspek Rasio

Aplikasi menggunakan **AndroidX Media3 ExoPlayer** yang dioptimalkan untuk performa tinggi pada STB dengan RAM kecil.

### Pilihan Aspek Rasio (Resize Mode):
Pengaturan aspek rasio dinamis dipetakan ke fungsi layout `PlayerView`:
*   `fit`: `AspectRatioFrameLayout.RESIZE_MODE_FIT` (Menjaga rasio asli dengan garis hitam).
*   `stretch`: `AspectRatioFrameLayout.RESIZE_MODE_FILL` (Memenuhi layar penuh secara paksa).
*   `zoom`: `AspectRatioFrameLayout.RESIZE_MODE_ZOOM` (Memotong video agar penuh layar).
*   `16_9`: Memaksa rasio aspek 16:9.
*   `4_3`: Memaksa rasio aspek 4:3.

```kotlin
fun applyAspectRatio(playerView: PlayerView, ratio: String) {
    when (ratio) {
        "fit" -> playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
        "stretch" -> playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FILL
        "zoom" -> playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
        "16_9" -> {
            playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIXED_WIDTH
            playerView.setAspectRatio(16f / 9f)
        }
        "4_3" -> {
            playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIXED_WIDTH
            playerView.setAspectRatio(4f / 3f)
        }
    }
}
```

---

## 📡 5. Cleartext HTTP & Network Security Config

Default production memakai HTTPS. Cleartext tetap diizinkan karena STB sering dipasang di jaringan intranet dengan IP server non-HTTPS seperti `http://10.55.1.5:9000`.

### File: `res/xml/network_security_config.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

### File: `AndroidManifest.xml` (Integrasi Config)
```xml
<application
    android:name=".IptvApplication"
    android:networkSecurityConfig="@xml/network_security_config"
    android:usesCleartextTraffic="true"
    ... >
```

---

## 🔄 6. Auto-Start On Boot (Boot Receiver)

Untuk kebutuhan perangkat STB / TV komersial yang berfungsi sebagai kios/display, aplikasi memiliki fitur auto-start setelah Android selesai booting.

### Permisi & Receiver di `AndroidManifest.xml`:
```xml
<!-- Permisi untuk mendengarkan boot completed -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<application ...>
    <receiver
        android:name=".receiver.BootReceiver"
        android:enabled="true"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.BOOT_COMPLETED" />
            <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            <category android:name="android.intent.category.DEFAULT" />
        </intent-filter>
    </receiver>
</application>
```

### File: `BootReceiver.kt`
```kotlin
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Action) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || 
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            
            // Periksa dari DataStore apakah auto-start aktif
            CoroutineScope(Dispatchers.IO).launch {
                val autoStartEnabled = context.dataStore.data.first()[AUTO_START_ON_BOOT] ?: false
                if (autoStartEnabled) {
                    val launchIntent = Intent(context, LiveTvActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(launchIntent)
                }
            }
        }
    }
}
```

---

## 🎛️ 7. Panduan Antarmuka Pengguna Android TV (D-pad Focus)

Desain antarmuka dirancang khusus untuk layar TV berjarak 3 meter dengan navigasi remote control standar (D-pad UP/DOWN/LEFT/RIGHT/OK).

### Aturan UI/UX Penting:
1. **Focus State Indication**: Semua item menu yang dapat diklik wajib memiliki visual focus yang tebal. Gunakan selektor drawable atau XML border bersinar (glow) dan naikkan ukuran elemen (scale up 1.05x) saat status `focused = true`.
2. **Tanpa Touchscreen Dependency**: Pastikan tidak ada tombol yang melayang yang tidak bisa dicapai oleh D-pad. Urutan navigasi diatur secara eksplisit menggunakan `android:nextFocusLeft`, `android:nextFocusRight`, dll.
3. **Loading Status**: Tampilkan progress bar yang informatif ("Menghubungkan ke Server...", "Sinkronisasi Saluran...") daripada halaman hitam kosong saat memuat data.
4. **Dark Mode by Default**: Latar belakang aplikasi harus berwarna gelap pekat (misal: `#0F172A` Slate Dark) untuk kenyamanan mata pengguna TV di malam hari.
