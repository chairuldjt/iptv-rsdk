package com.example.rsdkiptvplayer.ui.home

import androidx.activity.compose.BackHandler

import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Build
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.draw.alpha
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.Apps
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.Build
import androidx.compose.material.icons.rounded.Cake
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.Casino
import androidx.compose.material.icons.rounded.Chat
import androidx.compose.material.icons.rounded.Cloud
import androidx.compose.material.icons.rounded.CloudDownload
import androidx.compose.material.icons.rounded.CloudUpload
import androidx.compose.material.icons.rounded.Contacts
import androidx.compose.material.icons.rounded.Dashboard
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Feedback
import androidx.compose.material.icons.rounded.Folder
import androidx.compose.material.icons.rounded.FolderOpen
import androidx.compose.material.icons.rounded.Forum
import androidx.compose.material.icons.rounded.GridView
import androidx.compose.material.icons.rounded.Group
import androidx.compose.material.icons.rounded.Groups
import androidx.compose.material.icons.rounded.Headphones
import androidx.compose.material.icons.rounded.Help
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Hotel
import androidx.compose.material.icons.rounded.Image
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Key
import androidx.compose.material.icons.rounded.Launch
import androidx.compose.material.icons.rounded.Layers
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.LiveTv
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.LockOpen
import androidx.compose.material.icons.rounded.Map
import androidx.compose.material.icons.rounded.Menu
import androidx.compose.material.icons.rounded.Message
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.MilitaryTech
import androidx.compose.material.icons.rounded.Movie
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Navigation
import androidx.compose.material.icons.rounded.NearMe
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.People
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Phone
import androidx.compose.material.icons.rounded.Photo
import androidx.compose.material.icons.rounded.PhotoLibrary
import androidx.compose.material.icons.rounded.Place
import androidx.compose.material.icons.rounded.PlayCircle
import androidx.compose.material.icons.rounded.Radio
import androidx.compose.material.icons.rounded.Replay
import androidx.compose.material.icons.rounded.Restaurant
import androidx.compose.material.icons.rounded.RoomService
import androidx.compose.material.icons.rounded.Save
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Security
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material.icons.rounded.Spa
import androidx.compose.material.icons.rounded.Speaker
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.StarBorder
import androidx.compose.material.icons.rounded.Storage
import androidx.compose.material.icons.rounded.ThumbDown
import androidx.compose.material.icons.rounded.ThumbUp
import androidx.compose.material.icons.rounded.Toys
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material.icons.rounded.Upload
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material.icons.rounded.Videocam
import androidx.compose.material.icons.rounded.ViewList
import androidx.compose.material.icons.rounded.ViewModule
import androidx.compose.material.icons.rounded.VolumeUp
import androidx.compose.material.icons.rounded.Widgets
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.zIndex
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.geometry.Offset as TextOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.example.rsdkiptvplayer.R
import com.example.rsdkiptvplayer.BuildConfig
import com.example.rsdkiptvplayer.ui.components.KeyboardLayoutProvider
import com.example.rsdkiptvplayer.ui.components.RemoteKeyboardDialog
import com.example.rsdkiptvplayer.ui.components.RemoteKeyboardKeySpec
import com.example.rsdkiptvplayer.ui.player.PlayerViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.Job
import kotlin.math.abs
import java.text.SimpleDateFormat
import java.util.*
import android.widget.Toast
import com.example.rsdkiptvplayer.util.UpdateManager
import com.example.rsdkiptvplayer.util.HomeExperienceParser
import com.example.rsdkiptvplayer.util.HomeOverlayItem
import com.example.rsdkiptvplayer.util.HomeOverlayPosition
import com.example.rsdkiptvplayer.util.HomeOverlayType
import com.example.rsdkiptvplayer.util.RemoteAudioPlayer
import com.example.rsdkiptvplayer.data.api.RetrofitClient
import com.example.rsdkiptvplayer.util.NtpTimeProvider
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.net.URI

