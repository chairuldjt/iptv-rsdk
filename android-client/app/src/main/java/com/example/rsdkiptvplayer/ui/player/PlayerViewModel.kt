package com.example.rsdkiptvplayer.ui.player

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.example.rsdkiptvplayer.IptvApplication
import com.example.rsdkiptvplayer.data.cache.ChannelEntity
import com.example.rsdkiptvplayer.data.repository.IptvRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class PlayerViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: IptvRepository = (application as IptvApplication).repository
    private val dataStoreManager = (application as IptvApplication).dataStoreManager

    val exoPlayer: ExoPlayer = ExoPlayer.Builder(application).build()

    // UI States
    private val _channels = MutableStateFlow<List<ChannelEntity>>(emptyList())
    val channels: StateFlow<List<ChannelEntity>> = _channels.asStateFlow()

    private val _categories = MutableStateFlow<List<String>>(emptyList())
    val categories: StateFlow<List<String>> = _categories.asStateFlow()

    private val _selectedCategory = MutableStateFlow("")
    val selectedCategory: StateFlow<String> = _selectedCategory.asStateFlow()

    private val _selectedChannel = MutableStateFlow<ChannelEntity?>(null)
    val selectedChannel: StateFlow<ChannelEntity?> = _selectedChannel.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isBuffering = MutableStateFlow(false)
    val isBuffering: StateFlow<Boolean> = _isBuffering.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _isDeviceActive = MutableStateFlow(true)
    val isDeviceActive: StateFlow<Boolean> = _isDeviceActive.asStateFlow()

    private val _aspectRatio = MutableStateFlow("fit")
    val aspectRatio: StateFlow<String> = _aspectRatio.asStateFlow()

    private val _lockSettings = MutableStateFlow(true)
    val lockSettings: StateFlow<Boolean> = _lockSettings.asStateFlow()

    private var heartbeatJob: Job? = null
    private var syncJob: Job? = null

    init {
        // Observe Channels & Categories from Cache
        viewModelScope.launch {
            repository.allChannelsFlow.collectLatest { list ->
                _channels.value = list.filter { it.isActive }
                // Do not automatically select and play the first channel on screen launch.
                // This allows the user to browse and select a channel manually first.
            }
        }

        viewModelScope.launch {
            repository.allCategoriesFlow.collectLatest { list ->
                _categories.value = list
                if (_selectedCategory.value.isEmpty() && list.isNotEmpty()) {
                    _selectedCategory.value = list.first()
                }
            }
        }

        // Observe Aspect Ratio
        viewModelScope.launch {
            repository.aspectRatioFlow.collectLatest { ratio ->
                _aspectRatio.value = ratio
            }
        }

        // Observe settings lock
        viewModelScope.launch {
            repository.lockSettingsFlow.collectLatest { locked ->
                _lockSettings.value = locked
            }
        }

        // Player Event Listener
        exoPlayer.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                when (playbackState) {
                    Player.STATE_BUFFERING -> {
                        _isBuffering.value = true
                        _errorMessage.value = null
                    }
                    Player.STATE_READY -> {
                        _isBuffering.value = false
                        _isLoading.value = false
                        _errorMessage.value = null
                    }
                    Player.STATE_IDLE -> {
                        _isBuffering.value = false
                    }
                    Player.STATE_ENDED -> {
                        _isBuffering.value = false
                    }
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                _isBuffering.value = false
                val msg = "ExoPlayer: ${error.localizedMessage ?: "Playback Error"}"
                _errorMessage.value = msg
                
                // Remote logging
                viewModelScope.launch {
                    val activeCh = _selectedChannel.value
                    repository.logError(
                        errorType = "PLAYBACK_ERROR",
                        message = msg,
                        channelId = activeCh?.id,
                        streamUrl = activeCh?.streamUrl
                    )
                }
            }
        })

        // Run network registration & sync routines
        startSyncAndHeartbeat()
    }

    private fun startSyncAndHeartbeat() {
        viewModelScope.launch {
            _isLoading.value = true
            val active = repository.registerDevice()
            _isDeviceActive.value = active
            if (active) {
                // Initial configurations and playlist sync
                val activeConfig = repository.syncConfig()
                _isDeviceActive.value = activeConfig
                repository.syncChannels()
            }
            _isLoading.value = false
        }

        // Start periodic heartbeat loop
        heartbeatJob?.cancel()
        heartbeatJob = viewModelScope.launch {
            while (true) {
                delay(30000) // 30s heartbeat interval
                if (_isDeviceActive.value) {
                    val status = repository.sendHeartbeat(_selectedChannel.value?.id)
                    if (status != null) {
                        _lockSettings.value = status.lock_settings
                    } else {
                        // If offline, check if config is active locally
                    }
                }
            }
        }

        // Start channels list auto-sync loop
        syncJob?.cancel()
        syncJob = viewModelScope.launch {
            while (true) {
                val intervalSeconds = dataStoreManager.syncIntervalFlow.first()
                delay(intervalSeconds * 1000L)
                if (_isDeviceActive.value) {
                    repository.syncConfig()
                    repository.syncChannels()
                }
            }
        }
    }

    private suspend fun selectLastOrFirstChannel() {
        val lastId = dataStoreManager.lastSelectedChannelIdFlow.first()
        val match = _channels.value.find { it.id == lastId }
        if (match != null) {
            playChannel(match)
        } else if (_channels.value.isNotEmpty()) {
            playChannel(_channels.value.first())
        }
    }

    fun playChannel(channel: ChannelEntity) {
        _selectedChannel.value = channel
        _selectedCategory.value = channel.groupName
        _errorMessage.value = null
        _isBuffering.value = true

        exoPlayer.stop()
        exoPlayer.clearMediaItems()
        
        val mediaItem = MediaItem.fromUri(channel.streamUrl)
        exoPlayer.setMediaItem(mediaItem)
        exoPlayer.prepare()
        exoPlayer.playWhenReady = true

        // Save last channel seen
        viewModelScope.launch {
            dataStoreManager.setLastSelectedChannelId(channel.id)
            dataStoreManager.addLog("Playing Channel: ${channel.name} (${channel.groupName})")
        }
    }

    fun selectCategory(category: String) {
        _selectedCategory.value = category
        // Only select the category without auto-playing the first channel,
        // allowing the user to select channels from the list manually.
    }

    fun nextChannel() {
        val list = _channels.value
        if (list.isEmpty()) return
        val current = _selectedChannel.value
        val nextIdx = if (current != null) {
            (list.indexOfFirst { it.id == current.id } + 1) % list.size
        } else 0
        playChannel(list[nextIdx])
    }

    fun previousChannel() {
        val list = _channels.value
        if (list.isEmpty()) return
        val current = _selectedChannel.value
        val prevIdx = if (current != null) {
            val idx = list.indexOfFirst { it.id == current.id } - 1
            if (idx < 0) list.size - 1 else idx
        } else 0
        playChannel(list[prevIdx])
    }

    fun playChannelById(channelId: Int) {
        val ch = _channels.value.find { it.id == channelId }
        if (ch != null) {
            playChannel(ch)
        } else {
            // Channel not found yet — wait for channels to load, then try again
            viewModelScope.launch {
                _channels.collectLatest { list ->
                    val found = list.find { it.id == channelId }
                    if (found != null) {
                        playChannel(found)
                        return@collectLatest
                    }
                }
            }
        }
    }

    fun forceSync() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.syncConfig()
            repository.syncChannels()
            _isLoading.value = false
        }
    }

    fun stopPlayback() {
        exoPlayer.playWhenReady = false
        exoPlayer.stop()
        exoPlayer.clearMediaItems()
        _selectedChannel.value = null
        _isBuffering.value = false
        _errorMessage.value = null
    }

    override fun onCleared() {
        super.onCleared()
        exoPlayer.release()
        heartbeatJob?.cancel()
        syncJob?.cancel()
    }
}
