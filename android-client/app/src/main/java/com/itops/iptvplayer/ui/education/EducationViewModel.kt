package com.itops.iptvplayer.ui.education

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
import com.itops.iptvplayer.IptvApplication
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
import com.itops.iptvplayer.util.EducationSyncManager
import com.itops.iptvplayer.util.EducationSyncManager.isSupportedVideoName
import com.itops.iptvplayer.util.EducationSyncManager.ensureMd4Provider
import com.itops.iptvplayer.util.EducationSyncManager.normalizeSmbFolderUrls

@OptIn(UnstableApi::class)
class EducationViewModel(application: Application) : AndroidViewModel(application) {
    private val dataStoreManager = (application as IptvApplication).dataStoreManager

    private val defaultDataSourceFactory = androidx.media3.datasource.DefaultDataSource.Factory(application)

    private fun buildSmbDataSourceFactory(): SmbDataSource.Factory {
        return SmbDataSource.Factory(buildSmbContext())
    }

    val exoPlayer: ExoPlayer = ExoPlayer.Builder(application)
        .setMediaSourceFactory(
            ProgressiveMediaSource.Factory {
                val smbFactory = buildSmbDataSourceFactory()
                val defaultDs = defaultDataSourceFactory.createDataSource()
                val smbDs = smbFactory.createDataSource()
                DelegatingDataSource(defaultDs, smbDs)
            }
        )
        .build().apply {
            repeatMode = Player.REPEAT_MODE_ALL
            playWhenReady = true
        }

    private val _folderPath = MutableStateFlow("")
    val folderPath: StateFlow<String> = _folderPath.asStateFlow()

    private val _username = MutableStateFlow("")
    private val _password = MutableStateFlow("")
    private val _domain = MutableStateFlow("")

    private val _educationSource = MutableStateFlow("smb")
    val educationSource: StateFlow<String> = _educationSource.asStateFlow()

    private val _educationPlaybackMode = MutableStateFlow("copy")
    val educationPlaybackMode: StateFlow<String> = _educationPlaybackMode.asStateFlow()

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

        viewModelScope.launch {
            dataStoreManager.educationSourceFlow.collectLatest { source ->
                _educationSource.value = source
            }
        }

