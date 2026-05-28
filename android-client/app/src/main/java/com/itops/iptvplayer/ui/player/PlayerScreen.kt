package com.itops.iptvplayer.ui.player

import android.view.KeyEvent
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.itops.iptvplayer.R
import com.itops.iptvplayer.data.cache.ChannelEntity
import com.itops.iptvplayer.ui.components.AspectRatioPlayer
import com.itops.iptvplayer.ui.components.PinGridDialog
import kotlinx.coroutines.delay

private fun remoteChannelDigitFromKey(key: Key): String? = when (key) {
    Key.Zero -> "0"
    Key.One -> "1"
    Key.Two -> "2"
    Key.Three -> "3"
    Key.Four -> "4"
    Key.Five -> "5"
    Key.Six -> "6"
    Key.Seven -> "7"
    Key.Eight -> "8"
    Key.Nine -> "9"
    else -> null
}

private fun isFallbackCategoryName(category: String): Boolean {
    val normalized = category.trim().lowercase()
    return normalized.isBlank() ||
        normalized == "uncategorized" ||
        normalized == "uncategorised" ||
        normalized == "lainnya" ||
        normalized == "other"
}

@Composable
fun PlayerScreen(
    initialChannelId: Int? = null,
    onBack: () -> Unit = {},
    onOpenSettings: () -> Unit,
    viewModel: PlayerViewModel = viewModel()
) {
    val context = LocalContext.current
    val channels by viewModel.channels.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val selectedChannel by viewModel.selectedChannel.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isBuffering by viewModel.isBuffering.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val isDeviceActive by viewModel.isDeviceActive.collectAsState()
    val aspectRatio by viewModel.aspectRatio.collectAsState()
    val technicianPin by viewModel.technicianPin.collectAsState()
    val serverUrl by viewModel.serverUrl.collectAsState()

    DisposableEffect(Unit) {
        onDispose {
            viewModel.stopPlayback()
        }
    }

    var showMenu by remember { mutableStateOf(selectedChannel == null) }
    var showZapOverlay by remember { mutableStateOf(false) }
    var drawerFocusPane by remember { mutableIntStateOf(0) }
    var drawerFocusedCategoryIndex by remember { mutableIntStateOf(0) }
    var drawerFocusedChannelIndex by remember { mutableIntStateOf(0) }
    var hasAutoPlayedDefault by remember { mutableStateOf(false) }
    var channelNumberInput by remember { mutableStateOf("") }
    var channelNumberFeedback by remember { mutableStateOf("") }
    val drawerCategoryListState = rememberLazyListState()
    val drawerChannelListState = rememberLazyListState()
    val rootFocusRequester = remember { FocusRequester() }
    val canShowChannelDrawer = errorMessage == null && !isLoading
    val visibleDrawerCategories = remember(categories) {
        categories.filterNot { isFallbackCategoryName(it) }
    }
    val showDrawerCategories = visibleDrawerCategories.isNotEmpty()
    val drawerChannels = remember(channels, selectedCategory, showDrawerCategories) {
        if (showDrawerCategories) channels.filter { it.groupName == selectedCategory } else channels
    }
    val channelNumbers = remember(channels) {
        channels.mapIndexed { index, channel -> channel.id to (index + 1) }.toMap()
    }

    LaunchedEffect(Unit) {
        rootFocusRequester.requestFocus()
    }

    LaunchedEffect(showMenu, showDrawerCategories) {
        if (showMenu) {
            drawerFocusPane = if (showDrawerCategories) 0 else 1
            drawerFocusedCategoryIndex = if (showDrawerCategories) {
                visibleDrawerCategories.indexOf(selectedCategory).coerceAtLeast(0)
            } else {
                0
            }
            drawerFocusedChannelIndex = drawerChannels
                .indexOfFirst { it.id == selectedChannel?.id }
                .coerceAtLeast(0)
        }
    }

    LaunchedEffect(selectedCategory, showMenu, showDrawerCategories, drawerChannels.size) {
        if (showMenu) {
            drawerFocusedChannelIndex = drawerFocusedChannelIndex
                .coerceIn(0, drawerChannels.lastIndex.coerceAtLeast(0))
        }
    }

    LaunchedEffect(drawerFocusedCategoryIndex, showMenu, showDrawerCategories) {
        if (showMenu && showDrawerCategories && visibleDrawerCategories.isNotEmpty()) {
            drawerCategoryListState.animateScrollToItem(
                drawerFocusedCategoryIndex.coerceIn(visibleDrawerCategories.indices)
            )
        }
    }

    LaunchedEffect(drawerFocusedChannelIndex, selectedCategory, showMenu, drawerChannels.size) {
        if (showMenu && drawerChannels.isNotEmpty()) {
            drawerChannelListState.animateScrollToItem(
                drawerFocusedChannelIndex.coerceIn(drawerChannels.indices)
            )
        }
    }

    fun handleDrawerKey(key: Key): Boolean {
        return when (key) {
            Key.DirectionLeft -> {
                drawerFocusPane = if (showDrawerCategories) 0 else 1
                true
            }
            Key.DirectionRight -> {
                drawerFocusPane = 1
                drawerFocusedChannelIndex = drawerFocusedChannelIndex
                    .coerceIn(0, drawerChannels.lastIndex.coerceAtLeast(0))
                true
            }
            Key.DirectionUp -> {
                if (showDrawerCategories && drawerFocusPane == 0) {
                    drawerFocusedCategoryIndex = (drawerFocusedCategoryIndex - 1).coerceAtLeast(0)
                } else {
                    drawerFocusedChannelIndex = (drawerFocusedChannelIndex - 1).coerceAtLeast(0)
                }
                true
            }
            Key.DirectionDown -> {
                if (showDrawerCategories && drawerFocusPane == 0) {
                    drawerFocusedCategoryIndex = (drawerFocusedCategoryIndex + 1)
                        .coerceAtMost(visibleDrawerCategories.lastIndex.coerceAtLeast(0))
                } else {
                    drawerFocusedChannelIndex = (drawerFocusedChannelIndex + 1)
                        .coerceAtMost(drawerChannels.lastIndex.coerceAtLeast(0))
                }
                true
            }
            Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> {
                if (showDrawerCategories && drawerFocusPane == 0) {
                    visibleDrawerCategories.getOrNull(drawerFocusedCategoryIndex)?.let {
                        viewModel.selectCategory(it)
                        drawerFocusPane = 1
                        drawerFocusedChannelIndex = 0
                    }
                } else {
                    drawerChannels.getOrNull(drawerFocusedChannelIndex)?.let {
                        viewModel.playChannel(it)
                        showMenu = false
                    }
                }
                true
            }
            else -> false
        }
    }

    // Auto-play channel when initialChannelId is provided
    var hasAutoPlayed by remember { mutableStateOf(false) }
    LaunchedEffect(initialChannelId, channels) {
        if (initialChannelId != null && !hasAutoPlayed && channels.isNotEmpty()) {
            viewModel.playChannelById(initialChannelId)
            hasAutoPlayed = true
            showMenu = false
        }
    }

    LaunchedEffect(initialChannelId, channels, selectedChannel) {
        if (initialChannelId == null && !hasAutoPlayedDefault && selectedChannel == null && channels.isNotEmpty()) {
            viewModel.playLastOrFirstChannel()
            hasAutoPlayedDefault = true
            showMenu = false
        }
    }

    // D-pad Konami Code bypass history
    val konamiCode = remember {
        listOf(
            Key.DirectionUp, Key.DirectionUp,
            Key.DirectionDown, Key.DirectionDown,
            Key.DirectionLeft, Key.DirectionRight,
            Key.DirectionLeft, Key.DirectionRight,
            Key.DirectionCenter // OK button
        )
    }
    val inputHistory = remember { mutableStateListOf<Key>() }

    // Auto-hide zap overlay after 4 seconds
    LaunchedEffect(selectedChannel) {
        if (selectedChannel != null) {
            showZapOverlay = true
            delay(4000)
            showZapOverlay = false
        }
    }

    LaunchedEffect(errorMessage, isLoading) {
        if (!canShowChannelDrawer) {
            showMenu = false
        }
    }

    LaunchedEffect(channelNumberInput, channels) {
        val input = channelNumberInput
        if (input.isBlank()) return@LaunchedEffect

        delay(1100)
        if (input != channelNumberInput) return@LaunchedEffect

        val requestedNumber = input.toIntOrNull()
        val targetChannel = requestedNumber?.let { number ->
            channels.firstOrNull { it.sortOrder == number }
                ?: channels.getOrNull(number - 1)
        }

        if (targetChannel != null) {
            viewModel.playChannel(targetChannel)
            showMenu = false
        } else {
            channelNumberFeedback = "Channel $input tidak tersedia"
        }
        channelNumberInput = ""
    }

    LaunchedEffect(channelNumberFeedback) {
        if (channelNumberFeedback.isNotBlank()) {
            delay(1200)
            channelNumberFeedback = ""
        }
    }

    // Toggle menu or channel zapping with physical D-pad keys
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusRequester(rootFocusRequester)
            .focusable()
            .onPreviewKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown) {
                    val key = keyEvent.key
                    
                    // Trace Bypass PIN Combination
                    if (key in konamiCode) {
                        inputHistory.add(key)
                        if (inputHistory.size > konamiCode.size) {
                            inputHistory.removeAt(0)
                        }
                        if (inputHistory.toList() == konamiCode) {
                            inputHistory.clear()
                            onOpenSettings()
                            return@onPreviewKeyEvent true
                        }
                    } else {
                        inputHistory.clear()
                    }

                    if (showMenu && canShowChannelDrawer && handleDrawerKey(key)) {
                        return@onPreviewKeyEvent true
                    }

                    remoteChannelDigitFromKey(key)?.let { digit ->
                        if (channels.isNotEmpty()) {
                            channelNumberFeedback = ""
                            channelNumberInput = (channelNumberInput + digit).trimStart('0').take(3)
                            if (channelNumberInput.isBlank()) {
                                channelNumberInput = "0"
                            }
                            return@onPreviewKeyEvent true
                        }
                    }

                    // Remote D-pad triggers
                    when (key) {
                        Key.DirectionCenter, Key.Enter -> {
                            if (!showMenu && canShowChannelDrawer) {
                                if (selectedChannel != null && !showZapOverlay) {
                                    showZapOverlay = true
                                } else {
                                    onBack()
                                }
                                return@onPreviewKeyEvent true
                            }
                        }
                        Key.DirectionUp -> {
                            if (!showMenu) {
                                viewModel.previousChannel()
                                return@onPreviewKeyEvent true
                            }
                        }
                        Key.DirectionDown -> {
                            if (!showMenu) {
                                viewModel.nextChannel()
                                return@onPreviewKeyEvent true
                            }
                        }
                        Key.DirectionLeft -> {
                            if (!showMenu && canShowChannelDrawer) {
                                showMenu = true
                                return@onPreviewKeyEvent true
                            }
                        }
                        Key.DirectionRight -> {
                            if (!showMenu && canShowChannelDrawer) {
                                showMenu = true
                                return@onPreviewKeyEvent true
                            }
                        }
                    }
                }
                false
            }
    ) {
        if (!isDeviceActive) {
            // Blocked screen
            val deviceId by viewModel.deviceId.collectAsState()
            DeviceBlockedScreen(
                deviceId = deviceId,
                onOpenTechnician = { onOpenSettings() }
            )
        } else {
            // Fullscreen Live Player or Welcome Placeholder
            if (selectedChannel == null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    Color(0xFF0F172A),
                                    Color(0xFF020617)
                                )
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(32.dp)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.ic_app_logo),
                            contentDescription = "Logo RSDK",
                            modifier = Modifier
                                .size(96.dp)
                                .clip(RoundedCornerShape(18.dp))
                                .border(2.dp, Color(0xFF6366F1), RoundedCornerShape(18.dp))
                        )
                        
                        Spacer(modifier = Modifier.height(20.dp))
                        
                        Text(
                            text = "RSDK IPTV Player",
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            letterSpacing = 0.5.sp
                        )
                        
                        Spacer(modifier = Modifier.height(6.dp))
                        
                        Text(
                            text = "Silakan pilih saluran di menu sebelah kiri untuk memulai tontonan.",
                            fontSize = 13.sp,
                            color = Color(0xFF94A3B8),
                            textAlign = TextAlign.Center
                        )
                        
                        Spacer(modifier = Modifier.height(24.dp))
                        
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            var isBtnFocused by remember { mutableStateOf(false) }
                            Button(
                                onClick = { if (canShowChannelDrawer) showMenu = true },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isBtnFocused) Color(0xFF6366F1) else Color(0xFF1E293B)
                                ),
                                border = BorderStroke(1.dp, Color(0xFF6366F1)),
                                modifier = Modifier
                                    .focusable()
                                    .onFocusChanged { isBtnFocused = it.isFocused }
                            ) {
                                Text("Buka Daftar Saluran", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                            
                            var isBackBtnFocused by remember { mutableStateOf(false) }
                            OutlinedButton(
                                onClick = onBack,
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                border = BorderStroke(1.dp, if (isBackBtnFocused) Color(0xFF6366F1) else Color(0xFF475569)),
                                modifier = Modifier
                                    .focusable()
                                    .onFocusChanged { isBackBtnFocused = it.isFocused }
                            ) {
                                Text("← Kembali", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } else {
                AspectRatioPlayer(
                    exoPlayer = viewModel.exoPlayer,
                    aspectRatio = aspectRatio
                )
            }

            // Buffering progress bar
            if (isBuffering && !isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.3f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF6366F1))
                }
            }

            // Black loading splash
            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF0F172A)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = Color(0xFF6366F1))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Menghubungkan & Memuat Saluran...", color = Color.White, fontSize = 14.sp)
                    }
                }
            }

            // Error Overlay Dialog
            if (errorMessage != null && !isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.7f)),
                    contentAlignment = Alignment.Center
                ) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        border = BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.4f)),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.width(420.dp).padding(16.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("⚠️ playback error", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color(0xFFEF4444))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = errorMessage ?: "",
                                fontSize = 13.sp,
                                color = Color(0xFFCBD5E1),
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(20.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Button(
                                    onClick = { selectedChannel?.let { viewModel.playChannel(it) } },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                                ) {
                                    Text("Coba Lagi")
                                }
                                OutlinedButton(
                                    onClick = onBack,
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                    border = BorderStroke(1.dp, Color(0xFF475569))
                                ) {
                                    Text("Kembali")
                                }
                            }
                        }
                    }
                }
            }

            // Quick channel change indicator overlay (Zapping bar)
            AnimatedVisibility(
                visible = channelNumberInput.isNotBlank() || channelNumberFeedback.isNotBlank(),
                enter = fadeIn() + scaleIn(initialScale = 0.92f),
                exit = fadeOut() + scaleOut(targetScale = 0.92f),
                modifier = Modifier.align(Alignment.TopEnd)
            ) {
                Box(
                    modifier = Modifier
                        .padding(top = 34.dp, end = 38.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Color.Black.copy(alpha = 0.58f))
                        .border(1.dp, Color(0xFFFFE9A6).copy(alpha = 0.34f), RoundedCornerShape(18.dp))
                        .padding(horizontal = 22.dp, vertical = 14.dp)
                ) {
                    Text(
                        text = if (channelNumberInput.isNotBlank()) channelNumberInput else channelNumberFeedback,
                        color = if (channelNumberInput.isNotBlank()) Color(0xFFFFE9A6) else Color(0xFFFCA5A5),
                        fontSize = if (channelNumberInput.isNotBlank()) 28.sp else 13.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
            }

            AnimatedVisibility(
                visible = showZapOverlay && !showMenu && !isLoading && errorMessage == null,
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                selectedChannel?.let { ch ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(110.dp)
                            .background(
                                Brush.verticalGradient(
                                    listOf(Color.Transparent, Color.Black.copy(alpha = 0.9f))
                                )
                            )
                            .padding(horizontal = 40.dp, vertical = 16.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            modifier = Modifier.fillMaxHeight()
                        ) {
                            val resolvedLogo = com.itops.iptvplayer.util.LogoResolver.getEffectiveLogoUrl(
                                channelLogo = ch.logo,
                                channelName = ch.name,
                                serverUrl = serverUrl
                            )
                            if (!resolvedLogo.isNullOrEmpty()) {
                                Card(
                                    modifier = Modifier.size(54.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                ) {
                                    AsyncImage(
                                        model = resolvedLogo,
                                        contentDescription = ch.name,
                                        modifier = Modifier.fillMaxSize().padding(4.dp),
                                        contentScale = ContentScale.Fit
                                    )
                                }
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(54.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color(0xFF334155)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("TV", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }

                            Column {
                                Text(
                                    text = ch.name,
                                    color = Color.White,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                                Text(
                                    text = ch.groupName,
                                    color = Color(0xFF818CF8),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }

            // Semi-transparent sliding menu drawer
            AnimatedVisibility(
                visible = showMenu && canShowChannelDrawer,
                enter = slideInHorizontally(initialOffsetX = { -it }) + fadeIn(),
                exit = slideOutHorizontally(targetOffsetX = { -it }) + fadeOut()
            ) {
                BackHandler { showMenu = false }
                
                Row(modifier = Modifier.fillMaxSize()) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .width(520.dp)
                            .clip(RoundedCornerShape(topEnd = 26.dp, bottomEnd = 26.dp))
                            .background(Color(0xF207111D))
                            .border(
                                BorderStroke(1.dp, Color(0xFFFFE9A6).copy(alpha = 0.22f)),
                                shape = RoundedCornerShape(topEnd = 26.dp, bottomEnd = 26.dp)
                            )
                            .padding(24.dp)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.home_bg_tv),
                            contentDescription = null,
                            modifier = Modifier
                                .matchParentSize()
                                .alpha(0.18f),
                            contentScale = ContentScale.Crop
                        )
                        Box(
                            modifier = Modifier
                                .matchParentSize()
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(
                                            Color.Black.copy(alpha = 0.44f),
                                            Color(0xFF06111C).copy(alpha = 0.72f)
                                        )
                                    )
                                )
                        )
                        val activeCategoryChannels = drawerChannels

                        Row(
                            modifier = Modifier
                                .fillMaxSize()
                                .onPreviewKeyEvent { keyEvent ->
                                    if (keyEvent.type != KeyEventType.KeyDown) {
                                        return@onPreviewKeyEvent false
                                    }

                                    when (keyEvent.key) {
                                        Key.DirectionLeft -> {
                                            drawerFocusPane = if (showDrawerCategories) 0 else 1
                                            true
                                        }
                                        Key.DirectionRight -> {
                                            drawerFocusPane = 1
                                            drawerFocusedChannelIndex = drawerFocusedChannelIndex
                                                .coerceIn(0, activeCategoryChannels.lastIndex.coerceAtLeast(0))
                                            true
                                        }
                                        Key.DirectionUp -> {
                                            if (showDrawerCategories && drawerFocusPane == 0) {
                                                drawerFocusedCategoryIndex = (drawerFocusedCategoryIndex - 1)
                                                    .coerceAtLeast(0)
                                            } else {
                                                drawerFocusedChannelIndex = (drawerFocusedChannelIndex - 1)
                                                    .coerceAtLeast(0)
                                            }
                                            true
                                        }
                                        Key.DirectionDown -> {
                                            if (showDrawerCategories && drawerFocusPane == 0) {
                                                drawerFocusedCategoryIndex = (drawerFocusedCategoryIndex + 1)
                                                    .coerceAtMost(visibleDrawerCategories.lastIndex.coerceAtLeast(0))
                                            } else {
                                                drawerFocusedChannelIndex = (drawerFocusedChannelIndex + 1)
                                                    .coerceAtMost(activeCategoryChannels.lastIndex.coerceAtLeast(0))
                                            }
                                            true
                                        }
                                        Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> {
                                            if (showDrawerCategories && drawerFocusPane == 0) {
                                                visibleDrawerCategories.getOrNull(drawerFocusedCategoryIndex)?.let {
                                                    viewModel.selectCategory(it)
                                                    drawerFocusPane = 1
                                                    drawerFocusedChannelIndex = 0
                                                }
                                            } else {
                                                activeCategoryChannels.getOrNull(drawerFocusedChannelIndex)?.let {
                                                    viewModel.playChannel(it)
                                                    showMenu = false
                                                }
                                            }
                                            true
                                        }
                                        else -> false
                                    }
                                }
                        ) {
                            // Column 1: Kategori (Sidebar)
                            if (showDrawerCategories) {
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .fillMaxHeight()
                                ) {
                                    Text(
                                        text = "Kategori",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White.copy(alpha = 0.66f),
                                        modifier = Modifier.padding(bottom = 12.dp)
                                    )
                                    LazyColumn(
                                        state = drawerCategoryListState,
                                        verticalArrangement = Arrangement.spacedBy(6.dp),
                                        modifier = Modifier.fillMaxSize()
                                    ) {
                                        itemsIndexed(
                                            items = visibleDrawerCategories,
                                            key = { _, cat -> cat }
                                        ) { index, cat ->
                                            val isCatSelected = cat == selectedCategory
                                            var hasRealCatFocus by remember { mutableStateOf(false) }
                                            val isCatFocused = hasRealCatFocus || (drawerFocusPane == 0 && drawerFocusedCategoryIndex == index)

                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .shadow(
                                                        elevation = if (isCatFocused) 18.dp else 0.dp,
                                                        shape = RoundedCornerShape(8.dp),
                                                        ambientColor = Color.White.copy(alpha = if (isCatFocused) 0.9f else 0f),
                                                        spotColor = Color.White.copy(alpha = if (isCatFocused) 0.9f else 0f)
                                                    )
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(
                                                        when {
                                                            isCatFocused -> Color(0xFFFFE9A6).copy(alpha = 0.20f)
                                                            isCatSelected -> Color(0xFF7DD3FC).copy(alpha = 0.16f)
                                                            else -> Color.Black.copy(alpha = 0.16f)
                                                        }
                                                    )
                                                    .border(
                                                        BorderStroke(
                                                            if (isCatFocused) 3.dp else 1.dp,
                                                            when {
                                                                isCatFocused -> Color.White
                                                                isCatSelected -> Color(0xFFFFE9A6).copy(alpha = 0.34f)
                                                                else -> Color.White.copy(alpha = 0.08f)
                                                            }
                                                        ),
                                                        shape = RoundedCornerShape(8.dp)
                                                    )
                                                    .focusable()
                                                    .onFocusChanged {
                                                        hasRealCatFocus = it.isFocused
                                                        if (it.isFocused) {
                                                            drawerFocusPane = 0
                                                            drawerFocusedCategoryIndex = index
                                                        }
                                                    }
                                                    .clickable {
                                                        drawerFocusPane = 1
                                                        drawerFocusedCategoryIndex = index
                                                        drawerFocusedChannelIndex = 0
                                                        viewModel.selectCategory(cat)
                                                    }
                                                    .padding(horizontal = 14.dp, vertical = 10.dp)
                                            ) {
                                                Text(
                                                    text = cat,
                                                    color = if (isCatSelected || isCatFocused) Color.White else Color.White.copy(alpha = 0.62f),
                                                    fontWeight = if (isCatSelected) FontWeight.Bold else FontWeight.Normal,
                                                    fontSize = 14.sp
                                                )
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.width(16.dp))
                            }

                            // Column 2: Daftar Channel
                            Column(
                                modifier = Modifier
                                    .weight(if (showDrawerCategories) 1.5f else 1f)
                                    .fillMaxHeight()
                            ) {
                                Text(
                                    text = "Saluran",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White.copy(alpha = 0.66f),
                                    modifier = Modifier.padding(bottom = 12.dp)
                                )

                                LazyColumn(
                                    state = drawerChannelListState,
                                    verticalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.fillMaxSize()
                                ) {
                                    itemsIndexed(
                                        items = activeCategoryChannels,
                                        key = { _, ch -> ch.id }
                                    ) { itemIndex, ch ->
                                        val isChSelected = ch.id == selectedChannel?.id

                                        var hasRealChFocus by remember { mutableStateOf(false) }
                                        val isChFocused = hasRealChFocus || (drawerFocusPane == 1 && drawerFocusedChannelIndex == itemIndex)

                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .shadow(
                                                    elevation = if (isChFocused) 22.dp else 0.dp,
                                                    shape = RoundedCornerShape(10.dp),
                                                    ambientColor = Color.White.copy(alpha = if (isChFocused) 0.9f else 0f),
                                                    spotColor = Color.White.copy(alpha = if (isChFocused) 0.9f else 0f)
                                                )
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(
                                                    when {
                                                        isChFocused -> Color(0xFFFFE9A6).copy(alpha = 0.20f)
                                                        isChSelected -> Color(0xFF7DD3FC).copy(alpha = 0.18f)
                                                        else -> Color.Black.copy(alpha = 0.28f)
                                                    }
                                                )
                                                .border(
                                                    BorderStroke(
                                                        if (isChFocused) 3.dp else 1.dp,
                                                        when {
                                                            isChFocused -> Color.White
                                                            isChSelected -> Color(0xFFFFE9A6).copy(alpha = 0.30f)
                                                            else -> Color.White.copy(alpha = 0.08f)
                                                        }
                                                    ),
                                                    shape = RoundedCornerShape(10.dp)
                                                )
                                                .scale(if (isChFocused) 1.03f else 1.0f)
                                                .focusable()
                                                .onFocusChanged {
                                                    hasRealChFocus = it.isFocused
                                                    if (it.isFocused) {
                                                        drawerFocusPane = 1
                                                        drawerFocusedChannelIndex = itemIndex
                                                    }
                                                }
                                                .clickable {
                                                    drawerFocusPane = 1
                                                    drawerFocusedChannelIndex = itemIndex
                                                    viewModel.playChannel(ch)
                                                    showMenu = false
                                                }
                                                .padding(10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .widthIn(min = 34.dp)
                                                    .clip(RoundedCornerShape(999.dp))
                                                    .background(Color.Black.copy(alpha = 0.30f))
                                                    .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(999.dp))
                                                    .padding(horizontal = 8.dp, vertical = 5.dp),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    text = (channelNumbers[ch.id] ?: (itemIndex + 1)).toString().padStart(2, '0'),
                                                    color = Color(0xFFFFE9A6),
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.ExtraBold
                                                )
                                            }

                                            val resolvedLogo = com.itops.iptvplayer.util.LogoResolver.getEffectiveLogoUrl(
                                                channelLogo = ch.logo,
                                                channelName = ch.name,
                                                serverUrl = serverUrl
                                            )
                                            if (!resolvedLogo.isNullOrEmpty()) {
                                                Card(
                                                    modifier = Modifier.size(34.dp),
                                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                                ) {
                                                    AsyncImage(
                                                        model = resolvedLogo,
                                                        contentDescription = ch.name,
                                                        modifier = Modifier.fillMaxSize().padding(2.dp),
                                                        contentScale = ContentScale.Fit
                                                    )
                                                }
                                            } else {
                                                Box(
                                                    modifier = Modifier
                                                        .size(34.dp)
                                                        .clip(RoundedCornerShape(4.dp))
                                                        .background(Color.White.copy(alpha = 0.16f))
                                                        .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(4.dp)),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Text("TV", color = Color.White.copy(alpha = 0.86f), fontSize = 11.sp)
                                                }
                                            }

                                            Text(
                                                text = ch.name,
                                                color = Color.White,
                                                fontSize = 13.sp,
                                                fontWeight = if (isChSelected) FontWeight.Bold else FontWeight.Medium,
                                                modifier = Modifier.weight(1f)
                                            )
                                            if (isChSelected) {
                                                Box(
                                                    modifier = Modifier
                                                        .clip(RoundedCornerShape(999.dp))
                                                        .background(Color(0xFFFFE9A6).copy(alpha = 0.16f))
                                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                                ) {
                                                    Text(
                                                        text = "ON",
                                                        color = Color(0xFFFFE9A6),
                                                        fontSize = 9.sp,
                                                        fontWeight = FontWeight.ExtraBold
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                    }

                    // Click outside to dismiss menu
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .weight(1f)
                            .clickable { showMenu = false }
                    )
                }
            }
        }


    }
}

@Composable
fun DeviceBlockedScreen(
    deviceId: String,
    onOpenTechnician: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF020617)) // Deep dark black slate
            .padding(40.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.width(500.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFEF4444).copy(alpha = 0.1f))
                    .border(2.dp, Color(0xFFEF4444), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text("🔴", fontSize = 36.sp)
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                text = "PERANGKAT DINONAKTIFKAN",
                color = Color.White,
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 1.sp
            )
            
            Spacer(modifier = Modifier.height(10.dp))
            
            Text(
                text = "Perangkat STB ini telah dideaktivasi oleh Administrator Web Admin RSDK IPTV. Silakan hubungi teknisi atau administrator Anda.",
                color = Color(0xFF94A3B8),
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                lineHeight = 20.sp
            )

            Spacer(modifier = Modifier.height(16.dp))

            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                modifier = Modifier.fillMaxWidth().clickable { onOpenTechnician() }
            ) {
                Text(
                    text = "Device UUID: $deviceId",
                    color = Color(0xFF6366F1),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.height(20.dp))
            
            Button(
                onClick = onOpenTechnician,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Color(0xFF334155))
            ) {
                Text("Masuk Mode Teknisi", color = Color.White)
            }
        }
    }
}
