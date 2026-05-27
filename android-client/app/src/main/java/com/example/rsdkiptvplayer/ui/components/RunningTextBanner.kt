package com.example.rsdkiptvplayer.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.rsdkiptvplayer.util.HomeExperienceRunningText
import kotlin.math.roundToInt

@Composable
fun AppRunningTextBanner(runningText: HomeExperienceRunningText) {
    val items = remember(runningText.items) {
        runningText.items.filter { it.enabled && it.text.isNotBlank() }
    }

    if (!runningText.enabled || items.isEmpty()) return

    val displayText = remember(items) {
        items.joinToString("   |   ") { it.text }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(Color(0xE0121A24))
            .border(1.dp, Color(0xFFFFE9A6).copy(alpha = 0.14f), RoundedCornerShape(10.dp))
            .padding(horizontal = 7.dp, vertical = 3.dp)
    ) {
        RunningTextLane(
            text = displayText,
            loopDurationSeconds = runningText.rotationSeconds
        )
    }
}

@Composable
private fun RunningTextLane(
    text: String,
    loopDurationSeconds: Int
) {
    var containerWidthPx by remember(text) { mutableIntStateOf(0) }
    var textWidthPx by remember(text) { mutableIntStateOf(0) }
    val offsetX = remember(text) { Animatable(0f) }
    val durationMillis = loopDurationSeconds.coerceAtLeast(1) * 1000

    LaunchedEffect(text, containerWidthPx, textWidthPx, durationMillis) {
        if (containerWidthPx <= 0 || textWidthPx <= 0) return@LaunchedEffect
        while (true) {
            offsetX.snapTo(containerWidthPx.toFloat())
            offsetX.animateTo(
                targetValue = -textWidthPx.toFloat(),
                animationSpec = tween(durationMillis = durationMillis, easing = LinearEasing)
            )
        }
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(7.dp))
            .background(Color.White.copy(alpha = 0.035f))
            .onSizeChanged { containerWidthPx = it.width }
            .padding(vertical = 2.dp)
    ) {
        Text(
            text = text,
            color = Color(0xFFFFF3C7),
            fontSize = 9.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            softWrap = false,
            modifier = Modifier
                .offset { IntOffset(offsetX.value.roundToInt(), 0) }
                .onSizeChanged { textWidthPx = it.width }
                .padding(horizontal = 9.dp)
        )
    }
}
