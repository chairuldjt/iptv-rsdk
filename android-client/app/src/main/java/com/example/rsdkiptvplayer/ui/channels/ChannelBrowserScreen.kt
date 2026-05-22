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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.itemsIndexed
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

    var selectedCategory by remember { mutableStateOf("ALL") }
    val backFocusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        backFocusRequester.requestFocus()
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

    val filteredChannels = if (selectedCategory == "ALL") {
        channels
    } else {
        channels.filter { it.groupName == selectedCategory }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0F172A),
                        Color(0xFF020617)
                    )
                )
            )
    ) {
        Column(modifier = Modifier.fillMaxSize()) {

            // ─── Top Header Bar ───
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                Color(0xFF1E293B).copy(alpha = 0.9f),
                                Color(0xFF0F172A).copy(alpha = 0.9f)
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
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .size(40.dp)
                            .focusRequester(backFocusRequester)
                            .clip(CircleShape)
                            .background(
                                if (isBackFocused) Color(0xFF6366F1).copy(alpha = 0.3f)
                                else Color(0xFF334155).copy(alpha = 0.5f)
                            )
                            .border(
                                1.dp,
                                if (isBackFocused) Color(0xFF6366F1) else Color(0xFF475569),
                                CircleShape
                            )
                            .focusable()
                            .onFocusChanged { isBackFocused = it.isFocused }
                    ) {
                        Text("←", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }

                    Image(
                        painter = painterResource(id = R.drawable.ic_app_logo),
                        contentDescription = "Logo RSDK",
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(8.dp))
                    )

                    Column {
                        Text(
                            text = "PILIH SALURAN",
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

                // Right side — settings shortcut
                var isSettingsFocused by remember { mutableStateOf(false) }
                OutlinedButton(
                    onClick = { onNavigateToSettings(5) },
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color.White
                    ),
                    border = BorderStroke(
                        1.dp,
                        if (isSettingsFocused) Color(0xFF6366F1) else Color(0xFF475569)
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .focusable()
                        .onFocusChanged { isSettingsFocused = it.isFocused }
                ) {
                    Text("⚙ Pengaturan", fontSize = 12.sp)
                }
            }

            // ─── Category Filter Bar ───
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF0F172A).copy(alpha = 0.8f))
                    .padding(horizontal = 20.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // "ALL" tab
                item {
                    CategoryChip(
                        label = "Semua (${channels.size})",
                        isSelected = selectedCategory == "ALL",
                        accentColor = Color(0xFF6366F1),
                        onClick = { selectedCategory = "ALL" }
                    )
                }
                // Per-category tabs
                itemsIndexed(categories) { _, cat ->
                    val count = channels.count { it.groupName == cat }
                    CategoryChip(
                        label = "$cat ($count)",
                        isSelected = selectedCategory == cat,
                        accentColor = Color(0xFF6366F1),
                        onClick = { selectedCategory = cat }
                    )
                }
            }

            HorizontalDivider(color = Color(0xFF1E293B), thickness = 1.dp)

            // ─── Channel Grid ───
            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = Color(0xFF6366F1))
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
                                .background(Color(0xFFF59E0B).copy(alpha = 0.1f))
                                .border(2.dp, Color(0xFFF59E0B).copy(alpha = 0.3f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("📺", fontSize = 36.sp)
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
                    columns = GridCells.Fixed(gridColumns),
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f)
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    itemsIndexed(filteredChannels) { _, channel ->
                        ChannelGridCard(
                            channel = channel,
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
    accentColor: Color,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val bgColor by animateColorAsState(
        targetValue = when {
            isSelected -> accentColor
            isFocused -> accentColor.copy(alpha = 0.25f)
            else -> Color(0xFF1E293B)
        },
        animationSpec = tween(200),
        label = "chip_bg"
    )
    val borderColor by animateColorAsState(
        targetValue = when {
            isSelected -> accentColor
            isFocused -> accentColor.copy(alpha = 0.6f)
            else -> Color(0xFF334155)
        },
        animationSpec = tween(200),
        label = "chip_border"
    )

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(20.dp))
            .clickable { onClick() }
            .focusable()
            .onFocusChanged { isFocused = it.isFocused }
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = label,
            color = if (isSelected || isFocused) Color.White else Color(0xFF94A3B8),
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            fontSize = 12.sp
        )
    }
}

@Composable
fun ChannelGridCard(
    channel: ChannelEntity,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.05f else 1f,
        animationSpec = tween(150),
        label = "card_scale"
    )
    val borderColor by animateColorAsState(
        targetValue = if (isFocused) Color(0xFF6366F1) else Color(0xFF334155),
        animationSpec = tween(200),
        label = "card_border"
    )
    val bgColor by animateColorAsState(
        targetValue = if (isFocused) Color(0xFF1E293B) else Color(0xFF0F172A).copy(alpha = 0.9f),
        animationSpec = tween(200),
        label = "card_bg"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1.3f)
            .scale(scale)
            .shadow(
                elevation = if (isFocused) 12.dp else 2.dp,
                shape = RoundedCornerShape(14.dp),
                ambientColor = Color(0xFF6366F1).copy(alpha = if (isFocused) 0.4f else 0f),
                spotColor = Color(0xFF6366F1).copy(alpha = if (isFocused) 0.6f else 0f)
            )
            .focusable()
            .onFocusChanged { isFocused = it.isFocused }
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = bgColor),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(
            width = if (isFocused) 2.dp else 1.dp,
            color = borderColor
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Channel Logo
            if (!channel.logo.isNullOrEmpty()) {
                Card(
                    modifier = Modifier.size(56.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    AsyncImage(
                        model = channel.logo,
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
                                    Color(0xFF6366F1).copy(alpha = 0.3f),
                                    Color(0xFF8B5CF6).copy(alpha = 0.3f)
                                )
                            )
                        )
                        .border(1.dp, Color(0xFF6366F1).copy(alpha = 0.4f), RoundedCornerShape(10.dp)),
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

            Spacer(modifier = Modifier.height(4.dp))

            // Category Badge
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color(0xFF6366F1).copy(alpha = 0.12f))
                    .padding(horizontal = 8.dp, vertical = 3.dp)
            ) {
                Text(
                    text = channel.groupName,
                    color = Color(0xFF818CF8),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
