package com.example.rsdkiptvplayer.ui.components

import android.view.KeyEvent as AndroidKeyEvent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow

private fun remoteDigitFromKeyCode(keyCode: Int): String? = when (keyCode) {
    AndroidKeyEvent.KEYCODE_0, AndroidKeyEvent.KEYCODE_NUMPAD_0 -> "0"
    AndroidKeyEvent.KEYCODE_1, AndroidKeyEvent.KEYCODE_NUMPAD_1 -> "1"
    AndroidKeyEvent.KEYCODE_2, AndroidKeyEvent.KEYCODE_NUMPAD_2 -> "2"
    AndroidKeyEvent.KEYCODE_3, AndroidKeyEvent.KEYCODE_NUMPAD_3 -> "3"
    AndroidKeyEvent.KEYCODE_4, AndroidKeyEvent.KEYCODE_NUMPAD_4 -> "4"
    AndroidKeyEvent.KEYCODE_5, AndroidKeyEvent.KEYCODE_NUMPAD_5 -> "5"
    AndroidKeyEvent.KEYCODE_6, AndroidKeyEvent.KEYCODE_NUMPAD_6 -> "6"
    AndroidKeyEvent.KEYCODE_7, AndroidKeyEvent.KEYCODE_NUMPAD_7 -> "7"
    AndroidKeyEvent.KEYCODE_8, AndroidKeyEvent.KEYCODE_NUMPAD_8 -> "8"
    AndroidKeyEvent.KEYCODE_9, AndroidKeyEvent.KEYCODE_NUMPAD_9 -> "9"
    else -> null
}

@Composable
fun PinGridDialog(
    correctPin: String = "2468",
    onSuccess: () -> Unit,
    onDismiss: () -> Unit
) {
    var enteredPin by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf(false) }
    val firstButtonFocusRequester = remember { FocusRequester() }
    val pinLength = correctPin.length.coerceIn(4, 8)

    fun appendDigit(digit: String) {
        pinError = false
        if (enteredPin.length < pinLength) {
            enteredPin += digit
            if (enteredPin.length == pinLength) {
                if (enteredPin == correctPin) {
                    onSuccess()
                } else {
                    pinError = true
                    enteredPin = ""
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        firstButtonFocusRequester.requestFocus()
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .width(360.dp)
                .wrapContentHeight()
                .focusable()
                .onPreviewKeyEvent { keyEvent ->
                    if (keyEvent.type != KeyEventType.KeyDown) {
                        return@onPreviewKeyEvent false
                    }

                    val keyCode = keyEvent.nativeKeyEvent.keyCode
                    remoteDigitFromKeyCode(keyCode)?.let { digit ->
                        appendDigit(digit)
                        return@onPreviewKeyEvent true
                    }

                    when (keyCode) {
                        AndroidKeyEvent.KEYCODE_DEL,
                        AndroidKeyEvent.KEYCODE_FORWARD_DEL -> {
                            pinError = false
                            if (enteredPin.isNotEmpty()) {
                                enteredPin = enteredPin.dropLast(1)
                            }
                            true
                        }
                        AndroidKeyEvent.KEYCODE_CLEAR -> {
                            pinError = false
                            enteredPin = ""
                            true
                        }
                        AndroidKeyEvent.KEYCODE_BACK,
                        AndroidKeyEvent.KEYCODE_ESCAPE -> {
                            onDismiss()
                            true
                        }
                        else -> false
                    }
                }
                .border(1.dp, Color(0xFF334155), RoundedCornerShape(24.dp)),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xEC0F172A)) // Semi-transparent Slate Dark
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Technician Authentication",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Masukkan PIN untuk membuka Pengaturan",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                )

                // PIN indicator dots
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(bottom = 20.dp)
                ) {
                    for (i in 0 until pinLength) {
                        val isFilled = i < enteredPin.length
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .clip(CircleShape)
                                .background(
                                    if (pinError) Color(0xFFEF4444)
                                    else if (isFilled) Color(0xFF6366F1)
                                    else Color(0xFF334155)
                                )
                                .border(1.dp, Color(0xFF475569), CircleShape)
                        )
                    }
                }

                if (pinError) {
                    Text(
                        text = "PIN salah! Silakan coba lagi.",
                        color = Color(0xFFEF4444),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                }

                // Grid 0-9
                val buttons = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫")
                
                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.height(260.dp)
                ) {
                    items(buttons.size) { index ->
                        val text = buttons[index]
                        PinGridButton(
                            text = text,
                            focusRequester = if (index == 0) firstButtonFocusRequester else null,
                            onClick = {
                                pinError = false
                                when (text) {
                                    "C" -> enteredPin = ""
                                    "⌫" -> if (enteredPin.isNotEmpty()) {
                                        enteredPin = enteredPin.substring(0, enteredPin.length - 1)
                                    }
                                    else -> {
                                        appendDigit(text)
                                    }
                                }
                            }
                        )
                    }
                }

                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .padding(top = 16.dp)
                        .focusable()
                ) {
                    Text("Batal", color = Color(0xFF94A3B8))
                }
            }
        }
    }
}

@Composable
fun PinGridButton(
    text: String,
    focusRequester: FocusRequester? = null,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }

    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.15f else 1.0f,
        animationSpec = tween(150),
        label = "pin_button_scale"
    )

    OutlinedButton(
        onClick = onClick,
        modifier = Modifier
            .aspectRatio(1.2f)
            .scale(scale)
            .shadow(
                elevation = if (isFocused) 16.dp else 0.dp,
                shape = RoundedCornerShape(12.dp),
                ambientColor = Color.White.copy(alpha = if (isFocused) 0.9f else 0f),
                spotColor = Color.White.copy(alpha = if (isFocused) 0.9f else 0f)
            )
            .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .focusable()
            .onFocusChanged { isFocused = it.isFocused },
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = if (isFocused) Color(0xFF6366F1).copy(alpha = 0.28f) else Color(0xFF1E293B),
            contentColor = if (isFocused) Color.White else Color(0xFFCBD5E1)
        ),
        border = BorderStroke(
            width = if (isFocused) 3.dp else 1.dp,
            color = if (isFocused) Color.White else Color(0xFF334155)
        )
    ) {
        Text(
            text = text,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
    }
}
