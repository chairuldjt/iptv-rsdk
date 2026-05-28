package com.itops.iptvplayer.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import kotlin.math.min

data class RemoteKeyboardHint(
    val label: String,
    val accent: Color
)

data class RemoteKeyboardActionSpec(
    val label: String,
    val accentColor: Color,
    val textColor: Color = Color.White,
    val weight: Float = 1f,
    val onTrigger: ((String, Int) -> RemoteKeyboardStateUpdate)? = null
)

data class RemoteKeyboardStateUpdate(
    val text: String,
    val cursorIndex: Int
)

fun interface KeyboardLayoutProvider {
    fun build(uppercase: Boolean, symbolMode: Boolean): List<List<RemoteKeyboardKeySpec>>
}

data class RemoteKeyboardKeySpec(
    val label: String,
    val value: String = label,
    val weight: Float = 1f,
    val accentBackground: Color? = null,
    val accentTextColor: Color? = null,
    val action: ((String, Int) -> RemoteKeyboardStateUpdate)? = null
)

private val KeyboardPanel = Color(0xFF232A33)
private val KeyboardWell = Color(0xFF1D232B)
private val KeyBackground = Color(0xFF36404A)
private val KeyBackgroundAlt = Color(0xFF2D3640)
private val KeyFocusedBackground = Color(0xFFF4F5F7)
private val KeyFocusedText = Color(0xFF1C2025)
private val EnterKeyBackground = Color(0xFF475A70)