        viewModelScope.launch {
            dataStoreManager.educationPlaybackModeFlow.collectLatest { mode ->
                _educationPlaybackMode.value = mode
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
            var lastState: com.itops.iptvplayer.util.EducationSyncManager.SyncState = com.itops.iptvplayer.util.EducationSyncManager.SyncState.Idle
            com.itops.iptvplayer.util.EducationSyncManager.syncState.collectLatest { state ->
                if (state is com.itops.iptvplayer.util.EducationSyncManager.SyncState.Success &&
                    (lastState is com.itops.iptvplayer.util.EducationSyncManager.SyncState.Checking ||
                        lastState is com.itops.iptvplayer.util.EducationSyncManager.SyncState.Syncing)) {
                    _errorMessage.value = null
                    loadAndPlay()
                } else if (state is com.itops.iptvplayer.util.EducationSyncManager.SyncState.Checking ||
                    state is com.itops.iptvplayer.util.EducationSyncManager.SyncState.Syncing) {
                    _isLoading.value = false
                    _errorMessage.value = null
                } else if (state is com.itops.iptvplayer.util.EducationSyncManager.SyncState.Error) {
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
                    val source = dataStoreManager.educationSourceFlow.first()
                    val playbackMode = dataStoreManager.educationPlaybackModeFlow.first()
                    val playOrder = dataStoreManager.educationPlayOrderFlow.first()
                    val repeatModeStr = dataStoreManager.educationRepeatModeFlow.first()

                    val exoRepeatMode = when (repeatModeStr) {
                        "one" -> Player.REPEAT_MODE_ONE
                        "none" -> Player.REPEAT_MODE_OFF
                        else -> Player.REPEAT_MODE_ALL
                    }

                    data class PlayItem(val title: String, val uri: Uri)

                    val items = if (playbackMode == "stream") {
                        if (source == "web") {
                            val serverUrl = dataStoreManager.getServerUrl()
                            val apiService = com.itops.iptvplayer.data.api.RetrofitClient.getService(serverUrl)
                            val response = apiService.getEducationVideos()
                            if (response.isSuccessful && response.body()?.status == true) {
                                val videos = response.body()?.data ?: emptyList()
                                videos.map { video ->
                                    val fullUrl = if (video.video_url.startsWith("http")) {
                                        video.video_url
                                    } else {
                                        val base = serverUrl.trimEnd('/')
                                        val path = video.video_url.trimStart('/')
                                        "$base/$path"
                                    }
                                    PlayItem(video.displayTitle(), Uri.parse(fullUrl))
                                }
                            } else {
                                throw IllegalStateException("Gagal memuat daftar video dari server web: HTTP ${response.code()}")
                            }
                        } else {
                            // SMB stream mode
                            val path = _folderPath.value
                            if (path.isBlank()) {
                                throw IllegalStateException("Path SMB kosong.")
                            }
                            ensureMd4Provider()
                            val smbContext = buildSmbContext()
                            val folderCandidates = normalizeSmbFolderUrls(path)
                            var folder: SmbFile? = null
                            var lastConnectionError: Exception? = null

                            for (candidateUrl in folderCandidates) {
                                try {
                                    val candidateFolder = SmbFile(candidateUrl, smbContext)
                                    if (candidateFolder.exists() && candidateFolder.isDirectory) {
                                        folder = candidateFolder
                                        break
                                    }
                                } catch (e: Exception) {
                                    lastConnectionError = e
                                }
                            }
                            val resolvedFolder = folder ?: throw (lastConnectionError ?: IllegalStateException("Folder SMB tidak ditemukan."))
                            val remoteFiles = resolvedFolder.listFiles()
                                ?.filter { file -> !file.isDirectory && file.name.isSupportedVideoName() }
                                ?: emptyList()

                            remoteFiles.map { PlayItem(it.name.substringBeforeLast('.'), Uri.parse(it.url.toString())) }
                        }
                    } else {
                        // "copy" mode
                        val localDir = File(getApplication<IptvApplication>().getExternalFilesDir(null), "education_videos")
                        if (!localDir.exists()) {
                            localDir.mkdirs()
                        }

                        val videos = localDir.listFiles()
                            ?.filter { file -> !file.isDirectory && file.name.isSupportedVideoName() }
                            ?: emptyList()

                        videos.map { PlayItem(it.name.substringBeforeLast('.'), Uri.fromFile(it)) }
                    }

                    val sortedItems = when (playOrder) {
                        "random" -> items.shuffled()
                        "shuffle" -> items.shuffled(java.util.Random(12345))
                        else -> items.sortedBy { it.title.lowercase() }
                    }

                    Triple(sortedItems, exoRepeatMode, playOrder)
                }
            }

            result
                .onSuccess { (playItems, repeatModeVal, order) ->
                    _videoCount.value = playItems.size
                    if (playItems.isEmpty()) {
                        _isLoading.value = false
                        val playbackMode = dataStoreManager.educationPlaybackModeFlow.first()
                        val source = dataStoreManager.educationSourceFlow.first()
                        
                        if (playbackMode == "copy") {
                            val currentSyncState = com.itops.iptvplayer.util.EducationSyncManager.syncState.value
                            val currentPath = _folderPath.value.trim()
                            if (source == "smb" && currentPath.isBlank()) {
                                _errorMessage.value = "Path folder video edukasi kosong."
                                return@onSuccess
                            }

                            if (currentSyncState !is com.itops.iptvplayer.util.EducationSyncManager.SyncState.Checking &&
                                currentSyncState !is com.itops.iptvplayer.util.EducationSyncManager.SyncState.Syncing) {
                                viewModelScope.launch {
                                    com.itops.iptvplayer.util.EducationSyncManager.sync(getApplication())
                                }
                            }
                            _errorMessage.value = null
                            dataStoreManager.addLog("Local education folder is empty. Triggering auto-sync.")
                        } else {
                            _errorMessage.value = "Tidak ada video edukasi yang ditemukan."
                        }
                        return@onSuccess
                    }

                    val mediaItems = playItems.map { item ->
                        MediaItem.Builder()
                            .setUri(item.uri)
                            .setMediaMetadata(
                                androidx.media3.common.MediaMetadata.Builder()
                                    .setTitle(item.title)
                                    .build()
                            )
                            .build()
                    }

                    _currentTitle.value = playItems.first().title
                    exoPlayer.stop()
                    exoPlayer.clearMediaItems()
                    exoPlayer.repeatMode = repeatModeVal
                    exoPlayer.setMediaItems(mediaItems)
                    exoPlayer.prepare()
                    exoPlayer.playWhenReady = true
                    _isLoading.value = false
                    val playbackModeStr = dataStoreManager.educationPlaybackModeFlow.first()
                    val sourceStr = dataStoreManager.educationSourceFlow.first()
                    dataStoreManager.addLog("Education playlist loaded: ${playItems.size} videos (Source: $sourceStr, Mode: $playbackModeStr, Order: $order)")
                }
                .onFailure { error ->
                    _videoCount.value = 0
                    _isLoading.value = false
                    _errorMessage.value = error.localizedMessage ?: "Gagal memuat video edukasi."
                    dataStoreManager.addLog("Education load error: ${error.message}")
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

    private fun com.itops.iptvplayer.data.api.EducationVideoData.displayTitle(): String {
        val folderName = folder_name?.takeIf { it.isNotBlank() }
        return if (folderName == null) title else "$folderName / $title"
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
