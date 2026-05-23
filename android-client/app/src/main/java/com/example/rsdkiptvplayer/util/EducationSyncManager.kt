package com.example.rsdkiptvplayer.util

import android.content.Context
import com.example.rsdkiptvplayer.IptvApplication
import jcifs.context.SingletonContext
import jcifs.smb.NtlmPasswordAuthenticator
import jcifs.smb.SmbException
import jcifs.smb.SmbFile
import jcifs.smb.SmbFileInputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.URLEncoder
import java.security.MessageDigest
import jcifs.util.Crypto

object EducationSyncManager {

    private val _syncState = MutableStateFlow<SyncState>(SyncState.Idle)
    val syncState = _syncState.asStateFlow()
    private val syncMutex = Mutex()

    sealed class SyncState {
        object Idle : SyncState()
        data class Checking(val message: String, val detail: String? = null) : SyncState()
        data class Syncing(val currentFile: Int, val totalFiles: Int, val fileName: String, val progress: Float) : SyncState()
        data class Success(val message: String = "Sinkronisasi edukasi selesai.") : SyncState()
        data class Error(val message: String, val detail: String? = null) : SyncState()
    }

    suspend fun sync(context: Context, forceSync: Boolean = false) = syncMutex.withLock {
        withContext(Dispatchers.IO) {
            try {
                val app = context.applicationContext as IptvApplication
                val dataStoreManager = app.dataStoreManager

                val path = dataStoreManager.educationVideoPathFlow.first().trim()
                if (path.isEmpty()) {
                    _syncState.value = SyncState.Error(
                        message = "Path folder video edukasi kosong.",
                        detail = "Isi path SMB seperti \\\\10.55.1.5\\NamaShare\\folder."
                    )
                    return@withContext
                }

                val username = dataStoreManager.educationSmbUsernameFlow.first().trim()
                val password = dataStoreManager.educationSmbPasswordFlow.first()
                val domain = dataStoreManager.educationSmbDomainFlow.first().trim().ifBlank { null }

                val localDir = File(context.getExternalFilesDir(null), "education_videos")
                if (!localDir.exists()) {
                    localDir.mkdirs()
                }

                val localFiles = localDir.listFiles() ?: emptyArray()

                if (forceSync) {
                    _syncState.value = SyncState.Checking(
                        message = "Membersihkan cache video edukasi lokal...",
                        detail = "Cache lama akan disalin ulang dari SMB."
                    )
                    localFiles.forEach { it.delete() }
                }

                ensureMd4Provider()
                val smbContext = SingletonContext.getInstance()
                    .withCredentials(NtlmPasswordAuthenticator(domain, username, password))

                val folderCandidates = normalizeSmbFolderUrls(path)
                var folder: SmbFile? = null
                var folderUrl = folderCandidates.first()
                var lastConnectionError: Exception? = null

                for (candidateUrl in folderCandidates) {
                    _syncState.value = SyncState.Checking(
                        message = "Menghubungi folder SMB...",
                        detail = candidateUrl
                    )

                    try {
                        val candidateFolder = SmbFile(candidateUrl, smbContext)
                        val exists = candidateFolder.exists()
                        val isDirectory = exists && candidateFolder.isDirectory
                        if (exists && isDirectory) {
                            folder = candidateFolder
                            folderUrl = candidateUrl
                            lastConnectionError = null
                            break
                        }
                    } catch (e: Exception) {
                        lastConnectionError = e
                    }
                }

                val resolvedFolder = folder
                if (resolvedFolder == null) {
                    if (lastConnectionError != null) {
                        throw lastConnectionError
                    }

                    _syncState.value = SyncState.Error(
                        message = "Folder SMB tidak ditemukan atau bukan folder.",
                        detail = "Dicoba: ${folderCandidates.joinToString(" | ")}"
                    )
                    return@withContext
                }

                _syncState.value = SyncState.Checking(
                    message = "Folder SMB terhubung. Membaca daftar video...",
                    detail = folderUrl
                )

                val remoteFiles = resolvedFolder.listFiles()
                    ?.filter { file -> !file.isDirectory && file.name.isSupportedVideoName() }
                    ?: emptyList()

                if (remoteFiles.isEmpty()) {
                    _syncState.value = SyncState.Error(
                        message = "Folder SMB terbaca, tapi tidak ada file video yang didukung.",
                        detail = "Format didukung: mp4, mkv, webm, ts, m3u8, mov, avi."
                    )
                    return@withContext
                }

                // 1. Delete local files not present on remote
                val remoteNames = remoteFiles.map { it.name }.toSet()
                val currentLocalFiles = localDir.listFiles() ?: emptyArray()
                currentLocalFiles.forEach { localFile ->
                    if (localFile.name !in remoteNames) {
                        localFile.delete()
                    }
                }

                // 2. Identify files to download
                val localFilesMap = localDir.listFiles()?.associateBy { it.name } ?: emptyMap()
                val filesToDownload = remoteFiles.filter { remoteFile ->
                    val localFile = localFilesMap[remoteFile.name]
                    localFile == null || localFile.length() != remoteFile.length()
                }

                if (filesToDownload.isEmpty()) {
                    _syncState.value = SyncState.Success("Semua video edukasi sudah tersalin. Tidak ada file baru.")
                    return@withContext
                }

                // 3. Download files one by one
                filesToDownload.forEachIndexed { index, remoteFile ->
                    val localFile = File(localDir, remoteFile.name)
                    val tempFile = File(localDir, "${remoteFile.name}.tmp")
                    if (tempFile.exists()) {
                        tempFile.delete()
                    }

                    _syncState.value = SyncState.Syncing(index + 1, filesToDownload.size, remoteFile.name, 0f)

                    try {
                        val inputStream = SmbFileInputStream(remoteFile)
                        val outputStream = FileOutputStream(tempFile)

                        val buffer = ByteArray(64 * 1024)
                        var bytesRead: Int
                        var totalBytesRead: Long = 0
                        val totalLength = remoteFile.length()

                        while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                            outputStream.write(buffer, 0, bytesRead)
                            totalBytesRead += bytesRead
                            if (totalLength > 0) {
                                val progress = totalBytesRead.toFloat() / totalLength.toFloat()
                                _syncState.value = SyncState.Syncing(index + 1, filesToDownload.size, remoteFile.name, progress)
                            }
                        }

                        outputStream.flush()
                        outputStream.close()
                        inputStream.close()

                        if (localFile.exists()) {
                            localFile.delete()
                        }
                        tempFile.renameTo(localFile)
                    } catch (e: Exception) {
                        if (tempFile.exists()) {
                            tempFile.delete()
                        }
                        throw e
                    }
                }

                _syncState.value = SyncState.Success("Berhasil menyalin ${filesToDownload.size} video edukasi.")
                dataStoreManager.addLog("Education videos cached successfully: ${filesToDownload.size} files downloaded from $folderUrl.")
            } catch (e: Exception) {
                e.printStackTrace()
                _syncState.value = SyncState.Error(
                    message = classifySyncError(e),
                    detail = e.localizedMessage ?: e.javaClass.simpleName
                )
                val app = context.applicationContext as IptvApplication
                kotlinx.coroutines.CoroutineScope(Dispatchers.IO).launch {
                    app.dataStoreManager.addLog("SMB Caching Error: ${e.javaClass.simpleName}: ${e.message}")
                }
            }
        }
    }

    private fun classifySyncError(error: Exception): String {
        val rawMessage = error.localizedMessage.orEmpty()
        val message = rawMessage.lowercase()
        return when {
            error is SmbException && (
                message.contains("access is denied") ||
                    message.contains("logon failure") ||
                    message.contains("permission")
            ) -> "Akses SMB ditolak. Periksa username, password, domain, dan permission share."
            message.contains("md4") ||
                message.contains("unsupportedcrypto") ||
                message.contains("no such algorithm") -> "Provider MD4 untuk autentikasi SMB belum tersedia."
            message.contains("network name cannot be found") -> "Nama share SMB tidak ditemukan. Pastikan bagian setelah IP adalah nama share, misalnya \\\\10.55.1.5\\File Cah-cah."
            message.contains("failed to connect") ||
                message.contains("timed out") ||
                message.contains("timeout") ||
                message.contains("unreachable") ||
                message.contains("network is unreachable") -> "Server SMB tidak bisa dijangkau dari STB. Periksa IP, jaringan, dan firewall."
            message.contains("not found") ||
                message.contains("cannot find") ||
                message.contains("no such") -> "Path SMB tidak ditemukan. Periksa nama share dan folder."
            message.contains("unknown host") -> "Host SMB tidak ditemukan. Gunakan IP server atau periksa DNS."
            else -> "Gagal sinkronisasi SMB."
        }
    }

    private fun ensureMd4Provider() {
        val provider = Md4Provider()
        try {
            Crypto.initProvider(provider)
        } catch (e: Exception) {
            forceJcifsProvider(provider)
        }

        try {
            MessageDigest.getInstance("MD4", provider).digest(byteArrayOf())
            return
        } catch (e: Exception) {
            throw IllegalStateException("Provider MD4 lokal tidak bisa diinisialisasi.", e)
        }
    }

    private fun forceJcifsProvider(provider: java.security.Provider) {
        val field = Crypto::class.java.getDeclaredField("provider")
        field.isAccessible = true
        field.set(null, provider)
    }

    private fun normalizeSmbFolderUrls(path: String): List<String> {
        val trimmed = path.trim()
        val rawSmb = if (trimmed.startsWith("smb://", ignoreCase = true)) {
            trimmed.removePrefix("smb://")
        } else {
            trimmed
                .trimStart('\\', '/')
                .replace('\\', '/')
        }

        val normalized = rawSmb
            .trim('/')
            .split('/')
            .filter { it.isNotBlank() }

        if (normalized.isEmpty()) {
            return listOf("smb://")
        }

        val host = normalized.first()
        val rawPath = normalized.drop(1).joinToString("/")
        val rawUrl = buildSmbUrl(host, rawPath)

        val encodedPath = normalized.drop(1).joinToString("/") { it.encodeSmbPathSegment() }
        val encodedUrl = buildSmbUrl(host, encodedPath)

        return listOf(rawUrl, encodedUrl).distinct()
    }

    private fun buildSmbUrl(host: String, path: String): String {
        val smb = if (path.isEmpty()) "smb://$host" else "smb://$host/$path"
        return if (smb.endsWith("/")) smb else "$smb/"
    }

    private fun String.encodeSmbPathSegment(): String {
        return URLEncoder.encode(this, "UTF-8")
            .replace("+", "%20")
    }

    private fun String.isSupportedVideoName(): Boolean {
        val name = lowercase()
        return name.endsWith(".mp4") ||
                name.endsWith(".mkv") ||
                name.endsWith(".webm") ||
                name.endsWith(".ts") ||
                name.endsWith(".m3u8") ||
                name.endsWith(".mov") ||
                name.endsWith(".avi")
    }
}
