package com.itops.iptvplayer.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.itops.iptvplayer.util.HomeExperienceParser
import com.itops.iptvplayer.util.HomeExperienceRunningText
import com.itops.iptvplayer.util.RunningTextStyle
import kotlin.math.roundToInt

@Composable
fun AppRunningTextBanner(runningText: HomeExperienceRunningText) {
    val style = runningText.style
    val items = remember(runningText.items) {
        runningText.items.filter { it.enabled && it.text.isNotBlank() }
    }

    if (!runningText.enabled || items.isEmpty()) return

    val displayText = remember(items, style.separator, style.textTransform) {
        val joined = items.joinToString(style.separator) { it.text }
        applyTextTransform(joined, style.textTransform)
    }

    val bgColor = remember(style.bgColor, style.bgOpacity) {
        HomeExperienceParser.colorOrDefault(style.bgColor, Color(0xFF121A24))
            .copy(alpha = (style.bgOpacity / 100f).coerceIn(0f, 1f))
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(bgColor)
            .padding(horizontal = 7.dp, vertical = style.paddingY.coerceIn(0, 60).dp)
    ) {
        RunningTextLane(
            text = displayText,
            loopDurationSeconds = runningText.rotationSeconds,
            style = style,
            reverseDirection = style.direction == "right"
        )
    }
}

@Composable
private fun RunningTextLane(
    text: String,
    loopDurationSeconds: Int,
    style: RunningTextStyle,
    reverseDirection: Boolean = false
) {
    var containerWidthPx by remember(text) { mutableIntStateOf(0) }
    var textWidthPx by remember(text) { mutableIntStateOf(0) }
    val offsetX = remember(text) { Animatable(0f) }
    val durationMillis = loopDurationSeconds.coerceAtLeast(1) * 1000

    LaunchedEffect(text, containerWidthPx, textWidthPx, durationMillis, reverseDirection) {
        if (containerWidthPx <= 0 || textWidthPx <= 0) return@LaunchedEffect
        while (true) {
            if (reverseDirection) {
                offsetX.snapTo(-textWidthPx.toFloat())
                offsetX.animateTo(
                    targetValue = containerWidthPx.toFloat(),
                    animationSpec = tween(durationMillis = durationMillis, easing = LinearEasing)
                )
            } else {
                offsetX.snapTo(containerWidthPx.toFloat())
                offsetX.animateTo(
                    targetValue = -textWidthPx.toFloat(),
                    animationSpec = tween(durationMillis = durationMillis, easing = LinearEasing)
                )
            }
        }
    }

    val textColor = remember(style.textColor) {
        HomeExperienceParser.colorOrDefault(style.textColor, Color(0xFFFFF3C7))
    }

    val fontWeight = remember(style.fontWeight) {
        when (style.fontWeight) {
            "bold" -> FontWeight.Bold
            "bolder" -> FontWeight.ExtraBold
            "lighter" -> FontWeight.Light
            else -> FontWeight.Normal
        }
    }

    val fontStyle = remember(style.fontStyle) {
        if (style.fontStyle == "italic") FontStyle.Italic else FontStyle.Normal
    }

    val fontFamily = remember(style.fontFamily) {
        resolveFontFamily(style.fontFamily)
    }

    val shadow = remember(style.textShadow) {
        if (style.textShadow) Shadow(
            color = Color.Black.copy(alpha = 0.7f),
            offset = Offset(1f, 1f),
            blurRadius = 3f
        ) else null
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .onSizeChanged { containerWidthPx = it.width }
    ) {
        Text(
            text = text,
            color = textColor,
            fontSize = style.fontSize.coerceIn(10, 120).sp,
            fontWeight = fontWeight,
            fontStyle = fontStyle,
            fontFamily = fontFamily,
            maxLines = 1,
            softWrap = false,
            overflow = TextOverflow.Visible,
            style = TextStyle(
                shadow = shadow
            ),
            modifier = Modifier
                .offset { IntOffset(offsetX.value.roundToInt(), 0) }
                .onSizeChanged { textWidthPx = it.width }
                .padding(horizontal = 9.dp)
        )
    }
}

private fun resolveFontFamily(name: String): FontFamily {
    return when (name.lowercase().trim()) {
        "serif", "georgia", "times new roman" -> FontFamily.Serif
        "monospace", "courier new" -> FontFamily.Monospace
        "cursive" -> FontFamily.Cursive
        else -> FontFamily.SansSerif
    }
}

private fun applyTextTransform(text: String, transform: String): String {
    return when (transform) {
        "uppercase" -> text.uppercase()
        "lowercase" -> text.lowercase()
        "capitalize" -> text.split(" ").joinToString(" ") { word ->
            word.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        }
        else -> text
    }
}
