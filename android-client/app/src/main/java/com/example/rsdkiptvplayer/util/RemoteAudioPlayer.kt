package com.example.rsdkiptvplayer.util

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

object RemoteAudioPlayer {
    fun playOnce(context: Context, url: String) {
        if (url.isBlank()) return

        try {
            val player = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                setDataSource(url)
                setOnPreparedListener { it.start() }
                setOnCompletionListener { it.release() }
                setOnErrorListener { mp, _, _ ->
                    mp.release()
                    true
                }
                prepareAsync()
            }
        } catch (_: Exception) {
        }
    }

    /**
     * Suspend version — menunggu sampai audio selesai diputar atau error.
     * Gunakan ini di coroutine jika ingin menunggu chime selesai.
     */
    suspend fun playAndAwait(url: String) {
        if (url.isBlank()) return

        suspendCancellableCoroutine { cont ->
            try {
                val player = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build()
                    )
                    setDataSource(url)
                    setOnPreparedListener { it.start() }
                    setOnCompletionListener {
                        it.release()
                        if (cont.isActive) cont.resume(Unit)
                    }
                    setOnErrorListener { mp, _, _ ->
                        mp.release()
                        if (cont.isActive) cont.resume(Unit)
                        true
                    }
                    prepareAsync()
                }
                cont.invokeOnCancellation {
                    try { player.release() } catch (_: Exception) {}
                }
            } catch (_: Exception) {
                if (cont.isActive) cont.resume(Unit)
            }
        }
    }
}
