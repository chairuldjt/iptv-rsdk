package com.example.rsdkiptvplayer.ui.splash

import android.media.AudioAttributes
import android.media.SoundPool
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
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
import com.example.rsdkiptvplayer.R
import com.example.rsdkiptvplayer.util.UpdateManager
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    onSplashComplete: () -> Unit
) {
    val context = LocalContext.current
    val alpha = remember { Animatable(0f) }
    val scale = remember { Animatable(0.88f) }
    val soundPool = remember {
        SoundPool.Builder()
            .setMaxStreams(1)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .build()
    }

    var currentVersionName by remember { mutableStateOf("") }
    var currentVersionCode by remember { mutableIntStateOf(0) }
    var splashSoundId by remember { mutableIntStateOf(0) }

    DisposableEffect(Unit) {
        soundPool.setOnLoadCompleteListener { _, sampleId, status ->
            if (status == 0) {
                soundPool.play(sampleId, 1.0f, 1.0f, 1, 0, 1.0f)
            }
        }
        splashSoundId = soundPool.load(context, R.raw.splash_opening_chime, 1)
        onDispose {
            soundPool.release()
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
        
        delay(1200) // Delay before transitioning to home screen
        onSplashComplete()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(id = R.drawable.global_home_bg),
            contentDescription = "Hospitality IPTV background",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.42f),
                            Color(0xFF092A2A).copy(alpha = 0.24f),
                            Color.Black.copy(alpha = 0.84f)
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
                        ambientColor = Color(0xFF2EE6C6).copy(alpha = 0.34f),
                        spotColor = Color(0xFFFFD166).copy(alpha = 0.30f)
                    )
                    .background(Color(0xFF071217), CircleShape)
                    .border(2.dp, Color.White.copy(alpha = 0.24f), CircleShape)
                    .padding(14.dp),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_global_iptv),
                    contentDescription = "Hospitality IPTV",
                    modifier = Modifier.fillMaxSize()
                )
            }

            Spacer(modifier = Modifier.height(26.dp))

            Text(
                text = "Hospitality IPTV",
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 0.5.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Live TV • Guest Services • Education",
                color = Color(0xFFE9F7F6),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.8.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(42.dp))

            CircularProgressIndicator(
                color = Color(0xFF2EE6C6),
                strokeWidth = 3.dp,
                modifier = Modifier.size(38.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Preparing your experience...",
                color = Color.White.copy(alpha = 0.6f),
                fontSize = 12.sp
            )
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 24.dp)
                .alpha(alpha.value)
        ) {
            Text(
                text = "PREMIUM IPTV PLATFORM",
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
