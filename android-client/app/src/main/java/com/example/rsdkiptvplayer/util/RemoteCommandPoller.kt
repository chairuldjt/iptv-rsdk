package com.example.rsdkiptvplayer.util

import android.util.Log
import com.example.rsdkiptvplayer.data.api.RetrofitClient
import com.example.rsdkiptvplayer.data.datastore.DataStoreManager
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first

class RemoteCommandPoller(
    private val dataStoreManager: DataStoreManager,
    private val remoteServer: LocalRemoteServer
) {
    private var isPolling = false
    private var pollerJob: Job? = null
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
                            Log.d("IPTV_POLL", "Poll body: status=${body.status}, commandCount=${body.commands.size}")
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
                            delay(3000)
                        }
                    } else {
                        Log.d("IPTV_POLL", "Server API is disabled. Waiting...")
                        delay(10000)
                    }
                } catch (e: CancellationException) {
                    Log.d("IPTV_POLL", "Poller cancelled")
                    break
                } catch (e: Exception) {
                    Log.e("IPTV_POLL", "Polling exception: ${e.message}", e)
                    delay(3500)
                }
            }
        }
    }

    fun stop() {
        isPolling = false
        pollerJob?.cancel()
    }
}
