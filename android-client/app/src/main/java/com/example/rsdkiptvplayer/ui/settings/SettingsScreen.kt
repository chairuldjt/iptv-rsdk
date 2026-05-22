package com.example.rsdkiptvplayer.ui.settings

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import android.widget.Toast
import com.example.rsdkiptvplayer.util.AutostartPermissionHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    initialTabIdx: Int = 0,
    viewModel: SettingsViewModel = viewModel()
) {
    val context = LocalContext.current
    val deviceId by viewModel.deviceId.collectAsState()
    val serverUrl by viewModel.serverUrl.collectAsState()
    val serverApiEnabled by viewModel.serverApiEnabled.collectAsState()
    val aspectRatio by viewModel.aspectRatio.collectAsState()
    val lockSettings by viewModel.lockSettings.collectAsState()
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
    val m3uSyncResult by viewModel.m3uSyncResult.collectAsState()
    val isSyncingM3u by viewModel.isSyncingM3u.collectAsState()

    var activeMenuIdx by remember { mutableStateOf(initialTabIdx) }
    var inputUrlText by remember { mutableStateOf("") }
    var inputM3uText by remember { mutableStateOf("") }
    var inputEducationPathText by remember { mutableStateOf("") }
    var inputEducationUsernameText by remember { mutableStateOf("") }
    var inputEducationPasswordText by remember { mutableStateOf("") }
    var inputEducationDomainText by remember { mutableStateOf("") }
    
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

    BackHandler { onBack() }

    val menus = listOf(
        "Koneksi & Server API",
        "Diagnostik & Log Lokal",
        "Manajemen Perangkat",
        "Setelan Tampilan & Boot",
        "Konten Edukasi",
        "Playlist M3U Kustom"
    )
    val menuFocusRequesters = remember { List(menus.size) { FocusRequester() } }

    LaunchedEffect(initialTabIdx) {
        menuFocusRequesters[activeMenuIdx.coerceIn(menus.indices)].requestFocus()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(horizontal = 22.dp, vertical = 14.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
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
                        text = "RSDK IPTV Player — Mode Teknisi",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White
                    )
                    Text(
                        text = "UUID: $deviceId",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFF818CF8)
                    )
                }
                
                OutlinedButton(
                    onClick = onBack,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    border = BorderStroke(1.dp, Color(0xFF334155)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .height(42.dp)
                        .focusable()
                ) {
                    Text("← Kembali ke Player")
                }
            }

            // Separator line
            HorizontalDivider(color = Color(0xFF1E293B), modifier = Modifier.padding(bottom = 12.dp))

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
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Color(0xFF334155))
                ) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        itemsIndexed(menus) { index, item ->
                            val isSelected = index == activeMenuIdx
                            var isFocused by remember { mutableStateOf(false) }

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(
                                        if (isFocused) Color(0xFF6366F1).copy(alpha = 0.2f)
                                        else if (isSelected) Color(0xFF312E81)
                                        else Color.Transparent
                                    )
                                    .border(
                                        BorderStroke(
                                            1.dp,
                                            if (isFocused) Color(0xFF6366F1) else Color.Transparent
                                        ),
                                        shape = RoundedCornerShape(10.dp)
                                    )
                                    .scale(if (isFocused) 1.02f else 1.0f)
                                    .focusRequester(menuFocusRequesters[index])
                                    .clickable {
                                        activeMenuIdx = index
                                        menuFocusRequesters[index].requestFocus()
                                    }
                                    .focusable()
                                    .onFocusChanged { isFocused = it.isFocused }
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = item,
                                    color = if (isSelected || isFocused) Color.White else Color(0xFF94A3B8),
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }

                // Details Area Right
                Card(
                    modifier = Modifier
                        .weight(2f)
                        .fillMaxHeight(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Color(0xFF334155))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(18.dp)
                    ) {
                        when (activeMenuIdx) {
                            0 -> ConnectionServerPane(
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
                                 isTesting = isTesting
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
                                }
                            )
                            4 -> EducationContentPane(
                                inputPath = inputEducationPathText,
                                inputUsername = inputEducationUsernameText,
                                inputPassword = inputEducationPasswordText,
                                inputDomain = inputEducationDomainText,
                                onPathChange = { inputEducationPathText = it },
                                onUsernameChange = { inputEducationUsernameText = it },
                                onPasswordChange = { inputEducationPasswordText = it },
                                onDomainChange = { inputEducationDomainText = it },
                                onSave = {
                                    viewModel.updateEducationContentSettings(
                                        inputEducationPathText,
                                        inputEducationUsernameText,
                                        inputEducationPasswordText,
                                        inputEducationDomainText
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
                                isSyncing = isSyncingM3u
                            )
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
    serverApiEnabled: Boolean,
    onServerApiEnabledChange: (Boolean) -> Unit,
    serverUrl: String,
    inputUrl: String,
    onUrlChange: (String) -> Unit,
    onSave: () -> Unit,
    onRestore: () -> Unit,
    onTest: () -> Unit,
    testResult: String?,
    isTesting: Boolean
) {
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
            Switch(
                checked = serverApiEnabled,
                onCheckedChange = onServerApiEnabledChange,
                modifier = Modifier
                    .focusable()
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

            OutlinedTextField(
                value = inputUrl,
                onValueChange = onUrlChange,
                modifier = Modifier.fillMaxWidth().focusable(),
                label = { Text("Server API Base URL") },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedLabelColor = Color(0xFF6366F1),
                    focusedBorderColor = Color(0xFF6366F1),
                    unfocusedBorderColor = Color(0xFF334155),
                    focusedContainerColor = Color(0xFF0F172A),
                    unfocusedContainerColor = Color(0xFF0F172A)
                ),
                singleLine = true
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = onSave,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                    modifier = Modifier.focusable()
                ) {
                    Text("Simpan URL")
                }

                OutlinedButton(
                    onClick = onRestore,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    border = BorderStroke(1.dp, Color(0xFF334155)),
                    modifier = Modifier.focusable()
                ) {
                    Text("Restore Default")
                }
                
                Button(
                    onClick = onTest,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    modifier = Modifier.focusable()
                ) {
                    Text(if (isTesting) "Menguji..." else "Uji Koneksi Server")
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
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
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
                    modifier = Modifier.focusable()
                ) {
                    Text("Sync Manual", fontSize = 12.sp)
                }

                OutlinedButton(
                    onClick = onClear,
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    border = BorderStroke(1.dp, Color(0xFF334155)),
                    modifier = Modifier.focusable()
                ) {
                    Text("Hapus Log", fontSize = 12.sp)
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
                modifier = Modifier.focusable()
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
                modifier = Modifier.focusable()
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
                modifier = Modifier.focusable()
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
    onAutoStartChange: (Boolean) -> Unit
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
                    modifier = Modifier.focusable().onFocusChanged { isFocused = it.isFocused }
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
                    .focusable()
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
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EducationContentPane(
    inputPath: String,
    inputUsername: String,
    inputPassword: String,
    inputDomain: String,
    onPathChange: (String) -> Unit,
    onUsernameChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onDomainChange: (String) -> Unit,
    onSave: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("Konten Video Edukasi", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)

        Text(
            "Atur folder SMB/Windows Share berisi video edukasi. Menu Edukasi akan memutar semua video secara looping.",
            fontSize = 12.sp,
            color = Color(0xFF94A3B8),
            lineHeight = 15.sp
        )

        Text("Path Folder Network", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)

        OutlinedTextField(
            value = inputPath,
            onValueChange = onPathChange,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp)
                .focusable(),
            label = { Text("\\\\10.45.128.129\\edukasi") },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedLabelColor = Color(0xFF10B981),
                focusedBorderColor = Color(0xFF10B981),
                unfocusedBorderColor = Color(0xFF334155),
                focusedContainerColor = Color(0xFF0F172A),
                unfocusedContainerColor = Color(0xFF0F172A)
            ),
            singleLine = true
        )

        Text("Login SMB / Windows Share", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)

        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            OutlinedTextField(
                value = inputUsername,
                onValueChange = onUsernameChange,
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 52.dp)
                    .focusable(),
                label = { Text("Username / kosongkan untuk guest") },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedLabelColor = Color(0xFF10B981),
                    focusedBorderColor = Color(0xFF10B981),
                    unfocusedBorderColor = Color(0xFF334155),
                    focusedContainerColor = Color(0xFF0F172A),
                    unfocusedContainerColor = Color(0xFF0F172A)
                ),
                singleLine = true
            )

            OutlinedTextField(
                value = inputDomain,
                onValueChange = onDomainChange,
                modifier = Modifier
                    .weight(0.75f)
                    .heightIn(min = 52.dp)
                    .focusable(),
                label = { Text("Domain / WORKGROUP") },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedLabelColor = Color(0xFF10B981),
                    focusedBorderColor = Color(0xFF10B981),
                    unfocusedBorderColor = Color(0xFF334155),
                    focusedContainerColor = Color(0xFF0F172A),
                    unfocusedContainerColor = Color(0xFF0F172A)
                ),
                singleLine = true
            )
        }

        OutlinedTextField(
            value = inputPassword,
            onValueChange = onPasswordChange,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp)
                .focusable(),
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedLabelColor = Color(0xFF10B981),
                focusedBorderColor = Color(0xFF10B981),
                unfocusedBorderColor = Color(0xFF334155),
                focusedContainerColor = Color(0xFF0F172A),
                unfocusedContainerColor = Color(0xFF0F172A)
            ),
            singleLine = true
        )

        Button(
            onClick = onSave,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier
                .widthIn(min = 280.dp)
                .height(44.dp)
                .focusable()
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
    isSyncing: Boolean
) {
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
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            val modes = listOf("server" to "API Server (Terpusat)", "custom_m3u" to "Playlist M3U Kustom")
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
                        .focusable()
                        .onFocusChanged { isFocused = it.isFocused }
                ) {
                    Text(modeLabel)
                }
            }
        }

        HorizontalDivider(color = Color(0xFF334155), modifier = Modifier.padding(vertical = 4.dp))

        // Custom M3U URL Input
        if (syncMode == "custom_m3u") {
            Text("URL Playlist M3U / M3U8", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)

            OutlinedTextField(
                value = inputUrl,
                onValueChange = onUrlChange,
                modifier = Modifier.fillMaxWidth().focusable(),
                label = { Text("https://example.com/playlist.m3u") },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedLabelColor = Color(0xFF10B981),
                    focusedBorderColor = Color(0xFF10B981),
                    unfocusedBorderColor = Color(0xFF334155),
                    focusedContainerColor = Color(0xFF0F172A),
                    unfocusedContainerColor = Color(0xFF0F172A)
                ),
                singleLine = true
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = {
                        onSaveUrl()
                        onSync()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    modifier = Modifier.focusable()
                ) {
                    Text(if (isSyncing) "Mensinkronkan..." else "Simpan & Sinkronisasi Playlist")
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
