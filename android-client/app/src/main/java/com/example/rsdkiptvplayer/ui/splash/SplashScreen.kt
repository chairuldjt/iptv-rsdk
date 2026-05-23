package com.example.rsdkiptvplayer.ui.splash

import android.widget.Toast
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.rsdkiptvplayer.IptvApplication
import com.example.rsdkiptvplayer.R
import com.example.rsdkiptvplayer.data.api.RetrofitClient
import com.example.rsdkiptvplayer.util.UpdateManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@Composable
fun SplashScreen(
    onSplashComplete: () -> Unit
) {
    val context = LocalContext.current
    val app = context.applicationContext as IptvApplication
    val dataStoreManager = app.dataStoreManager
    val coroutineScope = rememberCoroutineScope()

    val alpha = remember { Animatable(0f) }
    val scale = remember { Animatable(0.88f) }

    var statusText by remember { mutableStateOf("Memulai aplikasi...") }
    var currentVersionName by remember { mutableStateOf("") }
    var currentVersionCode by remember { mutableIntStateOf(0) }

    // State for update checking
    var updateAvailable by remember { mutableStateOf(false) }
    var isMandatory by remember { mutableStateOf(false) }
    var updateVersionName by remember { mutableStateOf("") }
    var updateVersionCode by remember { mutableIntStateOf(0) }
    var apkUrl by remember { mutableStateOf("") }
    var changelog by remember { mutableStateOf("") }

    var isChecking by remember { mutableStateOf(true) }
    var isDownloading by remember { mutableStateOf(false) }
    var downloadProgress by remember { mutableStateOf(0f) }

    suspend fun startDownload(url: String) {
        isDownloading = true
        statusText = "Mengunduh pembaruan... 0%"
        try {
            val downloadedFile = UpdateManager.downloadApk(context, url) { progress ->
                downloadProgress = progress
                statusText = "Mengunduh pembaruan... ${(progress * 100).toInt()}%"
            }
            if (downloadedFile != null) {
                statusText = "Memasang pembaruan..."
                UpdateManager.installApk(context, downloadedFile)
            } else {
                Toast.makeText(context, "Gagal mengunduh pembaruan.", Toast.LENGTH_LONG).show()
                isDownloading = false
                if (!isMandatory) {
                    onSplashComplete()
                } else {
                    statusText = "Gagal mengunduh pembaruan wajib."
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Terjadi kesalahan saat mengunduh.", Toast.LENGTH_LONG).show()
            isDownloading = false
            if (!isMandatory) {
                onSplashComplete()
            } else {
                statusText = "Gagal mengunduh pembaruan wajib."
            }
        }
    }

    LaunchedEffect(Unit) {
        currentVersionCode = UpdateManager.getCurrentVersionCode(context)
        currentVersionName = UpdateManager.getCurrentVersionName(context)

        // Animate splash in
        alpha.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 850)
        )
        scale.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 750)
        )
        
        statusText = "Memeriksa pembaruan..."
        delay(600) // Give short delay for visual transition

        try {
            val serverUrl = dataStoreManager.serverUrlFlow.first()
            if (serverUrl.isNotBlank()) {
                val apiService = RetrofitClient.getService(serverUrl)
                val response = apiService.checkUpdate(currentVersionCode)
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.update_available) {
                        updateAvailable = true
                        isMandatory = body.is_mandatory == true
                        updateVersionName = body.version_name ?: ""
                        updateVersionCode = body.version_code ?: 0
                        apkUrl = body.apk_url ?: ""
                        changelog = body.changelog ?: ""
                        statusText = "Pembaruan tersedia: v$updateVersionName"
                        isChecking = false
                        
                        if (isMandatory) {
                            startDownload(apkUrl)
                        }
                        return@LaunchedEffect
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // If no update or update check fails, continue to home
        isChecking = false
        statusText = "Memuat data..."
        delay(600)
        onSplashComplete()
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
                            Color.Black.copy(alpha = 0.48f),
                            Color(0xFF06363B).copy(alpha = 0.30f),
                            Color.Black.copy(alpha = 0.82f)
                        )
                    )
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxSize()
                .scale(scale.value)
                .alpha(alpha.value)
                .padding(horizontal = 48.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(176.dp)
                    .shadow(
                        elevation = 28.dp,
                        shape = CircleShape,
                        ambientColor = Color(0xFF2EBEC6).copy(alpha = 0.35f),
                        spotColor = Color(0xFFC6E618).copy(alpha = 0.28f)
                    )
                    .background(Color.White, CircleShape)
                    .border(3.dp, Color.White.copy(alpha = 0.88f), CircleShape)
                    .padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_kemenkes_rs_kariadi),
                    contentDescription = "Kemenkes RS Kariadi",
                    modifier = Modifier.fillMaxSize()
                )
            }

            Spacer(modifier = Modifier.height(26.dp))

            Text(
                text = "RSUP Dr. Kariadi",
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 0.5.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Rujukan Nasional • Kelas A • Pendidikan",
                color = Color(0xFFE9F7F6),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.8.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(42.dp))

            // Dynamic progress and action area based on update status
            if (isChecking) {
                CircularProgressIndicator(
                    color = Color(0xFF2EBEC6),
                    strokeWidth = 3.dp,
                    modifier = Modifier.size(38.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = statusText,
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
            } else if (updateAvailable && !isDownloading) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Pembaruan Tersedia!",
                        color = Color(0xFF2EBEC6),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Versi v$updateVersionName (Build $updateVersionCode)",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                    if (changelog.isNotBlank()) {
                        Text(
                            text = "Catatan: $changelog",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(top = 6.dp, bottom = 16.dp)
                        )
                    } else {
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    startDownload(apkUrl)
                                }
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF2EBEC6),
                                contentColor = Color.Black
                            ),
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Perbarui Sekarang", fontWeight = FontWeight.Bold)
                        }

                        if (!isMandatory) {
                            OutlinedButton(
                                onClick = onSplashComplete,
                                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.5f)),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Lanjutkan")
                            }
                        }
                    }
                }
            } else if (isDownloading) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    LinearProgressIndicator(
                        progress = { downloadProgress },
                        color = Color(0xFF2EBEC6),
                        trackColor = Color.White.copy(alpha = 0.2f),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(CircleShape)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = statusText,
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            } else {
                CircularProgressIndicator(
                    color = Color(0xFF2EBEC6),
                    strokeWidth = 3.dp,
                    modifier = Modifier.size(38.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = statusText,
                    color = Color.White.copy(alpha = 0.6f),
                    fontSize = 12.sp
                )
            }
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 24.dp)
                .alpha(alpha.value)
        ) {
            Text(
                text = "Hospital IPTV Service",
                color = Color.White.copy(alpha = 0.70f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp
            )
            if (currentVersionName.isNotBlank()) {
                Text(
                    text = "v$currentVersionName (Build $currentVersionCode)",
                    color = Color.White.copy(alpha = 0.40f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}
