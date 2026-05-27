package com.example.rsdkiptvplayer.ui.settings

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import kotlinx.coroutines.launch
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.widget.Toast
import com.example.rsdkiptvplayer.R
import com.example.rsdkiptvplayer.util.AutostartPermissionHelper
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.ui.text.style.TextAlign
import com.example.rsdkiptvplayer.ui.components.PinGridButton
import com.example.rsdkiptvplayer.ui.components.RemoteKeyboardDialog

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

private fun Modifier.settingsFocusGlow(
    shape: RoundedCornerShape = RoundedCornerShape(10.dp)
): Modifier = composed {
    var isFocused by remember { mutableStateOf(false) }
    this
        .shadow(
            elevation = if (isFocused) 22.dp else 0.dp,
            shape = shape,
            ambientColor = Color.White.copy(alpha = if (isFocused) 0.95f else 0f),
            spotColor = Color.White.copy(alpha = if (isFocused) 0.95f else 0f)
        )
        .border(
            BorderStroke(
                if (isFocused) 3.dp else 0.dp,
                if (isFocused) Color.White else Color.Transparent
            ),
            shape
        )
        .onFocusChanged { isFocused = it.isFocused }
}

private val SettingsAccent = Color(0xFFFFE9A6)
private val SettingsCyan = Color(0xFF7DD3FC)
private val SettingsPanel = Color.Black.copy(alpha = 0.42f)

