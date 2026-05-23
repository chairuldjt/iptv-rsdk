package com.example.rsdkiptvplayer.util

import android.content.Context
import com.example.rsdkiptvplayer.IptvApplication
import jcifs.context.SingletonContext
import jcifs.smb.NtlmPasswordAuthenticator
import jcifs.smb.SmbFile
import jcifs.smb.SmbFileInputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.URLDecoder
import java.net.URLEncoder

object EducationSyncManager {

    private val _syncState = MutableStateFlow<SyncState>(SyncState.Idle)
    val syncState = _syncState.asStateFlow()

    sealed class SyncState {
        object Idle : SyncState()
        data class Syncing(val currentFile: Int, val totalFiles: Int, val fileName: String, val progress: Float) : SyncState()
        object Success : SyncState()
        data class Error(val message: String) : SyncState()
    }

    suspend fun sync(context: Context, forceSync: Boolean = false) = withContext(Dispatchers.IO) {
        try {
            val app = context.applicationContext as IptvApplication
            val dataStoreManager = app.dataStoreManager

            val path = dataStoreManager.educationVideoPathFlow.first().trim()
            if (path.isEmpty()) {
                _syncState.value = SyncState.Error("Path folder video edukasi kosong.")
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
                localFiles.forEach { it.delete() }
            }

            val folderUrl = normalizeSmbFolderUrl(path)
            val smbContext = SingletonContext.getInstance()
                .withCredentials(NtlmPasswordAuthenticator(domain, username, password))
            
            val folder = SmbFile(folderUrl, smbContext)
            if (!folder.exists() || !folder.isDirectory) {
                _syncState.value = SyncState.Error("Folder SMB tidak dapat diakses atau bukan folder.")
                return@withContext
            }

            val remoteFiles = folder.listFiles()
                ?.filter { file -> !file.isDirectory && file.name.isSupportedVideoName() }
                ?: emptyList()

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
                _syncState.value = SyncState.Success
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

            _syncState.value = SyncState.Success
            dataStoreManager.addLog("Education videos cached successfully: ${filesToDownload.size} files downloaded.")
        } catch (e: Exception) {
            e.printStackTrace()
            _syncState.value = SyncState.Error(e.localizedMessage ?: "Gagal sinkronisasi SMB.")
            val app = context.applicationContext as IptvApplication
            kotlinx.coroutines.CoroutineScope(Dispatchers.IO).launch {
                app.dataStoreManager.addLog("SMB Caching Error: ${e.message}")
            }
        }
    }

    private fun normalizeSmbFolderUrl(path: String): String {
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
            return "smb://"
        }

        val host = normalized.first()
        val encodedPath = normalized
            .drop(1)
            .joinToString("/") { it.encodeSmbPathSegment() }

        val smb = if (encodedPath.isEmpty()) {
            "smb://$host"
        } else {
            "smb://$host/$encodedPath"
        }
        return if (smb.endsWith("/")) smb else "$smb/"
    }

    private fun String.encodeSmbPathSegment(): String {
        val decoded = try {
            URLDecoder.decode(this, "UTF-8")
        } catch (e: Exception) {
            this
        }

        return URLEncoder.encode(decoded, "UTF-8")
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
