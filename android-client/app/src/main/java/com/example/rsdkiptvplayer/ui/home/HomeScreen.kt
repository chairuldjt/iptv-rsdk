package com.example.rsdkiptvplayer.ui.home

import androidx.activity.compose.BackHandler

import android.media.AudioAttributes
import android.media.SoundPool
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
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.zIndex
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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
import com.example.rsdkiptvplayer.R
import com.example.rsdkiptvplayer.ui.player.PlayerViewModel
import kotlinx.coroutines.delay
import kotlin.math.abs
import java.text.SimpleDateFormat
import java.util.*
import android.widget.Toast
import com.example.rsdkiptvplayer.util.UpdateManager
import com.example.rsdkiptvplayer.data.api.RetrofitClient
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
    onNavigateToSettings: (activeTab: Int) -> Unit,
    playerViewModel: PlayerViewModel = viewModel()
) {
    val context = LocalContext.current
    val app = context.applicationContext as com.example.rsdkiptvplayer.IptvApplication
    val dataStoreManager = app.dataStoreManager

    val channels by playerViewModel.channels.collectAsState()
    val channelsLoading by playerViewModel.isLoading.collectAsState()
    val serverUrl by dataStoreManager.serverUrlFlow.collectAsState(initial = "")
    val educationPath by dataStoreManager.educationVideoPathFlow.collectAsState(initial = null)
    val educationSource by dataStoreManager.educationSourceFlow.collectAsState(initial = null)
    val educationPlaybackMode by dataStoreManager.educationPlaybackModeFlow.collectAsState(initial = null)

    var resolvedDeviceId by remember { mutableStateOf("STB-RSDK-DEVICE") }
    var macAddress by remember { mutableStateOf("Tidak tersedia") }
    var localIpAddress by remember { mutableStateOf("127.0.0.1") }
    var timeString by remember { mutableStateOf("") }
    var dateString by remember { mutableStateOf("") }
    var versionText by remember { mutableStateOf("") }
    var currentVersionName by remember { mutableStateOf("") }
    var currentVersionCode by remember { mutableIntStateOf(0) }
    var showInfoDialog by remember { mutableStateOf(false) }
    val menuFocusRequester = remember { FocusRequester() }

    LaunchedEffect(showInfoDialog) {
        if (!showInfoDialog) {
            delay(100)
            try {
                menuFocusRequester.requestFocus()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    var selectedHomeBackground by remember { mutableIntStateOf(R.drawable.home_bg_tv) }

    LaunchedEffect(Unit) {
        resolvedDeviceId = dataStoreManager.getDeviceId()
        macAddress = app.repository.getMacAddress() ?: "Tidak tersedia"
        localIpAddress = app.repository.getLocalIpAddress()
        currentVersionCode = UpdateManager.getCurrentVersionCode(context)
        currentVersionName = UpdateManager.getCurrentVersionName(context)
        versionText = "v$currentVersionName ($currentVersionCode)"
    }

    LaunchedEffect(Unit) {
        while (true) {
            val cal = Calendar.getInstance()
            timeString = SimpleDateFormat("HH:mm", Locale.getDefault()).format(cal.time)
            dateString = SimpleDateFormat("EEEE, d MMMM yyyy", Locale.getDefault()).format(cal.time)
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
        Crossfade(
            targetState = selectedHomeBackground,
            animationSpec = tween(durationMillis = 520),
            label = "home_selection_background"
        ) { backgroundRes ->
            Image(
                painter = painterResource(id = backgroundRes),
                contentDescription = "Hospitality menu background",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        }

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

        val configuration = androidx.compose.ui.platform.LocalConfiguration.current
        val isSmallScreen = configuration.screenWidthDp < 760 || configuration.screenHeightDp < 500

        Column(
            modifier = Modifier
                .fillMaxSize()
                .safeDrawingPadding()
                .padding(
                    horizontal = if (isSmallScreen) 18.dp else 34.dp,
                    vertical = if (isSmallScreen) 10.dp else 18.dp
                )
        ) {
            HospitalityHeader(
                deviceId = resolvedDeviceId,
                ipAddress = localIpAddress,
                channelCount = channels.size,
                time = timeString,
                date = dateString,
                version = versionText,
                weather = weatherText
            )

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
                onSettingsClick = { onNavigateToSettings(0) },
                onInfoClick = { showInfoDialog = true },
                menuFocusRequester = menuFocusRequester,
                onSelectionChanged = { item ->
                    selectedHomeBackground = item.backgroundRes
                }
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
    }
}

@Composable
private fun HospitalityHeader(
    deviceId: String,
    ipAddress: String,
    channelCount: Int,
    time: String,
    date: String,
    version: String,
    weather: String
) {
    val configuration = androidx.compose.ui.platform.LocalConfiguration.current
    val isSmallScreen = configuration.screenWidthDp < 760 || configuration.screenHeightDp < 500

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        // Left column
        Column(
            modifier = Modifier.weight(1f),
            horizontalAlignment = Alignment.Start,
            verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 2.dp else 4.dp)
        ) {
            Text(
                text = "Selamat Datang",
                color = Color.White,
                fontSize = if (isSmallScreen) 13.sp else 17.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "Premium IPTV Hospitality",
                color = Color(0xFFE7D8A0),
                fontSize = if (isSmallScreen) 9.sp else 12.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        // Center column (only if not small screen)
        if (!isSmallScreen) {
            val isMediumHeight = configuration.screenHeightDp < 600
            Column(
                modifier = Modifier.weight(1.2f),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_global_iptv),
                    contentDescription = "Hospitality IPTV",
                    modifier = Modifier
                        .size(if (isMediumHeight) 48.dp else 72.dp)
                        .shadow(12.dp, RoundedCornerShape(16.dp))
                )
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
                fontSize = if (isSmallScreen) 22.sp else 30.sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = date,
                color = Color.White.copy(alpha = 0.82f),
                fontSize = if (isSmallScreen) 8.sp else 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(if (isSmallScreen) 2.dp else 4.dp))
            Text(
                text = weather,
                color = Color(0xFFFFE9A6),
                fontSize = if (isSmallScreen) 8.sp else 10.sp,
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
    onSettingsClick: () -> Unit,
    onInfoClick: () -> Unit,
    menuFocusRequester: FocusRequester,
    onSelectionChanged: (HospitalityCarouselItem) -> Unit
) {
    val context = LocalContext.current
    val configuration = androidx.compose.ui.platform.LocalConfiguration.current
    val isSmallScreen = configuration.screenWidthDp < 760 || configuration.screenHeightDp < 500

    var selectedIndex by remember { mutableIntStateOf(2) }
    var dragAmount by remember { mutableFloatStateOf(0f) }
    var hasPlayedSelectionSound by remember { mutableStateOf(false) }
    val carouselFocusRequester = menuFocusRequester
    val app = context.applicationContext as com.example.rsdkiptvplayer.IptvApplication
    val muteSelectionSound by app.dataStoreManager.muteSelectionSoundFlow.collectAsState(initial = false)
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
    val menuItems = listOf(
        HospitalityCarouselItem(
            iconRes = R.drawable.ic_home_education,
            title = "EDUKASI",
            subtitle = when {
                educationSource == null -> "Memuat..."
                educationSource == "web" -> if (educationPlaybackMode == "stream") "Web Streaming" else "Web Repository"
                educationPath == null -> "Memuat..."
                educationPath.isBlank() -> "SMB belum disetting"
                else -> "Video RS"
            },
            accent = Color(0xFF86EFAC),
            backgroundRes = R.drawable.home_bg_education,
            action = onEducationClick
        ),
        HospitalityCarouselItem(
            iconRes = R.drawable.ic_home_services,
            title = "LAYANAN",
            subtitle = "Informasi RS",
            accent = Color(0xFFE7D8A0),
            backgroundRes = R.drawable.home_bg_services,
            action = onServiceClick
        ),
        HospitalityCarouselItem(
            iconRes = R.drawable.ic_home_tv,
            title = "TV CHANNEL",
            subtitle = "$channelsCount saluran",
            accent = Color(0xFFFFE9A6),
            backgroundRes = R.drawable.home_bg_tv,
            action = onTvClick
        ),
        HospitalityCarouselItem(
            iconRes = R.drawable.ic_home_media,
            title = "HIBURAN",
            subtitle = "Konten & Musik",
            accent = Color(0xFFFF9A76),
            backgroundRes = R.drawable.home_bg_youtube,
            action = onEntertainmentClick
        ),
        HospitalityCarouselItem(
            iconRes = R.drawable.ic_home_info,
            title = "INFO APLIKASI",
            subtitle = "Cek Pembaruan",
            accent = Color(0xFFC084FC),
            backgroundRes = R.drawable.home_bg_info,
            action = onInfoClick
        ),
        HospitalityCarouselItem(
            iconRes = R.drawable.ic_home_settings,
            title = "SETTING",
            subtitle = "Sistem",
            accent = Color(0xFF7DD3FC),
            backgroundRes = R.drawable.home_bg_settings,
            action = onSettingsClick
        )
    )

    DisposableEffect(Unit) {
        selectionSoundId = soundPool.load(context, R.raw.home_selection_chime, 1)
        onDispose {
            soundPool.release()
        }
    }

    LaunchedEffect(Unit) {
        carouselFocusRequester.requestFocus()
    }

    LaunchedEffect(selectedIndex, selectionSoundId) {
        onSelectionChanged(menuItems[selectedIndex])
        if (!hasPlayedSelectionSound) {
            hasPlayedSelectionSound = true
            return@LaunchedEffect
        }
        if (selectionSoundId != 0 && !muteSelectionSound) {
            soundPool.play(selectionSoundId, 0.38f, 0.42f, 1, 0, 1.0f)
        }
    }

    fun moveSelection(delta: Int) {
        selectedIndex = wrapCarouselIndex(selectedIndex + delta, menuItems.size)
        carouselFocusRequester.requestFocus()
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(if (isSmallScreen) 140.dp else 190.dp)
                .focusRequester(carouselFocusRequester)
                .focusable()
                .onPreviewKeyEvent { keyEvent ->
                    if (keyEvent.type != KeyEventType.KeyDown) {
                        return@onPreviewKeyEvent false
                    }

                    when (keyEvent.key) {
                        Key.DirectionLeft -> {
                            moveSelection(-1)
                            true
                        }
                        Key.DirectionRight -> {
                            moveSelection(1)
                            true
                        }
                        Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> {
                            menuItems[selectedIndex].action()
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
                    horizontal = if (isSmallScreen) 12.dp else 24.dp,
                    vertical = if (isSmallScreen) 2.dp else 4.dp
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

            val offsets = if (isSmallScreen) listOf(-1, 0, 1) else listOf(-2, -1, 0, 1, 2)
            Row(
                horizontalArrangement = Arrangement.spacedBy(
                    if (isSmallScreen) 10.dp else 18.dp,
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
                        isSmallScreen = isSmallScreen,
                        onClick = {
                            if (offset == 0) {
                                item.action()
                            } else {
                                selectedIndex = itemIndex
                                carouselFocusRequester.requestFocus()
                            }
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(if (isSmallScreen) 4.dp else 8.dp))
        SelectedMenuLabel(
            item = menuItems[selectedIndex],
            isSmallScreen = isSmallScreen
        )
        Spacer(modifier = Modifier.height(if (isSmallScreen) 8.dp else 12.dp))
        Row(
            horizontalArrangement = Arrangement.spacedBy(7.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            menuItems.indices.forEach { index ->
                Box(
                    modifier = Modifier
                        .width(if (index == selectedIndex) 22.dp else 7.dp)
                        .height(7.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            if (index == selectedIndex) menuItems[selectedIndex].accent
                            else Color.White.copy(alpha = 0.28f)
                        )
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Gunakan kiri/kanan remote untuk memutar menu, OK untuk memilih",
            color = Color.White.copy(alpha = 0.62f),
            fontSize = if (isSmallScreen) 8.sp else 10.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

private data class HospitalityCarouselItem(
    val iconRes: Int,
    val title: String,
    val subtitle: String,
    val accent: Color,
    val backgroundRes: Int,
    val action: () -> Unit
)

private fun wrapCarouselIndex(index: Int, size: Int): Int {
    return ((index % size) + size) % size
}

@Composable
private fun SelectedMenuLabel(
    item: HospitalityCarouselItem,
    isSmallScreen: Boolean
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(if (isSmallScreen) 10.dp else 14.dp))
            .background(Color.Black.copy(alpha = 0.42f))
            .border(
                BorderStroke(1.dp, item.accent.copy(alpha = 0.34f)),
                RoundedCornerShape(if (isSmallScreen) 10.dp else 14.dp)
            )
            .padding(
                horizontal = if (isSmallScreen) 14.dp else 20.dp,
                vertical = if (isSmallScreen) 4.dp else 7.dp
            )
    ) {
        Text(
            text = item.title,
            color = item.accent,
            fontSize = if (isSmallScreen) 12.sp else 17.sp,
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
            fontSize = if (isSmallScreen) 8.sp else 10.sp,
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
    isSmallScreen: Boolean,
    onClick: () -> Unit
) {
    val isActive = offset == 0
    val distance = abs(offset)
    val scale by animateFloatAsState(
        targetValue = when (distance) {
            0 -> 1.22f
            1 -> 0.90f
            else -> 0.66f
        },
        label = "hospitality_carousel_scale"
    )
    val glowAlpha by animateFloatAsState(
        targetValue = if (isActive) 0.84f else 0.18f,
        label = "hospitality_carousel_glow_alpha"
    )
    val cardWidth by animateDpAsState(
        targetValue = when (distance) {
            0 -> if (isSmallScreen) 126.dp else 164.dp
            1 -> if (isSmallScreen) 92.dp else 112.dp
            else -> if (isSmallScreen) 68.dp else 82.dp
        },
        label = "hospitality_carousel_width"
    )
    val iconBoxSize by animateDpAsState(
        targetValue = when (distance) {
            0 -> if (isSmallScreen) 88.dp else 116.dp
            1 -> if (isSmallScreen) 56.dp else 72.dp
            else -> if (isSmallScreen) 40.dp else 50.dp
        },
        label = "hospitality_carousel_box_size"
    )
    val offsetY by animateDpAsState(
        targetValue = if (isActive) (if (isSmallScreen) (-16).dp else (-28).dp) else (if (isSmallScreen) 10.dp else 16.dp),
        label = "hospitality_carousel_offset_y"
    )
    val borderWidth by animateDpAsState(
        targetValue = if (isActive) (if (isSmallScreen) 3.dp else 4.dp) else (if (isSmallScreen) 1.8.dp else 2.5.dp),
        label = "hospitality_carousel_border_width"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isActive) item.accent else Color.White.copy(alpha = 0.45f),
        label = "hospitality_carousel_border_color"
    )
    val cornerRadius by animateDpAsState(
        targetValue = if (isActive) (if (isSmallScreen) 16.dp else 24.dp) else (if (isSmallScreen) 12.dp else 18.dp),
        label = "hospitality_carousel_corner_radius"
    )
    val cardShape = RoundedCornerShape(cornerRadius)

    val shadowElevation by animateDpAsState(
        targetValue = if (isActive) (if (isSmallScreen) 16.dp else 24.dp) else (if (isSmallScreen) 5.dp else 7.dp),
        label = "hospitality_carousel_shadow_elevation"
    )

    val contentAlpha by animateFloatAsState(
        targetValue = if (distance <= 1) 1f else 0f,
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
                        .size(iconBoxSize + (if (isSmallScreen) 54.dp else 78.dp))
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
                        .alpha(if (isActive) 0.42f else 0.18f),
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
                Icon(
                    painter = painterResource(id = item.iconRes),
                    contentDescription = item.title,
                    tint = Color.White.copy(alpha = if (isActive) 1f else 0.76f),
                    modifier = Modifier.size(
                        when (distance) {
                            0 -> if (isSmallScreen) 34.dp else 48.dp
                            1 -> if (isSmallScreen) 24.dp else 32.dp
                            else -> if (isSmallScreen) 18.dp else 24.dp
                        }
                    )
                )
            }
        }
        val textSpacerHeight by animateDpAsState(
            targetValue = if (isActive) (if (isSmallScreen) 8.dp else 14.dp) else (if (isSmallScreen) 4.dp else 6.dp),
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
                    if (isSmallScreen) 8.dp else 12.dp
                } else {
                    if (isSmallScreen) 5.dp else 8.dp
                },
                label = "hospitality_carousel_title_padding_h"
            )
            val titleVerticalPadding by animateDpAsState(
                targetValue = if (isActive) {
                    if (isSmallScreen) 2.5.dp else 4.dp
                } else {
                    if (isSmallScreen) 1.5.dp else 2.5.dp
                },
                label = "hospitality_carousel_title_padding_v"
            )
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(if (isSmallScreen) 7.dp else 10.dp))
                    .background(Color.Black.copy(alpha = titleBgAlpha))
                    .padding(horizontal = titleHorizontalPadding, vertical = titleVerticalPadding)
            ) {
                Text(
                    text = item.title,
                    color = if (isActive) item.accent else Color.White.copy(alpha = 0.76f),
                    fontSize = if (isActive) {
                        if (isSmallScreen) 12.sp else 16.sp
                    } else {
                        if (isSmallScreen) 8.sp else 10.sp
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
                    if (isSmallScreen) 8.sp else 10.sp
                } else {
                    if (isSmallScreen) 6.sp else 7.5.sp
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
