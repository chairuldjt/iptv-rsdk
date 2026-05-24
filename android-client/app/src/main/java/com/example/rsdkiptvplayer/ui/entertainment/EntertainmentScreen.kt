package com.example.rsdkiptvplayer.ui.entertainment

import android.annotation.SuppressLint
import android.net.Uri
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
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
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.offset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import coil.ImageLoader
import coil.decode.SvgDecoder
import com.example.rsdkiptvplayer.IptvApplication
import com.example.rsdkiptvplayer.data.api.EntertainmentItemData
import com.example.rsdkiptvplayer.data.api.RetrofitClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

private data class EntertainmentOption(
    val id: Int,
    val title: String,
    val subtitle: String,
    val url: String,
    val contentType: String,
    val thumbnailUrl: String?
)

private val fallbackItems = listOf(
    EntertainmentOption(
        id = -1,
        title = "SoundCloud",
        subtitle = "Musik dan audio streaming",
        url = "https://soundcloud.com",
        contentType = "webview",
        thumbnailUrl = null
    ),
    EntertainmentOption(
        id = -2,
        title = "YouTube",
        subtitle = "YouTube TV mode",
        url = "https://www.youtube.com/tv",
        contentType = "webview",
        thumbnailUrl = null
    )
)

@Composable
fun EntertainmentScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val app = context.applicationContext as IptvApplication
    val serverUrl by app.dataStoreManager.serverUrlFlow.collectAsState(initial = "")
    var items by remember { mutableStateOf<List<EntertainmentOption>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var activeOption by remember { mutableStateOf<EntertainmentOption?>(null) }

    LaunchedEffect(serverUrl) {
        isLoading = true
        items = loadEntertainmentItems(serverUrl).ifEmpty { fallbackItems }
        isLoading = false
    }

    activeOption?.let { option ->
        when (option.contentType) {
            "media_player", "m3u_player" -> EntertainmentPlayer(option = option, onBack = { activeOption = null })
            else -> EntertainmentWebView(option = option, onBack = { activeOption = null })
        }
        return
    }

    BackHandler { onBack() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(Color(0xFF1F2937), Color(0xFF050914)),
                    radius = 900f
                )
            )
            .safeDrawingPadding()
            .padding(horizontal = 42.dp, vertical = 26.dp)
    ) {
        Header()

        when {
            isLoading -> {
                CircularProgressIndicator(
                    color = Color(0xFFFFE9A6),
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            items.isEmpty() -> {
                Text(
                    text = "Belum ada konten hiburan aktif.",
                    color = Color.White.copy(alpha = 0.72f),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            else -> {
                Row(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalArrangement = Arrangement.spacedBy(22.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    items.take(5).forEachIndexed { index, option ->
                        EntertainmentOptionCard(
                            option = option,
                            serverUrl = serverUrl,
                            focusOnStart = index == 0,
                            onClick = { activeOption = option }
                        )
                    }
                }
            }
        }

        Text(
            text = "Tekan kembali untuk ke menu utama",
            color = Color.White.copy(alpha = 0.55f),
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

@Composable
private fun Header() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        Column {
            Text(
                text = "HIBURAN",
                color = Color(0xFFFFE9A6),
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 2.sp
            )
            Text(
                text = "Pilih konten hiburan untuk pasien dan tamu",
                color = Color.White.copy(alpha = 0.72f),
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun EntertainmentOptionCard(
    option: EntertainmentOption,
    serverUrl: String,
    focusOnStart: Boolean,
    onClick: () -> Unit
) {
    val context = LocalContext.current
    val imageLoader = remember {
        ImageLoader.Builder(context)
            .components {
                add(SvgDecoder.Factory())
            }
            .build()
    }
    var isFocused by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }
    val accent = when (option.contentType) {
        "media_player" -> Color(0xFF86EFAC)
        "m3u_player" -> Color(0xFF7DD3FC)
        else -> Color(0xFFFF9A76)
    }

    LaunchedEffect(Unit) {
        if (focusOnStart) {
            delay(180)
            runCatching { focusRequester.requestFocus() }
        }
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xD90B1220)),
        border = BorderStroke(if (isFocused) 3.dp else 1.dp, if (isFocused) accent else Color.White.copy(alpha = 0.14f)),
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier
            .width(236.dp)
            .height(178.dp)
            .scale(if (isFocused) 1.06f else 1f)
            .shadow(
                elevation = if (isFocused) 24.dp else 6.dp,
                shape = RoundedCornerShape(24.dp),
                ambientColor = accent.copy(alpha = if (isFocused) 0.45f else 0.12f),
                spotColor = accent.copy(alpha = if (isFocused) 0.45f else 0.12f)
            )
            .focusRequester(focusRequester)
            .onFocusChanged { isFocused = it.isFocused }
            .onPreviewKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown &&
                    (keyEvent.key == Key.DirectionCenter || keyEvent.key == Key.Enter || keyEvent.key == Key.NumPadEnter)
                ) {
                    onClick()
                    true
                } else {
                    false
                }
            }
            .focusable()
            .clickable(onClick = onClick)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            val thumbnail = option.thumbnailUrl?.let { resolveUrl(serverUrl, it) }
            if (thumbnail != null) {
                AsyncImage(
                    model = thumbnail,
                    contentDescription = null,
                    imageLoader = imageLoader,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                )
                Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.86f)))))
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Brush.radialGradient(listOf(accent.copy(alpha = 0.34f), Color(0xFF0B1220)), radius = 420f))
                )
            }

            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(18.dp)
            ) {
                Text(option.title, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(option.subtitle, color = Color.White.copy(alpha = 0.76f), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun EntertainmentWebView(option: EntertainmentOption, onBack: () -> Unit) {
    var webView by remember { mutableStateOf<WebView?>(null) }

    BackHandler {
        val currentWebView = webView
        if (currentWebView?.canGoBack() == true) currentWebView.goBack() else onBack()
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    webView = this
                    webViewClient = WebViewClient()
                    webChromeClient = WebChromeClient()
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.mediaPlaybackRequiresUserGesture = false
                    settings.loadsImagesAutomatically = true
                    settings.useWideViewPort = true
                    settings.loadWithOverviewMode = true
                    settings.userAgentString = settings.userAgentString.replace("; wv", "") + " AndroidTV"
                    loadUrl(option.url)
                }
            },
            update = {}
        )

        DetailChrome(title = option.title, subtitle = option.subtitle)
    }

    DisposableEffect(Unit) {
        onDispose {
            webView?.stopLoading()
            webView?.loadUrl("about:blank")
            webView?.destroy()
            webView = null
        }
    }
}

