package com.itops.iptvplayer

import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.foundation.focusable
import com.itops.iptvplayer.theme.RSDKIPTVPlayerTheme
import com.itops.iptvplayer.ui.appdrawer.AppDrawerScreen
import com.itops.iptvplayer.ui.channels.ChannelBrowserScreen
import com.itops.iptvplayer.ui.components.AppRunningTextBanner
import com.itops.iptvplayer.ui.education.EducationScreen
import com.itops.iptvplayer.ui.entertainment.EntertainmentScreen
import com.itops.iptvplayer.ui.home.HomeScreen
import com.itops.iptvplayer.ui.player.PlayerScreen
import com.itops.iptvplayer.ui.settings.SettingsScreen
import com.itops.iptvplayer.ui.splash.SplashScreen
import com.itops.iptvplayer.data.api.RetrofitClient
import com.itops.iptvplayer.data.api.UpdateCheckResponse
import com.itops.iptvplayer.util.HomeExperienceParser
import com.itops.iptvplayer.util.UpdateManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.itops.iptvplayer.util.VideoBroadcastProfile
import com.itops.iptvplayer.util.VideoBroadcastParser
import com.itops.iptvplayer.util.VideoItem
import com.itops.iptvplayer.util.BroadcastRunningText

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        val app = applicationContext as IptvApplication
        val dataStoreManager = app.dataStoreManager

        setContent {
            RSDKIPTVPlayerTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var currentScreen by remember { mutableStateOf("splash") }
                    var splashHomeExperienceJson by remember { mutableStateOf("") }
                    var activeSettingsTab by remember { mutableStateOf(0) }
                    var selectedChannelId by remember { mutableIntStateOf(-1) }
                    var selectedEntertainmentItemId by remember { mutableIntStateOf(0) }
                    var showExitConfirmDialog by remember { mutableStateOf(false) }
                    var showVideoBroadcastOverlay by remember { mutableStateOf(false) }
                    var activeVideoBroadcast by remember { mutableStateOf(VideoBroadcastProfile()) }
                    var videoBroadcastSessionKey by remember { mutableIntStateOf(0) }
                    val confirmNoFocusRequester = remember { FocusRequester() }
                    val coroutineScope = rememberCoroutineScope()
                    val serverUrl by dataStoreManager.serverUrlFlow.collectAsState(initial = "")
                    val homeExperienceJson by dataStoreManager.homeExperienceJsonFlow.collectAsState(initial = splashHomeExperienceJson)
                    val runningTextJson by dataStoreManager.runningTextJsonFlow.collectAsState(initial = "")
                    val runningTextOverrideJson by dataStoreManager.runningTextOverrideJsonFlow.collectAsState(initial = "")
                    val runningTextOverrideExpiresAt by dataStoreManager.runningTextOverrideExpiresAtFlow.collectAsState(initial = 0L)
                    val homeExperience = remember(homeExperienceJson) { HomeExperienceParser.parse(homeExperienceJson) }
                    val isRunningTextOverrideActive = remember(runningTextOverrideJson, runningTextOverrideExpiresAt) {
                        runningTextOverrideJson.isNotBlank() &&
                            (runningTextOverrideExpiresAt <= 0L || System.currentTimeMillis() < runningTextOverrideExpiresAt)
                    }
                    val effectiveRunningText = remember(runningTextJson, runningTextOverrideJson, runningTextOverrideExpiresAt) {
                        val runtimeOverride = HomeExperienceParser.parseRunningTextJson(runningTextOverrideJson)
                        if (isRunningTextOverrideActive) runtimeOverride else HomeExperienceParser.parseRunningTextJson(runningTextJson)
                    }

                    LaunchedEffect(runningTextOverrideJson, runningTextOverrideExpiresAt) {
                        if (runningTextOverrideJson.isBlank() || runningTextOverrideExpiresAt <= 0L) return@LaunchedEffect
                        val delayMillis = runningTextOverrideExpiresAt - System.currentTimeMillis()
                        if (delayMillis <= 0L) {
                            dataStoreManager.clearRunningTextOverride()
                            return@LaunchedEffect
                        }
                        delay(delayMillis)
                        dataStoreManager.clearRunningTextOverride()
                    }

                    LaunchedEffect(Unit) {
                        app.repository.remoteCommandFlow.collect { (command, value) ->
                            when (command) {
                                "NAVIGATE_HOME" -> currentScreen = "home"
                                "NAVIGATE_TV" -> currentScreen = "channels"
                                "NAVIGATE_EDUCATION" -> currentScreen = "education"
                                "NAVIGATE_SETTINGS" -> {
                                    activeSettingsTab = value?.toIntOrNull() ?: 0
                                    currentScreen = "settings"
                                }
                                "RELOAD_CONFIG" -> {
                                    // Realtime trigger from web admin: re-pull config + channels
                                    // immediately. syncConfig() already consumes force_sync /
                                    // clear_cache_trigger / education_force_sync from the server.
                                    kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
                                        try {
                                            app.repository.syncConfig()
                                            app.repository.syncChannels()
                                        } catch (e: Exception) {
                                            e.printStackTrace()
                                        }
                                    }
                                }
                                "PLAY_CHANNEL" -> {
                                    val chId = value?.toIntOrNull()
                                    if (chId != null) {
                                        selectedChannelId = chId
                                        currentScreen = "player"
                                    }
                                }
                                "PLAY_VIDEO_BROADCAST" -> {
                                    val liveBroadcast = VideoBroadcastParser.parse(value)
                                    val finalBroadcast = if (!liveBroadcast.enabled && (liveBroadcast.videoUrl.isNotBlank() || liveBroadcast.videos.isNotEmpty())) {
                                        liveBroadcast.copy(enabled = true)
                                    } else {
                                        liveBroadcast
                                    }
                                    if (finalBroadcast.enabled && (finalBroadcast.videoUrl.isNotBlank() || finalBroadcast.videos.isNotEmpty())) {
                                        activeVideoBroadcast = finalBroadcast
                                        videoBroadcastSessionKey += 1
                                        showVideoBroadcastOverlay = true
                                    }
                                }
                                "STOP_VIDEO_BROADCAST" -> {
                                    showVideoBroadcastOverlay = false
                                    activeVideoBroadcast = VideoBroadcastProfile()
                                    videoBroadcastSessionKey += 1
                                }
                                "UPDATE_RUNNING_TEXT" -> {
                                    if (!value.isNullOrBlank()) {
                                        try {
                                            val newRunningTextObj = org.json.JSONObject(value)
                                            dataStoreManager.setRunningTextOverrideJson(newRunningTextObj.toString())
                                            val stopAfterSeconds = newRunningTextObj.optInt("displaySeconds", 0).coerceAtLeast(0)
                                            val expiresAt = if (stopAfterSeconds > 0) {
                                                System.currentTimeMillis() + (stopAfterSeconds * 1000L)
                                            } else {
                                                0L
                                            }
                                            dataStoreManager.setRunningTextOverrideExpiresAt(expiresAt)
                                        } catch (e: Exception) {
                                            e.printStackTrace()
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Box(modifier = Modifier.fillMaxSize()) {
                        when (currentScreen) {
                            "splash" -> {
                                SplashScreen(
                                    onSplashComplete = { startScreen, contentId, freshJson ->
                                        splashHomeExperienceJson = freshJson
                                        when (startScreen) {
                                            "entertainment" -> {
                                                selectedEntertainmentItemId = contentId ?: 0
                                                currentScreen = "entertainment"
                                            }
                                            "education" -> currentScreen = "education"
                                            "category_list" -> currentScreen = "channels"
                                            "live_tv" -> currentScreen = "channels"
                                            else -> currentScreen = "home"
                                        }
                                    }
                                )
                            }
                            "home" -> {
                                BackHandler {
                                    showExitConfirmDialog = true
                                }
                                HomeScreen(
                                    initialHomeExperienceJson = splashHomeExperienceJson,
                                    onNavigateToPlayer = {
                                        selectedChannelId = -1
                                        currentScreen = "channels"
                                    },
                                    onNavigateToPlayerWithChannel = { channelId ->
                                        coroutineScope.launch {
                                            app.dataStoreManager.recordChannelPlayed(channelId)
                                        }
                                        selectedChannelId = channelId
                                        currentScreen = "player"
                                    },
                                    onNavigateToEducation = { currentScreen = "education" },
                                    onNavigateToEntertainment = {
                                        selectedEntertainmentItemId = 0
                                        currentScreen = "entertainment"
                                    },
                                    onNavigateToEntertainmentItem = { itemId ->
                                        selectedEntertainmentItemId = itemId
                                        currentScreen = "entertainment"
                                    },
                                    onNavigateToSettings = { tabIdx ->
                                        activeSettingsTab = tabIdx
                                        currentScreen = "settings"
                                    },
                                    onNavigateToAppDrawer = { currentScreen = "app_drawer" }
                                )
                            }
                            "app_drawer" -> {
                                BackHandler {
                                    currentScreen = "home"
                                }
                                AppDrawerScreen(
                                    onBack = { currentScreen = "home" }
                                )
                            }
                            "channels" -> {
                                BackHandler {
                                    currentScreen = "home"
                                }
                                ChannelBrowserScreen(
                                    onChannelSelected = { channelId ->
                                        coroutineScope.launch {
                                            app.dataStoreManager.recordChannelPlayed(channelId)
                                        }
                                        selectedChannelId = channelId
                                        currentScreen = "player"
                                    },
                                    onBack = { currentScreen = "home" },
                                    onNavigateToSettings = { tabIdx ->
                                        activeSettingsTab = tabIdx
                                        currentScreen = "settings"
                                    }
                                )
                            }
                            "education" -> {
                                BackHandler {
                                    currentScreen = "home"
                                }
                                EducationScreen(
                                    onBack = { currentScreen = "home" },
                                    onOpenSettings = {
                                        activeSettingsTab = 4
                                        currentScreen = "settings"
                                    }
                                )
                            }
                            "entertainment" -> {
                                BackHandler {
                                    selectedEntertainmentItemId = 0
                                    currentScreen = "home"
                                }
                                EntertainmentScreen(
                                    onBack = {
                                        selectedEntertainmentItemId = 0
                                        currentScreen = "home"
                                    },
                                    initialItemId = selectedEntertainmentItemId
                                )
                            }
                            "player" -> {
                                BackHandler {
                                    currentScreen = "channels"
                                }
                                PlayerScreen(
                                    initialChannelId = if (selectedChannelId >= 0) selectedChannelId else null,
                                    onBack = { currentScreen = "channels" },
                                    onOpenSettings = {
                                        activeSettingsTab = 0
                                        currentScreen = "settings"
                                    }
                                )
                            }
                            "settings" -> {
                                BackHandler {
                                    currentScreen = "home"
                                }
                                SettingsScreen(
                                    initialTabIdx = activeSettingsTab,
                                    onBack = { currentScreen = "home" }
                                )
                            }
                        }

                        if (currentScreen != "splash" && effectiveRunningText.enabled && effectiveRunningText.items.isNotEmpty()) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .fillMaxWidth()
                                    .safeDrawingPadding()
                                    .padding(horizontal = 14.dp, vertical = 8.dp)
                            ) {
                                AppRunningTextBanner(runningText = effectiveRunningText)
                            }
                        }
                    }



                    if (showExitConfirmDialog) {
                        BackHandler(enabled = showExitConfirmDialog) {
                            showExitConfirmDialog = false
                        }
                        
                        LaunchedEffect(showExitConfirmDialog) {
                            if (showExitConfirmDialog) {
                                try {
                                    confirmNoFocusRequester.requestFocus()
                                } catch (e: Exception) {
                                    e.printStackTrace()
                                }
                            }
                        }

                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.78f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xF207111D)),
                                border = BorderStroke(1.dp, Color(0xFFFFE9A6).copy(alpha = 0.30f)),
                                shape = RoundedCornerShape(24.dp),
                                modifier = Modifier
                                    .width(360.dp)
                                    .padding(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = "Restart Aplikasi?",
                                        color = Color.White,
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    
                                    Spacer(modifier = Modifier.height(12.dp))
                                    
                                    Text(
                                        text = "Aplikasi akan ditutup dan dibuka ulang secara otomatis.",
                                        color = Color.White.copy(alpha = 0.7f),
                                        fontSize = 14.sp,
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                    )
                                    
                                    Spacer(modifier = Modifier.height(24.dp))
                                    
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        ExitDialogButton(
                                            text = "Restart",
                                            onClick = {
                                                val intent = packageManager.getLaunchIntentForPackage(packageName)
                                                val restartIntent = android.content.Intent.makeRestartActivityTask(intent?.component)
                                                startActivity(restartIntent)
                                                Runtime.getRuntime().exit(0)
                                            },
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(44.dp)
                                        )
                                        
                                        ExitDialogButton(
                                            text = "Batal",
                                            primary = true,
                                            focusRequester = confirmNoFocusRequester,
                                            onClick = {
                                                showExitConfirmDialog = false
                                            },
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(44.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (showVideoBroadcastOverlay) {
                        val resolvedVideos = remember(activeVideoBroadcast, serverUrl) {
                            if (activeVideoBroadcast.videos.isNotEmpty()) {
                                activeVideoBroadcast.videos.map {
                                    it.copy(url = resolveRemoteVideoUrl(serverUrl, it.url))
                                }
                            } else if (activeVideoBroadcast.videoUrl.isNotBlank()) {
                                listOf(
                                    VideoItem(
                                        title = activeVideoBroadcast.videoTitle,
                                        url = resolveRemoteVideoUrl(serverUrl, activeVideoBroadcast.videoUrl),
                                        thumbnailUrl = activeVideoBroadcast.thumbnailUrl,
                                        repeatCount = activeVideoBroadcast.repeatCount
                                    )
                                )
                            } else {
                                emptyList()
                            }
                        }

                        if (resolvedVideos.isNotEmpty()) {
                            ForcedVideoOverlay(
                                sessionKey = videoBroadcastSessionKey,
                                videos = resolvedVideos,
                                runningText = activeVideoBroadcast.runningText,
                                onFinished = {
                                    showVideoBroadcastOverlay = false
                                    activeVideoBroadcast = VideoBroadcastProfile()
                                    videoBroadcastSessionKey += 1
                                }
                            )
                        } else {
                            showVideoBroadcastOverlay = false
                            activeVideoBroadcast = VideoBroadcastProfile()
                        }
                    }
                }
            }
        }

        window.decorView.post {
            enterImmersiveMode()
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            enterImmersiveMode()
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // Sebagai default launcher, tombol Home harus tetap di dalam app
        // dan kembali ke home screen internal (bukan keluar ke launcher lain)
        if (keyCode == KeyEvent.KEYCODE_HOME) {
            return true // consume — sistem tidak akan memproses lebih lanjut
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun enterImmersiveMode() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            window.decorView.windowInsetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                    View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        }
    }
}

@Composable
private fun ForcedVideoOverlay(
    sessionKey: Int,
    videos: List<VideoItem>,
    runningText: BroadcastRunningText = BroadcastRunningText(),
    onFinished: () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var currentVideoIndex by remember(sessionKey, videos) { mutableIntStateOf(0) }
    var completedLoops by remember(sessionKey, videos) { mutableIntStateOf(0) }
    var playbackAttempt by remember(sessionKey, currentVideoIndex) { mutableIntStateOf(0) }
    var showFileName by remember(sessionKey, currentVideoIndex, playbackAttempt) { mutableStateOf(true) }
    val maxRetryPerVideo = 1

    val currentVideo = remember(currentVideoIndex, videos) {
        if (currentVideoIndex in videos.indices) videos[currentVideoIndex] else null
    }
    val displayFileName = remember(currentVideo) {
        currentVideo?.let(::resolveBroadcastDisplayName).orEmpty()
    }

    val exoPlayer = remember(currentVideo, playbackAttempt, sessionKey) {
        currentVideo?.let { video ->
            ExoPlayer.Builder(context).build().apply {
                setMediaItem(MediaItem.fromUri(video.url))
                prepare()
                playWhenReady = true
            }
        }
    }

    LaunchedEffect(sessionKey, currentVideoIndex, playbackAttempt) {
        showFileName = true
        delay(3_000)
        showFileName = false
    }

    DisposableEffect(currentVideo) {
        if (currentVideo == null) {
            onFinished()
            return@DisposableEffect onDispose {}
        }
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    completedLoops += 1
                    if (completedLoops >= currentVideo.repeatCount) {
                        completedLoops = 0
                        playbackAttempt = 0
                        if (currentVideoIndex + 1 < videos.size) {
                            currentVideoIndex += 1
                        } else {
                            onFinished()
                        }
                    } else {
                        exoPlayer?.seekTo(0)
                        exoPlayer?.playWhenReady = true
                    }
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                if (playbackAttempt < maxRetryPerVideo) {
                    playbackAttempt += 1
                    return
                }

                completedLoops = 0
                playbackAttempt = 0
                if (currentVideoIndex + 1 < videos.size) {
                    currentVideoIndex += 1
                } else {
                    onFinished()
                }
            }
        }

        exoPlayer?.addListener(listener)
        onDispose {
            exoPlayer?.removeListener(listener)
            exoPlayer?.release()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        if (exoPlayer != null) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        player = exoPlayer
                        useController = false
                    }
                },
                update = { playerView ->
                    if (playerView.player !== exoPlayer) {
                        playerView.player = exoPlayer
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }

        if (showFileName && displayFileName.isNotBlank()) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 28.dp, start = 24.dp, end = 24.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color.Black.copy(alpha = 0.58f))
                    .padding(horizontal = 16.dp, vertical = 10.dp)
            ) {
                Text(
                    text = displayFileName,
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        // Running text overlay di atas video broadcast
        val activeOverlayItems = remember(runningText) {
            runningText.items.filter { it.enabled && it.text.isNotBlank() }
        }
        if (runningText.enabled && activeOverlayItems.isNotEmpty()) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) {
                com.itops.iptvplayer.ui.components.AppRunningTextBanner(
                    runningText = com.itops.iptvplayer.util.HomeExperienceRunningText(
                        enabled = true,
                        visibleCount = 1,
                        rotationSeconds = runningText.speed,
                        displaySeconds = 0,
                        items = activeOverlayItems.map {
                            com.itops.iptvplayer.util.HomeExperienceRunningTextItem(
                                id = it.id,
                                text = it.text,
                                enabled = it.enabled
                            )
                        }
                    )
                )
            }
        }
    }
}