@Composable
private fun SettingsTextFieldFrame(
    isFocused: Boolean,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .shadow(
                elevation = if (isFocused) 24.dp else 0.dp,
                shape = RoundedCornerShape(8.dp),
                ambientColor = Color.White.copy(alpha = if (isFocused) 0.92f else 0f),
                spotColor = Color.White.copy(alpha = if (isFocused) 0.92f else 0f)
            )
            .border(
                BorderStroke(
                    if (isFocused) 3.dp else 0.dp,
                    if (isFocused) Color.White else Color.Transparent
                ),
                RoundedCornerShape(8.dp)
            )
            .padding(if (isFocused) 3.dp else 0.dp)
    ) {
        content()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SettingsOutlinedTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    obscureText: Boolean = false,
    onFocusChanged: (Boolean) -> Unit = {}
) {
    var isFocused by remember { mutableStateOf(false) }
    var showKeyboard by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    val displayValue = if (obscureText && value.isNotEmpty()) "*".repeat(value.length) else value

    if (showKeyboard) {
        RemoteTextKeyboardDialog(
            title = label,
            initialValue = value,
            obscureText = obscureText,
            onCommit = {
                onValueChange(it)
                showKeyboard = false
                onFocusChanged(false)
            },
            onDismiss = {
                showKeyboard = false
                onFocusChanged(false)
            }
        )
    }

    SettingsTextFieldFrame(isFocused = isFocused && enabled, modifier = modifier) {
        Surface(
            enabled = enabled,
            onClick = {
                showKeyboard = true
                onFocusChanged(true)
            },
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp)
                .onPreviewKeyEvent { keyEvent ->
                    if (keyEvent.type != KeyEventType.KeyDown) {
                        return@onPreviewKeyEvent false
                    }

                    when (keyEvent.key) {
                        Key.Escape, Key.Back -> {
                            showKeyboard = false
                            onFocusChanged(false)
                            true
                        }
                        Key.Enter, Key.DirectionCenter -> {
                            showKeyboard = true
                            onFocusChanged(true)
                            true
                        }
                        Key.DirectionUp -> {
                            focusManager.moveFocus(FocusDirection.Up)
                            true
                        }
                        Key.DirectionDown -> {
                            focusManager.moveFocus(FocusDirection.Down)
                            true
                        }
                        Key.DirectionLeft -> {
                            focusManager.moveFocus(FocusDirection.Left)
                            true
                        }
                        Key.DirectionRight -> {
                            focusManager.moveFocus(FocusDirection.Right)
                            true
                        }
                        else -> false
                    }
                }
                .onFocusChanged {
                    isFocused = it.isFocused
                    onFocusChanged(it.isFocused)
                },
            shape = RoundedCornerShape(8.dp),
            color = if (enabled) Color(0xFF0F172A) else Color(0xFF020617),
            contentColor = if (enabled) Color.White else Color(0xFF94A3B8),
            border = BorderStroke(1.dp, if (isFocused && enabled) Color.White else Color(0xFF334155))
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = label,
                    color = if (isFocused && enabled) Color.White else Color(0xFF94A3B8),
                    fontSize = 11.sp,
                    maxLines = 1
                )
                Text(
                    text = displayValue.ifBlank { "Tekan OK untuk mengetik" },
                    color = if (displayValue.isBlank()) Color(0xFF64748B) else Color.White,
                    fontSize = 15.sp,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
private fun RemoteTextKeyboardDialog(
    title: String,
    initialValue: String,
    obscureText: Boolean,
    onCommit: (String) -> Unit,
    onDismiss: () -> Unit
) {
    RemoteKeyboardDialog(
        title = title,
        helperText = "Navigasi dengan D-pad. Tombol angka remote bisa dipakai langsung. Backspace untuk hapus cepat.",
        initialValue = initialValue,
        onCommit = onCommit,
        onDismiss = onDismiss,
        obscureText = obscureText,
        maxLength = 160,
        keyboardTitle = "",
        blankPreviewText = "Tekan tombol huruf, angka, atau pilih dari keyboard",
        clearLabel = "Clear"
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    initialTabIdx: Int = 0,
    viewModel: SettingsViewModel = viewModel()
) {
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current

    // Launcher untuk RoleManager.ROLE_HOME (Android 10+)
    val roleRequestLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { /* result diabaikan — user sudah memilih atau membatalkan di dialog sistem */ }
    val configuration = LocalConfiguration.current
    val screenWidth = configuration.screenWidthDp
    val screenHeight = configuration.screenHeightDp
    val isSmallScreen = screenWidth < 760 || screenHeight < 500
    val isCompactHeight = screenHeight < 450
    val deviceId by viewModel.deviceId.collectAsState()
    val serverUrl by viewModel.serverUrl.collectAsState()
    val serverApiEnabled by viewModel.serverApiEnabled.collectAsState()
    val aspectRatio by viewModel.aspectRatio.collectAsState()
    val lockSettings by viewModel.lockSettings.collectAsState()
    val technicianPin by viewModel.technicianPin.collectAsState()
    val autoStart by viewModel.autoStart.collectAsState()
    val diagnosticLogs by viewModel.diagnosticLogs.collectAsState()
    val connectionResult by viewModel.connectionTestResult.collectAsState()
    val isTesting by viewModel.isTestingConnection.collectAsState()

    val syncMode by viewModel.syncMode.collectAsState()
    val customM3uUrl by viewModel.customM3uUrl.collectAsState()
    val educationVideoPath by viewModel.educationVideoPath.collectAsState()
    val educationSmbUsername by viewModel.educationSmbUsername.collectAsState()
    val educationSmbPassword by viewModel.educationSmbPassword.collectAsState()
    val educationSmbDomain by viewModel.educationSmbDomain.collectAsState()
    val educationSource by viewModel.educationSource.collectAsState()
    val educationPlaybackMode by viewModel.educationPlaybackMode.collectAsState()
    val m3uSyncResult by viewModel.m3uSyncResult.collectAsState()
    val isSyncingM3u by viewModel.isSyncingM3u.collectAsState()
    var activeMenuIdx by remember { mutableStateOf(initialTabIdx) }
    var inputUrlText by remember { mutableStateOf("") }
    var inputM3uText by remember { mutableStateOf("") }
    var inputEducationPathText by remember { mutableStateOf("") }
    var inputEducationUsernameText by remember { mutableStateOf("") }
    var inputEducationPasswordText by remember { mutableStateOf("") }
    var inputEducationDomainText by remember { mutableStateOf("") }
    var inputEducationSource by remember { mutableStateOf("smb") }
    var inputEducationPlaybackMode by remember { mutableStateOf("copy") }
    var isTextInputFocused by remember { mutableStateOf(false) }
    val sidebarListState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    var isUnlockedSession by remember { mutableStateOf(false) }
    var enteredPin by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf(false) }
    val firstButtonFocusRequester = remember { FocusRequester() }
    val pinLength = technicianPin.length.coerceIn(4, 8)

    fun appendPinDigit(digit: String) {
        pinError = false
        if (enteredPin.length < pinLength) {
            enteredPin += digit
            if (enteredPin.length == pinLength) {
                if (enteredPin == technicianPin) {
                    isUnlockedSession = true
                    Toast.makeText(context, "Akses dibuka.", Toast.LENGTH_SHORT).show()
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
    
    LaunchedEffect(serverUrl) {
        inputUrlText = serverUrl
    }

    LaunchedEffect(customM3uUrl) {
        inputM3uText = customM3uUrl
    }

    LaunchedEffect(educationVideoPath) {
        inputEducationPathText = educationVideoPath
    }

    LaunchedEffect(educationSmbUsername) {
        inputEducationUsernameText = educationSmbUsername
    }

    LaunchedEffect(educationSmbPassword) {
        inputEducationPasswordText = educationSmbPassword
    }

    LaunchedEffect(educationSmbDomain) {
        inputEducationDomainText = educationSmbDomain
    }

    LaunchedEffect(educationSource) {
        inputEducationSource = educationSource
    }

    LaunchedEffect(educationPlaybackMode) {
        inputEducationPlaybackMode = educationPlaybackMode
    }

    BackHandler {
        if (isTextInputFocused) {
            focusManager.clearFocus(force = true)
            isTextInputFocused = false
        } else {
            onBack()
        }
    }

    val menus = listOf(
        "Koneksi & Server API",
        "Diagnostik & Log Lokal",
        "Manajemen Perangkat",
        "Setelan Tampilan & Boot",
        "Konten Edukasi",
        "Playlist M3U Kustom"
    )
    val menuFocusRequesters = remember { List(menus.size) { FocusRequester() } }
    var focusedMenuIdx by remember { mutableIntStateOf(initialTabIdx.coerceIn(menus.indices)) }

    LaunchedEffect(initialTabIdx, lockSettings, isUnlockedSession) {
        if (!lockSettings || isUnlockedSession) {
            focusedMenuIdx = activeMenuIdx.coerceIn(menus.indices)
            menuFocusRequesters[focusedMenuIdx].requestFocus()
        }
    }

    LaunchedEffect(lockSettings, isUnlockedSession) {
        if (lockSettings && !isUnlockedSession) {
            firstButtonFocusRequester.requestFocus()
        }
    }

    fun moveSidebarFocus(delta: Int) {
        focusedMenuIdx = (focusedMenuIdx + delta).coerceIn(menus.indices)
        menuFocusRequesters[focusedMenuIdx].requestFocus()
        coroutineScope.launch {
            sidebarListState.animateScrollToItem(focusedMenuIdx)
        }
    }

    fun selectFocusedMenu() {
        activeMenuIdx = focusedMenuIdx
        menuFocusRequesters[focusedMenuIdx].requestFocus()
        coroutineScope.launch {
            sidebarListState.animateScrollToItem(focusedMenuIdx)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF050B12))
            .padding(horizontal = 22.dp, vertical = 14.dp)
    ) {
        Image(
            painter = painterResource(id = R.drawable.home_bg_settings),
            contentDescription = null,
            modifier = Modifier
                .matchParentSize()
                .alpha(0.42f),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .matchParentSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.Black.copy(alpha = 0.30f),
                            Color(0xFF07131D).copy(alpha = 0.58f),
                            Color.Black.copy(alpha = 0.82f)
                        )
                    )
                )
        )
        if (lockSettings && !isUnlockedSession) {
            var showPinKeypad by remember { mutableStateOf(false) }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Card(
                    modifier = Modifier
                        .width(if (isSmallScreen) 330.dp else 420.dp)
                        .wrapContentHeight()
                        .border(1.dp, SettingsAccent.copy(alpha = 0.30f), RoundedCornerShape(if (isSmallScreen) 16.dp else 28.dp)),
                    shape = RoundedCornerShape(if (isSmallScreen) 16.dp else 28.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xE607111D))
                ) {
                    Column(
                        modifier = Modifier
                            .padding(if (isSmallScreen) 16.dp else 32.dp)
                            .fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        if (!showPinKeypad) {
                            Box(
                                modifier = Modifier
                                    .size(if (isSmallScreen) 54.dp else 86.dp)
                                    .clip(RoundedCornerShape(if (isSmallScreen) 14.dp else 22.dp))
                                    .background(SettingsAccent.copy(alpha = 0.12f))
                                    .border(1.dp, SettingsAccent.copy(alpha = 0.36f), RoundedCornerShape(if (isSmallScreen) 14.dp else 22.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    painter = painterResource(id = R.drawable.ic_home_settings),
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(if (isSmallScreen) 26.dp else 42.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(if (isSmallScreen) 10.dp else 18.dp))
                            Text(
                                text = "AKSES TEKNISI",
                                fontSize = if (isSmallScreen) 16.sp else 22.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White
                            )
                            Text(
                                text = "Masukkan PIN untuk membuka konfigurasi perangkat.",
                                fontSize = if (isSmallScreen) 11.sp else 14.sp,
                                color = Color(0xFF94A3B8),
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(top = if (isSmallScreen) 4.dp else 8.dp, bottom = if (isSmallScreen) 14.dp else 28.dp)
                            )

                            Button(
                                onClick = { showPinKeypad = true },
                                colors = ButtonDefaults.buttonColors(containerColor = SettingsAccent, contentColor = Color.Black),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(if (isSmallScreen) 42.dp else 54.dp)
                                    .settingsFocusGlow(RoundedCornerShape(12.dp))
                                    .focusRequester(firstButtonFocusRequester)
                            ) {
                                Text("BUKA KUNCI", fontWeight = FontWeight.Bold, fontSize = if (isSmallScreen) 13.sp else 16.sp)
                            }

                            Spacer(modifier = Modifier.height(if (isSmallScreen) 8.dp else 12.dp))

                            OutlinedButton(
                                onClick = onBack,
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                                border = BorderStroke(1.dp, Color(0xFF475569)),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(if (isSmallScreen) 42.dp else 54.dp)
                                    .settingsFocusGlow(RoundedCornerShape(12.dp))
                            ) {
                                Text("Kembali", fontSize = if (isSmallScreen) 13.sp else 16.sp)
                            }
                        } else {
                            // PIN Input UI
                            Text(
                                text = "MASUKKAN PIN TEKNISI",
                                fontSize = if (isSmallScreen) 14.sp else 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Masukkan PIN untuk akses penuh",
                                fontSize = if (isSmallScreen) 10.sp else 12.sp,
                                color = Color(0xFF94A3B8),
                                modifier = Modifier.padding(top = 4.dp, bottom = if (isSmallScreen) 10.dp else 20.dp)
                            )

                            LaunchedEffect(showPinKeypad) {
                                if (showPinKeypad) {
                                    firstButtonFocusRequester.requestFocus()
                                }
                            }

                            Row(
                                horizontalArrangement = Arrangement.spacedBy(if (isSmallScreen) 6.dp else 10.dp, Alignment.CenterHorizontally),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                repeat(pinLength) { index ->
                                    Box(
                                        modifier = Modifier
                                            .size(if (isSmallScreen) 36.dp else 46.dp)
                                            .clip(RoundedCornerShape(if (isSmallScreen) 6.dp else 10.dp))
                                            .background(Color(0xFF0F172A))
                                            .border(
                                                BorderStroke(
                                                    2.dp,
                                                    if (index == enteredPin.length) SettingsAccent else Color.White.copy(alpha = 0.18f)
                                                ),
                                                RoundedCornerShape(if (isSmallScreen) 6.dp else 10.dp)
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = if (index < enteredPin.length) "*" else "",
                                            color = Color.White,
                                            fontSize = if (isSmallScreen) 16.sp else 22.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(if (isSmallScreen) 10.dp else 16.dp))

                            LazyVerticalGrid(
                                columns = GridCells.Fixed(3),
                                userScrollEnabled = false,
                                horizontalArrangement = Arrangement.spacedBy(if (isSmallScreen) 6.dp else 10.dp),
                                verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 6.dp else 10.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(if (isSmallScreen) 185.dp else 260.dp)
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
                                        focusRequester = if (index == 0) firstButtonFocusRequester else null
                                    ) {
                                        when (key) {
                                            "Hapus" -> deletePinDigit()
                                            "Batal" -> showPinKeypad = false
                                            else -> appendPinDigit(key)
                                        }
                                    }
                                }
                            }

                            if (pinError) {
                                Spacer(modifier = Modifier.height(if (isSmallScreen) 6.dp else 10.dp))
                                Text(
                                    text = "PIN salah! Silakan coba lagi.",
                                    color = Color(0xFFEF4444),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(bottom = if (isSmallScreen) 6.dp else 12.dp)
                                )
                            }

                        }
                    }
                }
            }
        } else {            Column(modifier = Modifier.fillMaxSize()) {
                // Header Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                    Text(
                        text = "Hospitality IPTV - Mode Teknisi",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White
                    )
                    Text(
                        text = "UUID: $deviceId",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = SettingsAccent.copy(alpha = 0.82f)
                    )
                }
                
                OutlinedButton(
                    onClick = onBack,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    border = BorderStroke(1.dp, Color(0xFF334155)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .height(42.dp)
                        .settingsFocusGlow(RoundedCornerShape(8.dp))
                ) {
                    Text("Kembali")
                }
            }

            // Separator line
            HorizontalDivider(color = Color.White.copy(alpha = 0.08f), modifier = Modifier.padding(bottom = 12.dp))

            // Body Area (Split pane)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Sidebar Left
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    colors = CardDefaults.cardColors(containerColor = SettingsPanel),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.12f))
                ) {
                    LazyColumn(
                        state = sidebarListState,
                        modifier = Modifier
                            .fillMaxSize()
                            .onPreviewKeyEvent { keyEvent ->
                                if (keyEvent.type != KeyEventType.KeyDown) {
                                     return@onPreviewKeyEvent false
                                }

                                when (keyEvent.key) {
                                    Key.DirectionUp -> {
                                        moveSidebarFocus(-1)
                                        true
                                    }
                                    Key.DirectionDown -> {
                                        moveSidebarFocus(1)
                                        true
                                    }
                                    Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> {
                                        selectFocusedMenu()
                                        true
                                    }
                                    else -> false
                                }
                            }
                            .padding(if (isSmallScreen) 6.dp else 10.dp),
                        verticalArrangement = Arrangement.spacedBy(if (isSmallScreen) 4.dp else 6.dp)
                    ) {
                        itemsIndexed(menus) { index, item ->
                            val isSelected = index == activeMenuIdx
                            var hasRealFocus by remember { mutableStateOf(false) }
                            val isFocused = index == focusedMenuIdx || hasRealFocus

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = if (isFocused) (if (isSmallScreen) 1.dp else 2.dp) else 0.dp)
                                    .shadow(
                                        elevation = if (isFocused) (if (isSmallScreen) 16.dp else 34.dp) else 0.dp,
                                        shape = RoundedCornerShape(14.dp),
                                        ambientColor = Color.White.copy(alpha = if (isFocused) 1f else 0f),
                                        spotColor = Color.White.copy(alpha = if (isFocused) 1f else 0f)
                                    )
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(if (isFocused) SettingsAccent.copy(alpha = 0.14f) else Color.Transparent)
                                    .border(
                                        BorderStroke(
                                            if (isFocused) (if (isSmallScreen) 2.dp else 4.dp) else 0.dp,
                                            if (isFocused) Color.White else Color.Transparent
                                        ),
                                        shape = RoundedCornerShape(14.dp)
                                    )
                                    .padding(if (isFocused) (if (isSmallScreen) 1.5.dp else 3.dp) else 0.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(
                                            if (isFocused) SettingsAccent.copy(alpha = 0.24f)
                                            else if (isSelected) SettingsCyan.copy(alpha = 0.18f)
                                            else Color.Transparent
                                        )
                                        .border(
                                            BorderStroke(
                                                if (isFocused) 2.dp else 1.dp,
                                                if (isFocused) Color.White else Color.Transparent
                                            ),
                                            shape = RoundedCornerShape(10.dp)
                                        )
                                        .scale(if (isFocused) 1.035f else 1.0f)
                                        .focusRequester(menuFocusRequesters[index])
                                        .clickable {
                                            focusedMenuIdx = index
                                            activeMenuIdx = index
                                            menuFocusRequesters[index].requestFocus()
                                        }
                                        .focusable()
                                        .onFocusChanged {
                                            hasRealFocus = it.isFocused
                                            if (it.isFocused) {
                                                focusedMenuIdx = index
                                            }
                                        }
                                        .padding(
                                            horizontal = if (isSmallScreen) 10.dp else 14.dp,
                                            vertical = if (isSmallScreen) 6.dp else 10.dp
                                        ),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = item,
                                        color = if (isFocused) Color.White
                                        else if (isSelected) Color.White
                                        else Color(0xFF94A3B8),
                                        fontWeight = if (isSelected || isFocused) FontWeight.ExtraBold else FontWeight.Medium,
                                        fontSize = if (isSmallScreen) 12.sp else 14.sp
                                    )
                                }
                            }
                        }
                    }
                }

                // Details Area Right
                Card(
                    modifier = Modifier
                        .weight(2f)
                        .fillMaxHeight(),
                    colors = CardDefaults.cardColors(containerColor = SettingsPanel),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.12f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(18.dp)
                    ) {
                        when (activeMenuIdx) {
                            0 -> ConnectionServerPane(
                                 lockSettings = lockSettings,
                                 serverApiEnabled = serverApiEnabled,
                                 onServerApiEnabledChange = { viewModel.changeServerApiEnabled(it) },
                                 serverUrl = serverUrl,
                                 inputUrl = inputUrlText,
                                 onUrlChange = { inputUrlText = it },
                                 onSave = {
                                     viewModel.updateServerUrl(inputUrlText)
                                     Toast.makeText(context, "URL server disimpan.", Toast.LENGTH_SHORT).show()
                                 },
                                 onRestore = {
                                     viewModel.restoreDefaultUrl()
                                     Toast.makeText(context, "URL server dikembalikan ke default.", Toast.LENGTH_SHORT).show()
                                 },
                                 onTest = { viewModel.testConnection(inputUrlText) },
                                 testResult = connectionResult,
                                 isTesting = isTesting,
                                 onInputFocusChanged = { isTextInputFocused = it }
                             )
                            1 -> DiagnosticLogsPane(
                                logs = diagnosticLogs,
                                onClear = {
                                    viewModel.clearDiagnostics()
                                    Toast.makeText(context, "Log diagnostik dihapus.", Toast.LENGTH_SHORT).show()
                                },
                                onForceSync = {
                                    viewModel.forceSync()
                                    Toast.makeText(context, "Sinkronisasi manual dimulai.", Toast.LENGTH_SHORT).show()
                                }
                            )
                            2 -> DeviceControlPane(
                                deviceId = deviceId,
                                onResetId = {
                                    viewModel.resetDeviceId()
                                    Toast.makeText(context, "Device UUID direset.", Toast.LENGTH_SHORT).show()
                                },
                                onClearCache = {
                                    viewModel.clearCache()
                                    Toast.makeText(context, "Cache saluran dihapus.", Toast.LENGTH_SHORT).show()
                                },
                                onFactoryReset = { viewModel.factoryReset() }
                            )
                            3 -> DisplayBootPane(
                                activeRatio = aspectRatio,
                                autoStart = autoStart,
                                onRatioChange = {
                                    viewModel.changeAspectRatio(it)
                                    Toast.makeText(context, "Aspek rasio disimpan.", Toast.LENGTH_SHORT).show()
                                },
                                onAutoStartChange = {
                                    viewModel.changeAutoStart(it)
                                    Toast.makeText(
                                        context,
                                        if (it) "Auto-start diaktifkan." else "Auto-start dinonaktifkan.",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                    if (it) {
                                        AutostartPermissionHelper.requestAutostartPermission(context)
                                    }
                                },
                                onSetDefaultLauncher = {
                                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                                        val roleManager = context.getSystemService(android.app.role.RoleManager::class.java)
                                        if (roleManager != null && !roleManager.isRoleHeld(android.app.role.RoleManager.ROLE_HOME)) {
                                            roleRequestLauncher.launch(
                                                roleManager.createRequestRoleIntent(android.app.role.RoleManager.ROLE_HOME)
                                            )
                                        } else {
                                            try {
                                                val intent = android.content.Intent(android.provider.Settings.ACTION_HOME_SETTINGS)
                                                context.startActivity(intent)
                                            } catch (e: android.content.ActivityNotFoundException) {
                                                try {
                                                    val fallback = android.content.Intent(android.provider.Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
                                                    context.startActivity(fallback)
                                                } catch (e2: android.content.ActivityNotFoundException) {
                                                    Toast.makeText(context, "Pengaturan launcher tidak tersedia di perangkat ini.", Toast.LENGTH_LONG).show()
                                                }
                                            }
                                        }
                                    } else {
                                        try {
                                            val intent = android.content.Intent(android.provider.Settings.ACTION_HOME_SETTINGS)
                                            context.startActivity(intent)
                                        } catch (e: android.content.ActivityNotFoundException) {
                                            try {
                                                val fallback = android.content.Intent(android.provider.Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
                                                context.startActivity(fallback)
                                            } catch (e2: android.content.ActivityNotFoundException) {
                                                Toast.makeText(context, "Pengaturan launcher tidak tersedia di perangkat ini.", Toast.LENGTH_LONG).show()
                                            }
                                        }
                                    }
                                },
                                onOpenDeveloperOptions = {
                                    try {
                                        val intent = android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS)
                                        context.startActivity(intent)
                                    } catch (e: android.content.ActivityNotFoundException) {
                                        try {
                                            val fallback = android.content.Intent(android.provider.Settings.ACTION_SETTINGS)
                                            context.startActivity(fallback)
                                        } catch (e2: android.content.ActivityNotFoundException) {
                                            Toast.makeText(context, "Pengaturan tidak tersedia di perangkat ini.", Toast.LENGTH_LONG).show()
                                        }
                                    }
                                },
                            )
                            4 -> EducationContentPane(
                                inputPath = inputEducationPathText,
                                inputUsername = inputEducationUsernameText,
                                inputPassword = inputEducationPasswordText,
                                inputDomain = inputEducationDomainText,
                                activeSource = inputEducationSource,
                                activePlaybackMode = inputEducationPlaybackMode,
                                onPathChange = { inputEducationPathText = it },
                                onUsernameChange = { inputEducationUsernameText = it },
                                onPasswordChange = { inputEducationPasswordText = it },
                                onDomainChange = { inputEducationDomainText = it },
                                onSourceChange = { inputEducationSource = it },
                                onPlaybackModeChange = { inputEducationPlaybackMode = it },
                                onInputFocusChanged = { isTextInputFocused = it },
                                onSave = {
                                    viewModel.updateEducationContentSettings(
                                        inputEducationPathText,
                                        inputEducationUsernameText,
                                        inputEducationPasswordText,
                                        inputEducationDomainText,
                                        inputEducationSource,
                                        inputEducationPlaybackMode
                                    )
                                    Toast.makeText(context, "Pengaturan edukasi disimpan.", Toast.LENGTH_SHORT).show()
                                }
                            )
                            5 -> CustomM3uPane(
                                syncMode = syncMode,
                                m3uUrl = customM3uUrl,
                                inputUrl = inputM3uText,
                                onUrlChange = { inputM3uText = it },
                                onSaveMode = {
                                    viewModel.updateSyncMode(it)
                                    Toast.makeText(context, "Sumber playlist disimpan.", Toast.LENGTH_SHORT).show()
                                },
                                onSaveUrl = {
                                    viewModel.updateCustomM3uUrl(inputM3uText)
                                    Toast.makeText(context, "URL playlist M3U disimpan.", Toast.LENGTH_SHORT).show()
                                },
                                onSync = {
                                    viewModel.syncCustomM3u(inputM3uText)
                                    Toast.makeText(context, "Sinkronisasi M3U dimulai.", Toast.LENGTH_SHORT).show()
                                },
                                syncResult = m3uSyncResult,
                                isSyncing = isSyncingM3u,
                                onInputFocusChanged = { isTextInputFocused = it }
                            )
                        }
                    }
                }
            }
        }
    }
}
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConnectionServerPane(
    lockSettings: Boolean,
    serverApiEnabled: Boolean,
    onServerApiEnabledChange: (Boolean) -> Unit,
    serverUrl: String,
    inputUrl: String,
    onUrlChange: (String) -> Unit,
    onSave: () -> Unit,
    onRestore: () -> Unit,
    onTest: () -> Unit,
    testResult: String?,
    isTesting: Boolean,
    onInputFocusChanged: (Boolean) -> Unit
) {
    val configuration = LocalConfiguration.current
    val isSmallWidth = configuration.screenWidthDp < 680

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Konfigurasi Koneksi & Server API", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(Color(0xFF0F172A))
                .border(BorderStroke(1.dp, Color(0xFF334155)), RoundedCornerShape(10.dp))
                .padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Koneksi Server API", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(
                    if (serverApiEnabled) "Koneksi ke backend server aktif." else "Koneksi ke backend server dinonaktifkan (Offline/Lokal).",
                    color = Color.Gray,
                    fontSize = 11.sp
                )
            }
            
            var isFocused by remember { mutableStateOf(false) }
            var isFocusedBorder by remember { mutableStateOf(false) }
            Switch(
                checked = serverApiEnabled,
                onCheckedChange = onServerApiEnabledChange,
                modifier = Modifier
                    .settingsFocusGlow(RoundedCornerShape(16.dp))
                    .onFocusChanged { isFocused = it.isFocused }
                    .border(
                        BorderStroke(
                            1.dp,
                            if (isFocused) Color(0xFF6366F1) else Color.Transparent
                        ),
                        shape = RoundedCornerShape(16.dp)
                    )
            )
        }

        if (serverApiEnabled) {
            Text(
                "Ubah URL backend IPTV Player Anda. Server lokal/intranet non-HTTPS didukung secara default.",
                fontSize = 12.sp,
                color = Color(0xFF94A3B8)
            )

            SettingsOutlinedTextField(
                value = inputUrl,
                onValueChange = onUrlChange,
                label = "Server API Base URL",
                modifier = Modifier.fillMaxWidth(),
                onFocusChanged = onInputFocusChanged
            )

            if (isSmallWidth) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Button(
                        onClick = onSave,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF6366F1)
                        ),
                        modifier = Modifier.fillMaxWidth().settingsFocusGlow()
                    ) {
                        Text("Simpan URL")
                    }

                    OutlinedButton(
                        onClick = onRestore,
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color.White
                        ),
                        border = BorderStroke(1.dp, Color(0xFF334155)),
                        modifier = Modifier.fillMaxWidth().settingsFocusGlow()
                    ) {
                        Text("Restore Default")
                    }
                    
                    Button(
                        onClick = onTest,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF10B981)
                        ),
                        modifier = Modifier.fillMaxWidth().settingsFocusGlow()
                    ) {
                        Text(if (isTesting) "Menguji..." else "Uji Koneksi")
                    }
                }
            } else {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = onSave,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF6366F1)
                        ),
                        modifier = Modifier.settingsFocusGlow()
                    ) {
                        Text("Simpan URL")
                    }

                    OutlinedButton(
                        onClick = onRestore,
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Color.White
                        ),
                        border = BorderStroke(1.dp, Color(0xFF334155)),
                        modifier = Modifier.settingsFocusGlow()
                    ) {
                        Text("Restore Default")
                    }
                    
                    Button(
                        onClick = onTest,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF10B981)
                        ),
                        modifier = Modifier.settingsFocusGlow()
                    ) {
                        Text(if (isTesting) "Menguji..." else "Uji Koneksi Server")
                    }
                }
            }

            if (testResult != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = BorderStroke(1.dp, Color(0xFF334155)),
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                ) {
                    Text(
                        text = testResult,
                        color = Color.White,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(14.dp)
                    )
                }
            }
        } else {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B).copy(alpha = 0.5f)),
                border = BorderStroke(1.dp, Color(0xFF334155)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "💡 Koneksi Server API dinonaktifkan. Aplikasi berjalan dalam mode lokal penuh (Offline Mode) dan tidak akan melakukan sinkronisasi dengan portal admin terpusat. Untuk memuat saluran TV, silakan aktifkan dan atur 'Playlist M3U Kustom' pada menu sidebar.",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    modifier = Modifier.padding(16.dp)
                )
            }
        }
    }
}

