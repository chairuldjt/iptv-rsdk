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
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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
    }

    fun loadAndPlay() {
        viewModelScope.launch {
            val path = _folderPath.value.trim()
            if (path.isEmpty()) {
                _videoCount.value = 0
                _errorMessage.value = "Path folder video edukasi belum diset di Mode Teknisi."
                return@launch
            }

            _isLoading.value = true
            _errorMessage.value = null

            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val folderUrl = normalizeSmbFolderUrl(path)
                    val smbContext = buildSmbContext()
                    val folder = SmbFile(folderUrl, smbContext)
                    if (!folder.exists()) {
                        error("Folder tidak ditemukan: $path")
                    }
                    if (!folder.isDirectory) {
                        error("Path edukasi harus berupa folder SMB.")
                    }

                    folder.listFiles()
                        ?.filter { file -> !file.isDirectory && file.name.isSupportedVideoName() }
                        ?.sortedBy { it.name.lowercase() }
                        ?.let { videos -> smbContext to videos }
                        ?: (smbContext to emptyList())
                }
            }

            result
                .onSuccess { (smbContext, videos) ->
                    _videoCount.value = videos.size
                    if (videos.isEmpty()) {
                        _isLoading.value = false
                        _errorMessage.value = "Tidak ada video MP4/MKV/WEBM/TS/MOV di folder edukasi."
                        dataStoreManager.addLog("Education folder empty: $path")
                        return@onSuccess
                    }

                    val factory = ProgressiveMediaSource.Factory(SmbDataSource.Factory(smbContext))
                    val mediaSources = videos.map { file ->
                        val mediaItem = MediaItem.Builder()
                            .setUri(Uri.parse(file.url.toString()))
                            .setMediaMetadata(
                                androidx.media3.common.MediaMetadata.Builder()
                                    .setTitle(file.name.substringBeforeLast('.'))
                                    .build()
                            )
                            .build()
                        factory.createMediaSource(mediaItem)
                    }

                    _currentTitle.value = videos.first().name.substringBeforeLast('.')
                    exoPlayer.stop()
                    exoPlayer.clearMediaItems()
                    exoPlayer.setMediaSources(mediaSources)
                    exoPlayer.prepare()
                    exoPlayer.playWhenReady = true
                    dataStoreManager.addLog("Education playlist loaded: ${videos.size} videos from $path")
                }
                .onFailure { error ->
                    _videoCount.value = 0
                    _isLoading.value = false
                    _errorMessage.value = error.localizedMessage ?: "Gagal membaca folder edukasi."
                    dataStoreManager.addLog("Education folder error: ${error.message}")
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
        val smb = if (trimmed.startsWith("smb://", ignoreCase = true)) {
            trimmed
        } else {
            "smb://" + trimmed
                .trimStart('\\', '/')
                .replace('\\', '/')
        }
        return if (smb.endsWith("/")) smb else "$smb/"
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
