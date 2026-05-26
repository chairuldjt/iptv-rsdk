package com.example.rsdkiptvplayer.util

import androidx.compose.ui.graphics.Color
import org.json.JSONArray
import org.json.JSONObject

data class HomeExperienceProfile(
    val logoUrl: String = "",
    val homeBackgroundUrl: String = "",
    val menus: List<HomeExperienceMenu> = emptyList(),
    val staticPages: List<HomeExperienceStaticPage> = emptyList(),
    val runningText: HomeExperienceRunningText = HomeExperienceRunningText(),
    val splash: HomeExperienceSplash = HomeExperienceSplash(),
    val sounds: HomeExperienceSounds = HomeExperienceSounds(),
    val forceVideo: HomeExperienceForceVideo = HomeExperienceForceVideo()
)

data class HomeExperienceMenu(
    val id: String,
    val enabled: Boolean,
    val type: String,
    val title: String,
    val subtitle: String,
    val icon: String,
    val textColorHex: String,
    val borderColorHex: String,
    val accentColorHex: String,
    val backgroundUrl: String,
    val staticPageId: String,
    val sortOrder: Int
)

data class HomeExperienceStaticPage(
    val id: String,
    val title: String,
    val content: String
)

data class HomeExperienceRunningText(
    val enabled: Boolean = false,
    val visibleCount: Int = 1,
    val rotationSeconds: Int = 10,
    val displaySeconds: Int = 10,
    val items: List<HomeExperienceRunningTextItem> = emptyList()
)

data class HomeExperienceRunningTextItem(
    val id: String,
    val enabled: Boolean,
    val text: String
)

data class HomeExperienceSplash(
    val enabled: Boolean = true,
    val backgroundUrl: String = "",
    val logoUrl: String = "",
    val soundUrl: String = "",
    val title: String = "Hospitality IPTV",
    val subtitle: String = "Live TV • Guest Services • Education",
    val footerText: String = "PREMIUM IPTV PLATFORM",
    val loadingText: String = "Preparing your experience...",
    val showSound: Boolean = true
)

data class HomeExperienceSounds(
    val enableSelectionSound: Boolean = true,
    val enableSplashSound: Boolean = true,
    val selectionSoundUrl: String = ""
)

data class HomeExperienceForceVideo(
    val enabled: Boolean = false,
    val videoUrl: String = "",
    val repeatCount: Int = 1
)

object HomeExperienceParser {
    fun parse(json: String?): HomeExperienceProfile {
        if (json.isNullOrBlank()) return HomeExperienceProfile()

        return try {
            val root = JSONObject(json)
            HomeExperienceProfile(
                logoUrl = root.optString("logoUrl"),
                homeBackgroundUrl = root.optString("homeBackgroundUrl"),
                menus = parseMenus(root.optJSONArray("menus")),
                staticPages = parseStaticPages(root.optJSONArray("staticPages")),
                runningText = parseRunningText(root.optJSONObject("runningText")),
                splash = parseSplash(root.optJSONObject("splash")),
                sounds = parseSounds(root.optJSONObject("sounds")),
                forceVideo = parseForceVideo(root.optJSONObject("forceVideo"))
            )
        } catch (_: Exception) {
            HomeExperienceProfile()
        }
    }

    fun colorOrDefault(hex: String, fallback: Color): Color {
        return try {
            val clean = hex.removePrefix("#")
            when (clean.length) {
                6 -> Color(android.graphics.Color.parseColor("#$clean"))
                else -> fallback
            }
        } catch (_: Exception) {
            fallback
        }
    }

    private fun parseMenus(array: JSONArray?): List<HomeExperienceMenu> {
        if (array == null) return emptyList()

        return buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                add(
                    HomeExperienceMenu(
                        id = item.optString("id", "menu_$index"),
                        enabled = item.optBoolean("enabled", true),
                        type = item.optString("type", "info_dialog"),
                        title = item.optString("title", "MENU ${index + 1}"),
                        subtitle = item.optString("subtitle", ""),
                        icon = item.optString("icon", "info"),
                        textColorHex = item.optString("textColor", "#FFFFFF"),
                        borderColorHex = item.optString("borderColor", "#FFFFFF"),
                        accentColorHex = item.optString("accentColor", "#FFFFFF"),
                        backgroundUrl = item.optString("backgroundUrl", ""),
                        staticPageId = item.optString("staticPageId", ""),
                        sortOrder = item.optInt("sortOrder", index * 10)
                    )
                )
            }
        }.sortedBy { it.sortOrder }.filter { it.enabled }
    }

    private fun parseStaticPages(array: JSONArray?): List<HomeExperienceStaticPage> {
        if (array == null) return emptyList()

        return buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                add(
                    HomeExperienceStaticPage(
                        id = item.optString("id", "page_$index"),
                        title = item.optString("title", "Halaman ${index + 1}"),
                        content = item.optString("content", "")
                    )
                )
            }
        }
    }

    private fun parseRunningText(obj: JSONObject?): HomeExperienceRunningText {
        if (obj == null) return HomeExperienceRunningText()
        val itemsArray = obj.optJSONArray("items")

        val items = buildList {
            if (itemsArray != null) {
                for (index in 0 until itemsArray.length()) {
                    val item = itemsArray.optJSONObject(index) ?: continue
                    val text = item.optString("text", "").trim()
                    if (text.isNotEmpty() && item.optBoolean("enabled", true)) {
                        add(
                            HomeExperienceRunningTextItem(
                                id = item.optString("id", "ticker_$index"),
                                enabled = true,
                                text = text
                            )
                        )
                    }
                }
            }
        }

        return HomeExperienceRunningText(
            enabled = obj.optBoolean("enabled", false),
            visibleCount = obj.optInt("visibleCount", 1).coerceIn(1, 10),
            rotationSeconds = obj.optInt("rotationSeconds", 10).coerceIn(1, 600),
            displaySeconds = obj.optInt("displaySeconds", 10).coerceIn(1, 600),
            items = items
        )
    }

    private fun parseSplash(obj: JSONObject?): HomeExperienceSplash {
        if (obj == null) return HomeExperienceSplash()
        return HomeExperienceSplash(
            enabled = obj.optBoolean("enabled", true),
            backgroundUrl = obj.optString("backgroundUrl", ""),
            logoUrl = obj.optString("logoUrl", ""),
            soundUrl = obj.optString("soundUrl", ""),
            title = obj.optString("title", "Hospitality IPTV"),
            subtitle = obj.optString("subtitle", "Live TV • Guest Services • Education"),
            footerText = obj.optString("footerText", "PREMIUM IPTV PLATFORM"),
            loadingText = obj.optString("loadingText", "Preparing your experience..."),
            showSound = obj.optBoolean("showSound", true)
        )
    }

    private fun parseSounds(obj: JSONObject?): HomeExperienceSounds {
        if (obj == null) return HomeExperienceSounds()
        return HomeExperienceSounds(
            enableSelectionSound = obj.optBoolean("enableSelectionSound", true),
            enableSplashSound = obj.optBoolean("enableSplashSound", true),
            selectionSoundUrl = obj.optString("selectionSoundUrl", "")
        )
    }

    private fun parseForceVideo(obj: JSONObject?): HomeExperienceForceVideo {
        if (obj == null) return HomeExperienceForceVideo()
        return HomeExperienceForceVideo(
            enabled = obj.optBoolean("enabled", false),
            videoUrl = obj.optString("videoUrl", ""),
            repeatCount = obj.optInt("repeatCount", 1).coerceIn(1, 100)
        )
    }
}
