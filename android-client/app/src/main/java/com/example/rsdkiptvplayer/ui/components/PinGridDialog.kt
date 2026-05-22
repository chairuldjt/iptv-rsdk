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
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

@Composable
fun PinGridDialog(
    correctPin: String = "2468",
    onSuccess: () -> Unit,
    onDismiss: () -> Unit
) {
    var enteredPin by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .width(360.dp)
                .wrapContentHeight()
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
                    text = "Masukkan PIN 4-digit untuk membuka Pengaturan",
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
                    for (i in 0 until 4) {
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
                            onClick = {
                                pinError = false
                                when (text) {
                                    "C" -> enteredPin = ""
                                    "⌫" -> if (enteredPin.isNotEmpty()) {
                                        enteredPin = enteredPin.substring(0, enteredPin.length - 1)
                                    }
                                    else -> {
                                        if (enteredPin.length < 4) {
                                            enteredPin += text
                                            if (enteredPin.length == 4) {
                                                if (enteredPin == correctPin) {
                                                    onSuccess()
                                                } else {
                                                    pinError = true
                                                    enteredPin = ""
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        )
                    }
                }

                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.padding(top = 16.dp)
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
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }

    OutlinedButton(
        onClick = onClick,
        modifier = Modifier
            .aspectRatio(1.2f)
            .focusable()
            .onFocusChanged { isFocused = it.isFocused },
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = if (isFocused) Color(0xFF6366F1).copy(alpha = 0.2f) else Color(0xFF1E293B),
            contentColor = if (isFocused) Color.White else Color(0xFFCBD5E1)
        ),
        border = BorderStroke(
            width = if (isFocused) 2.dp else 1.dp,
            color = if (isFocused) Color(0xFF6366F1) else Color(0xFF334155)
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
