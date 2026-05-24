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
import com.example.rsdkiptvplayer.theme.RSDKIPTVPlayerTheme
import com.example.rsdkiptvplayer.ui.channels.ChannelBrowserScreen
import com.example.rsdkiptvplayer.ui.education.EducationScreen
import com.example.rsdkiptvplayer.ui.home.HomeScreen
import com.example.rsdkiptvplayer.ui.player.PlayerScreen
import com.example.rsdkiptvplayer.ui.settings.SettingsScreen
import com.example.rsdkiptvplayer.ui.splash.SplashScreen
import com.example.rsdkiptvplayer.data.api.RetrofitClient
import com.example.rsdkiptvplayer.data.api.UpdateCheckResponse
import com.example.rsdkiptvplayer.util.UpdateManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

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
                            HomeScreen(
                                onNavigateToPlayer = {
                                    selectedChannelId = -1
                                    currentScreen = "player"
                                },
                                onNavigateToEducation = { currentScreen = "education" },
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
