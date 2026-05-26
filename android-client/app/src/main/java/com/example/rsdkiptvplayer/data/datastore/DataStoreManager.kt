package com.example.rsdkiptvplayer.data.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.example.rsdkiptvplayer.BuildConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.UUID

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "iptv_settings")

class DataStoreManager(private val context: Context) {

    companion object {
        val DEVICE_ID = stringPreferencesKey("device_id")
        val STB_NAME = stringPreferencesKey("stb_name")
        val SERVER_URL_OVERRIDE = stringPreferencesKey("server_url_override")
        val SERVER_API_ENABLED = booleanPreferencesKey("server_api_enabled")
        val LAST_SELECTED_CHANNEL_ID = intPreferencesKey("last_selected_channel_id")
        val ASPECT_RATIO = stringPreferencesKey("aspect_ratio")
        val SYNC_INTERVAL = intPreferencesKey("sync_interval")
        val LOCK_SETTINGS = booleanPreferencesKey("lock_settings")
        val AUTO_START_ON_BOOT = booleanPreferencesKey("auto_start_on_boot")
        val AUTO_START_LOCAL_OVERRIDE = booleanPreferencesKey("auto_start_local_override")
        val LAST_SYNC_TIMESTAMP = longPreferencesKey("last_sync_timestamp")
        val LOCAL_DIAGNOSTIC_LOGS = stringPreferencesKey("local_diagnostic_logs")
        val SYNC_MODE = stringPreferencesKey("sync_mode")
        val CUSTOM_M3U_URL = stringPreferencesKey("custom_m3u_url")
        val EDUCATION_VIDEO_PATH = stringPreferencesKey("education_video_path")
        val EDUCATION_SMB_USERNAME = stringPreferencesKey("education_smb_username")
        val EDUCATION_SMB_PASSWORD = stringPreferencesKey("education_smb_password")
        val EDUCATION_SMB_DOMAIN = stringPreferencesKey("education_smb_domain")
        val EDUCATION_REPEAT_MODE = stringPreferencesKey("education_repeat_mode")
        val EDUCATION_PLAY_ORDER = stringPreferencesKey("education_play_order")
        val EDUCATION_SOURCE = stringPreferencesKey("education_source")
        val EDUCATION_PLAYBACK_MODE = stringPreferencesKey("education_playback_mode")
        val TECHNICIAN_PIN = stringPreferencesKey("technician_pin")
        val NTP_SERVER = stringPreferencesKey("ntp_server")
        val HOME_EXPERIENCE_JSON = stringPreferencesKey("home_experience_json")
        val VIDEO_BROADCAST_JSON = stringPreferencesKey("video_broadcast_json")
    }

    // Generate or get existing Device ID
    suspend fun getDeviceId(): String {
        val prefs = context.dataStore.data.first()
        var currentId = prefs[DEVICE_ID]
        if (currentId.isNullOrEmpty()) {
            currentId = "STB-RSDK-" + UUID.randomUUID().toString().uppercase()
            context.dataStore.edit { it[DEVICE_ID] = currentId }
            addLog("Device ID generated: $currentId")
        }
        return currentId
    }

