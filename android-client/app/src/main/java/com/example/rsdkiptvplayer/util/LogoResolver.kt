package com.example.rsdkiptvplayer.util

object LogoResolver {
    fun getPreloadedLogoPath(channelName: String): String? {
        val key = channelName.replace("[^a-zA-Z0-9]".toRegex(), "").lowercase()
        return when (key) {
            "inews" -> "/uploads/channel-logos/preloaded/inews.png"
            "antv" -> "/uploads/channel-logos/preloaded/antv.png"
            "mdtv", "md" -> "/uploads/channel-logos/preloaded/md-tv.png"
            "tvone" -> "/uploads/channel-logos/preloaded/tv-one.png"
            "mnctv" -> "/uploads/channel-logos/preloaded/mnc-tv.png"
            "metrotv" -> "/uploads/channel-logos/preloaded/metro-tv.png"
            "mentaritv" -> "/uploads/channel-logos/preloaded/mentari-tv.png"
            "gtv" -> "/uploads/channel-logos/preloaded/gtv.png"
            "transtv" -> "/uploads/channel-logos/preloaded/trans-tv.png"
            "moji", "mojitv" -> "/uploads/channel-logos/preloaded/moji-tv.png"
            "sinpotv" -> "/uploads/channel-logos/preloaded/sinpo-tv.png"
            "rtv", "rajawalitv" -> "/uploads/channel-logos/preloaded/rtv.png"
            "sctv" -> "/uploads/channel-logos/preloaded/sctv.png"
            "trans7" -> "/uploads/channel-logos/preloaded/trans-7.png"
            "indosiar" -> "/uploads/channel-logos/preloaded/indosiar.png"
            "rcti", "rctitv" -> "/uploads/channel-logos/preloaded/rcti-tv.png"
            "tvrisport" -> "/uploads/channel-logos/preloaded/tvri-sport.png"
            "kompastv" -> "/uploads/channel-logos/preloaded/kompas-tv.png"
            "redbulltv" -> "/uploads/channel-logos/preloaded/red-bull-tv.png"
            "intermilantv", "intertv" -> "/uploads/channel-logos/preloaded/inter-milan-tv.png"
            "qatartv", "qatartelevision" -> "/uploads/channel-logos/preloaded/qatar-tv.png"
            "dubaisporttv", "dubaisportstv" -> "/uploads/channel-logos/preloaded/dubai-sport-tv.png"
            else -> null
        }
    }

    fun getEffectiveLogoUrl(channelLogo: String?, channelName: String, serverUrl: String): String? {
        if (!channelLogo.isNullOrEmpty()) {
            return if (channelLogo.startsWith("/")) {
                serverUrl.trimEnd('/') + channelLogo
            } else {
                channelLogo
            }
        }
        val preloadedPath = getPreloadedLogoPath(channelName)
        if (preloadedPath != null && serverUrl.isNotEmpty()) {
            return serverUrl.trimEnd('/') + preloadedPath
        }
        return null
    }
}