@Composable
fun DiagnosticLogsPane(
    logs: List<String>,
    onClear: () -> Unit,
    onForceSync: () -> Unit
) {
    val configuration = LocalConfiguration.current
    val isSmallWidth = configuration.screenWidthDp < 680

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (isSmallWidth) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Diagnostik & Log Aktivitas", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = onForceSync,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                        modifier = Modifier.weight(1f).settingsFocusGlow()
                    ) {
                        Text("Sync Manual", fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }

                    OutlinedButton(
                        onClick = onClear,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFF334155)),
                        modifier = Modifier.weight(1f).settingsFocusGlow()
                    ) {
                        Text("Hapus Log", fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Diagnostik & Log Aktivitas", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = onForceSync,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                        modifier = Modifier.settingsFocusGlow()
                    ) {
                        Text("Sync Manual", fontSize = 12.sp)
                    }

                    OutlinedButton(
                        onClick = onClear,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                        border = BorderStroke(1.dp, Color(0xFF334155)),
                        modifier = Modifier.settingsFocusGlow()
                    ) {
                        Text("Hapus Log", fontSize = 12.sp)
                    }
                }
            }
        }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            border = BorderStroke(1.dp, Color(0xFF334155))
        ) {
            if (logs.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Tidak ada log aktivitas tersimpan.", color = Color(0xFF475569), fontSize = 13.sp)
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    itemsIndexed(logs) { _, log ->
                        Text(
                            text = log,
                            color = if (log.contains("⚠️")) Color(0xFFFBBF24) else Color(0xFFCBD5E1),
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DeviceControlPane(
    deviceId: String,
    onResetId: () -> Unit,
    onClearCache: () -> Unit,
    onFactoryReset: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Manajemen Perangkat STB", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        
        Text(
            "Gunakan tombol-tombol di bawah untuk merawat dan mendaftarkan ulang STB Anda.",
            fontSize = 12.sp,
            color = Color(0xFF94A3B8)
        )

        // Item 1
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Clear Cache Saluran", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text("Menghapus database Room SQLite lokal dan membersihkan memori tontonan.", color = Color.Gray, fontSize = 11.sp)
            }
            Button(
                onClick = onClearCache,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                modifier = Modifier.settingsFocusGlow()
            ) {
                Text("Hapus Cache")
            }
        }

        HorizontalDivider(color = Color(0xFF334155))

        // Item 2
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Reset Device UUID", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text("Menghapus UUID saat ini dan men-generate ID baru untuk inisialisasi ulang.", color = Color.Gray, fontSize = 11.sp)
            }
            Button(
                onClick = onResetId,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                modifier = Modifier.settingsFocusGlow()
            ) {
                Text("Reset UUID")
            }
        }

        HorizontalDivider(color = Color(0xFF334155))

        // Item 3
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Factory Reset Aplikasi", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text("Menghapus total seluruh database SQLite, setelan DataStore, log lokal, lalu mematikan aplikasi.", color = Color.Gray, fontSize = 11.sp)
            }
            Button(
                onClick = onFactoryReset,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                modifier = Modifier.settingsFocusGlow()
            ) {
                Text("FACTORY RESET")
            }
        }
    }
}

