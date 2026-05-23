package com.example.rsdkiptvplayer.ui.home

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
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
import java.net.URI

@Composable
fun HomeScreen(
    onNavigateToPlayer: () -> Unit,
    onNavigateToEducation: () -> Unit,
    onNavigateToSettings: (activeTab: Int) -> Unit,
    playerViewModel: PlayerViewModel = viewModel()
) {
    val context = LocalContext.current
    val app = context.applicationContext as com.example.rsdkiptvplayer.IptvApplication
    val dataStoreManager = app.dataStoreManager

    val channels by playerViewModel.channels.collectAsState()
    val serverUrl by dataStoreManager.serverUrlFlow.collectAsState(initial = "")
    val educationPath by dataStoreManager.educationVideoPathFlow.collectAsState(initial = "")

    var resolvedDeviceId by remember { mutableStateOf("STB-RSDK-DEVICE") }
    var localIpAddress by remember { mutableStateOf("127.0.0.1") }
    var timeString by remember { mutableStateOf("") }
    var dateString by remember { mutableStateOf("") }
    var versionText by remember { mutableStateOf("") }
    var currentVersionName by remember { mutableStateOf("") }
    var currentVersionCode by remember { mutableIntStateOf(0) }
    var showInfoDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        resolvedDeviceId = dataStoreManager.getDeviceId()
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

    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(id = R.drawable.kariadi_home_bg),
            contentDescription = "RSUP Dr. Kariadi",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

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
                .padding(horizontal = 34.dp, vertical = 18.dp)
        ) {
            HospitalityHeader(
                deviceId = resolvedDeviceId,
                ipAddress = localIpAddress,
                channelCount = channels.size,
                time = timeString,
                date = dateString,
                version = versionText
            )

            Spacer(modifier = Modifier.weight(1f))

                HospitalityMenuBar(
                    channelsCount = channels.size,
                    serverUrl = serverUrl,
                    educationPath = educationPath,
                    onEducationClick = {
                        if (educationPath.isBlank()) {
                            Toast.makeText(context, "Video edukasi belum disetting.", Toast.LENGTH_SHORT).show()
                        } else {
                            onNavigateToEducation()
                        }
                    },
                    onTvClick = {
                        if (channels.isEmpty()) {
                            Toast.makeText(context, "Saluran TV belum tersedia.", Toast.LENGTH_SHORT).show()
                        } else {
                            onNavigateToPlayer()
                        }
                    },
                    onServiceClick = {
                        Toast.makeText(context, "Layanan belum tersedia.", Toast.LENGTH_SHORT).show()
                    },
                    onYoutubeClick = {
                        Toast.makeText(context, "YouTube belum tersedia.", Toast.LENGTH_SHORT).show()
                    },
                    onSettingsClick = { onNavigateToSettings(0) },
                    onInfoClick = { showInfoDialog = true }
                )
        }

        if (showInfoDialog) {
            InfoAplikasiDialog(
                deviceId = resolvedDeviceId,
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
    version: String
) {
    Box(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.align(Alignment.TopStart),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = "Selamat Datang",
                color = Color.White,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "RSUP Dr. Kariadi Semarang",
                color = Color(0xFFE7D8A0),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(6.dp))
            InfoChip("IP $ipAddress")
            InfoChip("${channelCount} saluran tersedia")
            InfoChip("ID ${deviceId.takeLast(12)}")
            if (version.isNotBlank()) {
                InfoChip("Ver $version")
            }
        }

        Column(
            modifier = Modifier.align(Alignment.TopCenter),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Image(
                painter = painterResource(id = R.drawable.ic_kariadi_hospitality_logo),
                contentDescription = "Kariadi IPTV",
                modifier = Modifier
                    .size(72.dp)
                    .shadow(12.dp, RoundedCornerShape(16.dp))
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "RSUP Dr. Kariadi",
                color = Color(0xFFFFE9A6),
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 0.5.sp
            )
            Text(
                text = "Rujukan Nasional • Kelas A • Pendidikan",
                color = Color.White.copy(alpha = 0.88f),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 1.4.sp
            )
        }

        Column(
            modifier = Modifier.align(Alignment.TopEnd),
            horizontalAlignment = Alignment.End
        ) {
            Text(
                text = time,
                color = Color.White,
                fontSize = 30.sp,
                fontWeight = FontWeight.ExtraBold
            )
            Text(
                text = date,
                color = Color.White.copy(alpha = 0.82f),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun InfoChip(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(18.dp))
            .background(Color.Black.copy(alpha = 0.25f))
            .border(1.dp, Color.White.copy(alpha = 0.13f), RoundedCornerShape(18.dp))
            .padding(horizontal = 11.dp, vertical = 5.dp)
    ) {
        Text(
            text = text,
            color = Color.White.copy(alpha = 0.84f),
            fontSize = 10.sp,
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
    educationPath: String,
    onEducationClick: () -> Unit,
    onTvClick: () -> Unit,
    onServiceClick: () -> Unit,
    onYoutubeClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onInfoClick: () -> Unit
) {
    var selectedIndex by remember { mutableIntStateOf(2) }
    var dragAmount by remember { mutableFloatStateOf(0f) }
    val carouselFocusRequester = remember { FocusRequester() }
    val menuItems = listOf(
        HospitalityCarouselItem(
            icon = "EDU",
            title = "EDUKASI",
            subtitle = if (educationPath.isBlank()) "Set path" else "Video RS",
            accent = Color(0xFF86EFAC),
            action = onEducationClick
        ),
        HospitalityCarouselItem(
            icon = "✚",
            title = "LAYANAN",
            subtitle = "Informasi RS",
            accent = Color(0xFFE7D8A0),
            action = onServiceClick
        ),
        HospitalityCarouselItem(
            icon = "TV",
            title = "TV CHANNEL",
            subtitle = "$channelsCount saluran",
            accent = Color(0xFFFFE9A6),
            action = onTvClick
        ),
        HospitalityCarouselItem(
            icon = "YT",
            title = "YOUTUBE",
            subtitle = "Dikunci",
            accent = Color(0xFFFF4444),
            action = onYoutubeClick
        ),
        HospitalityCarouselItem(
            icon = "ℹ",
            title = "INFO APLIKASI",
            subtitle = "Cek Pembaruan",
            accent = Color(0xFFC084FC),
            action = onInfoClick
        ),
        HospitalityCarouselItem(
            icon = "⚙",
            title = "SETTING",
            subtitle = "Sistem",
            accent = Color(0xFF7DD3FC),
            action = onSettingsClick
        )
    )

    LaunchedEffect(Unit) {
        carouselFocusRequester.requestFocus()
    }

    fun moveSelection(delta: Int) {
        selectedIndex = wrapCarouselIndex(selectedIndex + delta, menuItems.size)
        carouselFocusRequester.requestFocus()
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(190.dp)
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
                .padding(horizontal = 24.dp, vertical = 4.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(18.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                listOf(-2, -1, 0, 1, 2).forEach { offset ->
                    val itemIndex = wrapCarouselIndex(selectedIndex + offset, menuItems.size)
                    val item = menuItems[itemIndex]
                    HospitalityCarouselCard(
                        item = item,
                        offset = offset,
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

        Spacer(modifier = Modifier.height(0.dp))
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
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

private data class HospitalityCarouselItem(
    val icon: String,
    val title: String,
    val subtitle: String,
    val accent: Color,
    val action: () -> Unit
)

private fun wrapCarouselIndex(index: Int, size: Int): Int {
    return ((index % size) + size) % size
}

@Composable
private fun HospitalityCarouselCard(
    item: HospitalityCarouselItem,
    offset: Int,
    onClick: () -> Unit
) {
    val isActive = offset == 0
    val distance = abs(offset)
    val scale by animateFloatAsState(
        targetValue = when (distance) {
            0 -> 1.12f
            1 -> 0.88f
            else -> 0.72f
        },
        label = "hospitality_carousel_scale"
    )
    val cardWidth = when (distance) {
        0 -> 150.dp
        1 -> 112.dp
        else -> 82.dp
    }
    val iconBoxSize = when (distance) {
        0 -> 102.dp
        1 -> 72.dp
        else -> 50.dp
    }
    val iconSize = when (distance) {
        0 -> 32.sp
        1 -> 22.sp
        else -> 16.sp
    }
    val interactionSource = remember { MutableInteractionSource() }

    Column(
        modifier = Modifier
            .width(cardWidth)
            .offset(y = if (isActive) (-18).dp else 14.dp)
            .scale(scale)
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
                        .size(iconBoxSize + 44.dp)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    item.accent.copy(alpha = 0.54f),
                                    item.accent.copy(alpha = 0.16f),
                                    Color.Transparent
                                )
                            )
                        )
                )
            }

            Box(
                modifier = Modifier
                    .size(iconBoxSize)
                    .clip(RoundedCornerShape(if (isActive) 24.dp else 18.dp))
                    .background(
                        if (isActive) {
                            Brush.verticalGradient(
                                listOf(
                                    item.accent.copy(alpha = 0.34f),
                                    Color.Black.copy(alpha = 0.56f)
                                )
                            )
                        } else {
                            Brush.verticalGradient(
                                listOf(
                                    Color.Black.copy(alpha = 0.20f),
                                    Color.Black.copy(alpha = 0.30f)
                                )
                            )
                        }
                    )
                    .border(
                        BorderStroke(
                            width = if (isActive) 4.dp else 2.5.dp,
                            color = if (isActive) item.accent else Color.White.copy(alpha = 0.45f)
                        ),
                        RoundedCornerShape(if (isActive) 24.dp else 18.dp)
                    )
                    .shadow(
                        elevation = if (isActive) 24.dp else 7.dp,
                        shape = RoundedCornerShape(if (isActive) 24.dp else 18.dp),
                        ambientColor = item.accent.copy(alpha = if (isActive) 0.80f else 0.14f),
                        spotColor = item.accent.copy(alpha = if (isActive) 0.95f else 0.18f)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = item.icon,
                    color = Color.White.copy(alpha = if (isActive) 1f else 0.72f),
                    fontSize = when {
                        item.icon.length >= 3 -> when (distance) { 0 -> 20.sp; 1 -> 14.sp; else -> 10.sp }
                        item.icon.length == 2 -> when (distance) { 0 -> 26.sp; 1 -> 18.sp; else -> 13.sp }
                        else -> iconSize
                    },
                    letterSpacing = if (item.icon.length >= 2) (-0.5).sp else 0.sp,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign = TextAlign.Center,
                    style = TextStyle(
                        shadow = Shadow(
                            color = Color.Black.copy(alpha = 0.85f),
                            offset = TextOffset(0f, 2f),
                            blurRadius = 6f
                        )
                    )
                )
            }
        }
        Spacer(modifier = Modifier.height(if (isActive) 14.dp else 6.dp))
        if (distance <= 1) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color.Black.copy(alpha = if (isActive) 0.58f else 0.20f))
                    .padding(horizontal = if (isActive) 12.dp else 8.dp, vertical = if (isActive) 4.dp else 2.5.dp)
            ) {
                Text(
                    text = item.title,
                    color = if (isActive) item.accent else Color.White.copy(alpha = 0.76f),
                    fontSize = if (isActive) 16.sp else 10.sp,
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
                fontSize = if (isActive) 10.sp else 7.5.sp,
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
    deviceId: String,
    ipAddress: String,
    serverUrl: String,
    currentVersionCode: Int,
    currentVersionName: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

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

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.78f)),
        contentAlignment = Alignment.Center
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xF20B1725)),
            border = BorderStroke(1.dp, Color(0xFFC084FC).copy(alpha = 0.35f)),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .width(460.dp)
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(26.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Circular Icon header
                Box(
                    modifier = Modifier
                        .size(58.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFC084FC).copy(alpha = 0.16f))
                        .border(1.dp, Color(0xFFC084FC).copy(alpha = 0.45f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text("ℹ", fontSize = 24.sp, color = Color.White, fontWeight = FontWeight.Bold)
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                Text("Informasi & Pembaruan Aplikasi", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(modifier = Modifier.height(20.dp))

                // Detail Grid-like layout
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.Black.copy(alpha = 0.25f), RoundedCornerShape(12.dp))
                        .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    InfoRow("Versi Terpasang", "v$currentVersionName ($currentVersionCode)")
                    InfoRow("ID Perangkat", deviceId)
                    InfoRow("IP Address", ipAddress)
                    InfoRow("URL Server", if (serverUrl.isBlank()) "Belum disetting" else serverUrl)
                }

                Spacer(modifier = Modifier.height(22.dp))

                // Action area based on status
                if (checkingState == "checking") {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(
                            color = Color(0xFFC084FC),
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
                                    color = Color(0xFFC084FC),
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
    val background = when {
        primary -> Color(0xFFC084FC)
        isFocused -> Color(0xFF6366F1)
        else -> Color.Transparent
    }
    val textColor = if (primary && !isFocused) Color.Black else Color.White

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
            .shadow(
                elevation = if (isFocused) 26.dp else 0.dp,
                shape = RoundedCornerShape(10.dp),
                ambientColor = Color.White.copy(alpha = if (isFocused) 0.95f else 0f),
                spotColor = Color.White.copy(alpha = if (isFocused) 0.95f else 0f)
            )
            .scale(if (isFocused) 1.03f else 1f)
            .clip(RoundedCornerShape(10.dp))
            .background(background)
            .border(
                BorderStroke(
                    if (isFocused) 4.dp else 1.dp,
                    if (isFocused) Color.White else Color.White.copy(alpha = 0.22f)
                ),
                RoundedCornerShape(10.dp)
            )
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
