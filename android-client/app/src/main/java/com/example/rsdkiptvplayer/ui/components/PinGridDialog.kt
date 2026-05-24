package com.example.rsdkiptvplayer.ui.components

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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

private fun remoteDigitFromKey(key: Key): String? = when (key) {
    Key.Zero -> "0"
    Key.One -> "1"
    Key.Two -> "2"
    Key.Three -> "3"
    Key.Four -> "4"
    Key.Five -> "5"
    Key.Six -> "6"
    Key.Seven -> "7"
    Key.Eight -> "8"
    Key.Nine -> "9"
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
    val focusRequester = remember { FocusRequester() }
    val pinLength = correctPin.length.coerceIn(4, 8)

    fun appendPinDigit(digit: String) {
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

    fun deletePinDigit() {
        pinError = false
        enteredPin = enteredPin.dropLast(1)
    }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .width(360.dp)
                .wrapContentHeight()
                .border(1.dp, Color(0xFFFFE9A6).copy(alpha = 0.28f), RoundedCornerShape(24.dp)),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xEE07111D))
        ) {
            Column(
                modifier = Modifier
                    .padding(28.dp)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Akses Teknisi",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Masukkan PIN untuk membuka Pengaturan",
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.62f),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 4.dp, bottom = 20.dp)
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    repeat(pinLength) { index ->
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color.Black.copy(alpha = 0.30f))
                                .border(
                                    BorderStroke(
                                        2.dp,
                                        if (index == enteredPin.length) Color(0xFFFFE9A6) else Color.White.copy(alpha = 0.16f)
                                    ),
                                    RoundedCornerShape(10.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (index < enteredPin.length) "*" else "",
                                color = Color.White,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                if (pinError) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "PIN salah! Silakan coba lagi.",
                        color = Color(0xFFEF4444),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    userScrollEnabled = false,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(260.dp)
                        .onPreviewKeyEvent { keyEvent ->
                            if (keyEvent.type != KeyEventType.KeyDown) {
                                return@onPreviewKeyEvent false
                            }

                            when (keyEvent.key) {
                                Key.Backspace -> {
                                    deletePinDigit()
                                    true
                                }
                                else -> remoteDigitFromKey(keyEvent.key)?.let {
                                    appendPinDigit(it)
                                    true
                                } ?: false
                            }
                        }
                ) {
                    val keys = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "Hapus", "0", "Batal")
                    items(keys.size) { index ->
                        val key = keys[index]
                        PinGridButton(
                            text = key,
                            focusRequester = if (index == 0) focusRequester else null
                        ) {
                            when (key) {
                                "Hapus" -> deletePinDigit()
                                "Batal" -> onDismiss()
                                else -> appendPinDigit(key)
                            }
                        }
                    }
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

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = if (isFocused) Color(0xFFFFE9A6) else Color.Black.copy(alpha = 0.36f),
        contentColor = if (isFocused) Color.Black else Color.White,
        border = BorderStroke(
            width = if (isFocused) 4.dp else 1.dp,
            color = if (isFocused) Color.White else Color.White.copy(alpha = 0.18f)
        ),
        modifier = Modifier
            .height(54.dp)
            .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .shadow(
                elevation = if (isFocused) 28.dp else 0.dp,
                shape = RoundedCornerShape(12.dp),
                ambientColor = Color.White.copy(alpha = if (isFocused) 1f else 0f),
                spotColor = Color.White.copy(alpha = if (isFocused) 1f else 0f)
            )
            .scale(if (isFocused) 1.04f else 1f)
            .onFocusChanged { isFocused = it.isFocused }
            .onPreviewKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown &&
                    (keyEvent.key == Key.DirectionCenter || keyEvent.key == Key.Enter)
                ) {
                    onClick()
                    true
                } else {
                    false
                }
            }
            .focusable()
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            Text(
                text = text,
                fontSize = if (text.length == 1) 18.sp else 13.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                color = if (isFocused) Color.Black else Color.White,
                maxLines = 1
            )
        }
    }
}
