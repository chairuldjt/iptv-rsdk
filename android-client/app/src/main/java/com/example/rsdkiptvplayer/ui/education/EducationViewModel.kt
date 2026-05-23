package com.example.rsdkiptvplayer.ui.education

import android.app.Application
import android.net.Uri
import androidx.annotation.OptIn
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import com.example.rsdkiptvplayer.IptvApplication
import jcifs.context.SingletonContext
import jcifs.CIFSContext
import jcifs.smb.NtlmPasswordAuthenticator
import jcifs.smb.SmbFile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.net.URLDecoder
import java.net.URLEncoder

@OptIn(UnstableApi::class)
class EducationViewModel(application: Application) : AndroidViewModel(application) {
    private val dataStoreManager = (application as IptvApplication).dataStoreManager

    val exoPlayer: ExoPlayer = ExoPlayer.Builder(application).build().apply {
        repeatMode = Player.REPEAT_MODE_ALL
        playWhenReady = true
    }

    private val _folderPath = MutableStateFlow("")
    val folderPath: StateFlow<String> = _folderPath.asStateFlow()

    private val _username = MutableStateFlow("")
    private val _password = MutableStateFlow("")
    private val _domain = MutableStateFlow("")

    private val _videoCount = MutableStateFlow(0)
    val videoCount: StateFlow<Int> = _videoCount.asStateFlow()

    private val _currentTitle = MutableStateFlow("Edukasi")
    val currentTitle: StateFlow<String> = _currentTitle.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    init {
        viewModelScope.launch {
            dataStoreManager.educationVideoPathFlow.collectLatest { path ->
                _folderPath.value = path
            }
        }

        viewModelScope.launch {
            dataStoreManager.educationSmbUsernameFlow.collectLatest { username ->
                _username.value = username
            }
        }

        viewModelScope.launch {
            dataStoreManager.educationSmbPasswordFlow.collectLatest { password ->
                _password.value = password
            }
        }

        viewModelScope.launch {
            dataStoreManager.educationSmbDomainFlow.collectLatest { domain ->
                _domain.value = domain
            }
        }

        exoPlayer.addListener(object : Player.Listener {
            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                _currentTitle.value = mediaItem?.mediaMetadata?.title?.toString() ?: "Edukasi"
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_READY) {
                    _isLoading.value = false
                    _errorMessage.value = null
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                _isLoading.value = false
                _errorMessage.value = error.localizedMessage ?: "Video edukasi gagal diputar."
                viewModelScope.launch {
                    dataStoreManager.addLog("Education playback error: ${error.message}")
                }
            }
        })

