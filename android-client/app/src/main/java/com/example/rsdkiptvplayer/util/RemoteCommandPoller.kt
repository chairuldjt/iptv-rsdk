package com.example.rsdkiptvplayer.util

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.view.PixelCopy
import com.example.rsdkiptvplayer.IptvApplication
import com.example.rsdkiptvplayer.data.api.IptvApiService
import com.example.rsdkiptvplayer.data.api.RetrofitClient
import com.example.rsdkiptvplayer.data.api.UploadScreenshotRequest
import com.example.rsdkiptvplayer.data.datastore.DataStoreManager
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import java.io.ByteArrayOutputStream

class RemoteCommandPoller(
    private val dataStoreManager: DataStoreManager,
    private val remoteServer: LocalRemoteServer
) {
    private var isPolling = false
    private var pollerJob: Job? = null
    private var screenshotJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun start() {
        if (isPolling) return
        isPolling = true
        pollerJob = scope.launch {
            val deviceId = dataStoreManager.getDeviceId()
            Log.d("IPTV_POLL", "Poller started for device ID: $deviceId")
            
            while (isPolling) {
                try {
                    val serverApiEnabled = dataStoreManager.serverApiEnabledFlow.first()
                    if (serverApiEnabled) {
                        val serverUrl = dataStoreManager.getServerUrl()
                        val apiService = RetrofitClient.getService(serverUrl)
                        
                        Log.d("IPTV_POLL", "Sending poll request to: $serverUrl")
                        val response = apiService.pollCommands(deviceId)
                        Log.d("IPTV_POLL", "Poll response received: code=${response.code()}")
                        
                        if (response.isSuccessful && response.body() != null) {
                            val body = response.body()!!
                            Log.d("IPTV_POLL", "Poll body: status=${body.status}, captureScreenshot=${body.capture_screenshot}, commandCount=${body.commands.size}")
                            
                            val captureScreenshot = body.capture_screenshot ?: false
                            if (captureScreenshot) {
                                startScreenshotLoop(apiService, deviceId)
                            } else {
                                stopScreenshotLoop()
                            }

                            if (body.status && body.commands.isNotEmpty()) {
                                withContext(Dispatchers.Main) {
                                    for (item in body.commands) {
                                        Log.d("IPTV_POLL", "Executing command from poll: ${item.command}")
                                        remoteServer.executeCommand(item.command, item.value)
                                    }
                                }
                            }
                            delay(100) // Small safety delay
                        } else {
                            Log.w("IPTV_POLL", "Poll failed with code ${response.code()}: ${response.errorBody()?.string()}")
                            stopScreenshotLoop()
                            delay(3000)
                        }
                    } else {
                        Log.d("IPTV_POLL", "Server API is disabled. Waiting...")
                        stopScreenshotLoop()
                        delay(10000)
                    }
                } catch (e: CancellationException) {
                    Log.d("IPTV_POLL", "Poller cancelled")
                    stopScreenshotLoop()
                    break
                } catch (e: Exception) {
                    Log.e("IPTV_POLL", "Polling exception: ${e.message}", e)
                    stopScreenshotLoop()
                    delay(3500)
                }
            }
        }
    }

    fun stop() {
        isPolling = false
        stopScreenshotLoop()
        pollerJob?.cancel()
    }

    @Synchronized
    private fun startScreenshotLoop(apiService: IptvApiService, deviceId: String) {
        if (screenshotJob != null && screenshotJob!!.isActive) return
        Log.d("IPTV_POLL", "Starting screen capture loop...")
        screenshotJob = scope.launch {
            while (isActive) {
                try {
                    captureAndUploadScreenshot(apiService, deviceId)
                } catch (e: Exception) {
                    Log.e("IPTV_POLL", "Error in screenshot loop: ${e.message}")
                }
                delay(1500) // Capture screenshot every 1.5 seconds
            }
        }
    }

    @Synchronized
    private fun stopScreenshotLoop() {
        if (screenshotJob != null) {
            Log.d("IPTV_POLL", "Stopping screen capture loop.")
            screenshotJob?.cancel()
            screenshotJob = null
        }
    }

    private fun captureAndUploadScreenshot(apiService: IptvApiService, deviceId: String) {
        val activity = IptvApplication.instance.currentActivity ?: return
        val view = activity.window.decorView
        if (view.width <= 0 || view.height <= 0) return

        // Scale down to 25% to minimize base64 payload size
        val scale = 0.25f
        val width = (view.width * scale).toInt()
        val height = (view.height * scale).toInt()
        if (width <= 0 || height <= 0) return
        
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val location = IntArray(2)
        view.getLocationInWindow(location)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val handler = Handler(Looper.getMainLooper())
            try {
                PixelCopy.request(
                    activity.window,
                    Rect(location[0], location[1], location[0] + view.width, location[1] + view.height),
                    bitmap,
                    { copyResult ->
                        if (copyResult == PixelCopy.SUCCESS) {
                            scope.launch {
                                uploadBitmap(apiService, deviceId, bitmap)
                            }
                        } else {
                            bitmap.recycle()
                        }
                    },
                    handler
                )
            } catch (e: Exception) {
                Log.e("IPTV_POLL", "PixelCopy failed: ${e.message}")
                bitmap.recycle()
            }
        } else {
            try {
                @Suppress("DEPRECATION")
                view.isDrawingCacheEnabled = true
                val cache = view.drawingCache
                if (cache != null) {
                    val scaledBitmap = Bitmap.createScaledBitmap(cache, width, height, true)
                    scope.launch {
                        uploadBitmap(apiService, deviceId, scaledBitmap)
                    }
                } else {
                    bitmap.recycle()
                }
                @Suppress("DEPRECATION")
                view.isDrawingCacheEnabled = false
            } catch (e: Exception) {
                bitmap.recycle()
            }
        }
    }

    private suspend fun uploadBitmap(apiService: IptvApiService, deviceId: String, bitmap: Bitmap) {
        try {
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 60, outputStream)
            val bytes = outputStream.toByteArray()
            val base64Image = Base64.encodeToString(bytes, Base64.NO_WRAP)
            bitmap.recycle()

            val request = UploadScreenshotRequest(deviceId = deviceId, image = base64Image)
            val response = apiService.uploadScreenshot(request)
            if (!response.isSuccessful) {
                Log.w("IPTV_POLL", "Failed to upload screenshot: HTTP ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e("IPTV_POLL", "Error uploading screenshot: ${e.message}")
        }
    }
}
