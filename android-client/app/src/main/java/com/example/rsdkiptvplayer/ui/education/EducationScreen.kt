package com.example.rsdkiptvplayer.ui.education

import androidx.activity.compose.BackHandler
import androidx.annotation.OptIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.common.util.UnstableApi
import com.example.rsdkiptvplayer.ui.components.AspectRatioPlayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.ui.text.style.TextOverflow
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
fun EducationScreen(
    onBack: () -> Unit,
    onOpenSettings: () -> Unit,
    viewModel: EducationViewModel = viewModel()
) {
    val folderPath by viewModel.folderPath.collectAsState()
    val educationSource by viewModel.educationSource.collectAsState()
    val educationPlaybackMode by viewModel.educationPlaybackMode.collectAsState()
    val videoCount by viewModel.videoCount.collectAsState()
    val currentTitle by viewModel.currentTitle.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val syncState by com.example.rsdkiptvplayer.util.EducationSyncManager.syncState.collectAsState()
    val settingsFocusRequester = remember { FocusRequester() }

    LaunchedEffect(folderPath, educationSource, educationPlaybackMode) {
        viewModel.loadAndPlay()
    }

    DisposableEffect(Unit) {
        onDispose { viewModel.stopPlayback() }
    }

    BackHandler { onBack() }

    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            settingsFocusRequester.requestFocus()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        if (errorMessage == null && videoCount > 0) {
            var controlsVisible by remember { mutableStateOf(true) }
            var isPlaying by remember { mutableStateOf(true) }
            var currentPosition by remember { mutableStateOf(0L) }
            var duration by remember { mutableStateOf(0L) }
            val playerFocusRequester = remember { FocusRequester() }

            LaunchedEffect(Unit) {
                delay(150)
                runCatching { playerFocusRequester.requestFocus() }
            }

            LaunchedEffect(controlsVisible) {
                if (controlsVisible) {
                    delay(4000)
                    controlsVisible = false
                }
            }

            LaunchedEffect(Unit) {
                while (true) {
                    currentPosition = viewModel.exoPlayer.currentPosition
                    duration = viewModel.exoPlayer.duration.coerceAtLeast(0L)
                    isPlaying = viewModel.exoPlayer.isPlaying
                    delay(100)
                }
            }

            Box(
                modifier = Modifier
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
                                    if (viewModel.exoPlayer.isPlaying) {
                                        viewModel.exoPlayer.pause()
                                        isPlaying = false
                                    } else {
                                        viewModel.exoPlayer.play()
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
                                    viewModel.exoPlayer.seekTo((viewModel.exoPlayer.currentPosition - 10_000L).coerceAtLeast(0L))
                                }
                                controlsVisible = true
                                true
                            }
                            Key.DirectionRight -> {
                                if (controlsVisible) {
                                    val target = viewModel.exoPlayer.currentPosition + 10_000L
                                    val dur = viewModel.exoPlayer.duration.takeIf { it > 0 }
                                    viewModel.exoPlayer.seekTo(if (dur != null) target.coerceAtMost(dur) else target)
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
                AspectRatioPlayer(
                    exoPlayer = viewModel.exoPlayer,
                    aspectRatio = "fit"
                )

                AnimatedVisibility(
                    visible = controlsVisible,
                    enter = fadeIn(),
                    exit = fadeOut(),
                    modifier = Modifier.align(Alignment.TopStart)
                ) {
                    DetailChrome(title = currentTitle, subtitle = "Edukasi Pasien")
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
        }

        if (syncState is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Syncing) {
            val state = syncState as com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Syncing
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(18.dp)
                    .background(Color.Black.copy(alpha = 0.7f), RoundedCornerShape(10.dp))
                    .border(1.dp, Color(0xFF10B981).copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    CircularProgressIndicator(
                        progress = state.progress,
                        color = Color(0xFF10B981),
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp
                    )
                    Column {
                        Text(
                            text = "Sinkronisasi Latar Belakang (${state.currentFile}/${state.totalFiles})",
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = state.fileName,
                            color = Color(0xFF94A3B8),
                            fontSize = 9.sp,
                            maxLines = 1,
                            modifier = Modifier.width(180.dp)
                        )
                    }
                }
            }
        }

        if (syncState is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Checking ||
            (syncState is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Syncing && videoCount == 0)
        ) {
            SyncStatusPanel(
                syncState = syncState,
                modifier = Modifier.align(Alignment.Center)
            )
        }

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xE6000000)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = Color(0xFF10B981))
                    Spacer(modifier = Modifier.height(14.dp))
                    Text("Membaca video edukasi...", color = Color.White, fontSize = 14.sp)
                }
            }
        }

        if (errorMessage != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF020617)),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.38f)),
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier
                        .width(480.dp)
                        .padding(20.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(26.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("EDUKASI", color = Color(0xFF10B981), fontSize = 14.sp, fontWeight = FontWeight.ExtraBold)
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = errorMessage ?: "",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                            lineHeight = 22.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = buildEducationErrorDetail(educationSource, folderPath, syncState),
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(22.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(
                                onClick = onOpenSettings,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                modifier = Modifier
                                    .focusRequester(settingsFocusRequester)
                                    .focusable()
                            ) {
                                Text(
                                    if (educationSource == "web") "Cek Repository" else "Set Path Edukasi",
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            OutlinedButton(
                                onClick = onBack,
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.24f)),
                                modifier = Modifier.focusable()
                            ) {
                                Text("Kembali", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SyncStatusPanel(
    syncState: com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState,
    modifier: Modifier = Modifier
) {
    val title: String
    val detail: String?
    val progress: Float?

    when (syncState) {
        is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Checking -> {
            title = syncState.message
            detail = syncState.detail
            progress = null
        }
        is com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Syncing -> {
            title = "Menyalin video edukasi (${syncState.currentFile}/${syncState.totalFiles})"
            detail = syncState.fileName
            progress = syncState.progress
        }
        else -> return
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
        border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.38f)),
        shape = RoundedCornerShape(16.dp),
        modifier = modifier
            .width(520.dp)
            .padding(20.dp)
    ) {
        Row(
            modifier = Modifier.padding(22.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (progress == null) {
                CircularProgressIndicator(
                    color = Color(0xFF10B981),
                    modifier = Modifier.size(34.dp),
                    strokeWidth = 3.dp
                )
            } else {
                CircularProgressIndicator(
                    progress = progress,
                    color = Color(0xFF10B981),
                    modifier = Modifier.size(34.dp),
                    strokeWidth = 3.dp
                )
            }
            Column {
                Text(
                    text = title,
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 20.sp
                )
                if (!detail.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(5.dp))
                    Text(
                        text = detail,
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp,
                        lineHeight = 16.sp
                    )
                }
            }
        }
    }
}

private fun buildEducationErrorDetail(
    source: String,
    folderPath: String,
    syncState: com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState
): String {
    val syncDetail = (syncState as? com.example.rsdkiptvplayer.util.EducationSyncManager.SyncState.Error)?.detail
    if (!syncDetail.isNullOrBlank()) {
        return syncDetail
    }

    if (source == "web") {
        return "Cek Video Repository di dashboard web, pastikan ada video aktif dan server URL STB sudah benar."
    }

    return if (folderPath.isEmpty()) {
        "Isi path seperti \\\\10.45.128.129\\NamaShare\\folder di menu Setting."
    } else {
        folderPath
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
                textAlign = TextAlign.Center
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