@Composable
fun RemoteKeyboardDialog(
    title: String,
    helperText: String,
    initialValue: String,
    onCommit: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    obscureText: Boolean = false,
    maxLength: Int = 160,
    hintChips: List<RemoteKeyboardHint> = emptyList(),
    blankPreviewText: String = "Tekan tombol keyboard",
    supportingText: (String) -> String = { value -> "${value.length}/$maxLength karakter" },
    layoutProvider: KeyboardLayoutProvider = KeyboardLayoutProvider(::defaultKeyboardRows),
    keyboardTitle: String = "Keyboard",
    clearLabel: String = "⌫",
    saveLabel: String = "→",
    cancelLabel: String = "Batal",
    modeToggleLabel: (Boolean) -> String = { if (it) "ABC" else "123?" },
    onSaveTransform: (String) -> String = { it },
    showHeader: Boolean = false
) {
    var text by remember(initialValue) { mutableStateOf(initialValue) }
    var uppercase by remember { mutableStateOf(false) }
    var symbolMode by remember { mutableStateOf(false) }
    var cursorIndex by remember(initialValue) { mutableIntStateOf(initialValue.length) }
    val rows = remember(uppercase, symbolMode, layoutProvider) { layoutProvider.build(uppercase, symbolMode) }
    val firstKeyFocusRequester = remember { FocusRequester() }
    val configuration = LocalConfiguration.current
    val screenWidthDp = configuration.screenWidthDp
    val screenHeightDp = configuration.screenHeightDp
    val isCompactWidth = screenWidthDp < 900
    val isCompactHeight = screenHeightDp < 720
    val isShortViewport = screenHeightDp < 820
    val dialogWidthFraction = when {
        screenWidthDp < 700 -> 0.995f
        screenWidthDp < 960 -> 0.985f
        else -> 0.95f
    }
    val dialogMaxWidth = when {
        screenWidthDp < 700 -> 900.dp
        screenWidthDp < 960 -> 1120.dp
        else -> 1240.dp
    }
    val outerPadding = when {
        isCompactWidth && isShortViewport -> 8.dp
        isCompactWidth -> 12.dp
        else -> 16.dp
    }
    val previewMinHeight = when {
        isCompactHeight -> 48.dp
        isShortViewport -> 56.dp
        else -> 72.dp
    }
    val previewTextSize = when {
        isCompactWidth && isShortViewport -> 14.sp
        isCompactWidth -> 16.sp
        else -> 19.sp
    }
    val bodyTextSize = if (isCompactWidth) 9.sp else 11.sp
    val panelSpacing = if (isCompactHeight) 6.dp else 10.dp
    val keyGap = when {
        isCompactWidth && isShortViewport -> 5.dp
        isCompactWidth -> 7.dp
        else -> 9.dp
    }
    val topRowHeight = when {
        isCompactHeight -> 34.dp
        isShortViewport -> 42.dp
        else -> 48.dp
    }
    val mainRowHeight = when {
        isCompactHeight -> 38.dp
        isShortViewport -> 48.dp
        else -> 58.dp
    }
    val actionRowHeight = when {
        isCompactHeight -> 38.dp
        isShortViewport -> 50.dp
        else -> 58.dp
    }
    val isUltraCompact = isCompactWidth && isCompactHeight
    val resolvedModeToggleLabel = if (isUltraCompact) {
        if (symbolMode) "Abc" else "123"
    } else {
        modeToggleLabel(symbolMode)
    }
    val resolvedClearLabel = "⌫"
    val resolvedCancelLabel = "✕"
    val resolvedSpaceLabel = if (isUltraCompact) "␠" else "␠"
    val modeToggleWeight = if (isUltraCompact) 1.05f else 1.2f
    val cursorWeight = if (isUltraCompact) 0.85f else 1f
    val spaceWeight = if (isUltraCompact) 2.5f else 3.2f
    val clearWeight = if (isUltraCompact) 0.95f else 1.1f
    val cancelWeight = if (isUltraCompact) 0.95f else 1.3f
    val saveWeight = if (isUltraCompact) 1.25f else 1.8f

    LaunchedEffect(Unit) {
        firstKeyFocusRequester.requestFocus()
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = modifier
                .fillMaxWidth(dialogWidthFraction)
                .widthIn(max = dialogMaxWidth)
                .shadow(
                    elevation = 40.dp,
                    shape = RoundedCornerShape(28.dp),
                    ambientColor = Color.Black.copy(alpha = 0.7f),
                    spotColor = Color.Black.copy(alpha = 0.7f)
                )
                .onPreviewKeyEvent { keyEvent ->
                    if (keyEvent.type != KeyEventType.KeyDown) {
                        return@onPreviewKeyEvent false
                    }

                    when (keyEvent.key) {
                        Key.Backspace -> {
                            val updated = deleteLeft(text, cursorIndex)
                            text = updated.text
                            cursorIndex = updated.cursorIndex
                            true
                        }
                        Key.DirectionLeft -> false
                        Key.DirectionRight -> false
                        else -> keyboardDigitFromKey(keyEvent.key)?.let { digit ->
                            val updated = insertText(text, cursorIndex, digit, maxLength)
                            text = updated.text
                            cursorIndex = updated.cursorIndex
                            true
                        } ?: false
                    }
                },
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.cardColors(containerColor = KeyboardPanel)
        ) {
            Column(
                modifier = Modifier.padding(horizontal = outerPadding, vertical = outerPadding),
                verticalArrangement = Arrangement.spacedBy(panelSpacing)
            ) {
                if (showHeader) {
                    Column(
                        modifier = Modifier.padding(horizontal = 4.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = title,
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = helperText,
                            color = Color(0xFFB4BDC8),
                            fontSize = 12.sp,
                            lineHeight = 16.sp
                        )
                    }
                }

                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = previewMinHeight),
                    shape = RoundedCornerShape(18.dp),
                    color = KeyboardWell,
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.06f))
                ) {
                    Column(
                        modifier = Modifier.padding(
                            horizontal = if (isCompactWidth) 12.dp else 18.dp,
                            vertical = if (isCompactHeight) 8.dp else 12.dp
                        ),
                        verticalArrangement = Arrangement.spacedBy(if (isCompactHeight) 4.dp else 5.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Preview",
                                color = Color(0xFF98A4B3),
                                fontSize = bodyTextSize,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = when {
                                    obscureText -> "Mode Rahasia"
                                    symbolMode -> "Simbol"
                                    uppercase -> "Huruf Besar"
                                    else -> "Huruf Kecil"
                                },
                                color = if (symbolMode || uppercase || obscureText) Color(0xFFE8EEF7) else Color(0xFF9DD9FF),
                                fontSize = bodyTextSize,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = previewTextWithCursor(text, cursorIndex, obscureText, blankPreviewText),
                            color = if (text.isBlank()) Color(0xFF6D7885) else Color.White,
                            fontSize = previewTextSize,
                            fontWeight = FontWeight.Medium,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = supportingText(text),
                            color = Color(0xFF98A4B3),
                            fontSize = bodyTextSize
                        )
                    }
                }

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(22.dp),
                    color = Color(0xFF1F252D),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.05f))
                ) {
                    Column(
                        modifier = Modifier.padding(if (isCompactWidth) 8.dp else 12.dp),
                        verticalArrangement = Arrangement.spacedBy(keyGap)
                    ) {
                        if (keyboardTitle.isNotBlank()) {
                            Text(
                                text = keyboardTitle,
                                color = Color.White.copy(alpha = 0.88f),
                                fontSize = if (isCompactWidth) 11.sp else 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        rows.forEachIndexed { rowIndex, row ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(keyGap)
                            ) {
                                row.forEachIndexed { keyIndex, spec ->
                                    WeightedKeyboardCell(
                                        weight = spec.weight,
                                        modifier = if (rowIndex == 0 && keyIndex == 0) Modifier.focusRequester(firstKeyFocusRequester) else Modifier
                                    ) { weightedModifier ->
                                        KeyboardKey(
                                            text = spec.label,
                                            modifier = weightedModifier.height(if (rowIndex == 0) topRowHeight else mainRowHeight),
                                            baseBackground = spec.accentBackground ?: if (rowIndex == 0) KeyBackground else KeyBackgroundAlt,
                                            focusedBackground = KeyFocusedBackground,
                                            baseTextColor = spec.accentTextColor ?: Color(0xFFE6EBF2),
                                            focusedTextColor = KeyFocusedText,
                                            textSize = if (rowIndex == 0) {
                                                if (isCompactWidth) 12.sp else 15.sp
                                            } else {
                                                if (isCompactWidth) 13.sp else 19.sp
                                            }
                                        ) {
                                            val updated = spec.action?.invoke(text, cursorIndex)
                                                ?: insertText(text, cursorIndex, spec.value, maxLength)
                                            text = updated.text
                                            cursorIndex = updated.cursorIndex
                                        }
                                    }
                                }
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(keyGap)
                        ) {
                            WeightedKeyboardCell(weight = modeToggleWeight) { weightedModifier ->
                                KeyboardActionKey(
                                    text = resolvedModeToggleLabel,
                                    modifier = weightedModifier.height(actionRowHeight),
                                    baseBackground = KeyBackground,
                                    focusedBackground = KeyFocusedBackground,
                                    baseTextColor = Color(0xFFE6EBF2),
                                    focusedTextColor = KeyFocusedText
                                ) {
                                    symbolMode = !symbolMode
                                    if (symbolMode) {
                                        uppercase = false
                                    }
                                }
                            }
                            WeightedKeyboardCell(weight = cursorWeight) { weightedModifier ->
                                KeyboardActionKey(
                                    text = "◀",
                                    modifier = weightedModifier.height(actionRowHeight),
                                    baseBackground = KeyBackground,
                                    focusedBackground = KeyFocusedBackground,
                                    baseTextColor = Color(0xFFE6EBF2),
                                    focusedTextColor = KeyFocusedText
                                ) {
                                    cursorIndex = maxOf(0, cursorIndex - 1)
                                }
                            }
                            WeightedKeyboardCell(weight = cursorWeight) { weightedModifier ->
                                KeyboardActionKey(
                                    text = "▶",
                                    modifier = weightedModifier.height(actionRowHeight),
                                    baseBackground = KeyBackground,
                                    focusedBackground = KeyFocusedBackground,
                                    baseTextColor = Color(0xFFE6EBF2),
                                    focusedTextColor = KeyFocusedText
                                ) {
                                    cursorIndex = min(text.length, cursorIndex + 1)
                                }
                            }
                            WeightedKeyboardCell(weight = spaceWeight) { weightedModifier ->
                                KeyboardActionKey(
                                    text = resolvedSpaceLabel,
                                    modifier = weightedModifier.height(actionRowHeight),
                                    baseBackground = KeyBackgroundAlt,
                                    focusedBackground = KeyFocusedBackground,
                                    baseTextColor = Color(0xFFE6EBF2),
                                    focusedTextColor = KeyFocusedText
                                ) {
                                    val updated = insertText(text, cursorIndex, " ", maxLength)
                                    text = updated.text
                                    cursorIndex = updated.cursorIndex
                                }
                            }
                            WeightedKeyboardCell(weight = clearWeight) { weightedModifier ->
                                KeyboardActionKey(
                                    text = resolvedClearLabel,
                                    modifier = weightedModifier.height(actionRowHeight),
                                    baseBackground = KeyBackground,
                                    focusedBackground = KeyFocusedBackground,
                                    baseTextColor = Color(0xFFE6EBF2),
                                    focusedTextColor = KeyFocusedText
                                ) {
                                    val updated = deleteLeft(text, cursorIndex)
                                    text = updated.text
                                    cursorIndex = updated.cursorIndex
                                }
                            }
                            WeightedKeyboardCell(weight = cancelWeight) { weightedModifier ->
                                KeyboardActionKey(
                                    text = resolvedCancelLabel,
                                    modifier = weightedModifier.height(actionRowHeight),
                                    baseBackground = KeyBackground,
                                    focusedBackground = KeyFocusedBackground,
                                    baseTextColor = Color(0xFFE6EBF2),
                                    focusedTextColor = KeyFocusedText,
                                    textSize = if (isCompactWidth) 11.sp else 15.sp
                                ) {
                                    onDismiss()
                                }
                            }
                            WeightedKeyboardCell(weight = saveWeight) { weightedModifier ->
                                KeyboardActionKey(
                                    text = saveLabel,
                                    modifier = weightedModifier.height(actionRowHeight),
                                    baseBackground = EnterKeyBackground,
                                    focusedBackground = Color.White,
                                    baseTextColor = Color.White,
                                    focusedTextColor = KeyFocusedText,
                                    textSize = if (isCompactWidth) 16.sp else 22.sp
                                ) {
                                    onCommit(onSaveTransform(text))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun defaultKeyboardRows(uppercase: Boolean, symbolMode: Boolean): List<List<RemoteKeyboardKeySpec>> {
    if (symbolMode) {
        return listOf(
            listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0"),
            listOf("!", "@", "#", "$", "%", "^", "&", "*", "(", ")"),
            listOf("-", "_", "=", "+", "/", "\\", ":", ";", "\"", "'"),
            listOf(".", ",", "?", "!", "[", "]", "{", "}", "<", ">")
                .map { RemoteKeyboardKeySpec(it) }
        ).map { row -> row.map { value -> if (value is String) RemoteKeyboardKeySpec(value) else value as RemoteKeyboardKeySpec } }
    }

    val topRow = listOf("1 !", "2 @", "3 #", "4 $", "5 %", "6 ^", "7 &", "8 *", "9 (", "0 )")
        .map {
            val pieces = it.split(" ")
            RemoteKeyboardKeySpec(label = pieces[0], value = pieces[0])
        }
    val qwerty = "qwertyuiop".map { char ->
        val display = if (uppercase) char.uppercaseChar().toString() else char.toString()
        RemoteKeyboardKeySpec(display, display)
    }
    val asdf = "asdfghjkl".map { char ->
        val display = if (uppercase) char.uppercaseChar().toString() else char.toString()
        RemoteKeyboardKeySpec(display, display)
    } + listOf(RemoteKeyboardKeySpec(".", "."))
    val zxcv = listOf(
        RemoteKeyboardKeySpec(
            label = if (uppercase) "⇩" else "⇧",
            value = "",
            weight = 1.15f,
            accentBackground = Color(0xFF3A4550),
            action = { text, cursor -> RemoteKeyboardStateUpdate(text, cursor) }
        )
    ) + "zxcvbnm".map { char ->
        val display = if (uppercase) char.uppercaseChar().toString() else char.toString()
        RemoteKeyboardKeySpec(display, display)
    } + listOf(
        RemoteKeyboardKeySpec(",", ","),
        RemoteKeyboardKeySpec("⌫", "", weight = 1.15f, accentBackground = Color(0xFF3A4550), action = ::deleteLeft)
    )

    return listOf(topRow, qwerty, asdf, zxcv)
}

private fun previewTextWithCursor(
    text: String,
    cursorIndex: Int,
    obscureText: Boolean,
    blankPreviewText: String
): String {
    if (text.isBlank()) return blankPreviewText
    val display = if (obscureText) "*".repeat(text.length) else text
    val safeCursor = cursorIndex.coerceIn(0, display.length)
    return display.substring(0, safeCursor) + "|" + display.substring(safeCursor)
}

private fun insertText(text: String, cursorIndex: Int, value: String, maxLength: Int): RemoteKeyboardStateUpdate {
    if (value.isEmpty() || text.length >= maxLength) {
        return RemoteKeyboardStateUpdate(text, cursorIndex.coerceIn(0, text.length))
    }
    val safeCursor = cursorIndex.coerceIn(0, text.length)
    val available = maxLength - text.length
    val insertValue = value.take(available)
    val newText = text.substring(0, safeCursor) + insertValue + text.substring(safeCursor)
    return RemoteKeyboardStateUpdate(newText, safeCursor + insertValue.length)
}

private fun deleteLeft(text: String, cursorIndex: Int): RemoteKeyboardStateUpdate {
    if (text.isEmpty()) return RemoteKeyboardStateUpdate(text, 0)
    val safeCursor = cursorIndex.coerceIn(0, text.length)
    if (safeCursor == 0) return RemoteKeyboardStateUpdate(text, 0)
    val newText = text.removeRange(safeCursor - 1, safeCursor)
    return RemoteKeyboardStateUpdate(newText, safeCursor - 1)
}

private fun keyboardDigitFromKey(key: Key): String? = when (key) {
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
private fun RowScope.WeightedKeyboardCell(
    weight: Float,
    modifier: Modifier = Modifier,
    content: @Composable (Modifier) -> Unit
) {
    content(modifier.weight(weight))
}

private fun isKeyboardConfirmKey(key: Key): Boolean {
    return key == Key.DirectionCenter || key == Key.Enter || key == Key.NumPadEnter
}

private fun Modifier.keyboardFocusGlow(
    shape: RoundedCornerShape = RoundedCornerShape(16.dp)
): Modifier = composed {
    var isFocused by remember { mutableStateOf(false) }
    this
        .shadow(
            elevation = if (isFocused) 18.dp else 0.dp,
            shape = shape,
            ambientColor = Color.White.copy(alpha = if (isFocused) 0.35f else 0f),
            spotColor = Color.White.copy(alpha = if (isFocused) 0.35f else 0f)
        )
        .onFocusChanged { isFocused = it.isFocused }
}

@Composable
private fun KeyboardHintChip(
    label: String,
    accent: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(accent.copy(alpha = 0.12f))
            .border(1.dp, accent.copy(alpha = 0.24f), RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 7.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = Color.White.copy(alpha = 0.88f),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1
        )
    }
}

@Composable
private fun KeyboardActionKey(
    text: String,
    modifier: Modifier = Modifier,
    baseBackground: Color,
    focusedBackground: Color,
    baseTextColor: Color,
    focusedTextColor: Color,
    textSize: androidx.compose.ui.unit.TextUnit = 20.sp,
    onClick: () -> Unit
) {
    KeyboardKey(
        text = text,
        modifier = modifier,
        baseBackground = baseBackground,
        focusedBackground = focusedBackground,
        baseTextColor = baseTextColor,
        focusedTextColor = focusedTextColor,
        textSize = textSize,
        onClick = onClick
    )
}

@Composable
private fun KeyboardKey(
    text: String,
    modifier: Modifier = Modifier,
    baseBackground: Color,
    focusedBackground: Color,
    baseTextColor: Color,
    focusedTextColor: Color,
    textSize: androidx.compose.ui.unit.TextUnit,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val creationTime = remember { System.currentTimeMillis() }

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .onFocusChanged { isFocused = it.isFocused }
            .onPreviewKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown && isKeyboardConfirmKey(keyEvent.key)) {
                    if (System.currentTimeMillis() - creationTime > 400) {
                        onClick()
                    }
                    true
                } else {
                    false
                }
            }
            .focusable()
            .keyboardFocusGlow(RoundedCornerShape(10.dp))
            .clip(RoundedCornerShape(10.dp))
            .background(if (isFocused) focusedBackground else baseBackground)
            .border(
                BorderStroke(
                    width = if (isFocused) 2.dp else 1.dp,
                    color = if (isFocused) Color.White.copy(alpha = 0.85f) else Color.Transparent
                ),
                RoundedCornerShape(10.dp)
            )
            .clickable {
                if (System.currentTimeMillis() - creationTime > 400) {
                    onClick()
                }
            }
    ) {
        Text(
            text = text,
            color = if (isFocused) focusedTextColor else baseTextColor,
            fontSize = textSize,
            fontWeight = FontWeight.Medium,
            maxLines = 1
        )
    }
}
