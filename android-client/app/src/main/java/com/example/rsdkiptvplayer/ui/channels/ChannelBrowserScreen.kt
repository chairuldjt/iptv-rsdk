package com.example.rsdkiptvplayer.ui.channels

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.example.rsdkiptvplayer.R
import com.example.rsdkiptvplayer.data.cache.ChannelEntity
import com.example.rsdkiptvplayer.ui.player.PlayerViewModel

private fun isFallbackCategoryName(category: String): Boolean {
    val normalized = category.trim().lowercase()
    return normalized.isBlank() ||
        normalized == "uncategorized" ||
        normalized == "uncategorised" ||
        normalized == "lainnya" ||
        normalized == "other"
}

@Composable
fun ChannelBrowserScreen(
    onChannelSelected: (Int) -> Unit,
    onBack: () -> Unit,
    onNavigateToSettings: (Int) -> Unit,
    playerViewModel: PlayerViewModel = viewModel()
) {
    val channels by playerViewModel.channels.collectAsState()
    val categories by playerViewModel.categories.collectAsState()
    val isLoading by playerViewModel.isLoading.collectAsState()
    val selectedChannel by playerViewModel.selectedChannel.collectAsState()
    val serverUrl by playerViewModel.serverUrl.collectAsState()

    var selectedCategory by remember { mutableStateOf("ALL") }
    val backFocusRequester = remember { FocusRequester() }
    val screenFocusRequester = remember { FocusRequester() }
    var focusSection by remember { mutableIntStateOf(1) }
    var focusedCategoryIndex by remember { mutableIntStateOf(0) }
    var focusedChannelIndex by remember { mutableIntStateOf(0) }
    val categoryListState = rememberLazyListState()
    val channelGridState = rememberLazyGridState()
    val visibleCategories = remember(categories) {
        categories.filterNot { isFallbackCategoryName(it) }
    }
    val showCategoryFilter = visibleCategories.isNotEmpty()

    LaunchedEffect(Unit) {
        screenFocusRequester.requestFocus()
    }

    LaunchedEffect(showCategoryFilter) {
        if (!showCategoryFilter) {
            selectedCategory = "ALL"
            focusSection = 2
            focusedCategoryIndex = 0
        } else if (focusSection == 2 && focusedChannelIndex == 0) {
            focusSection = 1
        }
    }

    // Responsive grid column count based on screen width
    val configuration = LocalConfiguration.current
    val screenWidthDp = configuration.screenWidthDp
    val gridColumns = when {
        screenWidthDp >= 1200 -> 5
        screenWidthDp >= 900 -> 4
        screenWidthDp >= 600 -> 3
        else -> 2
    }

    val filteredChannels = if (!showCategoryFilter || selectedCategory == "ALL") {
        channels
    } else {
        channels.filter { it.groupName == selectedCategory }
    }
    val categoryOptions = if (showCategoryFilter) listOf("ALL") + visibleCategories else emptyList()
    val channelNumbers = remember(channels) {
        channels.mapIndexed { index, channel -> channel.id to (index + 1) }.toMap()
    }

    LaunchedEffect(selectedCategory, filteredChannels.size, showCategoryFilter) {
        focusedCategoryIndex = if (showCategoryFilter) {
            categoryOptions.indexOf(selectedCategory).coerceAtLeast(0)
        } else {
            0
        }
        focusedChannelIndex = focusedChannelIndex.coerceIn(0, filteredChannels.lastIndex.coerceAtLeast(0))
    }

    LaunchedEffect(focusedCategoryIndex, showCategoryFilter) {
        if (showCategoryFilter && categoryOptions.isNotEmpty()) {
            categoryListState.animateScrollToItem(focusedCategoryIndex.coerceIn(categoryOptions.indices))
        }
    }

    LaunchedEffect(focusedChannelIndex) {
        if (filteredChannels.isNotEmpty()) {
            channelGridState.animateScrollToItem(focusedChannelIndex.coerceIn(filteredChannels.indices))
        }
    }

    fun selectFocusedCategory() {
        categoryOptions.getOrNull(focusedCategoryIndex)?.let { category ->
            selectedCategory = category
            focusedChannelIndex = 0
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .focusRequester(screenFocusRequester)
            .focusable()
            .onPreviewKeyEvent { keyEvent ->
                if (keyEvent.type != KeyEventType.KeyDown) {
                    return@onPreviewKeyEvent false
                }

                when (keyEvent.key) {
                    Key.DirectionLeft -> {
                        if (focusSection == 0) {
                            focusSection = if (showCategoryFilter) 1 else 2
                            focusedChannelIndex = focusedChannelIndex.coerceAtLeast(0)
                        } else if (showCategoryFilter && focusSection == 1) {
                            focusedCategoryIndex = (focusedCategoryIndex - 1).coerceAtLeast(0)
                        } else {
                            focusedChannelIndex = (focusedChannelIndex - 1).coerceAtLeast(0)
                        }
                        true
                    }
                    Key.DirectionRight -> {
                        if (focusSection == 0) {
                            focusSection = if (showCategoryFilter) 1 else 2
                            focusedChannelIndex = focusedChannelIndex.coerceAtLeast(0)
                        } else if (showCategoryFilter && focusSection == 1) {
                            focusedCategoryIndex = (focusedCategoryIndex + 1)
                                .coerceAtMost(categoryOptions.lastIndex.coerceAtLeast(0))
                        } else {
                            focusedChannelIndex = (focusedChannelIndex + 1)
                                .coerceAtMost(filteredChannels.lastIndex.coerceAtLeast(0))
                        }
                        true
                    }
                    Key.DirectionUp -> {
                        if (showCategoryFilter && focusSection == 1) {
                            focusSection = 0
                        } else if (focusSection == 2) {
                            if (focusedChannelIndex - gridColumns >= 0) {
                                focusedChannelIndex -= gridColumns
                            } else if (showCategoryFilter) {
                                focusSection = 1
                            } else {
                                focusSection = 0
                            }
                        }
                        true
                    }
                    Key.DirectionDown -> {
                        if (focusSection == 0) {
                            focusSection = if (showCategoryFilter) 1 else 2
                        } else if (showCategoryFilter && focusSection == 1) {
                            selectFocusedCategory()
                            focusSection = 2
                        } else {
                            focusedChannelIndex = (focusedChannelIndex + gridColumns)
                                .coerceAtMost(filteredChannels.lastIndex.coerceAtLeast(0))
                        }
                        true
                    }
                    Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> {
                        if (focusSection == 0) {
                            onBack()
                        } else if (showCategoryFilter && focusSection == 1) {
                            selectFocusedCategory()
                            focusSection = 2
                        } else {
                            filteredChannels.getOrNull(focusedChannelIndex)?.let { onChannelSelected(it.id) }
                        }
                        true
                    }
                    else -> false
                }
            }
            .background(
                Color(0xFF050B12)
            )
    ) {
        Image(
            painter = painterResource(id = R.drawable.home_bg_tv),
            contentDescription = null,
            modifier = Modifier
                .fillMaxSize()
                .alpha(0.46f),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.26f),
                            Color(0xFF06111C).copy(alpha = 0.42f),
                            Color.Black.copy(alpha = 0.78f)
                        )
                    )
                )
        )
        Column(modifier = Modifier.fillMaxSize()) {

            // ─── Top Header Bar ───
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                Color.Black.copy(alpha = 0.52f),
                                Color(0xFF07131D).copy(alpha = 0.66f)
                            )
                        )
                    )
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Back Button
                    var isBackFocused by remember { mutableStateOf(false) }
                    val isBackExplicitlyFocused = focusSection == 0
                    val shouldHighlightBack = isBackFocused || isBackExplicitlyFocused
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .size(40.dp)
                            .focusRequester(backFocusRequester)
                            .shadow(
                                elevation = if (shouldHighlightBack) 18.dp else 0.dp,
                                shape = CircleShape,
                                ambientColor = Color.White.copy(alpha = if (shouldHighlightBack) 0.9f else 0f),
                                spotColor = Color.White.copy(alpha = if (shouldHighlightBack) 0.9f else 0f)
                            )
                            .clip(CircleShape)
                            .background(
                                if (shouldHighlightBack) Color(0xFF7DD3FC).copy(alpha = 0.28f)
                                else Color(0xFF334155).copy(alpha = 0.5f)
                            )
                            .border(
                                if (shouldHighlightBack) 3.dp else 1.dp,
                                if (shouldHighlightBack) Color.White else Color(0xFF475569),
                                CircleShape
                            )
                            .focusable()
                            .onFocusChanged {
                                isBackFocused = it.isFocused
                                if (it.isFocused) {
                                    focusSection = 0
                                }
                            }
                    ) {
                        Text("←", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }

                    Image(
                        painter = painterResource(id = R.drawable.ic_global_iptv),
                        contentDescription = "Hospitality IPTV",
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(8.dp))
                    )

                    Column {
                        Text(
                            text = "DAFTAR SALURAN",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = "${channels.size} saluran tersedia",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF94A3B8)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(1.dp))
            }

            if (showCategoryFilter) {
                // ─── Category Filter Bar ───
                LazyRow(
                    state = categoryListState,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.Black.copy(alpha = 0.34f))
                        .padding(horizontal = 20.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        CategoryChip(
                            label = "Semua (${channels.size})",
                            isSelected = selectedCategory == "ALL",
                            isExplicitlyFocused = focusSection == 1 && focusedCategoryIndex == 0,
                            accentColor = Color(0xFFFFE9A6),
                            onClick = {
                                focusedCategoryIndex = 0
                                selectedCategory = "ALL"
                            }
                        )
                    }
                    itemsIndexed(visibleCategories) { index, cat ->
                        val count = channels.count { it.groupName == cat }
                        CategoryChip(
                            label = "$cat ($count)",
                            isSelected = selectedCategory == cat,
                            isExplicitlyFocused = focusSection == 1 && focusedCategoryIndex == index + 1,
                            accentColor = Color(0xFFFFE9A6),
                            onClick = {
                                focusedCategoryIndex = index + 1
                                selectedCategory = cat
                            }
                        )
                    }
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 1.dp)
            } else {
                HorizontalDivider(color = Color.White.copy(alpha = 0.06f), thickness = 1.dp)
            }

            // ─── Channel Grid ───
            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = Color(0xFFFFE9A6))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "Memuat daftar saluran...",
                            color = Color(0xFF94A3B8),
                            fontSize = 14.sp
                        )
                    }
                }
            } else if (filteredChannels.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(32.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFFFE9A6).copy(alpha = 0.12f))
                                .border(2.dp, Color(0xFFFFE9A6).copy(alpha = 0.32f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                painter = painterResource(id = R.drawable.ic_home_tv),
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(34.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(20.dp))
                        Text(
                            "Belum Ada Saluran",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Silakan hubungkan server atau impor playlist M3U terlebih dahulu melalui Pengaturan.",
                            fontSize = 13.sp,
                            color = Color(0xFF94A3B8),
                            textAlign = TextAlign.Center,
                            lineHeight = 18.sp
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Button(
                                onClick = { onNavigateToSettings(5) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                            ) {
                                Text("Impor M3U")
                            }
                            Button(
                                onClick = { onNavigateToSettings(0) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                            ) {
                                Text("Pengaturan Server")
                            }
                        }
                    }
                }
            } else {
                LazyVerticalGrid(
                    state = channelGridState,
                    columns = GridCells.Fixed(gridColumns),
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f)
                        .padding(horizontal = 28.dp, vertical = 18.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    itemsIndexed(filteredChannels) { index, channel ->
                        ChannelGridCard(
                            channel = channel,
                            channelNumber = channelNumbers[channel.id] ?: (index + 1),
                            isExplicitlyFocused = focusSection == 2 && focusedChannelIndex == index,
                            isCurrent = channel.id == selectedChannel?.id,
                            showCategory = showCategoryFilter,
                            serverUrl = serverUrl,
                            onClick = { onChannelSelected(channel.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CategoryChip(
    label: String,
    isSelected: Boolean,
    isExplicitlyFocused: Boolean = false,
    accentColor: Color,
    onClick: () -> Unit
) {
    var hasRealFocus by remember { mutableStateOf(false) }
    val isFocused = isExplicitlyFocused || hasRealFocus
    val bgColor by animateColorAsState(
        targetValue = when {
            isSelected -> accentColor
            isFocused -> Color(0xFFFFE9A6).copy(alpha = 0.24f)
            else -> Color.Black.copy(alpha = 0.34f)
        },
        animationSpec = tween(200),
        label = "chip_bg"
    )
    val borderColor by animateColorAsState(
        targetValue = when {
            isSelected -> accentColor
            isFocused -> Color.White
            else -> Color.White.copy(alpha = 0.18f)
        },
        animationSpec = tween(200),
        label = "chip_border"
    )

    Box(
        modifier = Modifier
            .shadow(
                elevation = if (isFocused) 18.dp else 0.dp,
                shape = RoundedCornerShape(20.dp),
                ambientColor = Color.White.copy(alpha = if (isFocused) 0.88f else 0f),
                spotColor = Color.White.copy(alpha = if (isFocused) 0.88f else 0f)
            )
            .clip(RoundedCornerShape(20.dp))
            .background(bgColor)
            .border(if (isFocused) 3.dp else 1.dp, borderColor, RoundedCornerShape(20.dp))
            .focusable()
            .onFocusChanged { hasRealFocus = it.isFocused }
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = label,
            color = if (isSelected) Color.Black else if (isFocused) Color.White else Color.White.copy(alpha = 0.66f),
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            fontSize = 12.sp
        )
    }
}

@Composable
fun ChannelGridCard(
    channel: ChannelEntity,
    channelNumber: Int,
    isExplicitlyFocused: Boolean = false,
    isCurrent: Boolean = false,
    showCategory: Boolean = true,
    serverUrl: String,
    onClick: () -> Unit
) {
    var hasRealFocus by remember { mutableStateOf(false) }
    val isFocused = isExplicitlyFocused || hasRealFocus
    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.05f else 1f,
        animationSpec = tween(150),
        label = "card_scale"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isFocused) Color.White else Color.White.copy(alpha = 0.16f),
        animationSpec = tween(200),
        label = "card_border"
    )
    val bgColor by animateColorAsState(
        targetValue = when {
            isFocused -> Color(0xFFFFE9A6).copy(alpha = 0.16f)
            isCurrent -> Color(0xFF7DD3FC).copy(alpha = 0.14f)
            else -> Color.Black.copy(alpha = 0.36f)
        },
        animationSpec = tween(200),
        label = "card_bg"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1.3f)
            .padding(4.dp)
            .scale(scale)
            .shadow(
                elevation = if (isFocused) 24.dp else 2.dp,
                shape = RoundedCornerShape(14.dp),
                ambientColor = Color.White.copy(alpha = if (isFocused) 0.9f else 0f),
                spotColor = Color.White.copy(alpha = if (isFocused) 0.9f else 0f)
            )
            .focusable()
            .onFocusChanged { hasRealFocus = it.isFocused }
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = bgColor),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(
            width = if (isFocused) 3.dp else 1.dp,
            color = if (isCurrent && !isFocused) Color(0xFFFFE9A6).copy(alpha = 0.28f) else borderColor
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .align(Alignment.End)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Color.Black.copy(alpha = 0.34f))
                    .border(1.dp, Color.White.copy(alpha = 0.14f), RoundedCornerShape(999.dp))
                    .padding(horizontal = 8.dp, vertical = 3.dp)
            ) {
                Text(
                    text = channelNumber.toString().padStart(2, '0'),
                    color = Color(0xFFFFE9A6),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    maxLines = 1
                )
            }

            Spacer(modifier = Modifier.height(2.dp))

            // Channel Logo
            val resolvedLogo = com.example.rsdkiptvplayer.util.LogoResolver.getEffectiveLogoUrl(
                channelLogo = channel.logo,
                channelName = channel.name,
                serverUrl = serverUrl
            )
            if (!resolvedLogo.isNullOrEmpty()) {
                Card(
                    modifier = Modifier.size(56.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    AsyncImage(
                        model = resolvedLogo,
                        contentDescription = channel.name,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(6.dp),
                        contentScale = ContentScale.Fit
                    )
                }
            } else {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    Color(0xFFFFE9A6).copy(alpha = 0.24f),
                                    Color(0xFF7DD3FC).copy(alpha = 0.18f)
                                )
                            )
                        )
                        .border(1.dp, Color.White.copy(alpha = 0.22f), RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = channel.name.take(2).uppercase(),
                        color = Color.White,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 16.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Channel Name
            Text(
                text = channel.name,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                lineHeight = 16.sp
            )

            if (showCategory) {
                Spacer(modifier = Modifier.height(4.dp))

                // Category Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color(0xFFFFE9A6).copy(alpha = 0.11f))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = channel.groupName,
                        color = Color(0xFFFFE9A6),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            if (isCurrent) {
                Spacer(modifier = Modifier.height(5.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(Color(0xFFFFE9A6).copy(alpha = 0.14f))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = "SEDANG DIPUTAR",
                        color = Color(0xFFFFE9A6),
                        fontSize = 8.sp,
                        fontWeight = FontWeight.ExtraBold,
                        maxLines = 1
                    )
                }
            }
        }
    }
}
