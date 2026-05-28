package com.itops.iptvplayer.ui.appdrawer

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import androidx.activity.compose.BackHandler
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
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
import androidx.compose.ui.input.key.*
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import android.widget.ImageView
import com.itops.iptvplayer.ui.components.RemoteKeyboardDialog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class AppInfo(
    val packageName: String,
    val label: String,
    val icon: Drawable
)


@Composable
fun AppDrawerScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    val screenWidth = configuration.screenWidthDp
    val screenHeight = configuration.screenHeightDp
    val isSmallScreen = screenWidth < 760 || screenHeight < 500
    val isUltraCompact = screenWidth < 680

    var apps by remember { mutableStateOf<List<AppInfo>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var selectedIndex by remember { mutableIntStateOf(0) }
    val gridState = rememberLazyGridState()
    val searchFocusRequester = remember { FocusRequester() }
    val firstItemFocusRequester = remember { FocusRequester() }
    var searchIsFocused by remember { mutableStateOf(false) }
    var showKeyboard by remember { mutableStateOf(false) }

    BackHandler { onBack() }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            val pm = context.packageManager
            val intent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            @Suppress("DEPRECATION")
            val resolvedApps = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
                .mapNotNull { ri ->
                    try {
                        AppInfo(
                            packageName = ri.activityInfo.packageName,
                            label = ri.loadLabel(pm).toString(),
                            icon = ri.loadIcon(pm)
                        )
                    } catch (_: Exception) { null }
                }
                .filter { it.packageName != context.packageName }
                .distinctBy { it.packageName }
                .sortedBy { it.label.lowercase() }
            withContext(Dispatchers.Main) {
                apps = resolvedApps
                isLoading = false
            }
        }
    }

    val filteredApps = remember(apps, searchQuery) {
        if (searchQuery.isBlank()) apps
        else apps.filter { it.label.contains(searchQuery, ignoreCase = true) }
    }

    LaunchedEffect(filteredApps.size) {
        selectedIndex = selectedIndex.coerceIn(0, (filteredApps.size - 1).coerceAtLeast(0))
    }

    LaunchedEffect(isLoading) {
        if (!isLoading) {
            try { firstItemFocusRequester.requestFocus() } catch (_: Exception) {}
        }
    }


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
            .padding(
                horizontal = if (isSmallScreen) 20.dp else 42.dp,
                vertical = if (isSmallScreen) 12.dp else 26.dp
            )
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column {
                Text(
                    text = "SEMUA APLIKASI",
                    color = Color(0xFFFCA5A5),
                    fontSize = if (isSmallScreen) 20.sp else 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 2.sp
                )
                Text(
                    text = "${filteredApps.size} aplikasi terinstall",
                    color = Color.White.copy(alpha = 0.72f),
                    fontSize = if (isSmallScreen) 10.sp else 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        // Search bar — focusable via D-pad + tappable via touchscreen
        val searchBorderColor by animateColorAsState(
            targetValue = if (searchIsFocused) Color(0xFFFCA5A5) else Color.White.copy(alpha = 0.14f),
            animationSpec = tween(160), label = "search_border"
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = if (isSmallScreen) 56.dp else 72.dp)
                .focusRequester(searchFocusRequester)
                .onFocusChanged { searchIsFocused = it.isFocused }
                .focusable()
                .onPreviewKeyEvent { keyEvent ->
                    if (keyEvent.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                    when (keyEvent.key) {
                        Key.DirectionDown -> {
                            try { firstItemFocusRequester.requestFocus() } catch (_: Exception) {}
                            true
                        }
                        Key.DirectionCenter, Key.Enter -> {
                            showKeyboard = true
                            true
                        }
                        else -> false
                    }
                }
                .clip(RoundedCornerShape(if (isSmallScreen) 10.dp else 14.dp))
                .background(
                    if (searchIsFocused) Color(0xFF0B1220).copy(alpha = 0.95f)
                    else Color.White.copy(alpha = 0.05f)
                )
                .border(if (searchIsFocused) 2.dp else 1.dp, searchBorderColor, RoundedCornerShape(if (isSmallScreen) 10.dp else 14.dp))
                .clickable { showKeyboard = true }
                .padding(horizontal = if (isSmallScreen) 12.dp else 16.dp, vertical = if (isSmallScreen) 8.dp else 11.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(
                imageVector = Icons.Rounded.Search,
                contentDescription = null,
                tint = if (searchIsFocused) Color(0xFFFCA5A5) else Color.White.copy(alpha = 0.45f),
                modifier = Modifier.size(if (isSmallScreen) 14.dp else 16.dp)
            )
            Text(
                text = if (searchQuery.isBlank()) "Cari aplikasi..." else searchQuery,
                color = if (searchQuery.isBlank()) Color.White.copy(alpha = if (searchIsFocused) 0.55f else 0.30f) else Color.White,
                fontSize = if (isSmallScreen) 11.sp else 13.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f)
            )
            if (searchQuery.isNotBlank()) {
                Text(
                    text = "✕",
                    color = Color.White.copy(alpha = 0.55f),
                    fontSize = 12.sp,
                    modifier = Modifier.clickable { searchQuery = "" }
                )
            }
        }


        // Grid content
        val topOffset = if (isSmallScreen) 110.dp else 140.dp
        when {
            isLoading -> {
                CircularProgressIndicator(
                    color = Color(0xFFFCA5A5),
                    strokeWidth = 3.dp,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(48.dp)
                )
            }
            filteredApps.isEmpty() -> {
                Text(
                    text = "Tidak ada aplikasi ditemukan.",
                    color = Color.White.copy(alpha = 0.72f),
                    fontSize = if (isSmallScreen) 15.sp else 18.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = if (isSmallScreen) 100.dp else 120.dp),
                    state = gridState,
                    horizontalArrangement = Arrangement.spacedBy(if (isSmallScreen) 8.dp else 12.dp),
                    verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 8.dp else 12.dp),
                    contentPadding = PaddingValues(top = 8.dp, bottom = 24.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(top = topOffset)
                ) {
                    itemsIndexed(filteredApps) { index, app ->
                        AppGridItem(
                            app = app,
                            isSmallScreen = isSmallScreen,
                            focusRequester = if (index == 0) firstItemFocusRequester else null,
                            onFocused = { selectedIndex = index },
                            onUpFromFirstRow = if (index < 6) ({
                                try { searchFocusRequester.requestFocus() } catch (_: Exception) {}
                            }) else null,
                            onClick = { launchApp(context, app.packageName) }
                        )
                    }
                }
            }
        }

        // Footer hint
        Text(
            text = "Tekan kembali untuk ke menu utama",
            color = Color.White.copy(alpha = 0.55f),
            fontSize = if (isSmallScreen) 9.sp else 11.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }

    // Virtual keyboard dialog — triggered by D-pad OK or tap on search bar
    if (showKeyboard) {
        RemoteKeyboardDialog(
            title = "Cari Aplikasi",
            helperText = "Ketik nama aplikasi yang ingin dicari",
            initialValue = searchQuery,
            onCommit = { newValue ->
                searchQuery = newValue
                showKeyboard = false
            },
            onDismiss = { showKeyboard = false },
            maxLength = 60,
            blankPreviewText = "Ketik nama aplikasi...",
            saveLabel = "Cari",
            keyboardTitle = "Cari Aplikasi"
        )
    }
}

