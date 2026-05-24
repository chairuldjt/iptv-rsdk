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
            AspectRatioPlayer(
                exoPlayer = viewModel.exoPlayer,
                aspectRatio = "fit"
            )
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
