package com.example.rsdkiptvplayer.ui.entertainment

import android.annotation.SuppressLint
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.rsdkiptvplayer.IptvApplication
import kotlinx.coroutines.delay

private data class EntertainmentOption(
    val title: String,
    val subtitle: String,
    val url: String,
    val accent: Color,
    val requiresConfiguredUrl: Boolean = false
)

@Composable
fun EntertainmentScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val app = context.applicationContext as IptvApplication
    val customTitle by app.dataStoreManager.entertainmentCustomTitleFlow.collectAsState(initial = "Custom Konten")
    val customUrl by app.dataStoreManager.entertainmentCustomUrlFlow.collectAsState(initial = "")

    var activeOption by remember { mutableStateOf<EntertainmentOption?>(null) }
    val options = remember(customTitle, customUrl) {
        listOf(
            EntertainmentOption(
                title = customTitle.ifBlank { "Custom Konten" },
                subtitle = if (customUrl.isBlank()) "Atur URL dari Web Admin" else "Konten dari portal",
                url = customUrl,
                accent = Color(0xFF86EFAC),
                requiresConfiguredUrl = true
            ),
            EntertainmentOption(
                title = "SoundCloud",
                subtitle = "Musik dan audio streaming",
                url = "https://soundcloud.com",
                accent = Color(0xFFFF9A76)
            ),
            EntertainmentOption(
                title = "YouTube",
                subtitle = "YouTube TV mode",
                url = "https://www.youtube.com/tv",
                accent = Color(0xFFFFE9A6)
            )
        )
    }

    if (activeOption != null) {
        EntertainmentWebView(
            title = activeOption!!.title,
            subtitle = activeOption!!.subtitle,
            url = activeOption!!.url,
            onBack = { activeOption = null }
        )
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
        Column(modifier = Modifier.align(Alignment.TopStart)) {
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

        Row(
            modifier = Modifier.align(Alignment.Center),
            horizontalArrangement = Arrangement.spacedBy(22.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            options.forEachIndexed { index, option ->
                EntertainmentOptionCard(
                    option = option,
                    focusOnStart = index == 0,
                    onClick = {
                        if (option.requiresConfiguredUrl && option.url.isBlank()) {
                            Toast.makeText(context, "URL custom konten belum diisi dari Web Admin.", Toast.LENGTH_LONG).show()
                        } else {
                            activeOption = option
                        }
                    }
                )
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
private fun EntertainmentOptionCard(
    option: EntertainmentOption,
    focusOnStart: Boolean,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        if (focusOnStart) {
            delay(180)
            runCatching { focusRequester.requestFocus() }
        }
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xD90B1220)),
        border = BorderStroke(
            if (isFocused) 3.dp else 1.dp,
            if (isFocused) option.accent else Color.White.copy(alpha = 0.14f)
        ),
        shape = RoundedCornerShape(24.dp),
        modifier = Modifier
            .width(230.dp)
            .height(162.dp)
            .scale(if (isFocused) 1.06f else 1f)
            .shadow(
                elevation = if (isFocused) 24.dp else 6.dp,
                shape = RoundedCornerShape(24.dp),
                ambientColor = option.accent.copy(alpha = if (isFocused) 0.45f else 0.12f),
                spotColor = option.accent.copy(alpha = if (isFocused) 0.45f else 0.12f)
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
        Box(modifier = Modifier.fillMaxSize().padding(20.dp)) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(option.accent.copy(alpha = 0.18f))
                    .border(1.dp, option.accent.copy(alpha = 0.46f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text("▶", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }

            Column(modifier = Modifier.align(Alignment.BottomStart)) {
                Text(
                    text = option.title,
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = option.subtitle,
                    color = Color.White.copy(alpha = 0.66f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun EntertainmentWebView(
    title: String,
    subtitle: String,
    url: String,
    onBack: () -> Unit
) {
    var webView by remember { mutableStateOf<WebView?>(null) }

    BackHandler {
        val currentWebView = webView
        if (currentWebView?.canGoBack() == true) {
            currentWebView.goBack()
        } else {
            onBack()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
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
                    loadUrl(url)
                }
            },
            update = {}
        )

        Row(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(18.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Color(0xDD111827))
                .border(1.dp, Color(0xFF334155), RoundedCornerShape(14.dp))
                .padding(horizontal = 10.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            var backFocused by remember { mutableStateOf(false) }
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(if (backFocused) Color(0xFFEF4444) else Color(0xFF1F2937))
                    .border(BorderStroke(1.dp, if (backFocused) Color.White else Color(0xFF475569)), CircleShape)
                    .focusable()
                    .onFocusChanged { backFocused = it.isFocused }
            ) {
                Text("<", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }

            Column {
                Text(
                    text = title.uppercase(),
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = subtitle,
                    color = Color(0xFFCBD5E1),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
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
