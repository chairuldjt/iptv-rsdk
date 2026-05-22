package com.example.rsdkiptvplayer.ui.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.rsdkiptvplayer.R
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    onSplashComplete: () -> Unit
) {
    val alpha = remember { Animatable(0f) }
    val scale = remember { Animatable(0.88f) }

    LaunchedEffect(Unit) {
        alpha.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 850)
        )
        scale.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 750)
        )
        delay(1300)
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

            CircularProgressIndicator(
                color = Color(0xFF2EBEC6),
                strokeWidth = 3.dp,
                modifier = Modifier.size(38.dp)
            )
        }

        Text(
            text = "Hospital IPTV Service",
            color = Color.White.copy(alpha = 0.70f),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 34.dp)
                .alpha(alpha.value)
        )
    }
}
