package com.example.rsdkiptvplayer.util

import org.json.JSONObject

data class VideoBroadcastProfile(
    val enabled: Boolean = false,
    val videoTitle: String = "",
    val videoUrl: String = "",
    val thumbnailUrl: String = "",
    val repeatCount: Int = 1,
    val scopeApplied: String = "fallback"
)

object VideoBroadcastParser {
    fun parse(json: String?): VideoBroadcastProfile {
        if (json.isNullOrBlank()) return VideoBroadcastProfile()

        return try {
            val root = JSONObject(json)
            VideoBroadcastProfile(
                enabled = root.optBoolean("enabled", false),
                videoTitle = root.optString("videoTitle", ""),
                videoUrl = root.optString("videoUrl", ""),
                thumbnailUrl = root.optString("thumbnailUrl", ""),
                repeatCount = root.optInt("repeatCount", 1).coerceIn(1, 100),
                scopeApplied = root.optString("scopeApplied", "fallback")
            )
        } catch (_: Exception) {
            VideoBroadcastProfile()
        }
    }
}