@Composable
fun HomeScreen(
    onNavigateToPlayer: () -> Unit,
    onNavigateToEducation: () -> Unit,
    onNavigateToEntertainment: () -> Unit,
    onNavigateToEntertainmentItem: (Int) -> Unit,
    onNavigateToSettings: (activeTab: Int) -> Unit,
    onNavigateToAppDrawer: () -> Unit,
    playerViewModel: PlayerViewModel = viewModel()
) {
    val context = LocalContext.current
    val app = context.applicationContext as com.example.rsdkiptvplayer.IptvApplication
    val dataStoreManager = app.dataStoreManager
    val coroutineScope = rememberCoroutineScope()

    val channels by playerViewModel.channels.collectAsState()
    val channelsLoading by playerViewModel.isLoading.collectAsState()
    val serverUrl by dataStoreManager.serverUrlFlow.collectAsState(initial = "")
    val storedStbName by dataStoreManager.stbNameFlow.collectAsState(initial = "")
    val ntpServer by dataStoreManager.ntpServerFlow.collectAsState(initial = "0.id.pool.ntp.org")
    val educationPath by dataStoreManager.educationVideoPathFlow.collectAsState(initial = null)
    val educationSource by dataStoreManager.educationSourceFlow.collectAsState(initial = null)
    val educationPlaybackMode by dataStoreManager.educationPlaybackModeFlow.collectAsState(initial = null)
    val homeExperienceJson by dataStoreManager.homeExperienceJsonFlow.collectAsState(initial = "")
    val homeExperience = remember(homeExperienceJson) { HomeExperienceParser.parse(homeExperienceJson) }

    var resolvedDeviceId by remember { mutableStateOf("STB-RSDK-DEVICE") }
    var macAddress by remember { mutableStateOf("Tidak tersedia") }
    var localIpAddress by remember { mutableStateOf("127.0.0.1") }
    var timeString by remember { mutableStateOf("") }
    var dateString by remember { mutableStateOf("") }
    var ntpOffsetMillis by remember { mutableStateOf<Long?>(null) }
    var versionText by remember { mutableStateOf("") }
    var currentVersionName by remember { mutableStateOf("") }
    var currentVersionCode by remember { mutableIntStateOf(0) }
    var showInfoDialog by remember { mutableStateOf(false) }
    var showStbNameDialog by remember { mutableStateOf(false) }
    val menuFocusRequester = remember { FocusRequester() }
    val displayedStbName = storedStbName.ifBlank { "${Build.MANUFACTURER} ${Build.MODEL}".trim() }
    val indonesianLocale = remember { Locale.forLanguageTag("id-ID") }

    LaunchedEffect(showInfoDialog, showStbNameDialog) {
        if (!showInfoDialog && !showStbNameDialog) {
            delay(100)
            try {
                menuFocusRequester.requestFocus()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    var selectedHomeBackground by remember { mutableIntStateOf(R.drawable.home_bg_tv) }
    var selectedHomeBackgroundUrl by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        resolvedDeviceId = dataStoreManager.getDeviceId()
        macAddress = app.repository.getMacAddress() ?: "Tidak tersedia"
        localIpAddress = app.repository.getLocalIpAddress()
        currentVersionCode = UpdateManager.getCurrentVersionCode(context)
        currentVersionName = UpdateManager.getCurrentVersionName(context)
        versionText = "v$currentVersionName ($currentVersionCode)"
    }

    LaunchedEffect(ntpServer) {
        while (true) {
            val refreshedOffset = NtpTimeProvider.resolveTimeOffsetMillis(ntpServer)
            if (refreshedOffset != null) {
                ntpOffsetMillis = refreshedOffset
                delay(6 * 60 * 60 * 1000L)
            } else {
                delay(5 * 60 * 1000L)
            }
        }
    }

    LaunchedEffect(ntpOffsetMillis) {
        while (true) {
            val useNtpClock = ntpOffsetMillis != null
            val displayDate = Date(System.currentTimeMillis() + (ntpOffsetMillis ?: 0L))
            val timeFormatter = SimpleDateFormat(
                "HH:mm",
                if (useNtpClock) indonesianLocale else Locale.getDefault()
            ).apply {
                if (useNtpClock) {
                    timeZone = TimeZone.getTimeZone("Asia/Jakarta")
                }
            }
            val dateFormatter = SimpleDateFormat(
                "EEEE, d MMMM yyyy",
                if (useNtpClock) indonesianLocale else Locale.getDefault()
            ).apply {
                if (useNtpClock) {
                    timeZone = TimeZone.getTimeZone("Asia/Jakarta")
                }
            }
            timeString = timeFormatter.format(displayDate)
            dateString = dateFormatter.format(displayDate)
            delay(1000)
        }
    }

    var weatherText by remember { mutableStateOf("Memuat cuaca...") }

    LaunchedEffect(Unit) {
        while (true) {
            try {
                withContext(Dispatchers.IO) {
                    val client = OkHttpClient()
                    var lat = -6.99
                    var lon = 110.42
                    var city = "Semarang"
                    
                    try {
                        val locRequest = Request.Builder().url("https://freeipapi.com/api/json").build()
                        client.newCall(locRequest).execute().use { response ->
                            if (response.isSuccessful) {
                                val bodyStr = response.body?.string()
                                if (!bodyStr.isNullOrBlank()) {
                                    val json = JSONObject(bodyStr)
                                    lat = json.optDouble("latitude", -6.99)
                                    lon = json.optDouble("longitude", 110.42)
                                    city = json.optString("cityName", "Semarang")
                                }
                            }
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }

                    val weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,weather_code"
                    val weatherRequest = Request.Builder().url(weatherUrl).build()
                    client.newCall(weatherRequest).execute().use { response ->
                        if (response.isSuccessful) {
                            val bodyStr = response.body?.string()
                            if (!bodyStr.isNullOrBlank()) {
                                val json = JSONObject(bodyStr)
                                val current = json.getJSONObject("current")
                                val temp = current.getDouble("temperature_2m")
                                val weatherCode = current.getInt("weather_code")
                                val (emoji, desc) = when (weatherCode) {
                                    0 -> Pair("☀️", "Cerah")
                                    1, 2 -> Pair("🌤️", "Cerah Berawan")
                                    3 -> Pair("☁️", "Berawan")
                                    45, 48 -> Pair("🌫️", "Kabut")
                                    51, 53, 55 -> Pair("🌧️", "Gerimis")
                                    61, 63, 65 -> Pair("🌧️", "Hujan")
                                    80, 81, 82 -> Pair("🌦️", "Hujan Ringan")
                                    95, 96, 99 -> Pair("⛈️", "Hujan Badai")
                                    else -> Pair("🌤️", "Cerah Berawan")
                                }
                                withContext(Dispatchers.Main) {
                                    weatherText = "$emoji $city • ${temp.toInt()}°C $desc"
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                withContext(Dispatchers.Main) {
                    if (weatherText == "Memuat cuaca...") {
                        weatherText = "🌤️ Semarang • 29°C Cerah Berawan"
                    }
                }
            }
            delay(15 * 60 * 1000L)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (BuildConfig.HOME_LOW_EFFECT_MODE) {
            if (selectedHomeBackgroundUrl.isNotBlank()) {
                AsyncImage(
                    model = selectedHomeBackgroundUrl,
                    contentDescription = "Hospitality menu background",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            } else if (homeExperience.homeBackgroundUrl.isNotBlank()) {
                AsyncImage(
                    model = homeExperience.homeBackgroundUrl,
                    contentDescription = "Hospitality menu background",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            } else {
                Image(
                    painter = painterResource(id = selectedHomeBackground),
                    contentDescription = "Hospitality menu background",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }
        } else {
            Crossfade(
                targetState = selectedHomeBackgroundUrl.ifBlank { homeExperience.homeBackgroundUrl.ifBlank { selectedHomeBackground.toString() } },
                animationSpec = tween(durationMillis = 520),
                label = "home_selection_background"
            ) { backgroundValue ->
                val resourceId = backgroundValue.toIntOrNull()
                if (resourceId != null) {
                    Image(
                        painter = painterResource(id = resourceId),
                        contentDescription = "Hospitality menu background",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    AsyncImage(
                        model = backgroundValue,
                        contentDescription = "Hospitality menu background",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                }
            }
        }

        val configuration = androidx.compose.ui.platform.LocalConfiguration.current
        val screenWidth = configuration.screenWidthDp
        val screenHeight = configuration.screenHeightDp
        val isSmallScreen = screenWidth < 760 || screenHeight < 500
        val isUltraCompact = screenWidth < 600 || screenHeight < 400
        val showFiveItems = screenWidth >= 560 && screenHeight >= 360

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.16f),
                            Color(0xFF06111C).copy(alpha = 0.05f),
                            Color.Black.copy(alpha = 0.66f)
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .safeDrawingPadding()
                .padding(
                    horizontal = if (isUltraCompact) 12.dp else if (isSmallScreen) 18.dp else 34.dp,
                    vertical = if (isUltraCompact) 6.dp else if (isSmallScreen) 10.dp else 18.dp
                )
        ) {
            // Jika ada overlay dari server, header hardcode disembunyikan —
            // overlay system yang mengambil alih rendering elemen header.
            if (homeExperience.overlays.isEmpty()) {
                HospitalityHeader(
                    logoUrl = homeExperience.logoUrl,
                    stbName = displayedStbName,
                    deviceId = resolvedDeviceId,
                    ipAddress = localIpAddress,
                    channelCount = channels.size,
                    time = timeString,
                    date = dateString,
                    version = versionText,
                    weather = weatherText
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            HospitalityMenuBar(
                channelsCount = channels.size,
                serverUrl = serverUrl,
                educationPath = educationPath,
                educationSource = educationSource,
                educationPlaybackMode = educationPlaybackMode,
                onEducationClick = {
                    val currentEducationPath = educationPath
                    val currentEducationSource = educationSource
                    if (currentEducationSource == null || currentEducationPath == null) {
                        Toast.makeText(context, "Memuat pengaturan edukasi...", Toast.LENGTH_SHORT).show()
                    } else if (currentEducationSource == "web") {
                        if (serverUrl.isBlank()) {
                            Toast.makeText(context, "Server belum disetting.", Toast.LENGTH_SHORT).show()
                        } else {
                            onNavigateToEducation()
                        }
                    } else if (currentEducationPath.isBlank()) {
                        Toast.makeText(context, "Path SMB edukasi belum disetting.", Toast.LENGTH_SHORT).show()
                    } else {
                        onNavigateToEducation()
                    }
                },
                onTvClick = {
                    if (channelsLoading) {
                        Toast.makeText(context, "Memuat daftar saluran...", Toast.LENGTH_SHORT).show()
                    } else if (channels.isEmpty()) {
                        Toast.makeText(context, "Saluran TV belum tersedia.", Toast.LENGTH_SHORT).show()
                    } else {
                        onNavigateToPlayer()
                    }
                },
                onServiceClick = {
                    Toast.makeText(context, "Layanan belum tersedia.", Toast.LENGTH_SHORT).show()
                },
                onEntertainmentClick = onNavigateToEntertainment,
                onEntertainmentItemClick = onNavigateToEntertainmentItem,
                onSettingsClick = { onNavigateToSettings(0) },
                onInfoClick = { showInfoDialog = true },
                onAppDrawerClick = onNavigateToAppDrawer,
                onOpenStbNameMenu = { showStbNameDialog = true },
                menuFocusRequester = menuFocusRequester,
                showFiveItems = showFiveItems,
                isUltraCompact = isUltraCompact,
                homeExperienceJson = homeExperienceJson,
                onSelectionChanged = { item ->
                    selectedHomeBackground = item.backgroundRes
                    selectedHomeBackgroundUrl = item.backgroundUrl
                }
            )
        }

        // Render home screen overlays (text, logo, clock, date, weather, etc.)
        if (homeExperience.overlays.isNotEmpty()) {
            HomeScreenOverlays(
                overlays = homeExperience.overlays,
                deviceName = displayedStbName,
                channelCount = channels.size,
                timeString = timeString,
                dateString = dateString,
                weatherText = weatherText,
                appLogoUrl = homeExperience.logoUrl,
            )
        }

        if (showInfoDialog) {
            InfoAplikasiDialog(
                macAddress = macAddress,
                ipAddress = localIpAddress,
                serverUrl = serverUrl,
                currentVersionCode = currentVersionCode,
                currentVersionName = currentVersionName,
                onDismiss = { showInfoDialog = false }
            )
        }

        if (showStbNameDialog) {
            StbNameDialog(
                currentName = storedStbName,
                fallbackName = displayedStbName,
                onDismiss = { showStbNameDialog = false },
                onSave = { newName ->
                    coroutineScope.launch {
                        dataStoreManager.setStbName(newName)
                        app.repository.registerDevice()
                        showStbNameDialog = false
                        Toast.makeText(
                            context,
                            if (newName.isBlank()) "Nama STB dikembalikan ke default." else "Nama STB berhasil disimpan.",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            )
        }
    }
}

@Composable
private fun HospitalityHeader(
    logoUrl: String,
    stbName: String,
    deviceId: String,
    ipAddress: String,
    channelCount: Int,
    time: String,
    date: String,
    version: String,
    weather: String
) {
    val configuration = androidx.compose.ui.platform.LocalConfiguration.current
    val screenWidth = configuration.screenWidthDp
    val screenHeight = configuration.screenHeightDp
    val isSmallScreen = screenWidth < 760 || screenHeight < 500
    val isUltraCompact = screenWidth < 600 || screenHeight < 400
    val showCenterHeader = screenWidth >= 600 && screenHeight >= 400

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        // Left column
        Column(
            modifier = Modifier.weight(1f),
            horizontalAlignment = Alignment.Start,
            verticalArrangement = Arrangement.spacedBy(if (isUltraCompact) 1.dp else if (isSmallScreen) 2.dp else 4.dp)
        ) {
            Text(
                text = "Selamat Datang",
                color = Color.White,
                fontSize = if (isUltraCompact) 11.sp else if (isSmallScreen) 13.sp else 17.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "Premium IPTV Hospitality",
                color = Color(0xFFE7D8A0),
                fontSize = if (isUltraCompact) 8.sp else if (isSmallScreen) 9.sp else 12.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = stbName,
                color = Color.White.copy(alpha = 0.88f),
                fontSize = if (isUltraCompact) 7.sp else if (isSmallScreen) 8.sp else 10.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        // Center column (only if screen is large enough)
        if (showCenterHeader) {
            val isMediumHeight = screenHeight < 600
            Column(
                modifier = Modifier.weight(1.2f),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (logoUrl.isNotBlank()) {
                    AsyncImage(
                        model = logoUrl,
                        contentDescription = "Hospitality IPTV",
                        modifier = Modifier
                            .size(if (isMediumHeight) 48.dp else 72.dp)
                            .shadow(12.dp, RoundedCornerShape(16.dp))
                    )
                } else {
                    Image(
                        painter = painterResource(id = R.drawable.ic_global_iptv),
                        contentDescription = "Hospitality IPTV",
                        modifier = Modifier
                            .size(if (isMediumHeight) 48.dp else 72.dp)
                            .shadow(12.dp, RoundedCornerShape(16.dp))
                    )
                }
                Spacer(modifier = Modifier.height(if (isMediumHeight) 4.dp else 8.dp))
                Text(
                    text = "Hospitality IPTV",
                    color = Color(0xFFFFE9A6),
                    fontSize = if (isMediumHeight) 16.sp else 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 0.5.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "Live TV • Education • Guest Services",
                    color = Color.White.copy(alpha = 0.88f),
                    fontSize = if (isMediumHeight) 9.sp else 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.2.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        // Right column
        Column(
            modifier = Modifier.weight(1f),
            horizontalAlignment = Alignment.End
        ) {
            Text(
                text = time,
                color = Color.White,
                fontSize = if (isUltraCompact) 18.sp else if (isSmallScreen) 22.sp else 30.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = date,
                color = Color.White.copy(alpha = 0.82f),
                fontSize = if (isUltraCompact) 7.sp else if (isSmallScreen) 8.sp else 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(if (isUltraCompact) 1.dp else if (isSmallScreen) 2.dp else 4.dp))
            Text(
                text = weather,
                color = Color(0xFFFFE9A6),
                fontSize = if (isUltraCompact) 7.sp else if (isSmallScreen) 8.sp else 10.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun InfoChip(text: String, isSmallScreen: Boolean = false) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(if (isSmallScreen) 12.dp else 18.dp))
            .background(Color.Black.copy(alpha = 0.25f))
            .border(1.dp, Color.White.copy(alpha = 0.13f), RoundedCornerShape(if (isSmallScreen) 12.dp else 18.dp))
            .padding(
                horizontal = if (isSmallScreen) 7.dp else 11.dp,
                vertical = if (isSmallScreen) 3.dp else 5.dp
            )
    ) {
        Text(
            text = text,
            color = Color.White.copy(alpha = 0.84f),
            fontSize = if (isSmallScreen) 8.sp else 10.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}


@Composable
private fun HospitalityMenuBar(
    channelsCount: Int,
    serverUrl: String,
    educationPath: String?,
    educationSource: String?,
    educationPlaybackMode: String?,
    onEducationClick: () -> Unit,
    onTvClick: () -> Unit,
    onServiceClick: () -> Unit,
    onEntertainmentClick: () -> Unit,
    onEntertainmentItemClick: (Int) -> Unit,
    onSettingsClick: () -> Unit,
    onInfoClick: () -> Unit,
    onAppDrawerClick: () -> Unit,
    onOpenStbNameMenu: () -> Unit,
    menuFocusRequester: FocusRequester,
    showFiveItems: Boolean,
    isUltraCompact: Boolean,
    homeExperienceJson: String,
    onSelectionChanged: (HospitalityCarouselItem) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val homeExperience = remember(homeExperienceJson) { HomeExperienceParser.parse(homeExperienceJson) }
    val configuration = androidx.compose.ui.platform.LocalConfiguration.current
    val screenWidth = configuration.screenWidthDp
    val screenHeight = configuration.screenHeightDp
    val isSmallScreen = screenWidth < 760 || screenHeight < 500
    val lowEffectMode = BuildConfig.HOME_LOW_EFFECT_MODE
    var hasPlayedSelectionSound by remember { mutableStateOf(false) }
    val soundPool = remember {
        SoundPool.Builder()
            .setMaxStreams(2)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .build()
    }
    var selectionSoundId by remember { mutableIntStateOf(0) }

    var selectedIndex by remember { mutableIntStateOf(0) }
    var dragAmount by remember { mutableFloatStateOf(0f) }
    var okHoldJob by remember { mutableStateOf<Job?>(null) }
    var okLongPressTriggered by remember { mutableStateOf(false) }
    val carouselFocusRequester = menuFocusRequester
    val menuItems = remember(homeExperienceJson, channelsCount, educationSource, educationPath, educationPlaybackMode) {
        val sourceMenus = if (homeExperience.menus.isEmpty()) {
            HomeExperienceParser.defaultMenus()
        } else {
            homeExperience.menus
        }

        val mapped = sourceMenus.mapNotNull { menu ->
            val subtitle = when (menu.type) {
                "tv" -> if (menu.subtitle.isBlank()) "$channelsCount saluran" else menu.subtitle
                "education" -> if (menu.subtitle.isNotBlank()) menu.subtitle else when {
                    educationSource == null -> "Memuat..."
                    educationSource == "web" -> if (educationPlaybackMode == "stream") "Web Streaming" else "Web Repository"
                    educationPath == null -> "Memuat..."
                    educationPath.isBlank() -> "SMB belum disetting"
                    else -> "Video RS"
                }
                else -> menu.subtitle
            }

            val action = when (menu.type) {
                "tv" -> onTvClick
                "education" -> onEducationClick
                "entertainment" -> onEntertainmentClick
                "settings" -> onSettingsClick
                "info_dialog" -> onInfoClick
                "konten" -> {
                    val itemId = menu.entertainmentItemId
                    if (itemId <= 0) return@mapNotNull null
                    ({ onEntertainmentItemClick(itemId) })
                }
                "app_drawer" -> onAppDrawerClick
                "launch_app" -> ({
                    val pkg = menu.targetPackage.trim()
                    if (pkg.isBlank()) {
                        Toast.makeText(context, "Package name belum diisi.", Toast.LENGTH_SHORT).show()
                    } else {
                        val launchIntent = context.packageManager.getLaunchIntentForPackage(pkg)
                        if (launchIntent != null) {
                            launchIntent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                            context.startActivity(launchIntent)
                        } else {
                            var opened = false
                            try {
                                val playIntent = android.content.Intent(
                                    android.content.Intent.ACTION_VIEW,
                                    android.net.Uri.parse("market://details?id=$pkg")
                                ).apply {
                                    setPackage("com.android.vending")
                                    flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                                }
                                context.startActivity(playIntent)
                                opened = true
                            } catch (_: Exception) {}

                            if (!opened) {
                                try {
                                    val playIntent = android.content.Intent(
                                        android.content.Intent.ACTION_VIEW,
                                        android.net.Uri.parse("market://details?id=$pkg")
                                    ).apply { flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK }
                                    context.startActivity(playIntent)
                                    opened = true
                                } catch (_: Exception) {}
                            }

                            if (!opened) {
                                try {
                                    val webIntent = android.content.Intent(
                                        android.content.Intent.ACTION_VIEW,
                                        android.net.Uri.parse("https://play.google.com/store/apps/details?id=$pkg")
                                    ).apply { flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK }
                                    context.startActivity(webIntent)
                                    opened = true
                                } catch (_: Exception) {}
                            }

                            if (!opened) {
                                Toast.makeText(context, "Tidak dapat membuka Play Store untuk: $pkg", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                })
                else -> onServiceClick
            }

            // Resolve app icon only if useAppIcon is enabled and app is installed
            val appIconDrawable = if (menu.type == "launch_app" && menu.useAppIcon && menu.targetPackage.isNotBlank()) {
                try {
                    context.packageManager.getApplicationIcon(menu.targetPackage)
                } catch (_: Exception) { null }
            } else null

            HospitalityCarouselItem(
                icon = resolveHomeIcon(menu.icon),
                appIconDrawable = appIconDrawable,
                title = menu.title,
                subtitle = subtitle,
                accent = HomeExperienceParser.colorOrDefault(menu.accentColorHex, Color(0xFFFFE9A6)),
                textColor = HomeExperienceParser.colorOrDefault(menu.textColorHex, Color.White),
                backgroundRes = defaultBackgroundForMenuType(menu.type),
                backgroundUrl = menu.backgroundUrl,
                action = action
            )
        }

        // If every menu got filtered out (e.g. all `konten` items reference a
        // missing entertainmentItemId), rebuild from the built-in defaults so
        // the carousel is never empty.
        if (mapped.isNotEmpty()) {
            mapped
        } else {
            HomeExperienceParser.defaultMenus().map { menu ->
                val subtitle = when (menu.type) {
                    "tv" -> if (menu.subtitle.isBlank()) "$channelsCount saluran" else menu.subtitle
                    else -> menu.subtitle
                }
                val action = when (menu.type) {
                    "tv" -> onTvClick
                    "education" -> onEducationClick
                    "entertainment" -> onEntertainmentClick
                    "settings" -> onSettingsClick
                    "info_dialog" -> onInfoClick
                    else -> onServiceClick
                }
                HospitalityCarouselItem(
                    icon = resolveHomeIcon(menu.icon),
                    title = menu.title,
                    subtitle = subtitle,
                    accent = HomeExperienceParser.colorOrDefault(menu.accentColorHex, Color(0xFFFFE9A6)),
                    textColor = HomeExperienceParser.colorOrDefault(menu.textColorHex, Color.White),
                    backgroundRes = defaultBackgroundForMenuType(menu.type),
                    backgroundUrl = menu.backgroundUrl,
                    action = action
                )
            }
        }
    }

    LaunchedEffect(menuItems.size) {
        selectedIndex = selectedIndex.coerceIn(0, (menuItems.size - 1).coerceAtLeast(0))
    }

    DisposableEffect(Unit) {
        selectionSoundId = soundPool.load(context, R.raw.home_selection_chime, 1)
        onDispose {
            okHoldJob?.cancel()
            soundPool.release()
        }
    }

    LaunchedEffect(Unit) { carouselFocusRequester.requestFocus() }

    LaunchedEffect(selectedIndex, selectionSoundId) {
        onSelectionChanged(menuItems[selectedIndex])
        if (!hasPlayedSelectionSound) {
            hasPlayedSelectionSound = true
            return@LaunchedEffect
        }
        if (homeExperience.sounds.enableSelectionSound) {
            if (homeExperience.sounds.selectionSoundUrl.isNotBlank()) {
                RemoteAudioPlayer.playOnce(context, homeExperience.sounds.selectionSoundUrl)
            } else if (selectionSoundId != 0) {
                soundPool.play(selectionSoundId, 0.38f, 0.42f, 1, 0, 1.0f)
            }
        }
    }

    fun moveSelection(delta: Int) {
        selectedIndex = wrapCarouselIndex(selectedIndex + delta, menuItems.size)
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(if (isUltraCompact) 115.dp else if (isSmallScreen) 140.dp else 190.dp)
                .focusRequester(carouselFocusRequester)
                .focusable()
                .onPreviewKeyEvent { keyEvent ->
                    if (keyEvent.type != KeyEventType.KeyDown) {
                        return@onPreviewKeyEvent false
                    }

                    when (keyEvent.key) {
                        Key.DirectionLeft -> {
                            okHoldJob?.cancel()
                            okHoldJob = null
                            okLongPressTriggered = false
                            moveSelection(-1)
                            true
                        }
                        Key.DirectionRight -> {
                            okHoldJob?.cancel()
                            okHoldJob = null
                            okLongPressTriggered = false
                            moveSelection(1)
                            true
                        }
                        else -> false
                    }
                }
                .onPreviewKeyEvent { keyEvent ->
                    if (!isConfirmKey(keyEvent.key)) {
                        return@onPreviewKeyEvent false
                    }

                    when (keyEvent.type) {
                        KeyEventType.KeyDown -> {
                            if (okHoldJob == null) {
                                okLongPressTriggered = false
                                okHoldJob = coroutineScope.launch {
                                    delay(3000)
                                    okLongPressTriggered = true
                                }
                            }
                            true
                        }
                        KeyEventType.KeyUp -> {
                            okHoldJob?.cancel()
                            okHoldJob = null
                            if (okLongPressTriggered) {
                                onOpenStbNameMenu()
                            } else {
                                menuItems[selectedIndex].action()
                            }
                            okLongPressTriggered = false
                            true
                        }
                        else -> false
                    }
                }
                .pointerInput(Unit) {
                    awaitPointerEventScope {
                        while (true) {
                            val down = awaitPointerEvent().changes.firstOrNull { it.pressed } ?: continue
                            dragAmount = 0f
                            var isDragging = down.pressed
                            while (isDragging) {
                                val event = awaitPointerEvent()
                                val change = event.changes.firstOrNull() ?: break
                                isDragging = event.changes.any { it.pressed }
                                dragAmount += change.position.x - change.previousPosition.x
                                if (abs(dragAmount) > 70f) {
                                    moveSelection(if (dragAmount < 0f) 1 else -1)
                                    dragAmount = 0f
                                    change.consume()
                                }
                            }
                        }
                    }
                }
                .padding(
                    horizontal = if (isUltraCompact) 6.dp else if (isSmallScreen) 12.dp else 24.dp,
                    vertical = if (isUltraCompact) 1.dp else if (isSmallScreen) 2.dp else 4.dp
                ),
            contentAlignment = Alignment.Center
        ) {
            CarouselTouchButton(
                direction = -1,
                isSmallScreen = isSmallScreen,
                accent = menuItems[selectedIndex].accent,
                onClick = { moveSelection(-1) },
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .zIndex(4f)
            )
            CarouselTouchButton(
                direction = 1,
                isSmallScreen = isSmallScreen,
                accent = menuItems[selectedIndex].accent,
                onClick = { moveSelection(1) },
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .zIndex(4f)
            )

            val offsets = if (showFiveItems) listOf(-2, -1, 0, 1, 2) else listOf(-1, 0, 1)
            Row(
                horizontalArrangement = Arrangement.spacedBy(
                    if (isUltraCompact) 6.dp else if (isSmallScreen) 10.dp else 18.dp,
                    Alignment.CenterHorizontally
                ),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                offsets.forEach { offset ->
                    val itemIndex = wrapCarouselIndex(selectedIndex + offset, menuItems.size)
                    val item = menuItems[itemIndex]
                    HospitalityCarouselCard(
                        item = item,
                        offset = offset,
                        lowEffectMode = lowEffectMode,
                        isSmallScreen = isSmallScreen,
                        isUltraCompact = isUltraCompact,
                        onClick = {
                            if (offset == 0) {
                                item.action()
                            } else {
                                selectedIndex = itemIndex
                            }
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(if (isUltraCompact) 2.dp else if (isSmallScreen) 4.dp else 8.dp))
        SelectedMenuLabel(
            item = menuItems[selectedIndex],
            isSmallScreen = isSmallScreen,
            isUltraCompact = isUltraCompact
        )
        Spacer(modifier = Modifier.height(if (isUltraCompact) 4.dp else if (isSmallScreen) 8.dp else 12.dp))
        Row(
            horizontalArrangement = Arrangement.spacedBy(if (isUltraCompact) 4.dp else 7.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            menuItems.indices.forEach { index ->
                Box(
                    modifier = Modifier
                        .width(if (index == selectedIndex) (if (isUltraCompact) 14.dp else 22.dp) else (if (isUltraCompact) 5.dp else 7.dp))
                        .height(if (isUltraCompact) 5.dp else 7.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            if (index == selectedIndex) menuItems[selectedIndex].accent
                            else Color.White.copy(alpha = 0.28f)
                        )
                )
            }
        }
        Spacer(modifier = Modifier.height(if (isUltraCompact) 4.dp else 8.dp))
        if (okLongPressTriggered) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(if (isUltraCompact) 8.dp else 12.dp))
                    .background(Color(0xFF2EE6C6).copy(alpha = 0.22f))
                    .border(
                        BorderStroke(1.dp, Color(0xFF2EE6C6).copy(alpha = 0.85f)),
                        RoundedCornerShape(if (isUltraCompact) 8.dp else 12.dp)
                    )
                    .padding(
                        horizontal = if (isUltraCompact) 10.dp else 14.dp,
                        vertical = if (isUltraCompact) 5.dp else 7.dp
                    )
            ) {
                Text(
                    text = if (isUltraCompact) "Lepas OK untuk ubah nama STB" else "Trigger aktif. Lepaskan tombol OK untuk membuka ubah nama STB.",
                    color = Color.White,
                    fontSize = if (isUltraCompact) 8.sp else if (isSmallScreen) 9.sp else 11.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
            }
            Spacer(modifier = Modifier.height(if (isUltraCompact) 4.dp else 8.dp))
        }
        Text(
            text = if (isUltraCompact) {
                homeExperience.menuHintText.ifBlank { "Kiri/Kanan: Putar • OK: Pilih • Tahan OK 3s: Nama STB" }.let {
                    if (it.length > 60) it.take(57) + "..." else it
                }
            } else homeExperience.menuHintText.ifBlank {
                "Gunakan kiri/kanan remote untuk memutar menu, OK untuk memilih, tahan OK 3 detik untuk ubah nama STB"
            },
            color = Color.White.copy(alpha = 0.62f),
            fontSize = if (isUltraCompact) 7.sp else if (isSmallScreen) 8.sp else 10.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

private data class HospitalityCarouselItem(
    val icon: ImageVector,
    val appIconDrawable: android.graphics.drawable.Drawable? = null,
    val title: String,
    val subtitle: String,
    val accent: Color,
    val textColor: Color,
    val backgroundRes: Int,
    val backgroundUrl: String,
    val action: () -> Unit
)

private fun resolveHomeIcon(name: String): ImageVector {
    return when (name.lowercase()) {
        // Media & Entertainment
        "live_tv" -> Icons.Rounded.LiveTv
        "tv" -> Icons.Rounded.LiveTv
        "movie" -> Icons.Rounded.Movie
        "theaters" -> Icons.Rounded.Movie
        "music_note" -> Icons.Rounded.MusicNote
        "headphones" -> Icons.Rounded.Headphones
        "radio" -> Icons.Rounded.Radio
        "podcast" -> Icons.Rounded.Radio
        "videocam" -> Icons.Rounded.Videocam
        "play_circle" -> Icons.Rounded.PlayCircle
        "replay" -> Icons.Rounded.Replay
        "shuffle" -> Icons.Rounded.Shuffle
        "mic" -> Icons.Rounded.Mic
        "speaker" -> Icons.Rounded.Speaker
        "volume_up" -> Icons.Rounded.VolumeUp
        "sports_esports" -> Icons.Rounded.Toys
        "casino" -> Icons.Rounded.Casino
        "toys" -> Icons.Rounded.Toys
        // Education & Info
        "menu_book" -> Icons.AutoMirrored.Rounded.MenuBook
        "school" -> Icons.Rounded.School
        "book" -> Icons.AutoMirrored.Rounded.MenuBook
        "library_books" -> Icons.AutoMirrored.Rounded.MenuBook
        "science" -> Icons.Rounded.Science
        "info" -> Icons.Rounded.Info
        "help" -> Icons.Rounded.Help
        "help_outline" -> Icons.Rounded.Help
        "notifications" -> Icons.Rounded.Notifications
        "feedback" -> Icons.Rounded.Feedback
        // Health & Medical
        "local_hospital" -> Icons.Rounded.Favorite
        "medical_services" -> Icons.Rounded.Favorite
        "health_and_safety" -> Icons.Rounded.Shield
        "healing" -> Icons.Rounded.Favorite
        "spa" -> Icons.Rounded.Spa
        // Navigation & UI
        "home" -> Icons.Rounded.Home
        "dashboard" -> Icons.Rounded.Dashboard
        "menu" -> Icons.Rounded.Menu
        "apps" -> Icons.Rounded.Apps
        "grid_view" -> Icons.Rounded.GridView
        "view_list" -> Icons.Rounded.ViewList
        "view_module" -> Icons.Rounded.ViewModule
        "widgets" -> Icons.Rounded.Widgets
        "layers" -> Icons.Rounded.Layers
        "map" -> Icons.Rounded.Map
        "navigation" -> Icons.Rounded.Navigation
        "explore" -> Icons.Rounded.Explore
        "near_me" -> Icons.Rounded.NearMe
        "place" -> Icons.Rounded.Place
        "location_on" -> Icons.Rounded.Place
        "launch" -> Icons.Rounded.Launch
        "link" -> Icons.Rounded.Link
        "share" -> Icons.Rounded.Share
        // Communication
        "chat" -> Icons.Rounded.Chat
        "message" -> Icons.Rounded.Message
        "email" -> Icons.Rounded.Email
        "phone" -> Icons.Rounded.Phone
        "call" -> Icons.Rounded.Call
        "forum" -> Icons.Rounded.Forum
        "contacts" -> Icons.Rounded.Contacts
        "person" -> Icons.Rounded.Person
        "group" -> Icons.Rounded.Group
        "groups" -> Icons.Rounded.Groups
        "people" -> Icons.Rounded.People
        // Food & Hospitality
        "room_service" -> Icons.Rounded.RoomService
        "restaurant" -> Icons.Rounded.Restaurant
        "hotel" -> Icons.Rounded.Hotel
        // Settings & System
        "settings" -> Icons.Rounded.Settings
        "tune" -> Icons.Rounded.Tune
        "build" -> Icons.Rounded.Build
        "security" -> Icons.Rounded.Security
        "lock" -> Icons.Rounded.Lock
        "lock_open" -> Icons.Rounded.LockOpen
        "key" -> Icons.Rounded.Key
        "shield" -> Icons.Rounded.Shield
        // Files & Data
        "folder" -> Icons.Rounded.Folder
        "folder_open" -> Icons.Rounded.FolderOpen
        "cloud" -> Icons.Rounded.Cloud
        "cloud_upload" -> Icons.Rounded.CloudUpload
        "cloud_download" -> Icons.Rounded.CloudDownload
        "upload" -> Icons.Rounded.Upload
        "download" -> Icons.Rounded.Download
        "save" -> Icons.Rounded.Save
        "storage" -> Icons.Rounded.Storage
        "image" -> Icons.Rounded.Image
        "photo" -> Icons.Rounded.Photo
        "photo_library" -> Icons.Rounded.PhotoLibrary
        // Stars & Misc
        "star" -> Icons.Rounded.Star
        "star_border" -> Icons.Rounded.StarBorder
        "favorite" -> Icons.Rounded.Favorite
        "favorite_border" -> Icons.Rounded.FavoriteBorder
        "thumb_up" -> Icons.Rounded.ThumbUp
        "thumb_down" -> Icons.Rounded.ThumbDown
        "military_tech" -> Icons.Rounded.MilitaryTech
        "verified" -> Icons.Rounded.Verified
        "search" -> Icons.Rounded.Search
        "bookmark" -> Icons.Rounded.Bookmark
        "cake" -> Icons.Rounded.Cake
        else -> Icons.Rounded.Info
    }
}

private fun defaultBackgroundForMenuType(type: String): Int {
    return when (type) {
        "tv" -> R.drawable.home_bg_tv
        "education" -> R.drawable.home_bg_education
        "entertainment", "konten" -> R.drawable.home_bg_youtube
        "settings", "app_drawer" -> R.drawable.home_bg_settings
        else -> R.drawable.home_bg_info
    }
}

private fun wrapCarouselIndex(index: Int, size: Int): Int {
    return ((index % size) + size) % size
}

@Composable
private fun SelectedMenuLabel(
    item: HospitalityCarouselItem,
    isSmallScreen: Boolean,
    isUltraCompact: Boolean
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(if (isUltraCompact) 6.dp else if (isSmallScreen) 10.dp else 14.dp))
            .background(Color.Black.copy(alpha = 0.42f))
            .border(
                BorderStroke(1.dp, item.accent.copy(alpha = 0.34f)),
                RoundedCornerShape(if (isUltraCompact) 6.dp else if (isSmallScreen) 10.dp else 14.dp)
            )
            .padding(
                horizontal = if (isUltraCompact) 10.dp else if (isSmallScreen) 14.dp else 20.dp,
                vertical = if (isUltraCompact) 2.dp else if (isSmallScreen) 4.dp else 7.dp
            )
    ) {
        Text(
            text = item.title,
            color = item.textColor,
            fontSize = if (isUltraCompact) 10.sp else if (isSmallScreen) 12.sp else 17.sp,
            fontWeight = FontWeight.ExtraBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            style = TextStyle(
                shadow = Shadow(
                    color = Color.Black.copy(alpha = 0.95f),
                    offset = TextOffset(0f, 1.5f),
                    blurRadius = 6f
                )
            )
        )
        Text(
            text = item.subtitle,
            color = Color.White.copy(alpha = 0.84f),
            fontSize = if (isUltraCompact) 7.sp else if (isSmallScreen) 8.sp else 10.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            style = TextStyle(
                shadow = Shadow(
                    color = Color.Black.copy(alpha = 0.88f),
                    offset = TextOffset(0f, 1.2f),
                    blurRadius = 4f
                )
            )
        )
    }
}

@Composable
private fun CarouselTouchButton(
    direction: Int,
    isSmallScreen: Boolean,
    accent: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val size = if (isSmallScreen) 42.dp else 54.dp
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(Color.Black.copy(alpha = 0.34f))
            .border(1.dp, accent.copy(alpha = 0.42f), CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = if (direction < 0) "‹" else "›",
            color = Color.White,
            fontSize = if (isSmallScreen) 30.sp else 40.sp,
            fontWeight = FontWeight.Light,
            lineHeight = if (isSmallScreen) 30.sp else 40.sp,
            style = TextStyle(
                shadow = Shadow(
                    color = accent.copy(alpha = 0.75f),
                    offset = TextOffset(0f, 0f),
                    blurRadius = 12f
                )
            )
        )
    }
}

@Composable
private fun HospitalityCarouselCard(
    item: HospitalityCarouselItem,
    offset: Int,
    lowEffectMode: Boolean,
    isSmallScreen: Boolean,
    isUltraCompact: Boolean,
    onClick: () -> Unit
) {
    val isActive = offset == 0
    val distance = abs(offset)
    if (lowEffectMode) {
        val scale by animateFloatAsState(
            targetValue = when (distance) {
                0 -> 1.10f
                1 -> 0.92f
                else -> 0.72f
            },
            animationSpec = tween(durationMillis = 160),
            label = "hospitality_carousel_scale_debug_step1"
        )
        val cardWidth by animateDpAsState(
            targetValue = when (distance) {
                0 -> if (isUltraCompact) 96.dp else if (isSmallScreen) 126.dp else 164.dp
                1 -> if (isUltraCompact) 74.dp else if (isSmallScreen) 92.dp else 112.dp
                else -> if (isUltraCompact) 56.dp else if (isSmallScreen) 68.dp else 82.dp
            },
            animationSpec = tween(durationMillis = 160),
            label = "hospitality_carousel_width_debug_step1"
        )
        val iconBoxSize by animateDpAsState(
            targetValue = when (distance) {
                0 -> if (isUltraCompact) 66.dp else if (isSmallScreen) 88.dp else 116.dp
                1 -> if (isUltraCompact) 44.dp else if (isSmallScreen) 56.dp else 72.dp
                else -> if (isUltraCompact) 32.dp else if (isSmallScreen) 40.dp else 50.dp
            },
            animationSpec = tween(durationMillis = 160),
            label = "hospitality_carousel_box_size_debug_step1"
        )
        val iconSize = when (distance) {
            0 -> if (isUltraCompact) 28.dp else if (isSmallScreen) 38.dp else 54.dp
            1 -> if (isUltraCompact) 20.dp else if (isSmallScreen) 26.dp else 36.dp
            else -> if (isUltraCompact) 14.dp else if (isSmallScreen) 20.dp else 26.dp
        }
        val iconPlateSize = when (distance) {
            0 -> if (isUltraCompact) 36.dp else if (isSmallScreen) 48.dp else 62.dp
            1 -> if (isUltraCompact) 24.dp else if (isSmallScreen) 30.dp else 40.dp
            else -> if (isUltraCompact) 16.dp else if (isSmallScreen) 22.dp else 30.dp
        }
        val offsetY by animateDpAsState(
            targetValue = if (isActive) {
                if (isUltraCompact) (-6).dp else if (isSmallScreen) (-8).dp else (-12).dp
            } else {
                if (isUltraCompact) 4.dp else if (isSmallScreen) 6.dp else 10.dp
            },
            animationSpec = tween(durationMillis = 160),
            label = "hospitality_carousel_offset_y_debug_step2"
        )
        val borderWidth by animateDpAsState(
            targetValue = if (isActive) {
                if (isUltraCompact) 2.dp else if (isSmallScreen) 3.dp else 4.dp
            } else {
                1.dp
            },
            animationSpec = tween(durationMillis = 160),
            label = "hospitality_carousel_border_width_debug_step1"
        )
        val borderColor by animateColorAsState(
            targetValue = if (isActive) item.accent else Color.White.copy(alpha = 0.30f),
            animationSpec = tween(durationMillis = 160),
            label = "hospitality_carousel_border_color_debug_step1"
        )
        val cardShape = RoundedCornerShape(if (isActive) (if (isUltraCompact) 10.dp else 16.dp) else (if (isUltraCompact) 8.dp else 12.dp))
        val shadowElevation by animateDpAsState(
            targetValue = if (isActive) {
                if (isUltraCompact) 4.dp else if (isSmallScreen) 6.dp else 8.dp
            } else {
                if (isUltraCompact) 1.dp else if (isSmallScreen) 2.dp else 3.dp
            },
            animationSpec = tween(durationMillis = 160),
            label = "hospitality_carousel_shadow_debug_step3"
        )

        Column(
            modifier = Modifier
                .width(cardWidth)
                .offset(y = offsetY)
                .scale(scale)
                .zIndex(if (isActive) 3f else 1f / (distance + 1))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) { onClick() },
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(iconBoxSize)
                    .shadow(
                        elevation = shadowElevation,
                        shape = cardShape,
                        ambientColor = if (isActive) item.accent.copy(alpha = 0.18f) else Color.Black.copy(alpha = 0.10f),
                        spotColor = if (isActive) item.accent.copy(alpha = 0.22f) else Color.Black.copy(alpha = 0.12f)
                    )
                    .clip(cardShape)
                    .background(
                        if (isActive) Color(0xFF142331) else Color(0xFF101A24)
                    )
                    .border(
                        BorderStroke(
                            width = borderWidth,
                            color = borderColor
                        ),
                        cardShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    item.accent.copy(alpha = if (isActive) 0.16f else 0.08f),
                                    Color(0xFF142331).copy(alpha = if (isActive) 0.96f else 0.92f),
                                    Color(0xFF0F1822)
                                )
                            )
                        )
                )
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.White.copy(alpha = if (isActive) 0.07f else 0.03f),
                                    Color.Transparent,
                                    Color.Black.copy(alpha = if (isActive) 0.14f else 0.08f)
                                )
                            )
                        )
                )
                Box(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = if (isUltraCompact) 3.dp else if (isSmallScreen) 5.dp else 7.dp)
                        .width(if (isActive) iconBoxSize * 0.52f else iconBoxSize * 0.40f)
                        .height(if (isUltraCompact) 2.dp else if (isSmallScreen) 3.dp else 4.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(item.accent.copy(alpha = if (isActive) 0.78f else 0.36f))
                )
                if (item.appIconDrawable != null) {
                    AndroidView(
                        factory = { ctx ->
                            android.widget.ImageView(ctx).apply {
                                scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
                                setImageDrawable(item.appIconDrawable)
                            }
                        },
                        modifier = Modifier
                            .size(iconPlateSize)
                            .offset(y = if (isActive) (-2).dp else 0.dp)
                    )
                } else {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.title,
                        tint = Color.White.copy(alpha = if (isActive) 0.98f else 0.78f),
                        modifier = Modifier
                            .size(iconPlateSize)
                            .offset(y = if (isActive) (-2).dp else 0.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(if (isActive) (if (isUltraCompact) 4.dp else 8.dp) else (if (isUltraCompact) 2.dp else 4.dp)))

            if (!isActive) {
                Text(
                    text = item.title,
                    color = Color.White.copy(alpha = 0.76f),
                    fontSize = if (isUltraCompact) 7.sp else if (isSmallScreen) 8.sp else 10.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        return
    }

    val targetScale = when (distance) {
        0 -> if (lowEffectMode) 1.12f else 1.22f
        1 -> 0.90f
        else -> 0.66f
    }
    val scale by animateFloatAsState(
        targetValue = targetScale,
        animationSpec = if (lowEffectMode) tween(durationMillis = 0) else tween(durationMillis = 220),
        label = "hospitality_carousel_scale"
    )
    val glowAlpha by animateFloatAsState(
        targetValue = if (isActive) if (lowEffectMode) 0.24f else 0.84f else if (lowEffectMode) 0f else 0.18f,
        animationSpec = if (lowEffectMode) tween(durationMillis = 0) else tween(durationMillis = 220),
        label = "hospitality_carousel_glow_alpha"
    )
    val cardWidth by animateDpAsState(
        targetValue = when (distance) {
            0 -> if (isUltraCompact) 96.dp else if (isSmallScreen) 126.dp else 164.dp
            1 -> if (isUltraCompact) 74.dp else if (isSmallScreen) 92.dp else 112.dp
            else -> if (isUltraCompact) 56.dp else if (isSmallScreen) 68.dp else 82.dp
        },
        animationSpec = if (lowEffectMode) tween(durationMillis = 0) else tween(durationMillis = 220),
        label = "hospitality_carousel_width"
    )
    val iconBoxSize by animateDpAsState(
        targetValue = when (distance) {
            0 -> if (isUltraCompact) 66.dp else if (isSmallScreen) 88.dp else 116.dp
            1 -> if (isUltraCompact) 44.dp else if (isSmallScreen) 56.dp else 72.dp
            else -> if (isUltraCompact) 32.dp else if (isSmallScreen) 40.dp else 50.dp
        },
        animationSpec = if (lowEffectMode) tween(durationMillis = 0) else tween(durationMillis = 220),
        label = "hospitality_carousel_box_size"
    )
    val offsetY by animateDpAsState(
        targetValue = if (isActive) (if (isUltraCompact) (-10).dp else if (isSmallScreen) (-16).dp else (-28).dp) else (if (isUltraCompact) 6.dp else if (isSmallScreen) 10.dp else 16.dp),
        animationSpec = if (lowEffectMode) tween(durationMillis = 0) else tween(durationMillis = 220),
        label = "hospitality_carousel_offset_y"
    )
    val borderWidth by animateDpAsState(
        targetValue = if (isActive) (if (isUltraCompact) 2.dp else if (isSmallScreen) 3.dp else 4.dp) else (if (isUltraCompact) 1.dp else if (isSmallScreen) 1.8.dp else 2.5.dp),
        animationSpec = if (lowEffectMode) tween(durationMillis = 0) else tween(durationMillis = 220),
        label = "hospitality_carousel_border_width"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isActive) item.accent else Color.White.copy(alpha = 0.45f),
        animationSpec = if (lowEffectMode) tween(durationMillis = 0) else tween(durationMillis = 220),
        label = "hospitality_carousel_border_color"
    )
    val cornerRadius by animateDpAsState(
        targetValue = if (isActive) (if (isUltraCompact) 10.dp else if (isSmallScreen) 16.dp else 24.dp) else (if (isUltraCompact) 8.dp else if (isSmallScreen) 12.dp else 18.dp),
        animationSpec = if (lowEffectMode) tween(durationMillis = 0) else tween(durationMillis = 220),
        label = "hospitality_carousel_corner_radius"
    )
    val cardShape = RoundedCornerShape(cornerRadius)

    val shadowElevation by animateDpAsState(
        targetValue = if (lowEffectMode) 0.dp else if (isActive) (if (isUltraCompact) 10.dp else if (isSmallScreen) 16.dp else 24.dp) else (if (isUltraCompact) 3.dp else if (isSmallScreen) 5.dp else 7.dp),
        animationSpec = if (lowEffectMode) tween(durationMillis = 0) else tween(durationMillis = 220),
        label = "hospitality_carousel_shadow_elevation"
    )

    val contentAlpha by animateFloatAsState(
        targetValue = if (distance <= 1) 1f else 0f,
        animationSpec = if (lowEffectMode) tween(durationMillis = 0) else tween(durationMillis = 220),
        label = "hospitality_carousel_content_alpha"
    )

    val interactionSource = remember { MutableInteractionSource() }

    Column(
        modifier = Modifier
            .width(cardWidth)
            .offset(y = offsetY)
            .scale(scale)
            .zIndex(if (isActive) 3f else 1f / (distance + 1))
            .clickable(
                interactionSource = interactionSource,
                indication = null
            ) { onClick() },
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(contentAlignment = Alignment.Center) {
            if (isActive) {
                Box(
                    modifier = Modifier
                        .size(iconBoxSize + (if (isUltraCompact) 36.dp else if (isSmallScreen) 54.dp else 78.dp))
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    item.accent.copy(alpha = glowAlpha),
                                    item.accent.copy(alpha = 0.26f),
                                    Color.Transparent
                                )
                            )
                        )
                )
            }

            Box(
                modifier = Modifier
                    .size(iconBoxSize)
                    .clip(cardShape)
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                item.accent.copy(alpha = if (isActive) 0.42f else 0.12f),
                                Color.Black.copy(alpha = if (isActive) 0.64f else 0.34f)
                            )
                        )
                    )
                    .border(
                        BorderStroke(
                            width = borderWidth,
                            color = borderColor
                        ),
                        cardShape
                    )
                    .shadow(
                        elevation = shadowElevation,
                        shape = cardShape,
                        ambientColor = item.accent.copy(alpha = if (isActive) 0.80f else 0.14f),
                        spotColor = item.accent.copy(alpha = if (isActive) 0.95f else 0.18f)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = item.backgroundRes),
                    contentDescription = null,
                    modifier = Modifier
                        .matchParentSize()
                        .alpha(if (lowEffectMode) 0f else if (isActive) 0.42f else 0.18f),
                    contentScale = ContentScale.Crop
                )
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    Color.White.copy(alpha = if (isActive) 0.14f else 0.05f),
                                    Color.Black.copy(alpha = if (isActive) 0.46f else 0.58f)
                                )
                            )
                        )
                )
                if (item.appIconDrawable != null) {
                    AndroidView(
                        factory = { ctx ->
                            android.widget.ImageView(ctx).apply {
                                scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
                                setImageDrawable(item.appIconDrawable)
                            }
                        },
                        modifier = Modifier.size(
                            when (distance) {
                                0 -> if (isUltraCompact) 26.dp else if (isSmallScreen) 34.dp else 48.dp
                                1 -> if (isUltraCompact) 18.dp else if (isSmallScreen) 24.dp else 32.dp
                                else -> if (isUltraCompact) 14.dp else if (isSmallScreen) 18.dp else 24.dp
                            }
                        )
                    )
                } else {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = item.title,
                        tint = Color.White.copy(alpha = if (isActive) 1f else 0.76f),
                        modifier = Modifier.size(
                            when (distance) {
                                0 -> if (isUltraCompact) 26.dp else if (isSmallScreen) 34.dp else 48.dp
                                1 -> if (isUltraCompact) 18.dp else if (isSmallScreen) 24.dp else 32.dp
                                else -> if (isUltraCompact) 14.dp else if (isSmallScreen) 18.dp else 24.dp
                            }
                        )
                    )
                }
            }
        }
        val textSpacerHeight by animateDpAsState(
            targetValue = if (isActive) {
                if (isUltraCompact) 4.dp else if (isSmallScreen) 8.dp else 14.dp
            } else {
                if (isUltraCompact) 2.dp else if (isSmallScreen) 4.dp else 6.dp
            },
            label = "hospitality_carousel_text_spacer"
        )
        Spacer(modifier = Modifier.height(textSpacerHeight))
        
        if (!isActive) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.alpha(contentAlpha)
            ) {
            val titleBgAlpha by animateFloatAsState(
                targetValue = if (isActive) 0.58f else 0.20f,
                label = "hospitality_carousel_title_bg_alpha"
            )
            val titleHorizontalPadding by animateDpAsState(
                targetValue = if (isActive) {
                    if (isUltraCompact) 6.dp else if (isSmallScreen) 8.dp else 12.dp
                } else {
                    if (isUltraCompact) 4.dp else if (isSmallScreen) 5.dp else 8.dp
                },
                label = "hospitality_carousel_title_padding_h"
            )
            val titleVerticalPadding by animateDpAsState(
                targetValue = if (isActive) {
                    if (isUltraCompact) 1.5.dp else if (isSmallScreen) 2.5.dp else 4.dp
                } else {
                    if (isUltraCompact) 1.dp else if (isSmallScreen) 1.5.dp else 2.5.dp
                },
                label = "hospitality_carousel_title_padding_v"
            )
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(if (isUltraCompact) 5.dp else if (isSmallScreen) 7.dp else 10.dp))
                    .background(Color.Black.copy(alpha = titleBgAlpha))
                    .padding(horizontal = titleHorizontalPadding, vertical = titleVerticalPadding)
            ) {
                Text(
                    text = item.title,
                    color = if (isActive) item.accent else Color.White.copy(alpha = 0.76f),
                    fontSize = if (isActive) {
                        if (isUltraCompact) 9.sp else if (isSmallScreen) 12.sp else 16.sp
                    } else {
                        if (isUltraCompact) 7.sp else if (isSmallScreen) 8.sp else 10.sp
                    },
                    fontWeight = FontWeight.ExtraBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = TextStyle(
                        shadow = Shadow(
                            color = Color.Black.copy(alpha = 0.95f),
                            offset = TextOffset(0f, 1.5f),
                            blurRadius = 6f
                        )
                    )
                )
            }
            Text(
                text = item.subtitle,
                color = Color.White.copy(alpha = if (isActive) 0.86f else 0.54f),
                fontSize = if (isActive) {
                    if (isUltraCompact) 7.sp else if (isSmallScreen) 8.sp else 10.sp
                } else {
                    if (isUltraCompact) 5.5.sp else if (isSmallScreen) 6.sp else 7.5.sp
                },
                fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = TextStyle(
                    shadow = Shadow(
                        color = Color.Black.copy(alpha = 0.90f),
                        offset = TextOffset(0f, 1.2f),
                        blurRadius = 4f
                    )
                )
            )
            }
        }
    }
}

@Composable
private fun HomeDialog(
    icon: String,
    title: String,
    message: String,
    primaryText: String,
    secondaryText: String?,
    accentColor: Color,
    onPrimary: () -> Unit,
    onSecondary: () -> Unit,
    onDismiss: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.78f)),
        contentAlignment = Alignment.Center
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xF20B1725)),
            border = BorderStroke(1.dp, accentColor.copy(alpha = 0.42f)),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .width(440.dp)
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(26.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(58.dp)
                        .clip(CircleShape)
                        .background(accentColor.copy(alpha = 0.16f))
                        .border(1.dp, accentColor.copy(alpha = 0.45f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(icon, fontSize = 22.sp, color = Color.White, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text(title, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = message,
                    fontSize = 13.sp,
                    color = Color(0xFFCBD5E1),
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )
                Spacer(modifier = Modifier.height(22.dp))
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = onPrimary,
                        colors = ButtonDefaults.buttonColors(containerColor = accentColor),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                    ) {
                        Text(
                            text = primaryText,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (secondaryText != null) {
                            OutlinedButton(
                                onClick = onSecondary,
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.26f)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(42.dp)
                            ) {
                                Text(
                                    text = secondaryText,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        OutlinedButton(
                            onClick = onDismiss,
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White.copy(alpha = 0.82f)),
                            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.18f)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(42.dp)
                        ) {
                            Text(
                                text = "Tutup",
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun InfoAplikasiDialog(
    macAddress: String,
    ipAddress: String,
    serverUrl: String,
    currentVersionCode: Int,
    currentVersionName: String,
    onDismiss: () -> Unit
) {
    BackHandler {
        onDismiss()
    }
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val configuration = androidx.compose.ui.platform.LocalConfiguration.current
    val isSmallScreen = configuration.screenWidthDp < 760 || configuration.screenHeightDp < 500

    var checkingState by remember { mutableStateOf("idle") } // idle, checking, update_available, no_update, error
    var statusMessage by remember { mutableStateOf("") }

    // Update info if found
    var updateVersionName by remember { mutableStateOf("") }
    var updateVersionCode by remember { mutableIntStateOf(0) }
    var apkUrl by remember { mutableStateOf("") }
    var apkFileName by remember { mutableStateOf("") }
    var changelog by remember { mutableStateOf("") }

    // Downloading state
    var isDownloading by remember { mutableStateOf(false) }
    var downloadProgress by remember { mutableStateOf(0f) }

    val dialogFocusRequester = remember { FocusRequester() }

    suspend fun checkUpdates() {
        checkingState = "checking"
        statusMessage = "Memeriksa pembaruan..."
        delay(800) // visual delay for smoothness
        try {
            if (serverUrl.isBlank()) {
                checkingState = "error"
                statusMessage = "Server URL belum dikonfigurasi."
                return
            }
            val apiService = RetrofitClient.getService(serverUrl)
            val response = apiService.checkUpdate(currentVersionCode)
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null && body.update_available) {
                    updateVersionName = body.version_name ?: ""
                    updateVersionCode = body.version_code ?: 0
                    apkFileName = body.apk_file_name ?: ""
                    apkUrl = resolveUpdateApkUrl(serverUrl, body.apk_url, body.apk_file_name)
                    changelog = body.changelog ?: ""
                    checkingState = "update_available"
                    statusMessage = "Pembaruan tersedia!"
                } else {
                    checkingState = "no_update"
                    statusMessage = "Aplikasi Anda sudah versi terbaru."
                }
            } else {
                checkingState = "error"
                statusMessage = "Gagal memeriksa pembaruan (HTTP ${response.code()})"
            }
        } catch (e: Exception) {
            e.printStackTrace()
            checkingState = "error"
            statusMessage = "Koneksi gagal atau server offline."
        }
    }

    suspend fun startDownload() {
        isDownloading = true
        statusMessage = "Mengunduh pembaruan... 0%"
        try {
            if (apkUrl.isBlank()) {
                isDownloading = false
                checkingState = "error"
                statusMessage = "URL APK kosong dari server."
                return
            }

            val downloadResult = UpdateManager.downloadApk(context, apkUrl) { progress ->
                downloadProgress = progress
                statusMessage = "Mengunduh pembaruan... ${(progress * 100).toInt()}%"
            }
            val downloadedFile = downloadResult.file
            if (downloadedFile != null) {
                statusMessage = "Memasang pembaruan..."
                UpdateManager.installApk(context, downloadedFile)
            } else {
                Toast.makeText(context, "Gagal mengunduh pembaruan.", Toast.LENGTH_LONG).show()
                isDownloading = false
                checkingState = "error"
                statusMessage = "Gagal mengunduh APK: ${downloadResult.errorMessage ?: apkUrl}"
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Terjadi kesalahan saat mengunduh.", Toast.LENGTH_LONG).show()
            isDownloading = false
            checkingState = "error"
            statusMessage = "Terjadi kesalahan saat mengunduh."
        }
    }

    LaunchedEffect(Unit) {
        delay(150)
        try {
            dialogFocusRequester.requestFocus()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    LaunchedEffect(checkingState, isDownloading) {
        if (checkingState != "checking" && !isDownloading) {
            delay(100)
            try {
                dialogFocusRequester.requestFocus()
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
                .width(if (isSmallScreen) 400.dp else 500.dp)
                .padding(if (isSmallScreen) 8.dp else 16.dp)
        ) {
            Column(
                modifier = Modifier
                    .padding(if (isSmallScreen) 16.dp else 26.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Circular Icon header
                Box(
                    modifier = Modifier
                        .size(if (isSmallScreen) 44.dp else 58.dp)
                        .clip(RoundedCornerShape(if (isSmallScreen) 14.dp else 18.dp))
                        .background(Color(0xFFFFE9A6).copy(alpha = 0.13f))
                        .border(1.dp, Color(0xFFFFE9A6).copy(alpha = 0.40f), RoundedCornerShape(if (isSmallScreen) 14.dp else 18.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_home_info),
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(if (isSmallScreen) 22.dp else 30.dp)
                    )
                }
                
                Spacer(modifier = Modifier.height(if (isSmallScreen) 10.dp else 16.dp))
                Text(
                    text = "Informasi Aplikasi",
                    fontSize = if (isSmallScreen) 15.sp else 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(if (isSmallScreen) 12.dp else 20.dp))

                // Detail Grid-like layout
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.Black.copy(alpha = 0.32f), RoundedCornerShape(14.dp))
                        .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(14.dp))
                        .padding(if (isSmallScreen) 10.dp else 14.dp),
                    verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 6.dp else 8.dp)
                ) {
                    InfoRow("Versi Terpasang", "v$currentVersionName ($currentVersionCode)")
                    InfoRow("MAC Address", macAddress)
                    InfoRow("IP Address", ipAddress)
                    InfoRow("URL Server", if (serverUrl.isBlank()) "Belum disetting" else serverUrl)
                }

                Spacer(modifier = Modifier.height(if (isSmallScreen) 14.dp else 22.dp))

                // Action area based on status
                if (checkingState == "checking") {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(
                            color = Color(0xFFFFE9A6),
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(statusMessage, color = Color.White, fontSize = 13.sp)
                    }
                } else if (checkingState == "update_available") {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "Pembaruan Tersedia: v$updateVersionName (Build $updateVersionCode)",
                            color = Color(0xFF86EFAC),
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        if (changelog.isNotBlank()) {
                            Text(
                                text = "Catatan: $changelog",
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                            )
                        } else {
                            Spacer(modifier = Modifier.height(16.dp))
                        }
                        if (apkFileName.isNotBlank()) {
                            Text(
                                text = apkFileName,
                                color = Color.White.copy(alpha = 0.5f),
                                fontSize = 10.sp,
                                textAlign = TextAlign.Center,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 10.dp)
                            )
                        }

                        if (isDownloading) {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                LinearProgressIndicator(
                                    progress = { downloadProgress },
                                    color = Color(0xFFFFE9A6),
                                    trackColor = Color.White.copy(alpha = 0.15f),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(8.dp)
                                        .clip(CircleShape)
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(statusMessage, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                InfoDialogButton(
                                    text = "Perbarui Sekarang",
                                    primary = true,
                                    focusRequester = dialogFocusRequester,
                                    onClick = {
                                        coroutineScope.launch {
                                            startDownload()
                                        }
                                    },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(42.dp)
                                )
                                InfoDialogButton(
                                    text = "Batal",
                                    onClick = { checkingState = "idle" },
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(42.dp)
                                )
                            }
                        }
                    }
                } else {
                    // Idle, No Update, or Error states
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        if (checkingState == "no_update") {
                            Text(
                                text = statusMessage,
                                color = Color(0xFF86EFAC),
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(bottom = 16.dp)
                            )
                        } else if (checkingState == "error") {
                            Text(
                                text = statusMessage,
                                color = Color(0xFFFCA5A5),
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(bottom = 16.dp)
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            InfoDialogButton(
                                text = "Cek Pembaruan",
                                primary = true,
                                focusRequester = dialogFocusRequester,
                                onClick = {
                                    coroutineScope.launch {
                                        checkUpdates()
                                    }
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(44.dp)
                            )
                            InfoDialogButton(
                                text = "Tutup",
                                onClick = onDismiss,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(44.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun resolveUpdateApkUrl(serverUrl: String, apiUrl: String?, fileName: String?): String {
    val cleanServerUrl = serverUrl.trim().trimEnd('/')
    if (!fileName.isNullOrBlank() && cleanServerUrl.isNotBlank()) {
        return "$cleanServerUrl/uploads/apk/$fileName"
    }

    val candidate = apiUrl.orEmpty().trim()
    if (candidate.isBlank()) return ""

    return try {
        val uri = URI(candidate)
        val host = uri.host.orEmpty()
        if ((host == "localhost" || host == "127.0.0.1" || host == "0.0.0.0") && cleanServerUrl.isNotBlank()) {
            "$cleanServerUrl${uri.rawPath.orEmpty()}"
        } else {
            candidate
        }
    } catch (e: Exception) {
        candidate
    }
}

private fun isConfirmKey(key: Key): Boolean {
    return key == Key.DirectionCenter || key == Key.Enter || key == Key.NumPadEnter
}

@Composable
private fun StbNameDialog(
    currentName: String,
    fallbackName: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    RemoteKeyboardDialog(
        title = "Nama STB",
        helperText = "Tahan OK selama 3 detik dari home untuk membuka menu ini. Nama yang disimpan akan tampil di home dan web admin.",
        initialValue = currentName,
        onCommit = { onSave(it.trim()) },
        onDismiss = onDismiss,
        obscureText = false,
        maxLength = 32,
        keyboardTitle = "",
        blankPreviewText = fallbackName,
        supportingText = { value ->
            if (value.isBlank()) "Kosong = pakai nama default perangkat" else "${value.length}/32 karakter"
        },
        layoutProvider = KeyboardLayoutProvider { _, symbolMode ->
            if (symbolMode) {
                listOf(
                    listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0"),
                    listOf("-", "_", ".", "/", "\\", ":", "@", "#"),
                    listOf("(", ")", "[", "]", "{", "}", "!", "?")
                ).map { row -> row.map { value -> RemoteKeyboardKeySpec(value) } }
            } else {
                listOf(
                    "ABCDEFGH".map { value -> RemoteKeyboardKeySpec(value.toString()) },
                    "IJKLMNOP".map { value -> RemoteKeyboardKeySpec(value.toString()) },
                    "QRSTUVWX".map { value -> RemoteKeyboardKeySpec(value.toString()) },
                    "YZ".map { value -> RemoteKeyboardKeySpec(value.toString(), weight = 1.4f) } +
                        ('0'..'9').map { value -> RemoteKeyboardKeySpec(value.toString()) } +
                        listOf(RemoteKeyboardKeySpec("-", weight = 1.2f), RemoteKeyboardKeySpec("_", weight = 1.2f), RemoteKeyboardKeySpec(".", weight = 1.2f))
                )
            }
        },
        clearLabel = "Reset"
    )
}

@Composable
private fun InfoDialogButton(
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

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp, fontWeight = FontWeight.Medium)
        Text(text = value, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun HomeScreenOverlays(
    overlays: List<HomeOverlayItem>,
    deviceName: String,
    channelCount: Int,
    timeString: String,
    dateString: String,
    weatherText: String,
    appLogoUrl: String,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        overlays.forEach { overlay ->
            HomeOverlayWidget(
                overlay = overlay,
                deviceName = deviceName,
                channelCount = channelCount,
                timeString = timeString,
                dateString = dateString,
                weatherText = weatherText,
                appLogoUrl = appLogoUrl,
            )
        }
    }
}

@Composable
private fun HomeOverlayWidget(
    overlay: HomeOverlayItem,
    deviceName: String,
    channelCount: Int,
    timeString: String,
    dateString: String,
    weatherText: String,
    appLogoUrl: String,
) {
    val configuration = androidx.compose.ui.platform.LocalConfiguration.current
    val screenWidth = configuration.screenWidthDp
    val screenHeight = configuration.screenHeightDp
    val isSmallScreen = screenWidth < 760 || screenHeight < 500
    val isUltraCompact = screenWidth < 600 || screenHeight < 400

    // Scale factor: 1.0 = normal (large TV), 0.75 = small, 0.55 = ultracompact
    val scaleFactor = when {
        isUltraCompact -> 0.55f
        isSmallScreen -> 0.75f
        else -> 1.0f
    }

    val alignment = when (overlay.position) {
        HomeOverlayPosition.TOP_LEFT -> Alignment.TopStart
        HomeOverlayPosition.TOP_CENTER -> Alignment.TopCenter
        HomeOverlayPosition.TOP_RIGHT -> Alignment.TopEnd
        HomeOverlayPosition.MIDDLE_LEFT -> Alignment.CenterStart
        HomeOverlayPosition.MIDDLE_CENTER -> Alignment.Center
        HomeOverlayPosition.MIDDLE_RIGHT -> Alignment.CenterEnd
        HomeOverlayPosition.BOTTOM_LEFT -> Alignment.BottomStart
        HomeOverlayPosition.BOTTOM_CENTER -> Alignment.BottomCenter
        HomeOverlayPosition.BOTTOM_RIGHT -> Alignment.BottomEnd
    }

    val textColor = try {
        Color(android.graphics.Color.parseColor(overlay.textColor.ifBlank { "#FFFFFF" }))
    } catch (_: Exception) { Color.White }

    val bgColor = if (overlay.backgroundColor.isNotBlank()) {
        try { Color(java.lang.Long.parseLong(overlay.backgroundColor.removePrefix("#"), 16).toInt()) }
        catch (_: Exception) { Color.Transparent }
    } else Color.Transparent

    val fontWeight = when (overlay.fontWeight) {
        "bold" -> FontWeight.Bold
        "extrabold" -> FontWeight.ExtraBold
        else -> FontWeight.Normal
    }

    val displayText = when (overlay.type) {
        HomeOverlayType.TEXT -> overlay.text
        HomeOverlayType.CLOCK -> timeString
        HomeOverlayType.DATE -> dateString
        HomeOverlayType.WEATHER -> weatherText
        HomeOverlayType.DEVICE_NAME -> deviceName
        HomeOverlayType.CHANNEL_COUNT -> "$channelCount Saluran"
        HomeOverlayType.LOGO -> null
        HomeOverlayType.APP_LOGO -> null
    }

    // Resolve logo URL: APP_LOGO uses homeExperience.logoUrl, LOGO uses overlay.imageUrl
    val resolvedLogoUrl = when (overlay.type) {
        HomeOverlayType.APP_LOGO -> appLogoUrl
        HomeOverlayType.LOGO -> overlay.imageUrl
        else -> ""
    }

    // Scale font size and offsets based on screen size
    val scaledFontSize = (overlay.textSize * scaleFactor).sp
    val scaledOffsetX = (overlay.offsetX * scaleFactor).dp
    val scaledOffsetY = (overlay.offsetY * scaleFactor).dp
    val scaledPaddingH = (overlay.paddingH * scaleFactor).dp
    val scaledPaddingV = (overlay.paddingV * scaleFactor).dp
    val scaledCornerRadius = (overlay.cornerRadius * scaleFactor).dp
    val scaledImageWidth = (overlay.imageWidth * scaleFactor).dp
    val scaledImageHeight = (overlay.imageHeight * scaleFactor).dp

    Box(
        modifier = Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .padding(
                horizontal = if (isUltraCompact) 12.dp else if (isSmallScreen) 18.dp else 34.dp,
                vertical = if (isUltraCompact) 6.dp else if (isSmallScreen) 10.dp else 18.dp
            ),
        contentAlignment = alignment
    ) {
        Box(
            modifier = Modifier
                .offset(x = scaledOffsetX, y = scaledOffsetY)
                .clip(RoundedCornerShape(scaledCornerRadius))
                .background(bgColor)
                .padding(horizontal = scaledPaddingH, vertical = scaledPaddingV)
        ) {
            if ((overlay.type == HomeOverlayType.LOGO || overlay.type == HomeOverlayType.APP_LOGO) && resolvedLogoUrl.isNotBlank()) {
                AsyncImage(
                    model = resolvedLogoUrl,
                    contentDescription = "Overlay logo",
                    modifier = Modifier
                        .width(scaledImageWidth)
                        .height(scaledImageHeight)
                        .shadow(12.dp, RoundedCornerShape(scaledCornerRadius)),
                    contentScale = ContentScale.Fit
                )
            } else if (overlay.type == HomeOverlayType.APP_LOGO) {
                // Fallback to built-in drawable when no logoUrl configured
                Image(
                    painter = painterResource(id = R.drawable.ic_global_iptv),
                    contentDescription = "App Logo",
                    modifier = Modifier
                        .width(scaledImageWidth)
                        .height(scaledImageHeight)
                        .shadow(12.dp, RoundedCornerShape(scaledCornerRadius)),
                    contentScale = ContentScale.Fit
                )
            } else if (displayText != null && displayText.isNotBlank()) {
                Text(
                    text = displayText,
                    color = textColor,
                    fontSize = scaledFontSize,
                    fontWeight = fontWeight,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
