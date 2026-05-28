package com.itops.iptvplayer.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.itops.iptvplayer.IptvApplication
import com.itops.iptvplayer.MainActivity
import com.itops.iptvplayer.R

/**
 * Foreground Service yang menjalankan RemoteCommandPoller secara terus-menerus,
 * bahkan ketika aplikasi tidak sedang dibuka oleh pengguna.
 *
 * Service ini:
 * - Dimulai saat boot (via BootReceiver) jika auto-start aktif
 * - Dimulai saat aplikasi pertama kali dibuka (via IptvApplication)
 * - Menampilkan notifikasi persistent agar tidak di-kill oleh sistem
 * - Meneruskan command yang diterima ke LocalRemoteServer untuk dieksekusi
 */
class RemotePollerService : Service() {

    companion object {
        private const val TAG = "RemotePollerService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "iptv_remote_service"
        private const val CHANNEL_NAME = "IPTV Remote Control"

        const val ACTION_START = "com.itops.iptvplayer.action.START_POLLER"
        const val ACTION_STOP = "com.itops.iptvplayer.action.STOP_POLLER"

        fun startIntent(context: Context): Intent =
            Intent(context, RemotePollerService::class.java).apply {
                action = ACTION_START
            }

        fun stopIntent(context: Context): Intent =
            Intent(context, RemotePollerService::class.java).apply {
                action = ACTION_STOP
            }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")
        createNotificationChannel()
        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID,
            buildNotification(),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            else
                0
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                Log.d(TAG, "Stop action received")
                stopSelf()
                return START_NOT_STICKY
            }
            else -> {
                Log.d(TAG, "Start action received — ensuring poller is running")
                ensurePollerRunning()
            }
        }
        // START_STICKY: sistem akan restart service jika di-kill, tanpa re-deliver intent
        return START_STICKY
    }

    override fun onDestroy() {
        Log.d(TAG, "Service destroyed")
        super.onDestroy()
    }

    /**
     * Pastikan RemoteCommandPoller sudah berjalan.
     * Poller dikelola oleh IptvApplication; jika app belum terbuka,
     * Application.onCreate() akan dipanggil otomatis saat service ini start,
     * sehingga poller sudah diinisialisasi di sana.
     */
    private fun ensurePollerRunning() {
        try {
            val app = application as IptvApplication
            if (!app.remotePoller.isRunning()) {
                Log.d(TAG, "Poller not running — starting it")
                app.remotePoller.start()
            } else {
                Log.d(TAG, "Poller already running")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to ensure poller running: ${e.message}", e)
        }
    }

    private fun buildNotification(): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("IPTV Remote")
            .setContentText("Menunggu perintah remote...")
            .setSmallIcon(R.drawable.ic_global_iptv)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notifikasi untuk layanan remote control IPTV"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