private fun resolveBroadcastDisplayName(video: VideoItem): String {
    val path = video.url.substringBefore('?').substringBefore('#')
    val fileName = path.substringAfterLast('/').trim()
    if (fileName.isNotBlank()) {
        return fileName
    }

    val title = video.title.trim()
    return if (title.isNotBlank()) title else "video"
}

private fun resolveRemoteVideoUrl(serverUrl: String, value: String): String {
    val trimmedValue = value.trim()
    if (trimmedValue.isBlank() || trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://")) {
        return trimmedValue
    }

    val base = serverUrl.trim().trimEnd('/')
    val path = trimmedValue.trimStart('/')
    return if (base.isBlank()) trimmedValue else "$base/$path"
}

@Composable
private fun ExitDialogButton(
    text: String,
    modifier: Modifier = Modifier,
    primary: Boolean = false,
    focusRequester: FocusRequester? = null,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    
    // Focused state uses Cyan, primary defaults to Yellow, others transparent
    val background = when {
        isFocused -> Color(0xFF2EE6C6)
        primary -> Color(0xFFFFE9A6)
        else -> Color.Transparent
    }
    
    // Focused state and primary use Black text for high readability, others use White
    val textColor = when {
        isFocused -> Color.Black
        primary -> Color.Black
        else -> Color.White
    }
    
    val borderStroke = if (isFocused) {
        BorderStroke(3.dp, Color(0xFF2EE6C6))
    } else {
        BorderStroke(1.dp, Color.White.copy(alpha = 0.22f))
    }

    Box(
        modifier = modifier
            .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .onFocusChanged { isFocused = it.isFocused }
            .onPreviewKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown &&
                    (keyEvent.key == Key.DirectionCenter || keyEvent.key == Key.Enter)
                ) {
                    onClick()
                    true
                } else {
                    false
                }
            }
            .focusable()
            .scale(if (isFocused) 1.03f else 1f)
            .shadow(
                elevation = if (isFocused) 16.dp else 0.dp,
                shape = RoundedCornerShape(10.dp),
                ambientColor = Color(0xFF2EE6C6).copy(alpha = if (isFocused) 0.8f else 0f),
                spotColor = Color(0xFF2EE6C6).copy(alpha = if (isFocused) 0.8f else 0f)
            )
            .clip(RoundedCornerShape(10.dp))
            .background(background)
            .border(borderStroke, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            fontWeight = FontWeight.Bold,
            color = textColor,
            fontSize = 13.sp
        )
    }
}