    val stbNameFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[STB_NAME] ?: ""
    }

    suspend fun getStbName(): String {
        val prefs = context.dataStore.data.first()
        return prefs[STB_NAME] ?: ""
    }

    suspend fun setStbName(name: String) {
        val normalizedName = name.trim()
        val current = getStbName()
        if (current != normalizedName) {
            context.dataStore.edit { prefs ->
                prefs[STB_NAME] = normalizedName
            }
            addLog("STB name updated to: ${normalizedName.ifBlank { "(default device name)" }}")
        }
    }

    // Get dynamic server URL (override or buildConfig)
    val serverUrlFlow: Flow<String> = context.dataStore.data.map { prefs ->
        val override = prefs[SERVER_URL_OVERRIDE]
        if (!override.isNullOrEmpty()) {
            override
        } else {
            BuildConfig.DEFAULT_API_BASE_URL
        }
    }

    suspend fun getServerUrl(): String {
        val prefs = context.dataStore.data.first()
        val override = prefs[SERVER_URL_OVERRIDE]
        return if (!override.isNullOrEmpty()) override else BuildConfig.DEFAULT_API_BASE_URL
    }

    suspend fun setServerUrlOverride(url: String) {
        val current = getServerUrl()
        if (current != url) {
            context.dataStore.edit { prefs ->
                prefs[SERVER_URL_OVERRIDE] = url
            }
            addLog("Server URL override set to: $url")
        }
    }

    suspend fun clearServerUrlOverride() {
        context.dataStore.edit { prefs ->
            prefs.remove(SERVER_URL_OVERRIDE)
        }
        addLog("Server URL override cleared.")
    }

    val serverApiEnabledFlow: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[SERVER_API_ENABLED] ?: true
    }

    suspend fun setServerApiEnabled(enabled: Boolean) {
        val current = serverApiEnabledFlow.first()
        if (current != enabled) {
            context.dataStore.edit { prefs ->
                prefs[SERVER_API_ENABLED] = enabled
            }
            addLog("API Server connection changed to: ${if (enabled) "Enabled" else "Disabled"}")
        }
    }

    // Sync Mode: "api" (centralized) or "custom" (M3U URL)
    val syncModeFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[SYNC_MODE] ?: "custom"
    }

    suspend fun getSyncMode(): String {
        val prefs = context.dataStore.data.first()
        return prefs[SYNC_MODE] ?: "custom"
    }

    suspend fun setSyncMode(mode: String) {
        val normalizedMode = if (mode == "server") "api" else if (mode == "custom_m3u") "custom" else mode
        val current = getSyncMode()
        if (current != normalizedMode) {
            context.dataStore.edit { prefs ->
                prefs[SYNC_MODE] = normalizedMode
            }
            addLog("Sync mode changed to: $normalizedMode")
        }
    }

    // Custom M3U URL
    val customM3uUrlFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[CUSTOM_M3U_URL] ?: "http://10.0.0.1/iptv/iptv_rsdk.m3u"
    }

    suspend fun getCustomM3uUrl(): String {
        val prefs = context.dataStore.data.first()
        return prefs[CUSTOM_M3U_URL] ?: ""
    }

    suspend fun setCustomM3uUrl(url: String) {
        val current = getCustomM3uUrl()
        if (current != url) {
            context.dataStore.edit { prefs ->
                prefs[CUSTOM_M3U_URL] = url
            }
            addLog("Custom M3U URL updated.")
        }
    }

    // Education video SMB folder path, for example: \\10.45.128.129\edukasi
    val educationVideoPathFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[EDUCATION_VIDEO_PATH] ?: ""
    }

    suspend fun getEducationVideoPath(): String {
        val prefs = context.dataStore.data.first()
        return prefs[EDUCATION_VIDEO_PATH] ?: ""
    }

    suspend fun setEducationVideoPath(path: String) {
        val current = getEducationVideoPath()
        if (current != path.trim()) {
            context.dataStore.edit { prefs ->
                prefs[EDUCATION_VIDEO_PATH] = path.trim()
            }
            addLog("Education video path updated.")
        }
    }

    val educationSmbUsernameFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[EDUCATION_SMB_USERNAME] ?: ""
    }

    val educationSmbPasswordFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[EDUCATION_SMB_PASSWORD] ?: ""
    }

    val educationSmbDomainFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[EDUCATION_SMB_DOMAIN] ?: ""
    }

    val educationRepeatModeFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[EDUCATION_REPEAT_MODE] ?: "all"
    }

    val educationPlayOrderFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[EDUCATION_PLAY_ORDER] ?: "alphabetical"
    }

    val educationSourceFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[EDUCATION_SOURCE] ?: "smb"
    }

    val educationPlaybackModeFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[EDUCATION_PLAYBACK_MODE] ?: "copy"
    }

    suspend fun getEducationSource(): String {
        val prefs = context.dataStore.data.first()
        return prefs[EDUCATION_SOURCE] ?: "smb"
    }

    suspend fun setEducationSource(source: String) {
        val current = getEducationSource()
        if (current != source) {
            context.dataStore.edit { prefs ->
                prefs[EDUCATION_SOURCE] = source
            }
            addLog("Education source changed to: $source")
        }
    }

    suspend fun getEducationPlaybackMode(): String {
        val prefs = context.dataStore.data.first()
        return prefs[EDUCATION_PLAYBACK_MODE] ?: "copy"
    }

    suspend fun setEducationPlaybackMode(mode: String) {
        val current = getEducationPlaybackMode()
        if (current != mode) {
            context.dataStore.edit { prefs ->
                prefs[EDUCATION_PLAYBACK_MODE] = mode
            }
            addLog("Education playback mode changed to: $mode")
        }
    }

    suspend fun setEducationSmbCredentials(username: String, password: String, domain: String) {
        val prefs = context.dataStore.data.first()
        if (prefs[EDUCATION_SMB_USERNAME] != username || 
            prefs[EDUCATION_SMB_PASSWORD] != password || 
            prefs[EDUCATION_SMB_DOMAIN] != domain) {
            
            context.dataStore.edit { p ->
                p[EDUCATION_SMB_USERNAME] = username.trim()
                p[EDUCATION_SMB_PASSWORD] = password
                p[EDUCATION_SMB_DOMAIN] = domain.trim()
            }
            addLog("Education SMB credentials updated.")
        }
    }

    suspend fun setEducationPlaylistConfig(repeatMode: String, playOrder: String) {
        val prefs = context.dataStore.data.first()
        if (prefs[EDUCATION_REPEAT_MODE] != repeatMode || prefs[EDUCATION_PLAY_ORDER] != playOrder) {
            context.dataStore.edit { p ->
                p[EDUCATION_REPEAT_MODE] = repeatMode
                p[EDUCATION_PLAY_ORDER] = playOrder
            }
            addLog("Education playlist config updated: Repeat=$repeatMode, Order=$playOrder")
        }
    }

    // Aspect Ratio: "fit", "stretch", "zoom", "16_9", "4_3"
    val aspectRatioFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[ASPECT_RATIO] ?: "fit"
    }

    suspend fun setAspectRatio(ratio: String) {
        val current = aspectRatioFlow.first()
        if (current != ratio) {
            context.dataStore.edit { prefs ->
                prefs[ASPECT_RATIO] = ratio
            }
            addLog("Aspect ratio changed to: $ratio")
        }
    }

    // Sync Interval
    val syncIntervalFlow: Flow<Int> = context.dataStore.data.map { prefs ->
        prefs[SYNC_INTERVAL] ?: 1800
    }

    suspend fun setSyncInterval(seconds: Int) {
        val current = syncIntervalFlow.first()
        if (current != seconds) {
            context.dataStore.edit { prefs ->
                prefs[SYNC_INTERVAL] = seconds
            }
            addLog("Sync interval changed to: ${seconds}s")
        }
    }

    // Lock settings
    val lockSettingsFlow: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[LOCK_SETTINGS] ?: true
    }

    suspend fun getLockSettings(): Boolean {
        val prefs = context.dataStore.data.first()
        return prefs[LOCK_SETTINGS] ?: true
    }

    suspend fun setLockSettings(locked: Boolean) {
        val current = getLockSettings()
        if (current != locked) {
            context.dataStore.edit { prefs ->
                prefs[LOCK_SETTINGS] = locked
            }
            addLog("Settings locked status changed to: $locked")
        }
    }

    // Technician PIN sync
    val technicianPinFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[TECHNICIAN_PIN] ?: "2468"
    }

    suspend fun getTechnicianPin(): String {
        val prefs = context.dataStore.data.first()
        return prefs[TECHNICIAN_PIN] ?: "2468"
    }

    suspend fun setTechnicianPin(pin: String) {
        val current = getTechnicianPin()
        if (current != pin) {
            context.dataStore.edit { prefs ->
                prefs[TECHNICIAN_PIN] = pin
            }
            addLog("Technician PIN updated.")
        }
    }

    val ntpServerFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[NTP_SERVER] ?: "0.id.pool.ntp.org"
    }

    suspend fun getNtpServer(): String {
        val prefs = context.dataStore.data.first()
        return prefs[NTP_SERVER] ?: "0.id.pool.ntp.org"
    }

    suspend fun setNtpServer(server: String) {
        val normalizedServer = server.trim().lowercase().removeSuffix(".").ifBlank { "0.id.pool.ntp.org" }
        val current = getNtpServer()
        if (current != normalizedServer) {
            context.dataStore.edit { prefs ->
                prefs[NTP_SERVER] = normalizedServer
            }
            addLog("Primary NTP server changed to: $normalizedServer")
        }
    }

    val homeExperienceJsonFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[HOME_EXPERIENCE_JSON] ?: ""
    }

    suspend fun getHomeExperienceJson(): String {
        val prefs = context.dataStore.data.first()
        return prefs[HOME_EXPERIENCE_JSON] ?: ""
    }

    suspend fun setHomeExperienceJson(json: String) {
        val normalized = json.trim()
        val current = getHomeExperienceJson()
        if (current != normalized) {
            context.dataStore.edit { prefs ->
                prefs[HOME_EXPERIENCE_JSON] = normalized
            }
            addLog("Home experience profile updated from server.")
        }
    }

    val videoBroadcastJsonFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[VIDEO_BROADCAST_JSON] ?: ""
    }

    suspend fun getVideoBroadcastJson(): String {
        val prefs = context.dataStore.data.first()
        return prefs[VIDEO_BROADCAST_JSON] ?: ""
    }

    suspend fun setVideoBroadcastJson(json: String) {
        val normalized = json.trim()
        val current = getVideoBroadcastJson()
        if (current != normalized) {
            context.dataStore.edit { prefs ->
                prefs[VIDEO_BROADCAST_JSON] = normalized
            }
            addLog("Video broadcast profile updated from server.")
        }
    }

    // Auto start on boot
    val autoStartFlow: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[AUTO_START_ON_BOOT] ?: false
    }


    val autoStartLocalOverrideFlow: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[AUTO_START_LOCAL_OVERRIDE] ?: false
    }

    suspend fun hasAutoStartLocalOverride(): Boolean {
        val prefs = context.dataStore.data.first()
        return prefs[AUTO_START_LOCAL_OVERRIDE] ?: false
    }

    suspend fun setAutoStartOnBoot(enabled: Boolean, localOverride: Boolean = false) {
        val prefs = context.dataStore.data.first()
        if (prefs[AUTO_START_ON_BOOT] != enabled) {
            context.dataStore.edit { it[AUTO_START_ON_BOOT] = enabled }
            if (localOverride) {
                context.dataStore.edit { it[AUTO_START_LOCAL_OVERRIDE] = true }
            }
            addLog("Auto start on boot changed to: $enabled")
        }
    }

    // Last sync timestamp
    val lastSyncFlow: Flow<Long> = context.dataStore.data.map { prefs ->
        prefs[LAST_SYNC_TIMESTAMP] ?: 0L
    }

    suspend fun setLastSyncTimestamp(timestamp: Long) {
        context.dataStore.edit { prefs ->
            prefs[LAST_SYNC_TIMESTAMP] = timestamp
        }
    }

    // Last selected channel ID
    val lastSelectedChannelIdFlow: Flow<Int?> = context.dataStore.data.map { prefs ->
        prefs[LAST_SELECTED_CHANNEL_ID]
    }

    suspend fun setLastSelectedChannelId(channelId: Int) {
        context.dataStore.edit { prefs ->
            prefs[LAST_SELECTED_CHANNEL_ID] = channelId
        }
    }

    // Local rolling diagnostic logs (up to 50 entries)
    val diagnosticLogsFlow: Flow<List<String>> = context.dataStore.data.map { prefs ->
        val logString = prefs[LOCAL_DIAGNOSTIC_LOGS] ?: ""
        if (logString.isEmpty()) emptyList() else logString.split("\n")
    }

    suspend fun addLog(message: String) {
        val timestamp = java.text.SimpleDateFormat("yyyy-MM-dd HH:ss", java.util.Locale.getDefault()).format(java.util.Date())
        val entry = "[$timestamp] $message"
        context.dataStore.edit { prefs ->
            val logString = prefs[LOCAL_DIAGNOSTIC_LOGS] ?: ""
            val list = if (logString.isEmpty()) mutableListOf() else logString.split("\n").toMutableList()
            list.add(0, entry) // Add to the top
            while (list.size > 50) {
                list.removeAt(list.size - 1)
            }
            prefs[LOCAL_DIAGNOSTIC_LOGS] = list.joinToString("\n")
        }
    }

    suspend fun clearLogs() {
        context.dataStore.edit { prefs ->
            prefs.remove(LOCAL_DIAGNOSTIC_LOGS)
        }
    }

    suspend fun clearAll() {
        context.dataStore.edit { prefs ->
            prefs.clear()
        }
        addLog("Factory Reset completed!")
    }
}
