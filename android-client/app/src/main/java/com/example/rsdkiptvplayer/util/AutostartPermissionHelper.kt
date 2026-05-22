package com.example.rsdkiptvplayer.util

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import java.util.Locale

object AutostartPermissionHelper {

    fun requestAutostartPermission(context: Context) {
        val manufacturer = Build.MANUFACTURER.lowercase(Locale.getDefault())
        var isRedirected = false

        try {
            when {
                manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> {
                    isRedirected = tryXiaomi(context)
                }
                manufacturer.contains("oppo") || manufacturer.contains("realme") -> {
                    isRedirected = tryOppo(context)
                }
                manufacturer.contains("vivo") -> {
                    isRedirected = tryVivo(context)
                }
                manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
                    isRedirected = tryHuawei(context)
                }
                manufacturer.contains("oneplus") -> {
                    isRedirected = tryOnePlus(context)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        if (!isRedirected) {
            // Fallback to Application Details Settings
            try {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                Toast.makeText(
                    context,
                    "Membuka Detail Aplikasi. Silakan periksa izin Autostart atau Optimasi Baterai.",
                    Toast.LENGTH_LONG
                ).show()
            } catch (e: Exception) {
                Toast.makeText(
                    context,
                    "Gagal membuka pengaturan sistem.",
                    Toast.LENGTH_SHORT
                ).show()
            }
        } else {
            Toast.makeText(
                context,
                "Buka menu 'Mulai Otomatis' / 'Autostart' lalu izinkan aplikasi ini.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun tryXiaomi(context: Context): Boolean {
        return try {
            val intent = Intent().apply {
                component = ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e1: Exception) {
            try {
                val intent = Intent().apply {
                    action = "miui.intent.action.OP_AUTO_START"
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                true
            } catch (e2: Exception) {
                false
            }
        }
    }

    private fun tryOppo(context: Context): Boolean {
        val intents = listOf(
            Intent().apply {
                component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent().apply {
                component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent().apply {
                component = ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        )

        for (intent in intents) {
            try {
                context.startActivity(intent)
                return true
            } catch (e: Exception) {
                // Try next
            }
        }
        return false
    }

    private fun tryVivo(context: Context): Boolean {
        val intents = listOf(
            Intent().apply {
                component = ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent().apply {
                component = ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent().apply {
                component = ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        )

        for (intent in intents) {
            try {
                context.startActivity(intent)
                return true
            } catch (e: Exception) {
                // Try next
            }
        }
        return false
    }

    private fun tryHuawei(context: Context): Boolean {
        val intents = listOf(
            Intent().apply {
                component = ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            Intent().apply {
                component = ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        )

        for (intent in intents) {
            try {
                context.startActivity(intent)
                return true
            } catch (e: Exception) {
                // Try next
            }
        }
        return false
    }

    private fun tryOnePlus(context: Context): Boolean {
        return try {
            val intent = Intent().apply {
                component = ComponentName("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }
}
