package com.itops.iptvplayer.ui.components

import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView

@OptIn(UnstableApi::class)
@Composable
fun AspectRatioPlayer(
    exoPlayer: ExoPlayer,
    aspectRatio: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        val playerModifier = when (aspectRatio) {
            "16_9" -> Modifier.aspectRatio(16f / 9f)
            "4_3" -> Modifier.aspectRatio(4f / 3f)
            else -> Modifier.fillMaxSize()
        }

        AndroidView(
            factory = { context ->
                PlayerView(context).apply {
                    player = exoPlayer
                    useController = false
                }
            },
            update = { playerView ->
                when (aspectRatio) {
                    "fit" -> {
                        playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                    }
                    "stretch" -> {
                        playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FILL
                    }
                    "zoom" -> {
                        playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                    }
                    else -> {
                        playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                    }
                }
            },
            modifier = playerModifier
        )
    }
}
