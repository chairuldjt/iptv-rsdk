package com.example.rsdkiptvplayer.util

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer

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
}
