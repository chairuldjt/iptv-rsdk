package com.example.rsdkiptvplayer.util

import org.json.JSONObject

data class VideoItem(
    val title: String = "",
    val url: String = "",
    val thumbnailUrl: String = "",
    val repeatCount: Int = 1
)

data class VideoBroadcastProfile(
    val enabled: Boolean = false,
    val videoTitle: String = "",
    val videoUrl: String = "",
    val thumbnailUrl: String = "",
    val repeatCount: Int = 1,
    val scopeApplied: String = "fallback",
    val videos: List<VideoItem> = emptyList()
)

object VideoBroadcastParser {
    fun parse(json: String?): VideoBroadcastProfile {
        if (json.isNullOrBlank()) return VideoBroadcastProfile()

        return try {
            val root = JSONObject(json)
            val videosList = mutableListOf<VideoItem>()
            val videosArray = root.optJSONArray("videos")
            if (videosArray != null) {
                for (i in 0 until videosArray.length()) {
                    val obj = videosArray.optJSONObject(i)
                    if (obj != null) {
                        videosList.add(
                            VideoItem(
                                title = obj.optString("title", ""),
                                url = obj.optString("url", ""),
                                thumbnailUrl = obj.optString("thumbnailUrl", ""),
                                repeatCount = obj.optInt("repeatCount", 1).coerceIn(1, 100)
                            )
                        )
                    }
                }
            }

            VideoBroadcastProfile(
                enabled = root.optBoolean("enabled", false),
                videoTitle = root.optString("videoTitle", ""),
                videoUrl = root.optString("videoUrl", ""),
                thumbnailUrl = root.optString("thumbnailUrl", ""),
                repeatCount = root.optInt("repeatCount", 1).coerceIn(1, 100),
                scopeApplied = root.optString("scopeApplied", "fallback"),
                videos = videosList
            )
        } catch (_: Exception) {
            VideoBroadcastProfile()
        }
    }
}
