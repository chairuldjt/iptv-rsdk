package com.example.rsdkiptvplayer

import android.os.Bundle
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
import com.example.rsdkiptvplayer.theme.RSDKIPTVPlayerTheme
import com.example.rsdkiptvplayer.ui.channels.ChannelBrowserScreen
import com.example.rsdkiptvplayer.ui.education.EducationScreen
import com.example.rsdkiptvplayer.ui.entertainment.EntertainmentScreen
import com.example.rsdkiptvplayer.ui.home.HomeScreen
import com.example.rsdkiptvplayer.ui.player.PlayerScreen
import com.example.rsdkiptvplayer.ui.settings.SettingsScreen
import com.example.rsdkiptvplayer.ui.splash.SplashScreen
import com.example.rsdkiptvplayer.data.api.RetrofitClient
import com.example.rsdkiptvplayer.data.api.UpdateCheckResponse
import com.example.rsdkiptvplayer.util.UpdateManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
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
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.example.rsdkiptvplayer.util.VideoBroadcastProfile
import com.example.rsdkiptvplayer.util.VideoBroadcastParser

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
                    var activeSettingsTab by remember { mutableStateOf(0) }
                    var selectedChannelId by remember { mutableIntStateOf(-1) }
                    var showExitConfirmDialog by remember { mutableStateOf(false) }
                    var showVideoBroadcastOverlay by remember { mutableStateOf(false) }
                    var videoBroadcastAlreadyShown by remember { mutableStateOf(false) }
                    var activeVideoBroadcast by remember { mutableStateOf(VideoBroadcastProfile()) }
                    val confirmNoFocusRequester = remember { FocusRequester() }
                    val serverUrl by dataStoreManager.serverUrlFlow.collectAsState(initial = "")
                    val videoBroadcastJson by dataStoreManager.videoBroadcastJsonFlow.collectAsState(initial = "")
                    val videoBroadcast = remember(videoBroadcastJson) { VideoBroadcastParser.parse(videoBroadcastJson) }

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
                                "PLAY_CHANNEL" -> {
                                    val chId = value?.toIntOrNull()
                                    if (chId != null) {
                                        selectedChannelId = chId
                                        currentScreen = "player"
                                    }
                                }
                                "PLAY_VIDEO_BROADCAST" -> {
                                    val liveBroadcast = VideoBroadcastParser.parse(value)
                                    if (liveBroadcast.enabled && liveBroadcast.videoUrl.isNotBlank()) {
                                        activeVideoBroadcast = liveBroadcast
                                        showVideoBroadcastOverlay = true
                                    }
                                }
                                "STOP_VIDEO_BROADCAST" -> {
                                    showVideoBroadcastOverlay = false
                                }
                            }
                        }
                    }



                    when (currentScreen) {
                        "splash" -> {
                            SplashScreen(
                                onSplashComplete = { currentScreen = "home" }
                            )
                        }
                        "home" -> {
                            BackHandler {
                                showExitConfirmDialog = true
                            }
                            HomeScreen(
                                onNavigateToPlayer = {
                                    selectedChannelId = -1
                                    currentScreen = "player"
                                },
                                onNavigateToEducation = { currentScreen = "education" },
                                onNavigateToEntertainment = { currentScreen = "entertainment" },
                                onNavigateToSettings = { tabIdx ->
                                    activeSettingsTab = tabIdx
                                    currentScreen = "settings"
                                }
                            )
                        }
                        "channels" -> {
                            BackHandler {
                                currentScreen = "home"
                            }
                            ChannelBrowserScreen(
                                onChannelSelected = { channelId ->
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
                                currentScreen = "home"
                            }
                            EntertainmentScreen(
                                onBack = { currentScreen = "home" }
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

                    LaunchedEffect(currentScreen, videoBroadcastJson, serverUrl) {
                        if (
                            currentScreen != "splash" &&
                            !videoBroadcastAlreadyShown &&
                            videoBroadcast.enabled &&
                            videoBroadcast.videoUrl.isNotBlank()
                        ) {
                            videoBroadcastAlreadyShown = true
                            activeVideoBroadcast = videoBroadcast
                            showVideoBroadcastOverlay = true
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
                                        text = "Keluar Aplikasi?",
                                        color = Color.White,
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    
                                    Spacer(modifier = Modifier.height(12.dp))
                                    
                                    Text(
                                        text = "Apakah Anda yakin ingin keluar dari RSDK IPTV Player?",
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
                                            text = "Ya",
                                            onClick = {
                                                finishAndRemoveTask()
                                            },
                                            modifier = Modifier
                                                .weight(1f)
                                                .height(44.dp)
                                        )
                                        
                                        ExitDialogButton(
                                            text = "Tidak",
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
                        ForcedVideoOverlay(
                            videoUrl = resolveRemoteVideoUrl(serverUrl, activeVideoBroadcast.videoUrl),
                            repeatCount = activeVideoBroadcast.repeatCount,
                            onFinished = { showVideoBroadcastOverlay = false }
                        )
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
    videoUrl: String,
    repeatCount: Int,
    onFinished: () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val exoPlayer = remember(videoUrl) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(videoUrl))
            prepare()
            playWhenReady = true
        }
    }
    var completedLoops by remember { mutableIntStateOf(0) }

    DisposableEffect(videoUrl) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    completedLoops += 1
                    if (completedLoops >= repeatCount) {
                        onFinished()
                    } else {
                        exoPlayer.seekTo(0)
                        exoPlayer.playWhenReady = true
                    }
                }
            }
        }

        exoPlayer.addListener(listener)
        onDispose {
            exoPlayer.removeListener(listener)
            exoPlayer.release()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = false
                }
            },
            modifier = Modifier.fillMaxSize()
        )
    }
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
