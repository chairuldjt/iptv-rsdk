package com.itops.iptvplayer.ui.splash

import android.media.AudioAttributes
import android.media.SoundPool
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.itops.iptvplayer.R
import com.itops.iptvplayer.IptvApplication
import com.itops.iptvplayer.util.UpdateManager
import com.itops.iptvplayer.util.HomeExperienceParser
import com.itops.iptvplayer.util.RemoteAudioPlayer
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull

@Composable
fun SplashScreen(
    onSplashComplete: (startScreen: String, startScreenContentId: Int?) -> Unit
) {
    val context = LocalContext.current
    val app = context.applicationContext as IptvApplication
    val alpha = remember { Animatable(0f) }
    val scale = remember { Animatable(0.88f) }
    val homeExperienceJson by app.dataStoreManager.homeExperienceJsonFlow.collectAsState(initial = "")
    val homeExperience = remember(homeExperienceJson) { HomeExperienceParser.parse(homeExperienceJson) }
    val soundPool = remember {
        SoundPool.Builder()
            .setMaxStreams(1)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .build()
    }

    var currentVersionName by remember { mutableStateOf("") }
    var currentVersionCode by remember { mutableIntStateOf(0) }
    var splashSoundId by remember { mutableIntStateOf(0) }
    var loadingStatus by remember { mutableStateOf("") }
    // Deferred untuk menunggu chime lokal selesai
    val chimeDeferred = remember { kotlinx.coroutines.CompletableDeferred<Unit>() }

    DisposableEffect(homeExperience.sounds.enableSplashSound, homeExperience.splash.showSound) {
        soundPool.setOnLoadCompleteListener { _, sampleId, status ->
            if (status == 0 && homeExperience.sounds.enableSplashSound && homeExperience.splash.showSound) {
                if (homeExperience.splash.soundUrl.isNotBlank()) {
                    // Remote sound — chimeDeferred akan di-complete via LaunchedEffect
                    chimeDeferred.complete(Unit)
                } else {
                    soundPool.play(sampleId, 1.0f, 1.0f, 1, 0, 1.0f)
                    // SoundPool tidak punya completion callback — complete langsung
                    // durasi akan di-handle via MediaPlayer di LaunchedEffect
                    chimeDeferred.complete(Unit)
                }
            } else {
                chimeDeferred.complete(Unit)
            }
        }
        splashSoundId = soundPool.load(context, R.raw.splash_opening_chime, 1)
        onDispose {
            soundPool.release()
        }
    }

    LaunchedEffect(Unit) {
        currentVersionCode = UpdateManager.getCurrentVersionCode(context)
        currentVersionName = UpdateManager.getCurrentVersionName(context)

        // Animate splash in (parallel with network work)
        val animJob = async {
            alpha.animateTo(targetValue = 1f, animationSpec = tween(durationMillis = 850))
            scale.animateTo(targetValue = 1f, animationSpec = tween(durationMillis = 750))
        }

        // Only wait for config sync (4s timeout) — channels sync in background
        loadingStatus = "Memuat konfigurasi..."
        val syncConfigJob = async {
            withTimeoutOrNull(4_000L) {
                try { app.repository.syncConfig() } catch (_: Exception) {}
            }
        }

        // Fire channel sync in background — don't block splash
        val syncChannelsJob = async {
            try { app.repository.syncChannels() } catch (_: Exception) {}
        }

        // Wait for animation and config sync only
        animJob.await()
        syncConfigJob.await()
        // syncChannels continues in background — don't await

        // After sync, homeExperienceJson in DataStore is now fresh.
        // Re-read it and preload all remote image URLs into Coil cache.
        loadingStatus = "Memuat aset tampilan..."
        val freshJson = app.dataStoreManager.homeExperienceJsonFlow.first()
        val freshExp = HomeExperienceParser.parse(freshJson)
        val imageLoader = coil.Coil.imageLoader(context)
        val urlsToPreload = buildList {
            if (freshExp.splash.backgroundUrl.isNotBlank()) add(freshExp.splash.backgroundUrl)
            if (freshExp.splash.logoUrl.isNotBlank()) add(freshExp.splash.logoUrl)
            if (freshExp.homeBackgroundUrl.isNotBlank()) add(freshExp.homeBackgroundUrl)
            if (freshExp.logoUrl.isNotBlank()) add(freshExp.logoUrl)
            freshExp.menus.forEach { menu ->
                if (menu.backgroundUrl.isNotBlank()) add(menu.backgroundUrl)
            }
        }.distinct()

        if (urlsToPreload.isNotEmpty()) {
            withTimeoutOrNull(6_000L) {
                val preloadJobs = urlsToPreload.map { url ->
                    async {
                        try {
                            val req = ImageRequest.Builder(context)
                                .data(url)
                                .memoryCacheKey(url)
                                .diskCacheKey(url)
                                .build()
                            imageLoader.execute(req)
                        } catch (_: Exception) {}
                    }
                }
                preloadJobs.forEach { it.await() }
            }
        }

        // Putar chime dan tunggu selesai (maks 10 detik)
        loadingStatus = ""
        if (freshExp.sounds.enableSplashSound && freshExp.splash.showSound) {
            if (freshExp.splash.soundUrl.isNotBlank()) {
                // Remote sound — putar dan tunggu selesai
                withTimeoutOrNull(10_000L) {
                    RemoteAudioPlayer.playAndAwait(freshExp.splash.soundUrl)
                }
            } else {
                // Local chime via SoundPool — tunggu load complete + estimasi durasi
                withTimeoutOrNull(10_000L) {
                    chimeDeferred.await()
                }
                // Beri waktu SoundPool memutar chime lokal (estimasi 3 detik)
                delay(3_000L)
            }
        }

        delay(300)
        onSplashComplete(freshExp.startScreen, freshExp.startScreenContentId)
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (homeExperience.splash.enabled && homeExperience.splash.backgroundUrl.isNotBlank()) {
            AsyncImage(
                model = homeExperience.splash.backgroundUrl,
                contentDescription = "Hospitality IPTV background",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        } else {
            Image(
                painter = painterResource(id = R.drawable.global_home_bg),
                contentDescription = "Hospitality IPTV background",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.42f),
                            Color(0xFF092A2A).copy(alpha = 0.24f),
                            Color.Black.copy(alpha = 0.84f)
                        )
                    )
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxSize()
                .scale(scale.value)
                .alpha(alpha.value)
                .padding(horizontal = 48.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(176.dp)
                    .padding(14.dp),
                contentAlignment = Alignment.Center
            ) {
                if (homeExperience.splash.enabled && homeExperience.splash.logoUrl.isNotBlank()) {
                    AsyncImage(
                        model = homeExperience.splash.logoUrl,
                        contentDescription = "Hospitality IPTV",
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Image(
                        painter = painterResource(id = R.drawable.ic_global_iptv),
                        contentDescription = "Hospitality IPTV",
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }

            Spacer(modifier = Modifier.height(26.dp))

            Text(
                text = if (homeExperience.splash.enabled) homeExperience.splash.title else "Hospitality IPTV",
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 0.5.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = if (homeExperience.splash.enabled) homeExperience.splash.subtitle else "Live TV • Guest Services • Education",
                color = Color(0xFFE9F7F6),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.8.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(42.dp))

            CircularProgressIndicator(
                color = Color(0xFF2EE6C6),
                strokeWidth = 3.dp,
                modifier = Modifier.size(38.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = loadingStatus.ifBlank {
                    if (homeExperience.splash.enabled) homeExperience.splash.loadingText
                    else "Preparing your experience..."
                },
                color = Color.White.copy(alpha = 0.6f),
                fontSize = 12.sp
            )
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 24.dp)
                .alpha(alpha.value)
        ) {
            Text(
                text = if (homeExperience.splash.enabled) homeExperience.splash.footerText else "PREMIUM IPTV PLATFORM",
                color = Color.White.copy(alpha = 0.70f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp
            )
            if (currentVersionName.isNotBlank()) {
                Text(
                    text = "v$currentVersionName (Build $currentVersionCode)",
                    color = Color.White.copy(alpha = 0.40f),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}