@Composable
fun DisplayBootPane(
    activeRatio: String,
    autoStart: Boolean,
    onRatioChange: (String) -> Unit,
    onAutoStartChange: (Boolean) -> Unit,
    onSetDefaultLauncher: () -> Unit,
    onOpenDeveloperOptions: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Tampilan & Kelakuan Boot", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        
        Text(
            "Sesuaikan setelan bawaan pemutaran dan start screen pada STB.",
            fontSize = 12.sp,
            color = Color(0xFF94A3B8)
        )

        // Item Aspect Ratio
        Text("Aspek Rasio Default Video", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        
        val ratios = listOf("fit", "stretch", "zoom", "16_9", "4_3")
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            itemsIndexed(ratios) { _, ratio ->
                val isSelected = ratio == activeRatio
                var isFocused by remember { mutableStateOf(false) }

                Button(
                    onClick = { onRatioChange(ratio) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isSelected) Color(0xFF6366F1) else if (isFocused) Color(0xFF334155) else Color(0xFF1E293B)
                    ),
                    border = BorderStroke(1.dp, if (isFocused) Color(0xFF6366F1) else Color(0xFF334155)),
                    modifier = Modifier.settingsFocusGlow().onFocusChanged { isFocused = it.isFocused }
                ) {
                    Text(ratio.uppercase())
                }
            }
        }

        HorizontalDivider(color = Color(0xFF334155))

        // Item Auto Start
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Auto-Start Setelah Boot Selesai", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text("Otomatis menjalankan aplikasi IPTV ini sesaat setelah STB/Android TV dinyalakan.", color = Color.Gray, fontSize = 11.sp)
            }
            
            var isFocused by remember { mutableStateOf(false) }
            Switch(
                checked = autoStart,
                onCheckedChange = onAutoStartChange,
                modifier = Modifier
                    .settingsFocusGlow(RoundedCornerShape(16.dp))
                    .onFocusChanged { isFocused = it.isFocused }
                    .border(
                        BorderStroke(
                            1.dp,
                            if (isFocused) Color(0xFF6366F1) else Color.Transparent
                        ),
                        shape = RoundedCornerShape(16.dp)
                    )
            )
        }

        HorizontalDivider(color = Color(0xFF334155))

        // Item Set Default Launcher
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Set Sebagai Default Launcher", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text("Jadikan aplikasi ini sebagai launcher utama. Android akan menampilkan dialog pemilihan launcher.", color = Color.Gray, fontSize = 11.sp)
            }
            Button(
                onClick = onSetDefaultLauncher,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                modifier = Modifier.settingsFocusGlow()
            ) {
                Text("Set Launcher")
            }
        }

        HorizontalDivider(color = Color(0xFF334155))

        // Item Developer Options & ADB
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Developer Options & ADB", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text("Buka halaman Developer Options untuk mengaktifkan USB/Wireless debugging (ADB).", color = Color.Gray, fontSize = 11.sp)
            }
            Button(
                onClick = onOpenDeveloperOptions,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F766E)),
                modifier = Modifier.settingsFocusGlow()
            ) {
                Text("Buka Dev Options")
            }
        }

        HorizontalDivider(color = Color(0xFF334155))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EducationContentPane(
    inputPath: String,
    inputUsername: String,
    inputPassword: String,
    inputDomain: String,
    activeSource: String,
    activePlaybackMode: String,
    onPathChange: (String) -> Unit,
    onUsernameChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onDomainChange: (String) -> Unit,
    onSourceChange: (String) -> Unit,
    onPlaybackModeChange: (String) -> Unit,
    onInputFocusChanged: (Boolean) -> Unit,
    onSave: () -> Unit
) {
    val configuration = LocalConfiguration.current
    val isSmallWidth = configuration.screenWidthDp < 680

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("Konten Video Edukasi", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)

        Text(
            "Pilih apakah video edukasi berasal dari folder SMB (Local Share) atau Web Repository terpusat. Anda juga bisa memilih untuk menyalin file secara lokal atau mengalirkannya langsung via jaringan.",
            fontSize = 12.sp,
            color = Color(0xFF94A3B8),
            lineHeight = 15.sp
        )

        Text("Sumber Video Edukasi", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)

        val sources = listOf("smb" to "SMB Share (Lokal)", "web" to "Web Repository (Terpusat)")
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp)
        ) {
            itemsIndexed(sources) { _, (key, label) ->
                val isSelected = key == activeSource
                var isFocused by remember { mutableStateOf(false) }

                Button(
                    onClick = { onSourceChange(key) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isSelected) Color(0xFF6366F1) else if (isFocused) Color(0xFF334155) else Color(0xFF1E293B)
                    ),
                    border = BorderStroke(1.dp, if (isFocused) Color(0xFF6366F1) else Color(0xFF334155)),
                    modifier = Modifier.settingsFocusGlow().onFocusChanged { isFocused = it.isFocused }
                ) {
                    Text(label)
                }
            }
        }

        Text("Mode Playback Edukasi", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)

        val modes = listOf("copy" to "Salin ke Lokal (Unduh)", "stream" to "Alirkan Langsung (Stream)")
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
        ) {
            itemsIndexed(modes) { _, (key, label) ->
                val isSelected = key == activePlaybackMode
                var isFocused by remember { mutableStateOf(false) }

                Button(
                    onClick = { onPlaybackModeChange(key) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isSelected) Color(0xFF6366F1) else if (isFocused) Color(0xFF334155) else Color(0xFF1E293B)
                    ),
                    border = BorderStroke(1.dp, if (isFocused) Color(0xFF6366F1) else Color(0xFF334155)),
                    modifier = Modifier.settingsFocusGlow().onFocusChanged { isFocused = it.isFocused }
                ) {
                    Text(label)
                }
            }
        }

        if (activeSource == "smb") {
            Text("Path Folder Network", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)

            SettingsOutlinedTextField(
                value = inputPath,
                onValueChange = onPathChange,
                label = "\\\\10.45.128.129\\edukasi",
                modifier = Modifier.fillMaxWidth(),
                onFocusChanged = onInputFocusChanged
            )

            Text("Login SMB / Windows Share", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)

            if (isSmallWidth) {
                SettingsOutlinedTextField(
                    value = inputUsername,
                    onValueChange = onUsernameChange,
                    label = "Username / kosongkan untuk guest",
                    modifier = Modifier.fillMaxWidth(),
                    onFocusChanged = onInputFocusChanged
                )

                SettingsOutlinedTextField(
                    value = inputDomain,
                    onValueChange = onDomainChange,
                    label = "Domain / WORKGROUP",
                    modifier = Modifier.fillMaxWidth(),
                    onFocusChanged = onInputFocusChanged
                )
            } else {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    SettingsOutlinedTextField(
                        value = inputUsername,
                        onValueChange = onUsernameChange,
                        label = "Username / kosongkan untuk guest",
                        modifier = Modifier.weight(1f),
                        onFocusChanged = onInputFocusChanged
                    )

                    SettingsOutlinedTextField(
                        value = inputDomain,
                        onValueChange = onDomainChange,
                        label = "Domain / WORKGROUP",
                        modifier = Modifier.weight(0.75f),
                        onFocusChanged = onInputFocusChanged
                    )
                }
            }

            SettingsOutlinedTextField(
                value = inputPassword,
                onValueChange = onPasswordChange,
                label = "Password",
                modifier = Modifier.fillMaxWidth(),
                obscureText = true,
                onFocusChanged = onInputFocusChanged
            )
        } else {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B).copy(alpha = 0.4f)),
                border = BorderStroke(1.dp, Color(0xFF334155)),
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
            ) {
                Text(
                    text = "💡 Menggunakan Web Repository terpusat. Daftar video edukasi akan diambil secara otomatis dari server web dan tidak memerlukan konfigurasi Windows Share/SMB lokal.",
                    color = Color(0xFF7DD3FC),
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    modifier = Modifier.padding(14.dp)
                )
            }
        }

        Button(
            onClick = onSave,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier
                .widthIn(min = 280.dp)
                .height(44.dp)
                .settingsFocusGlow()
        ) {
            Text("Simpan Konten Edukasi", fontWeight = FontWeight.Bold)
        }

        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            border = BorderStroke(1.dp, Color(0xFF334155)),
            modifier = Modifier.fillMaxWidth().padding(top = 2.dp)
        ) {
            Text(
                text = "Format yang didukung: MP4, MKV, WEBM, TS, M3U8, MOV, AVI. Untuk Windows Share tanpa password, kosongkan username dan password. Untuk share dengan akun lokal Windows, isi username/password; domain boleh dikosongkan atau isi WORKGROUP.",
                color = Color(0xFF94A3B8),
                fontSize = 11.sp,
                lineHeight = 14.sp,
                modifier = Modifier.padding(12.dp)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomM3uPane(
    syncMode: String,
    m3uUrl: String,
    inputUrl: String,
    onUrlChange: (String) -> Unit,
    onSaveMode: (String) -> Unit,
    onSaveUrl: () -> Unit,
    onSync: () -> Unit,
    syncResult: String?,
    isSyncing: Boolean,
    onInputFocusChanged: (Boolean) -> Unit
) {
    val configuration = LocalConfiguration.current
    val isSmallWidth = configuration.screenWidthDp < 680

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Playlist M3U Kustom (Offline Mode)", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
        
        Text(
            "Gunakan playlist M3U dari penyedia IPTV Anda sendiri. Aplikasi akan mem-parsing dan menyimpannya secara lokal.",
            fontSize = 12.sp,
            color = Color(0xFF94A3B8)
        )

        // Sync Mode Selector
        Text("Pilih Sumber Playlist", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        
        if (isSmallWidth) {
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                val modes = listOf("api" to "API Server (Terpusat)", "custom" to "Playlist M3U Kustom")
                modes.forEach { (modeKey, modeLabel) ->
                    val isSelected = syncMode == modeKey
                    var isFocused by remember { mutableStateOf(false) }

                    Button(
                        onClick = { onSaveMode(modeKey) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isSelected) Color(0xFF6366F1) else if (isFocused) Color(0xFF334155) else Color(0xFF1E293B)
                        ),
                        border = BorderStroke(1.dp, if (isFocused) Color(0xFF6366F1) else Color(0xFF334155)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .settingsFocusGlow()
                            .onFocusChanged { isFocused = it.isFocused }
                    ) {
                        Text(modeLabel)
                    }
                }
            }
        } else {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                val modes = listOf("api" to "API Server (Terpusat)", "custom" to "Playlist M3U Kustom")
                modes.forEach { (modeKey, modeLabel) ->
                    val isSelected = syncMode == modeKey
                    var isFocused by remember { mutableStateOf(false) }

                    Button(
                        onClick = { onSaveMode(modeKey) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isSelected) Color(0xFF6366F1) else if (isFocused) Color(0xFF334155) else Color(0xFF1E293B)
                        ),
                        border = BorderStroke(1.dp, if (isFocused) Color(0xFF6366F1) else Color(0xFF334155)),
                        modifier = Modifier
                            .settingsFocusGlow()
                            .onFocusChanged { isFocused = it.isFocused }
                    ) {
                        Text(modeLabel)
                    }
                }
            }
        }

        HorizontalDivider(color = Color(0xFF334155), modifier = Modifier.padding(vertical = 4.dp))

        // Custom M3U URL Input
        if (syncMode == "custom") {
            Text("URL Playlist M3U / M3U8", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)

            SettingsOutlinedTextField(
                value = inputUrl,
                onValueChange = onUrlChange,
                label = "https://example.com/playlist.m3u",
                modifier = Modifier.fillMaxWidth(),
                onFocusChanged = onInputFocusChanged
            )

            if (isSmallWidth) {
                Button(
                    onClick = {
                        onSaveUrl()
                        onSync()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    modifier = Modifier.fillMaxWidth().settingsFocusGlow()
                ) {
                    Text(if (isSyncing) "Mensinkronkan..." else "Simpan & Sinkronisasi Playlist")
                }
            } else {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = {
                            onSaveUrl()
                            onSync()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        modifier = Modifier.settingsFocusGlow()
                    ) {
                        Text(if (isSyncing) "Mensinkronkan..." else "Simpan & Sinkronisasi Playlist")
                    }
                }
            }

            if (syncResult != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = BorderStroke(1.dp, Color(0xFF334155)),
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                ) {
                    Text(
                        text = syncResult,
                        color = Color.White,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(14.dp)
                    )
                }
            }
        } else {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B).copy(alpha = 0.5f)),
                border = BorderStroke(1.dp, Color(0xFF334155)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "💡 Menggunakan mode API Server. Data saluran disinkronkan otomatis dari portal admin terpusat. Ubah ke mode 'Playlist M3U Kustom' di atas jika Anda ingin menggunakan file M3U8 Anda sendiri secara mandiri.",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    modifier = Modifier.padding(16.dp)
                )
            }

            if (syncResult != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = BorderStroke(1.dp, Color(0xFF334155)),
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
                ) {
                    Text(
                        text = syncResult,
                        color = Color.White,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(14.dp)
                    )
                }
            }
        }
    }
}
