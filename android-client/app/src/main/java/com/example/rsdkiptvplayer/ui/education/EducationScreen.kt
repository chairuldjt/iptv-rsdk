package com.example.rsdkiptvplayer.ui.education

import androidx.activity.compose.BackHandler
import androidx.annotation.OptIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
    val videoCount by viewModel.videoCount.collectAsState()
    val currentTitle by viewModel.currentTitle.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    LaunchedEffect(folderPath) {
        viewModel.loadAndPlay()
    }

    DisposableEffect(Unit) {
        onDispose { viewModel.stopPlayback() }
    }

    BackHandler { onBack() }

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
                            text = if (folderPath.isEmpty()) {
                                "Isi path seperti \\\\10.45.128.129\\edukasi di menu Setting."
                            } else {
                                folderPath
                            },
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(22.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(
                                onClick = onOpenSettings,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                modifier = Modifier.focusable()
                            ) {
                                Text("Set Path Edukasi", fontWeight = FontWeight.Bold)
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
