package com.example.rsdkiptvplayer.util

import android.app.Instrumentation
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.view.KeyEvent
import com.example.rsdkiptvplayer.data.datastore.DataStoreManager
import kotlinx.coroutines.*
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder

class LocalRemoteServer(
    private val context: Context,
    private val dataStoreManager: DataStoreManager,
    private val onCommandReceived: (String, String?) -> Unit
) {
    private var serverSocket: ServerSocket? = null
    private var isRunning = false
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun start(port: Int = 8080) {
        if (isRunning) return
        isRunning = true
        scope.launch {
            try {
                serverSocket = ServerSocket(port)
                dataStoreManager.addLog("Remote Control Server started on port $port")
                while (isRunning) {
                    val socket = serverSocket?.accept() ?: break
                    scope.launch { handleClient(socket) }
                }
            } catch (e: Exception) {
                dataStoreManager.addLog("Error starting remote server: ${e.message}")
            }
        }
    }

    fun stop() {
        isRunning = false
        try {
            serverSocket?.close()
        } catch (e: Exception) {
            // ignore
        }
        scope.cancel()
    }

    private fun handleClient(socket: Socket) {
        try {
            val reader = BufferedReader(InputStreamReader(socket.inputStream))
            val writer = PrintWriter(socket.outputStream, true)

            val requestLine = reader.readLine() ?: return
            
            // Example request: GET /command?command=UP HTTP/1.1
            if (requestLine.startsWith("GET") || requestLine.startsWith("POST")) {
                val parts = requestLine.split(" ")
                if (parts.size >= 2) {
                    val pathAndQuery = parts[1]
                    val path = pathAndQuery.substringBefore("?")
                    val query = pathAndQuery.substringAfter("?", "")
                    
                    if (path == "/remote" || path == "/command") {
                        val params = parseQueryParams(query)
                        val command = params["command"]?.uppercase() ?: ""
                        val value = params["value"]
                        
                        if (command.isNotEmpty()) {
                            executeCommand(command, value)
                            
                            // Return HTTP Success JSON
                            writer.println("HTTP/1.1 200 OK")
                            writer.println("Content-Type: application/json")
                            writer.println("Access-Control-Allow-Origin: *")
                            writer.println("Connection: close")
                            writer.println("")
                            writer.println("{\"status\":true,\"message\":\"Command '$command' received\"}")
                            return
                        }
                    }
                }
            }

            // Fallback for other endpoints or invalid formats
            writer.println("HTTP/1.1 400 Bad Request")
            writer.println("Content-Type: application/json")
            writer.println("Connection: close")
            writer.println("")
            writer.println("{\"status\":false,\"message\":\"Invalid endpoint or parameters\"}")
        } catch (e: Exception) {
            // ignore
        } finally {
            try {
                socket.close()
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    fun executeCommand(command: String, value: String?) {
        scope.launch {
            dataStoreManager.addLog("Executing remote command: $command" + (if (value != null) " with value $value" else ""))
        }

        // 1. Check volume commands first
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        when (command) {
            "VOLUME_UP" -> {
                audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI)
                return
            }
            "VOLUME_DOWN" -> {
                audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI)
                return
            }
            "MUTE" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val isMuted = audioManager.isStreamMute(AudioManager.STREAM_MUSIC)
                    audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, if (isMuted) AudioManager.ADJUST_UNMUTE else AudioManager.ADJUST_MUTE, AudioManager.FLAG_SHOW_UI)
                } else {
                    @Suppress("DEPRECATION")
                    audioManager.setStreamMute(AudioManager.STREAM_MUSIC, !audioManager.isStreamMute(AudioManager.STREAM_MUSIC))
                }
                return
            }
            "HOME" -> {
                try {
                    val intent = Intent(Intent.ACTION_MAIN).apply {
                        addCategory(Intent.CATEGORY_HOME)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                return
            }
            "REBOOT" -> {
                try {
                    val packageManager = context.packageManager
                    val intent = packageManager.getLaunchIntentForPackage(context.packageName)
                    val componentName = intent?.component
                    val mainIntent = Intent.makeRestartActivityTask(componentName)
                    context.startActivity(mainIntent)
                    Runtime.getRuntime().exit(0)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                return
            }
        }

        // 2. Check universal keyboard/remote keys
        val keyCode = when (command) {
            "UP" -> KeyEvent.KEYCODE_DPAD_UP
            "DOWN" -> KeyEvent.KEYCODE_DPAD_DOWN
            "LEFT" -> KeyEvent.KEYCODE_DPAD_LEFT
            "RIGHT" -> KeyEvent.KEYCODE_DPAD_RIGHT
            "ENTER", "OK" -> KeyEvent.KEYCODE_DPAD_CENTER
            "BACK" -> KeyEvent.KEYCODE_BACK
            else -> null
        }

        if (keyCode != null) {
            RemoteKeyInjector.injectKey(keyCode)
        } else {
            // 3. Otherwise, pass the command to repository for UI state transition
            onCommandReceived(command, value)
        }
    }

    private fun parseQueryParams(query: String): Map<String, String> {
        val result = mutableMapOf<String, String>()
        if (query.isEmpty()) return result
        val pairs = query.split("&")
        for (pair in pairs) {
            val idx = pair.indexOf("=")
            if (idx > 0) {
                val key = pair.substring(0, idx)
                val value = pair.substring(idx + 1)
                try {
                    result[key] = URLDecoder.decode(value, "UTF-8")
                } catch (e: Exception) {
                    result[key] = value
                }
            }
        }
        return result
    }
}

object RemoteKeyInjector {
    private val inst = Instrumentation()
    
    fun injectKey(keyCode: Int) {
        Thread {
            try {
                inst.sendKeyDownUpSync(keyCode)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }
}
