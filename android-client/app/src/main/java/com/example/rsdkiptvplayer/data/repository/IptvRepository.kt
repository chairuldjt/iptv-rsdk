package com.example.rsdkiptvplayer.data.repository

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.SystemClock
import com.example.rsdkiptvplayer.BuildConfig
import com.example.rsdkiptvplayer.data.api.*
import com.example.rsdkiptvplayer.data.cache.ChannelDao
import com.example.rsdkiptvplayer.data.cache.ChannelEntity
import com.example.rsdkiptvplayer.data.datastore.DataStoreManager
import com.example.rsdkiptvplayer.data.parser.M3uParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.Inet4Address
import java.net.NetworkInterface
import java.text.SimpleDateFormat
import java.util.*

class IptvRepository(
    private val context: Context,
    private val channelDao: ChannelDao,
    private val dataStoreManager: DataStoreManager
) {

    val allChannelsFlow: Flow<List<ChannelEntity>> = channelDao.getAllChannelsFlow()
    val allCategoriesFlow: Flow<List<String>> = channelDao.getAllCategoriesFlow()
    
    private val _remoteCommandFlow = MutableSharedFlow<Pair<String, String?>>(extraBufferCapacity = 10)
    val remoteCommandFlow: SharedFlow<Pair<String, String?>> = _remoteCommandFlow

    fun emitRemoteCommand(command: String, value: String?) {
        _remoteCommandFlow.tryEmit(Pair(command, value))
    }
    val serverUrlFlow: Flow<String> = dataStoreManager.serverUrlFlow
    val lockSettingsFlow: Flow<Boolean> = dataStoreManager.lockSettingsFlow
    val autoStartFlow: Flow<Boolean> = dataStoreManager.autoStartFlow
    val aspectRatioFlow: Flow<String> = dataStoreManager.aspectRatioFlow
    val diagnosticLogsFlow: Flow<List<String>> = dataStoreManager.diagnosticLogsFlow
    val technicianPinFlow: Flow<String> = dataStoreManager.technicianPinFlow

    // Handshake & Self Register on boot/startup
    suspend fun registerDevice(): Boolean {
        val serverApiEnabled = dataStoreManager.serverApiEnabledFlow.first()
        if (!serverApiEnabled) {
            dataStoreManager.addLog("API Server is disabled. Skipping registration.")
            return true // Allow offline mode
        }

        val deviceId = dataStoreManager.getDeviceId()
        val serverUrl = dataStoreManager.getServerUrl()

        val request = RegisterRequest(
            device_id = deviceId,
            device_name = "${Build.MANUFACTURER} ${Build.MODEL}",
            app_version = BuildConfig.VERSION_NAME,
            android_version = Build.VERSION.RELEASE,
            mac_address = getMacAddress(),
            local_ip = getLocalIpAddress()
        )

        dataStoreManager.addLog("Registering device on endpoint $serverUrl...")
        return try {
            val apiService = RetrofitClient.getService(serverUrl)
            val response = apiService.registerDevice(request)
            if (response.isSuccessful && response.body() != null) {
                val resBody = response.body()!!
                dataStoreManager.addLog("Registration result: ${resBody.message}")
                if (resBody.status && resBody.data != null) {
                    dataStoreManager.setSyncInterval(resBody.data.sync_interval)
                    resBody.data.active
                } else {
                    dataStoreManager.addLog("Registration successful (default active)")
                    true
                }
            } else {
                dataStoreManager.addLog("Registration failed: HTTP ${response.code()}")
                // Fallback to locally stored active preference if server fails, default true
                true
            }
        } catch (e: Exception) {
            dataStoreManager.addLog("Registration connection error: ${e.message}")
            true // Allow offline mode
        }
    }

    // Sync Server configurations
    suspend fun syncConfig(): Boolean {
        val serverApiEnabled = dataStoreManager.serverApiEnabledFlow.first()
        if (!serverApiEnabled) {
            return true
        }

        val deviceId = dataStoreManager.getDeviceId()
        val serverUrl = dataStoreManager.getServerUrl()

        dataStoreManager.addLog("Syncing configuration from server...")
        try {
            val apiService = RetrofitClient.getService(serverUrl)
            val response = apiService.getDeviceConfig(deviceId)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.status && body.data != null) {
                    val config = body.data
                    dataStoreManager.addLog("Config Sync: Server returned lock_settings=${config.lock_settings}, mode=${config.sync_mode}")
                    dataStoreManager.setLockSettings(config.lock_settings ?: true)
                    dataStoreManager.setSyncInterval(config.sync_interval ?: 1800)
                    dataStoreManager.setAspectRatio(config.aspect_ratio ?: "fit")
                    config.sync_mode?.let { dataStoreManager.setSyncMode(it) }
                    config.custom_m3u_url?.let { dataStoreManager.setCustomM3uUrl(it) }
                    config.technician_pin?.let { pin ->
                        dataStoreManager.setTechnicianPin(pin)
                    }
                    config.education_video_path?.let { dataStoreManager.setEducationVideoPath(it) }
                    dataStoreManager.setEducationSmbCredentials(
                        config.education_smb_username ?: "",
                        config.education_smb_password ?: "",
                        config.education_smb_domain ?: ""
                    )
                    dataStoreManager.setEducationPlaylistConfig(
                        config.education_repeat_mode ?: "all",
                        config.education_play_order ?: "alphabetical"
                    )
                    dataStoreManager.setEducationSource(config.education_source ?: "smb")
                    dataStoreManager.setEducationPlaybackMode(config.education_playback_mode ?: "copy")
                    dataStoreManager.setAutoStartOnBoot(config.auto_start_on_boot ?: false)

                    if (config.force_sync == true) {
                        dataStoreManager.addLog("Remote trigger: FORCE SYNC enabled!")
                    }

                    if (config.clear_cache_trigger == true) {
                        dataStoreManager.addLog("Remote trigger: CLEAR CACHE triggered from Web!")
                        clearChannelCache()
                    }

                    val educationPath = dataStoreManager.getEducationVideoPath()
                    val eduSource = dataStoreManager.getEducationSource()
                    val eduPlaybackMode = dataStoreManager.getEducationPlaybackMode()
                    if (eduPlaybackMode == "copy" && (eduSource == "web" || educationPath.isNotBlank())) {
                        // Trigger background video caching
                        kotlinx.coroutines.CoroutineScope(Dispatchers.IO).launch {
                            com.example.rsdkiptvplayer.util.EducationSyncManager.sync(context, forceSync = config.education_force_sync == true)
                        }
                    }

                    dataStoreManager.addLog("Server config sync successful!")
                    return config.active
                }
            } else {
                if (response.code() == 403) {
                    dataStoreManager.addLog("Config sync blocked: Device is inactive on server.")
                    return false
                }
                if (response.code() == 404) {
                    dataStoreManager.addLog("Config sync: Device missing on server. Re-registering...")
                    return registerDevice()
                }
                dataStoreManager.addLog("Config sync failed: HTTP ${response.code()}")
            }
        } catch (e: Exception) {
            dataStoreManager.addLog("Config sync network error: ${e.message}")
        }
        return true
    }

    // Sync local custom M3U playlist
    suspend fun syncLocalM3u(url: String): Pair<Boolean, String> {
        val normalizedUrl = url.trim()
        if (normalizedUrl.isEmpty()) {
            return Pair(false, "URL M3U kosong.")
        }

        dataStoreManager.addLog("Mode M3U custom aktif. Mengunduh playlist M3U...")
        return withContext(Dispatchers.IO) {
            try {
                dataStoreManager.setCustomM3uUrl(normalizedUrl)
                dataStoreManager.setSyncMode("custom")
                dataStoreManager.addLog("Mengunduh playlist M3U dari: $normalizedUrl...")

                val connection = java.net.URL(normalizedUrl).openConnection() as java.net.HttpURLConnection
                connection.connectTimeout = 15000
                connection.readTimeout = 15000
                connection.requestMethod = "GET"
                connection.connect()

                if (connection.responseCode == 200) {
                    val content = connection.inputStream.bufferedReader().use { it.readText() }
                    val channels = M3uParser.parse(content)
                    if (channels.isNotEmpty()) {
                        channelDao.replaceAllChannels(channels)
                        dataStoreManager.setLastSyncTimestamp(System.currentTimeMillis())
                        dataStoreManager.addLog("Sukses sinkronisasi M3U! Berhasil memuat ${channels.size} saluran.")
                        Pair(true, "Sukses: Berhasil memuat ${channels.size} saluran dari M3U.")
                    } else {
                        dataStoreManager.addLog("Gagal: M3U kosong atau format tidak valid.")
                        Pair(false, "Format playlist M3U tidak valid atau tidak ditemukan saluran.")
                    }
                } else {
                    dataStoreManager.addLog("Gagal mengunduh M3U: HTTP ${connection.responseCode}")
                    Pair(false, "Server merespon dengan HTTP ${connection.responseCode}.")
                }
            } catch (e: Exception) {
                dataStoreManager.addLog("Error mengunduh M3U: ${e.message}")
                Pair(false, "Koneksi gagal atau URL salah: ${e.localizedMessage}.")
            }
        }
    }

    // Sync remote channel list to Room DB Cache
    suspend fun syncChannels(): Boolean {
        val syncMode = dataStoreManager.getSyncMode()
        if (syncMode == "custom") {
            val customUrl = dataStoreManager.getCustomM3uUrl()
            if (customUrl.isNotEmpty()) {
                val res = syncLocalM3u(customUrl)
                return res.first
            }
        }

        val serverApiEnabled = dataStoreManager.serverApiEnabledFlow.first()
        if (!serverApiEnabled) {
            return false
        }

        val deviceId = dataStoreManager.getDeviceId()
        val serverUrl = dataStoreManager.getServerUrl()

        dataStoreManager.addLog("Syncing channel playlist from server...")
        try {
            val apiService = RetrofitClient.getService(serverUrl)
            val response = apiService.getDeviceChannels(deviceId)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.status && body.data != null) {
                    val remoteChannels = body.data
                    val entities = remoteChannels.map {
                        ChannelEntity(
                            id = it.id,
                            name = it.name,
                            logo = it.logo,
                            groupName = it.group,
                            streamUrl = it.stream_url,
                            sortOrder = it.sort_order,
                            isActive = it.active
                        )
                    }

                    // Save cache to Room atomically
                    channelDao.replaceAllChannels(entities)
                    
                    dataStoreManager.setLastSyncTimestamp(System.currentTimeMillis())
                    dataStoreManager.addLog("Playlist synced successfully. Received ${entities.size} channels.")
                    return true
                }
            } else {
                dataStoreManager.addLog("Failed syncing channels: HTTP ${response.code()}")
            }
        } catch (e: Exception) {
            dataStoreManager.addLog("Channels sync network error: ${e.message}")
        }
        return false
    }

    // Send Status Heartbeat to Web Admin
    suspend fun sendHeartbeat(currentChannelId: Int?): StatusData? {
        val serverApiEnabled = dataStoreManager.serverApiEnabledFlow.first()
        if (!serverApiEnabled) {
            return null
        }

        val deviceId = dataStoreManager.getDeviceId()
        val serverUrl = dataStoreManager.getServerUrl()

        val request = StatusRequest(
            device_id = deviceId,
            current_channel_id = currentChannelId,
            uptime_seconds = SystemClock.elapsedRealtime() / 1000,
            memory_free_mb = getFreeMemory(),
            cpu_usage_percent = 15.0f, // Fallback placeholder
            local_ip = getLocalIpAddress()
        )

        try {
            val apiService = RetrofitClient.getService(serverUrl)
            val response = apiService.sendHeartbeat(request)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.status && body.data != null) {
                    val status = body.data
                    dataStoreManager.addLog("Heartbeat: Server returned lock_settings=${status.lock_settings}, active=${status.active}")
                    dataStoreManager.setLockSettings(status.lock_settings)
                    if (status.force_sync) {
                        dataStoreManager.addLog("Heartbeat response trigger received.")
                    }
                    return status
                }
            } else {
                if (response.code() == 404) {
                    dataStoreManager.addLog("Heartbeat: Device missing on server. Re-registering automatically...")
                    val active = registerDevice()
                    return StatusData(
                        force_sync = active,
                        lock_settings = dataStoreManager.getLockSettings(),
                        active = active
                    )
                }
                if (response.code() == 403) {
                    dataStoreManager.addLog("Heartbeat: Device is inactive on server.")
                    return StatusData(
                        force_sync = false,
                        lock_settings = dataStoreManager.getLockSettings(),
                        active = false
                    )
                }
                dataStoreManager.addLog("Heartbeat response failed: HTTP ${response.code()}")
            }
        } catch (e: Exception) {
            // Heartbeat failed (Offline / No Server Connection)
            dataStoreManager.addLog("Heartbeat network error: ${e.message}")
        }
        return null
    }

    // Log error to Remote Web Admin
    suspend fun logError(errorType: String, message: String, channelId: Int?, streamUrl: String?) {
        dataStoreManager.addLog("⚠️ ERROR ($errorType): $message")

        val serverApiEnabled = dataStoreManager.serverApiEnabledFlow.first()
        if (!serverApiEnabled) {
            return
        }

        val deviceId = dataStoreManager.getDeviceId()
        val serverUrl = dataStoreManager.getServerUrl()

        val timestamp = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.getDefault()).format(Date())
        val request = LogRequest(
            device_id = deviceId,
            error_type = errorType,
            error_message = message,
            channel_id = channelId,
            stream_url = streamUrl,
            android_sdk = Build.VERSION.SDK_INT,
            timestamp = timestamp
        )

        try {
            val apiService = RetrofitClient.getService(serverUrl)
            apiService.sendErrorLog(request)
        } catch (e: Exception) {
            // Safe ignore if endpoint is down, already saved locally
        }
    }

    // Direct connection test
    suspend fun testConnection(targetUrl: String): Pair<Boolean, String> {
        return try {
            val apiService = RetrofitClient.getService(targetUrl)
            val deviceId = dataStoreManager.getDeviceId()
            
            // Register/handshake the device on this server first so it is present in the database
            val request = RegisterRequest(
                device_id = deviceId,
                device_name = "${Build.MANUFACTURER} ${Build.MODEL}",
                app_version = BuildConfig.VERSION_NAME,
                android_version = Build.VERSION.RELEASE,
                mac_address = getMacAddress(),
                local_ip = getLocalIpAddress()
            )
            
            val regResponse = apiService.registerDevice(request)
            if (!regResponse.isSuccessful) {
                return Pair(false, "Registrasi perangkat gagal: HTTP ${regResponse.code()}")
            }
            
            val response = apiService.getDeviceConfig(deviceId)
            if (response.isSuccessful) {
                Pair(true, "Terhubung ke server! HTTP ${response.code()}")
            } else {
                Pair(false, "Respon server error: HTTP ${response.code()}")
            }
        } catch (e: Exception) {
            Pair(false, "Koneksi Gagal: ${e.localizedMessage}")
        }
    }

    // Clear Room Cache
    suspend fun clearChannelCache() {
        channelDao.clearAll()
        dataStoreManager.addLog("Local channel cache cleared.")
    }

    // Total Factory Reset
    suspend fun factoryReset() {
        channelDao.clearAll()
        dataStoreManager.clearAll()
    }

    // Helper functions
    fun getLocalIpAddress(): String {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (!address.isLoopbackAddress && address is Inet4Address) {
                        return address.hostAddress ?: "127.0.0.1"
                    }
                }
            }
        } catch (ex: Exception) {
            ex.printStackTrace()
        }
        return "127.0.0.1"
    }

    private fun getFreeMemory(): Long {
        val mi = ActivityManager.MemoryInfo()
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        activityManager.getMemoryInfo(mi)
        return mi.availMem / 1048576L // convert to MB
    }

    fun getMacAddress(): String? {
        var hardwareMac: String? = null
        try {
            val all = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (nif in all) {
                if (!nif.name.equals("wlan0", ignoreCase = true) && !nif.name.equals("eth0", ignoreCase = true)) continue
                val macBytes = nif.hardwareAddress ?: continue
                val res1 = StringBuilder()
                for (b in macBytes) {
                    res1.append(String.format("%02X:", b))
                }
                if (res1.isNotEmpty()) {
                    res1.deleteCharAt(res1.length - 1)
                }
                val formatted = res1.toString()
                if (formatted.isNotEmpty() && formatted != "02:00:00:00:00:00") {
                    return formatted
                }
                hardwareMac = formatted
            }
        } catch (ex: Exception) {
            ex.printStackTrace()
        }

        // Fallback to Settings.Secure.ANDROID_ID on Android 10+ or if hardware MAC is 02:00:00:00:00:00
        try {
            val androidId = android.provider.Settings.Secure.getString(
                context.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            )
            if (!androidId.isNullOrEmpty()) {
                val cleanId = androidId.filter { it.isDigit() || it.lowercaseChar() in 'a'..'f' }
                    .padStart(10, '0')
                    .takeLast(10)
                    .uppercase()
                val sb = StringBuilder("02")
                for (i in 0 until 5) {
                    sb.append(":")
                    sb.append(cleanId.substring(i * 2, i * 2 + 2))
                }
                return sb.toString()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return hardwareMac ?: "02:00:00:00:00:00"
    }
}
