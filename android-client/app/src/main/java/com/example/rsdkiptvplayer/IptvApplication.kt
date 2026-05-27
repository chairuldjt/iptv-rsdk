package com.example.rsdkiptvplayer

import android.app.Activity
import android.app.Application
import android.os.Build
import android.os.Bundle
import com.example.rsdkiptvplayer.util.CrashHandler
import com.example.rsdkiptvplayer.data.cache.IptvDatabase
import com.example.rsdkiptvplayer.data.datastore.DataStoreManager
import com.example.rsdkiptvplayer.data.repository.IptvRepository
import com.example.rsdkiptvplayer.service.RemotePollerService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class IptvApplication : Application() {
    
    var currentActivity: Activity? = null
        private set

    lateinit var dataStoreManager: DataStoreManager
        private set
        
    lateinit var database: IptvDatabase
        private set
        
    lateinit var repository: IptvRepository
        private set

    lateinit var remoteServer: com.example.rsdkiptvplayer.util.LocalRemoteServer
        private set

    lateinit var remotePoller: com.example.rsdkiptvplayer.util.RemoteCommandPoller
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        Thread.setDefaultUncaughtExceptionHandler(CrashHandler(this))
        
        dataStoreManager = DataStoreManager(this)
        CrashHandler.getSavedCrash(this)?.let { crash ->
            CoroutineScope(Dispatchers.IO).launch {
                dataStoreManager.addLog("Last app crash: $crash")
                CrashHandler.clearSavedCrash(this@IptvApplication)
            }
        }

        database = IptvDatabase.getDatabase(this)
        repository = IptvRepository(this, database.channelDao(), dataStoreManager)
        
        remoteServer = com.example.rsdkiptvplayer.util.LocalRemoteServer(this, dataStoreManager) { command, value ->
            repository.emitRemoteCommand(command, value)
        }
        remoteServer.start()

        remotePoller = com.example.rsdkiptvplayer.util.RemoteCommandPoller(dataStoreManager, remoteServer)
        remotePoller.start()

        // Start foreground service agar polling tetap berjalan
        // meski app di-background atau di-close oleh sistem
        val serviceIntent = RemotePollerService.startIntent(this)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }

        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityResumed(activity: Activity) {
                currentActivity = activity
            }
            override fun onActivityPaused(activity: Activity) {
                if (currentActivity == activity) {
                    currentActivity = null
                }
            }
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        })
    }

    override fun onTerminate() {
        if (::remotePoller.isInitialized) {
            remotePoller.stop()
        }
        if (::remoteServer.isInitialized) {
            remoteServer.stop()
        }
        super.onTerminate()
    }

    companion object {
        lateinit var instance: IptvApplication
            private set
    }
}