@OptIn(UnstableApi::class)
@Composable
private fun EntertainmentPlayer(option: EntertainmentOption, onBack: () -> Unit) {
    val context = LocalContext.current
    var resolvedUrl by remember(option.url, option.contentType) { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var controlsVisible by remember { mutableStateOf(true) }
    var isPlaying by remember { mutableStateOf(true) }
    var currentPosition by remember { mutableStateOf(0L) }
    var duration by remember { mutableStateOf(0L) }
    val playerFocusRequester = remember { FocusRequester() }
    val player = remember {
        ExoPlayer.Builder(context).build().apply {
            repeatMode = Player.REPEAT_MODE_ALL
            playWhenReady = true
        }
    }

    BackHandler {
        if (controlsVisible) {
            onBack()
        } else {
            controlsVisible = true
        }
    }

    LaunchedEffect(Unit) {
        delay(150)
        runCatching { playerFocusRequester.requestFocus() }
    }

    LaunchedEffect(option) {
        runCatching {
            if (option.contentType == "m3u_player") resolveM3uUrl(option.url) else option.url
        }.onSuccess { mediaUrl ->
            resolvedUrl = mediaUrl
            player.setMediaItem(MediaItem.fromUri(Uri.parse(mediaUrl)))
            player.prepare()
            player.playWhenReady = true
            isPlaying = true
        }.onFailure { error ->
            errorMessage = error.localizedMessage ?: "Konten tidak bisa diputar."
        }
    }

    LaunchedEffect(controlsVisible) {
        if (controlsVisible) {
            delay(4000)
            controlsVisible = false
        }
    }

    LaunchedEffect(Unit) {
        while (true) {
            currentPosition = player.currentPosition
            duration = player.duration.takeIf { it > 0 } ?: 0L
            delay(100)
        }
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black)
            .border(2.dp, Color.White.copy(alpha = 0.12f))
            .shadow(elevation = 12.dp, shape = RoundedCornerShape(0.dp))
            .focusRequester(playerFocusRequester)
            .focusable()
            .onPreviewKeyEvent { keyEvent ->
                if (keyEvent.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false

                when (keyEvent.key) {
                    Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> {
                        if (controlsVisible) {
                            if (player.isPlaying) {
                                player.pause()
                                isPlaying = false
                            } else {
                                player.play()
                                isPlaying = true
                            }
                            controlsVisible = true
                        } else {
                            controlsVisible = true
                        }
                        true
                    }
                    Key.DirectionLeft -> {
                        if (controlsVisible) {
                            player.seekTo((player.currentPosition - 10_000L).coerceAtLeast(0L))
                        }
                        controlsVisible = true
                        true
                    }
                    Key.DirectionRight -> {
                        if (controlsVisible) {
                            val target = player.currentPosition + 10_000L
                            val duration = player.duration.takeIf { it > 0 }
                            player.seekTo(if (duration != null) target.coerceAtMost(duration) else target)
                        }
                        controlsVisible = true
                        true
                    }
                    Key.Back -> {
                        if (controlsVisible) {
                            onBack()
                        } else {
                            controlsVisible = true
                        }
                        true
                    }
                    else -> false
                }
            }
    ) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = {
                PlayerView(it).apply {
                    this.player = player
                    useController = false
                }
            },
            update = { it.player = player }
        )

        if (resolvedUrl == null && errorMessage == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(Color(0xFF1F2937), Color(0xFF050914)),
                            radius = 900f
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(
                        color = Color(0xFFFFE9A6),
                        strokeWidth = 3.dp,
                        modifier = Modifier.size(44.dp)
                    )
                    Spacer(modifier = Modifier.height(18.dp))
                    Text(
                        text = "Memuat konten...",
                        color = Color.White.copy(alpha = 0.72f),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
        errorMessage?.let {
            Text(it, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.Center))
        }

        AnimatedVisibility(
            visible = controlsVisible,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.TopStart)
        ) {
            DetailChrome(title = option.title, subtitle = option.subtitle)
        }

        if (controlsVisible) {
            Box(modifier = Modifier.fillMaxSize()) {
                CenterPlayButton(
                    isPlaying = isPlaying,
                    modifier = Modifier.align(Alignment.Center)
                )
                
                BottomControlBar(
                    currentPosition = currentPosition,
                    duration = duration,
                    isPlaying = isPlaying,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                )
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose { player.release() }
    }
}

@Composable
private fun DetailChrome(title: String, subtitle: String) {
    Column(
        modifier = Modifier
            .padding(26.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xCC0F172A),
                        Color(0xDD1E293B)
                    )
                )
            )
            .border(1.5.dp, Color.White.copy(alpha = 0.16f), RoundedCornerShape(14.dp))
            .shadow(
                elevation = 8.dp,
                shape = RoundedCornerShape(14.dp),
                ambientColor = Color.Black.copy(alpha = 0.4f)
            )
            .padding(horizontal = 18.dp, vertical = 14.dp)
    ) {
        Text(
            text = title.uppercase(),
            color = Color(0xFFFFE9A6),
            fontSize = 16.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 1.2.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = subtitle,
            color = Color(0xFFCBD5E1),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

private var _pauseIcon: ImageVector? = null
private val CustomPauseIcon: ImageVector
    get() {
        _pauseIcon?.let { return it }
        return ImageVector.Builder(
            name = "CustomPause",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f
        ).apply {
            path(fill = SolidColor(Color.White)) {
                moveTo(6f, 19f)
                horizontalLineTo(10f)
                verticalLineTo(5f)
                horizontalLineTo(6f)
                verticalLineTo(19f)
                close()
                moveTo(14f, 5f)
                verticalLineTo(19f)
                horizontalLineTo(18f)
                verticalLineTo(5f)
                horizontalLineTo(14f)
                close()
            }
        }.build().also { _pauseIcon = it }
    }

@Composable
private fun CenterPlayButton(isPlaying: Boolean, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(80.dp)
            .clip(CircleShape)
            .background(Color.Black.copy(alpha = 0.55f))
            .border(2.dp, Color.White.copy(alpha = 0.24f), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = if (isPlaying) CustomPauseIcon else Icons.Default.PlayArrow,
            contentDescription = if (isPlaying) "Pause" else "Play",
            modifier = Modifier.size(42.dp),
            tint = Color.White
        )
    }
}

@Composable
private fun BottomControlBar(
    currentPosition: Long,
    duration: Long,
    isPlaying: Boolean,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        ProgressBar(currentPosition = currentPosition, duration = duration)
        
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFFB8BCC4).copy(alpha = 0.86f),
                            Color(0xFF7A8084).copy(alpha = 0.72f)
                        )
                    )
                )
                .border(1.dp, Color.White.copy(alpha = 0.12f))
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Text(
                text = formatTime(currentPosition),
                color = Color.Black.copy(alpha = 0.72f),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold
            )
            
            Text(
                text = if (isPlaying) "⏸ PAUSE" else "▶ PLAY",
                color = Color(0xFF1F2937),
                fontSize = 12.sp,
                fontWeight = FontWeight.ExtraBold,
                modifier = Modifier.weight(1f),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            
            Text(
                text = formatTime(duration),
                color = Color.Black.copy(alpha = 0.72f),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun ProgressBar(currentPosition: Long, duration: Long) {
    val progress = if (duration > 0) currentPosition.toFloat() / duration else 0f
    
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(6.dp)
            .background(Color.Black.copy(alpha = 0.4f))
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(progress)
                .background(Color(0xFF10B981))
        )
    }
}