        viewModelScope.launch {
            var lastState: com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState = com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Idle
            com.example.rsdkiptvplayer.util.EducationSyncManager.syncState.collectLatest { state ->
                if (state is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Success &&
                    (lastState is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Checking ||
                        lastState is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Syncing)) {
                    _errorMessage.value = null
                    loadAndPlay()
                } else if (state is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Checking ||
                    state is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Syncing) {
                    _isLoading.value = false
                    _errorMessage.value = null
                } else if (state is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Error) {
                    _isLoading.value = false
                    if (_videoCount.value == 0) {
                        _errorMessage.value = "Gagal menyalin video dari server: ${state.message}"
                    } else {
                        dataStoreManager.addLog("Education background sync failed while cached playback continues: ${state.message}")
                    }
                }
                lastState = state
            }
        }
    }

    fun loadAndPlay() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val localDir = File(getApplication<IptvApplication>().getExternalFilesDir(null), "education_videos")
                    if (!localDir.exists()) {
                        localDir.mkdirs()
                    }

                    val videos = localDir.listFiles()
                        ?.filter { file -> !file.isDirectory && file.name.isSupportedVideoName() }
                        ?: emptyList()

                    val playOrder = dataStoreManager.educationPlayOrderFlow.first()
                    val repeatModeStr = dataStoreManager.educationRepeatModeFlow.first()

                    val sortedVideos = when (playOrder) {
                        "random" -> videos.shuffled()
                        "shuffle" -> videos.shuffled(java.util.Random(12345))
                        else -> videos.sortedBy { it.name.lowercase() }
                    }

                    val exoRepeatMode = when (repeatModeStr) {
                        "one" -> Player.REPEAT_MODE_ONE
                        "none" -> Player.REPEAT_MODE_OFF
                        else -> Player.REPEAT_MODE_ALL
                    }

                    Triple(sortedVideos, exoRepeatMode, playOrder)
                }
            }

            result
                .onSuccess { (videos, repeatModeVal, order) ->
                    _videoCount.value = videos.size
                    if (videos.isEmpty()) {
                        _isLoading.value = false
                        val currentSyncState = com.example.rsdkiptvplayer.util.EducationSyncManager.syncState.value
                        if (currentSyncState !is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Syncing) {
                            viewModelScope.launch {
                                com.example.rsdkiptvplayer.util.EducationSyncManager.sync(getApplication())
                            }
                        }
                        _errorMessage.value = "Belum ada video edukasi disalin. Memulai sinkronisasi otomatis..."
                        dataStoreManager.addLog("Local education folder is empty. Triggering auto-sync.")
                        return@onSuccess
                    }

                    val mediaItems = videos.map { file ->
                        MediaItem.Builder()
                            .setUri(Uri.fromFile(file))
                            .setMediaMetadata(
                                androidx.media3.common.MediaMetadata.Builder()
                                    .setTitle(file.name.substringBeforeLast('.'))
                                    .build()
                            )
                            .build()
                    }

                    _currentTitle.value = videos.first().name.substringBeforeLast('.')
                    exoPlayer.stop()
                    exoPlayer.clearMediaItems()
                    exoPlayer.repeatMode = repeatModeVal
                    exoPlayer.setMediaItems(mediaItems)
                    exoPlayer.prepare()
                    exoPlayer.playWhenReady = true
                    _isLoading.value = false
                    dataStoreManager.addLog("Local education playlist loaded: ${videos.size} videos (Order: $order, Repeat: $repeatModeVal)")
                }
                .onFailure { error ->
                    _videoCount.value = 0
                    _isLoading.value = false
                    _errorMessage.value = error.localizedMessage ?: "Gagal memuat video edukasi luring."
                    dataStoreManager.addLog("Local education load error: ${error.message}")
                }
        }
    }

    fun stopPlayback() {
        exoPlayer.playWhenReady = false
        exoPlayer.stop()
        exoPlayer.clearMediaItems()
        _isLoading.value = false
    }

    private fun normalizeSmbFolderUrl(path: String): String {
        val trimmed = path.trim()
        val rawSmb = if (trimmed.startsWith("smb://", ignoreCase = true)) {
            trimmed.removePrefix("smb://")
        } else {
            trimmed
                .trimStart('\\', '/')
                .replace('\\', '/')
        }

        val normalized = rawSmb
            .trim('/')
            .split('/')
            .filter { it.isNotBlank() }

        if (normalized.isEmpty()) {
            return "smb://"
        }

        val host = normalized.first()
        val encodedPath = normalized
            .drop(1)
            .joinToString("/") { it.encodeSmbPathSegment() }

        val smb = if (encodedPath.isEmpty()) {
            "smb://$host"
        } else {
            "smb://$host/$encodedPath"
        }
        return if (smb.endsWith("/")) smb else "$smb/"
    }

    private fun String.encodeSmbPathSegment(): String {
        val decoded = try {
            URLDecoder.decode(this, "UTF-8")
        } catch (e: Exception) {
            this
        }

        return URLEncoder.encode(decoded, "UTF-8")
            .replace("+", "%20")
    }

    private fun buildSmbContext(): CIFSContext {
        val username = _username.value.trim()
        val password = _password.value
        val domain = _domain.value.trim().ifBlank { null }
        return SingletonContext.getInstance()
            .withCredentials(NtlmPasswordAuthenticator(domain, username, password))
    }

    private fun String.isSupportedVideoName(): Boolean {
        val name = lowercase()
        return name.endsWith(".mp4") ||
            name.endsWith(".mkv") ||
            name.endsWith(".webm") ||
            name.endsWith(".ts") ||
            name.endsWith(".m3u8") ||
            name.endsWith(".mov") ||
            name.endsWith(".avi")
    }

    override fun onCleared() {
        super.onCleared()
        exoPlayer.release()
    }
}
