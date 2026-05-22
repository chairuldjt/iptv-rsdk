package com.example.rsdkiptvplayer.ui.settings

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.rsdkiptvplayer.IptvApplication
import com.example.rsdkiptvplayer.data.repository.IptvRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class SettingsViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: IptvRepository = (application as IptvApplication).repository
    private val dataStoreManager = (application as IptvApplication).dataStoreManager

    private val _deviceId = MutableStateFlow("")
    val deviceId: StateFlow<String> = _deviceId.asStateFlow()

    private val _serverUrl = MutableStateFlow("")
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    private val _aspectRatio = MutableStateFlow("fit")
    val aspectRatio: StateFlow<String> = _aspectRatio.asStateFlow()

    private val _lockSettings = MutableStateFlow(true)
    val lockSettings: StateFlow<Boolean> = _lockSettings.asStateFlow()

    private val _autoStart = MutableStateFlow(false)
    val autoStart: StateFlow<Boolean> = _autoStart.asStateFlow()

    private val _diagnosticLogs = MutableStateFlow<List<String>>(emptyList())
    val diagnosticLogs: StateFlow<List<String>> = _diagnosticLogs.asStateFlow()

    private val _connectionTestResult = MutableStateFlow<String?>(null)
    val connectionTestResult: StateFlow<String?> = _connectionTestResult.asStateFlow()

    private val _isTestingConnection = MutableStateFlow(false)
    val isTestingConnection: StateFlow<Boolean> = _isTestingConnection.asStateFlow()

    private val _syncMode = MutableStateFlow("server")
    val syncMode: StateFlow<String> = _syncMode.asStateFlow()

    private val _customM3uUrl = MutableStateFlow("")
    val customM3uUrl: StateFlow<String> = _customM3uUrl.asStateFlow()

    private val _educationVideoPath = MutableStateFlow("")
    val educationVideoPath: StateFlow<String> = _educationVideoPath.asStateFlow()

    private val _educationSmbUsername = MutableStateFlow("")
    val educationSmbUsername: StateFlow<String> = _educationSmbUsername.asStateFlow()

    private val _educationSmbPassword = MutableStateFlow("")
    val educationSmbPassword: StateFlow<String> = _educationSmbPassword.asStateFlow()

    private val _educationSmbDomain = MutableStateFlow("")
    val educationSmbDomain: StateFlow<String> = _educationSmbDomain.asStateFlow()

    private val _m3uSyncResult = MutableStateFlow<String?>(null)
    val m3uSyncResult: StateFlow<String?> = _m3uSyncResult.asStateFlow()

    private val _isSyncingM3u = MutableStateFlow(false)
    val isSyncingM3u: StateFlow<Boolean> = _isSyncingM3u.asStateFlow()

    init {
        // Fetch values
        viewModelScope.launch {
            _deviceId.value = dataStoreManager.getDeviceId()
        }

        viewModelScope.launch {
            repository.serverUrlFlow.collectLatest { url ->
                _serverUrl.value = url
            }
        }

        viewModelScope.launch {
            repository.aspectRatioFlow.collectLatest { ratio ->
                _aspectRatio.value = ratio
            }
        }

        viewModelScope.launch {
            repository.lockSettingsFlow.collectLatest { locked ->
                _lockSettings.value = locked
            }
        }

        viewModelScope.launch {
            repository.autoStartFlow.collectLatest { enabled ->
                _autoStart.value = enabled
            }
        }

        viewModelScope.launch {
            repository.diagnosticLogsFlow.collectLatest { logs ->
                _diagnosticLogs.value = logs
            }
        }

        viewModelScope.launch {
            dataStoreManager.syncModeFlow.collectLatest { mode ->
                _syncMode.value = mode
            }
        }

        viewModelScope.launch {
            dataStoreManager.customM3uUrlFlow.collectLatest { url ->
                _customM3uUrl.value = url
            }
        }

        viewModelScope.launch {
            dataStoreManager.educationVideoPathFlow.collectLatest { path ->
                _educationVideoPath.value = path
            }
        }

        viewModelScope.launch {
            dataStoreManager.educationSmbUsernameFlow.collectLatest { username ->
                _educationSmbUsername.value = username
            }
        }

        viewModelScope.launch {
            dataStoreManager.educationSmbPasswordFlow.collectLatest { password ->
                _educationSmbPassword.value = password
            }
        }

        viewModelScope.launch {
            dataStoreManager.educationSmbDomainFlow.collectLatest { domain ->
                _educationSmbDomain.value = domain
            }
        }
    }

    fun updateSyncMode(mode: String) {
        viewModelScope.launch {
            dataStoreManager.setSyncMode(mode)
            if (mode == "server") {
                _m3uSyncResult.value = "Mengganti ke API Server, membersihkan cache lama..."
                repository.clearChannelCache()
                repository.syncConfig()
                val synced = repository.syncChannels()
                _m3uSyncResult.value = if (synced) {
                    "🟢 Mode API Server aktif dan playlist berhasil disinkronkan."
                } else {
                    "🔴 Mode API Server aktif, tetapi playlist belum berhasil diambil. Cache lama sudah dikosongkan."
                }
            }
        }
    }

    fun updateCustomM3uUrl(url: String) {
        viewModelScope.launch {
            dataStoreManager.setCustomM3uUrl(url)
        }
    }

    fun syncCustomM3u(urlOverride: String? = null) {
        viewModelScope.launch {
            _isSyncingM3u.value = true
            _m3uSyncResult.value = "Mengunduh & menganalisis playlist..."
            val url = (urlOverride ?: _customM3uUrl.value).trim()
            if (url.isEmpty()) {
                _m3uSyncResult.value = "🔴 Gagal: URL M3U kosong"
                _isSyncingM3u.value = false
                return@launch
            }
            dataStoreManager.setCustomM3uUrl(url)
            dataStoreManager.setSyncMode("custom_m3u")
            val res = repository.syncLocalM3u(url)
            _m3uSyncResult.value = if (res.first) {
                "🟢 ${res.second}"
            } else {
                "🔴 ${res.second}"
            }
            _isSyncingM3u.value = false
        }
    }

    fun updateServerUrl(url: String) {
        viewModelScope.launch {
            val normalizedUrl = url.trim().trimEnd('/')
            dataStoreManager.setServerUrlOverride(normalizedUrl)
            dataStoreManager.setSyncMode("server")
            repository.clearChannelCache()
            repository.registerDevice()
            repository.syncConfig()
            val synced = repository.syncChannels()
            _connectionTestResult.value = if (synced) {
                "🟢 Server disimpan dan playlist berhasil disinkronkan ulang."
            } else {
                "🔴 Server disimpan, tetapi playlist belum berhasil diambil. Cache lama sudah dikosongkan."
            }
        }
    }

    fun restoreDefaultUrl() {
        viewModelScope.launch {
            dataStoreManager.clearServerUrlOverride()
            dataStoreManager.setSyncMode("server")
            repository.clearChannelCache()
            repository.registerDevice()
            repository.syncConfig()
            val synced = repository.syncChannels()
            _connectionTestResult.value = if (synced) {
                "🟢 URL default dipulihkan dan playlist berhasil disinkronkan ulang."
            } else {
                "🔴 URL default dipulihkan, tetapi playlist belum berhasil diambil. Cache lama sudah dikosongkan."
            }
        }
    }

    fun testConnection(urlOverride: String? = null) {
        viewModelScope.launch {
            _isTestingConnection.value = true
            _connectionTestResult.value = "Menghubungkan..."
            val currentUrl = (urlOverride ?: _serverUrl.value).trim().trimEnd('/')
            val result = repository.testConnection(currentUrl)
            _connectionTestResult.value = if (result.first) {
                "🟢 Sukses: ${result.second}"
            } else {
                "🔴 Gagal: ${result.second}"
            }
            _isTestingConnection.value = false
        }
    }

    fun resetDeviceId() {
        viewModelScope.launch {
            dataStoreManager.clearAll()
            _deviceId.value = dataStoreManager.getDeviceId()
            repository.registerDevice()
        }
    }

    fun clearCache() {
        viewModelScope.launch {
            repository.clearChannelCache()
        }
    }

    fun forceSync() {
        viewModelScope.launch {
            repository.syncConfig()
            repository.syncChannels()
        }
    }

    fun factoryReset() {
        viewModelScope.launch {
            repository.factoryReset()
            // Force app reset restart
            android.os.Process.killProcess(android.os.Process.myPid())
        }
    }

    fun changeAspectRatio(ratio: String) {
        viewModelScope.launch {
            dataStoreManager.setAspectRatio(ratio)
        }
    }

    fun changeAutoStart(enabled: Boolean) {
        viewModelScope.launch {
            dataStoreManager.setAutoStartOnBoot(enabled, localOverride = true)
        }
    }

    fun updateEducationVideoPath(path: String) {
        viewModelScope.launch {
            dataStoreManager.setEducationVideoPath(path)
        }
    }

    fun updateEducationContentSettings(path: String, username: String, password: String, domain: String) {
        viewModelScope.launch {
            dataStoreManager.setEducationVideoPath(path)
            dataStoreManager.setEducationSmbCredentials(username, password, domain)
        }
    }

    fun unlockSettings() {
        viewModelScope.launch {
            dataStoreManager.setLockSettings(false)
        }
    }

    fun clearDiagnostics() {
        viewModelScope.launch {
            dataStoreManager.clearLogs()
        }
    }
}
