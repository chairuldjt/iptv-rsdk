package com.itops.iptvplayer.ui.components

import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * CompositionLocal yang menyimpan multiplier skala UI.
 * Default 1.0f = normal. Inject dari HomeScreen sebelum render konten.
 */
val LocalUiScale = compositionLocalOf { 1.0f }

/**
 * Konversi Int (dp value) ke Dp yang sudah di-scale.
 * Contoh: 164.scaledDp() dengan multiplier 0.8f = 131.2.dp
 */
@androidx.compose.runtime.Composable
fun Int.scaledDp(): Dp {
    val multiplier = LocalUiScale.current
    return (this * multiplier).dp
}

/**
 * Konversi Float (dp value) ke Dp yang sudah di-scale.
 */
@androidx.compose.runtime.Composable
fun Float.scaledDp(): Dp {
    val multiplier = LocalUiScale.current
    return (this * multiplier).dp
}

/**
 * Konversi Int (sp value) ke TextUnit yang sudah di-scale.
 * Contoh: 17.scaledSp() dengan multiplier 0.8f = 13.6.sp
 */
@androidx.compose.runtime.Composable
fun Int.scaledSp(): TextUnit {
    val multiplier = LocalUiScale.current
    return (this * multiplier).sp
}

/**
 * Konversi Float (sp value) ke TextUnit yang sudah di-scale.
 */
@androidx.compose.runtime.Composable
fun Float.scaledSp(): TextUnit {
    val multiplier = LocalUiScale.current
    return (this * multiplier).sp
}
