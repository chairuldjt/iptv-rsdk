package com.example.rsdkiptvplayer.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.rsdkiptvplayer.MainActivity
import com.example.rsdkiptvplayer.data.datastore.DataStoreManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {
    private val supportedActions = setOf(
        Intent.ACTION_BOOT_COMPLETED,
        Intent.ACTION_LOCKED_BOOT_COMPLETED,
        Intent.ACTION_MY_PACKAGE_REPLACED,
        "android.intent.action.QUICKBOOT_POWERON",
        "com.htc.intent.action.QUICKBOOT_POWERON"
    )

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action !in supportedActions) return

        val pendingResult = goAsync()
        val dataStoreManager = DataStoreManager(context.applicationContext)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                dataStoreManager.addLog("Auto-start receiver triggered by: $action")
                val autoStart = dataStoreManager.autoStartFlow.first()
                if (autoStart) {
                    dataStoreManager.addLog("Auto-start is ACTIVE. Launching application after boot delay...")
                    delay(3500)
                    val launchIntent = context.packageManager
                        .getLaunchIntentForPackage(context.packageName)
                        ?.apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        }
                        ?: Intent(context, MainActivity::class.java).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        }
                    context.startActivity(launchIntent)
                } else {
                    dataStoreManager.addLog("Auto-start is DISABLED. Skipping launch.")
                }
            } catch (e: Exception) {
                dataStoreManager.addLog("Auto-start launch failed: ${e.message}")
            } finally {
                pendingResult.finish()
            }
        }
    }
}