@Composable
private fun AppGridItem(
    app: AppInfo,
    isSmallScreen: Boolean,
    focusRequester: FocusRequester?,
    onFocused: () -> Unit,
    onUpFromFirstRow: (() -> Unit)?,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val accent = Color(0xFFFCA5A5)
    val cardShape = RoundedCornerShape(if (isSmallScreen) 10.dp else 16.dp)

    val borderColor by animateColorAsState(
        targetValue = if (isFocused) accent else Color.White.copy(alpha = 0.14f),
        animationSpec = tween(160), label = "item_border"
    )
    val bgColor by animateColorAsState(
        targetValue = if (isFocused) Color(0xFF0B1220) else Color(0xD90B1220),
        animationSpec = tween(160), label = "item_bg"
    )

    Column(
        modifier = Modifier
            .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .onFocusChanged {
                isFocused = it.isFocused
                if (it.isFocused) onFocused()
            }
            .focusable()
            .onPreviewKeyEvent { keyEvent ->
                if (keyEvent.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                when (keyEvent.key) {
                    Key.DirectionCenter, Key.Enter -> { onClick(); true }
                    Key.DirectionUp -> {
                        if (onUpFromFirstRow != null) { onUpFromFirstRow(); true }
                        else false
                    }
                    else -> false
                }
            }
            .scale(if (isFocused) 1.04f else 1f)
            .shadow(
                elevation = if (isFocused) (if (isSmallScreen) 12.dp else 20.dp) else (if (isSmallScreen) 2.dp else 4.dp),
                shape = cardShape,
                ambientColor = accent.copy(alpha = if (isFocused) 0.38f else 0.10f),
                spotColor = accent.copy(alpha = if (isFocused) 0.38f else 0.10f)
            )
            .clip(cardShape)
            .background(bgColor)
            .border(if (isFocused) (if (isSmallScreen) 2.dp else 3.dp) else 1.dp, borderColor, cardShape)
            .clickable(onClick = onClick)
            .padding(if (isSmallScreen) 10.dp else 14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 6.dp else 8.dp)
    ) {
        AndroidView(
            factory = { ctx ->
                ImageView(ctx).apply {
                    scaleType = ImageView.ScaleType.FIT_CENTER
                    setImageDrawable(app.icon)
                }
            },
            modifier = Modifier.size(if (isSmallScreen) 40.dp else 52.dp)
        )
        Text(
            text = app.label,
            color = if (isFocused) Color.White else Color.White.copy(alpha = 0.72f),
            fontSize = if (isSmallScreen) 10.sp else 11.sp,
            fontWeight = if (isFocused) FontWeight.SemiBold else FontWeight.Medium,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
    }
}

private fun launchApp(context: Context, packageName: String) {
    try {
        val intent = context.packageManager.getLaunchIntentForPackage(packageName)
        if (intent != null) {
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
        }
    } catch (_: Exception) {}
}
