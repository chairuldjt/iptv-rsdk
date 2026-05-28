package com.itops.iptvplayer.util

import org.json.JSONObject

data class VideoItem(
    val title: String = "",
    val url: String = "",
    val thumbnailUrl: String = "",
    val repeatCount: Int = 1
)

data class BroadcastRunningTextItem(
    val id: String = "",
    val text: String = "",
    val enabled: Boolean = true
)

data class BroadcastRunningText(
    val enabled: Boolean = false,
    val items: List<BroadcastRunningTextItem> = emptyList(),
    val speed: Int = 20
)

data class VideoBroadcastProfile(
    val enabled: Boolean = false,
    val videoTitle: String = "",
    val videoUrl: String = "",
    val thumbnailUrl: String = "",
    val repeatCount: Int = 1,
    val scopeApplied: String = "fallback",
    val videos: List<VideoItem> = emptyList(),
    val runningText: BroadcastRunningText = BroadcastRunningText()
)

object VideoBroadcastParser {
    fun parse(json: String?): VideoBroadcastProfile {
        if (json.isNullOrBlank()) return VideoBroadcastProfile()

        return try {
            val root = JSONObject(json)

            // Parse videos array
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

            // Parse runningText overlay
            val runningText = root.optJSONObject("runningText")?.let { rt ->
                val rtItems = mutableListOf<BroadcastRunningTextItem>()
                val rtArray = rt.optJSONArray("items")
                if (rtArray != null) {
                    for (i in 0 until rtArray.length()) {
                        val obj = rtArray.optJSONObject(i)
                        if (obj != null) {
                            rtItems.add(
                                BroadcastRunningTextItem(
                                    id = obj.optString("id", ""),
                                    text = obj.optString("text", ""),
                                    enabled = obj.optBoolean("enabled", true)
                                )
                            )
                        }
                    }
                }
                BroadcastRunningText(
                    enabled = rt.optBoolean("enabled", false),
                    items = rtItems,
                    speed = rt.optInt("speed", 20).coerceIn(1, 600)
                )
            } ?: BroadcastRunningText()

            VideoBroadcastProfile(
                enabled = root.optBoolean("enabled", false),
                videoTitle = root.optString("videoTitle", ""),
                videoUrl = root.optString("videoUrl", ""),
                thumbnailUrl = root.optString("thumbnailUrl", ""),
                repeatCount = root.optInt("repeatCount", 1).coerceIn(1, 100),
                scopeApplied = root.optString("scopeApplied", "fallback"),
                videos = videosList,
                runningText = runningText
            )
        } catch (_: Exception) {
            VideoBroadcastProfile()
        }
    }
}