private fun formatTime(ms: Long): String {
    val seconds = (ms / 1000) % 60
    val minutes = (ms / 1000 / 60) % 60
    val hours = ms / 1000 / 60 / 60
    return if (hours > 0) {
        String.format("%02d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%02d:%02d", minutes, seconds)
    }
}

private suspend fun loadEntertainmentItems(serverUrl: String): List<EntertainmentOption> = withContext(Dispatchers.IO) {
    if (serverUrl.isBlank()) return@withContext emptyList()
    runCatching {
        val response = RetrofitClient.getService(serverUrl).getEntertainmentItems()
        if (!response.isSuccessful || response.body()?.status != true) return@runCatching emptyList()
        response.body()?.data.orEmpty()
            .filter { !it.url.isNullOrBlank() }
            .map { it.toOption(serverUrl) }
    }.getOrElse { emptyList() }
}

private fun EntertainmentItemData.toOption(serverUrl: String): EntertainmentOption {
    return EntertainmentOption(
        id = id,
        title = title,
        subtitle = subtitle.orEmpty(),
        url = resolveUrl(serverUrl, url.orEmpty()),
        contentType = content_type ?: "webview",
        thumbnailUrl = thumbnail_url
    )
}

private fun resolveUrl(serverUrl: String, value: String): String {
    if (value.startsWith("http://", true) || value.startsWith("https://", true)) return value
    val base = serverUrl.trimEnd('/')
    val path = value.trimStart('/')
    return "$base/$path"
}

private suspend fun resolveM3uUrl(url: String): String = withContext(Dispatchers.IO) {
    val lowerUrl = url.lowercase()
    if (lowerUrl.endsWith(".m3u8")) return@withContext url
    if (!lowerUrl.endsWith(".m3u")) return@withContext url

    val conn = URL(url).openConnection() as HttpURLConnection
    conn.connectTimeout = 10000
    conn.readTimeout = 10000
    conn.connect()
    if (conn.responseCode !in 200..299) {
        throw IllegalStateException("Gagal membuka M3U: HTTP ${conn.responseCode}")
    }
    conn.inputStream.bufferedReader().useLines { lines ->
        lines.map { it.trim() }
            .firstOrNull { it.isNotBlank() && !it.startsWith("#") }
            ?: throw IllegalStateException("Playlist M3U kosong.")
    }
}
