package com.itops.iptvplayer.util

import androidx.compose.ui.graphics.Color
import org.json.JSONArray
import org.json.JSONObject

data class HomeExperienceProfile(
    val logoUrl: String = "",
    val homeBackgroundUrl: String = "",
    val startScreen: String = "home_screen",
    val startScreenContentId: Int? = null,
    val menus: List<HomeExperienceMenu> = emptyList(),
    val overlays: List<HomeOverlayItem> = emptyList(),
    val menuHintText: String = "Gunakan kiri/kanan remote untuk memutar menu, OK untuk memilih, tahan OK 3 detik untuk ubah nama STB",
    val splash: HomeExperienceSplash = HomeExperienceSplash(),
    val sounds: HomeExperienceSounds = HomeExperienceSounds()
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
    val entertainmentItemId: Int,
    val targetPackage: String,
    val useAppIcon: Boolean,
    val sortOrder: Int
)

// ── Overlay models ────────────────────────────────────────────────────────────

enum class HomeOverlayType {
    TEXT, LOGO, APP_LOGO, CLOCK, DATE, WEATHER, DEVICE_NAME, CHANNEL_COUNT;
    companion object {
        fun from(s: String) = when (s.lowercase()) {
            "text" -> TEXT
            "logo" -> LOGO
            "app_logo" -> APP_LOGO
            "clock" -> CLOCK
            "date" -> DATE
            "weather" -> WEATHER
            "device_name" -> DEVICE_NAME
            "channel_count" -> CHANNEL_COUNT
            else -> TEXT
        }
    }
}

enum class HomeOverlayPosition {
    TOP_LEFT, TOP_CENTER, TOP_RIGHT,
    MIDDLE_LEFT, MIDDLE_CENTER, MIDDLE_RIGHT,
    BOTTOM_LEFT, BOTTOM_CENTER, BOTTOM_RIGHT;
    companion object {
        fun from(s: String) = when (s.lowercase()) {
            "top-left" -> TOP_LEFT
            "top-center" -> TOP_CENTER
            "top-right" -> TOP_RIGHT
            "middle-left" -> MIDDLE_LEFT
            "middle-center" -> MIDDLE_CENTER
            "middle-right" -> MIDDLE_RIGHT
            "bottom-left" -> BOTTOM_LEFT
            "bottom-center" -> BOTTOM_CENTER
            "bottom-right" -> BOTTOM_RIGHT
            else -> TOP_LEFT
        }
    }
}

data class HomeOverlayItem(
    val id: String,
    val enabled: Boolean = true,
    val type: HomeOverlayType = HomeOverlayType.TEXT,
    val position: HomeOverlayPosition = HomeOverlayPosition.TOP_LEFT,
    val text: String = "",
    val imageUrl: String = "",
    val imageWidth: Int = 120,
    val imageHeight: Int = 60,
    val textColor: String = "#FFFFFF",
    val textSize: Int = 14,
    val fontWeight: String = "normal",   // normal | bold | extrabold
    val backgroundColor: String = "",    // #AARRGGBB or empty
    val paddingH: Int = 8,
    val paddingV: Int = 4,
    val cornerRadius: Int = 6,
    val offsetX: Int = 0,
    val offsetY: Int = 0,
    val sortOrder: Int = 0
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

object HomeExperienceParser {
    fun parse(json: String?): HomeExperienceProfile {
        if (json.isNullOrBlank()) return defaultProfile()

        return try {
            val root = JSONObject(json)
            val rawStartScreen = root.optString("startScreen", "home_screen")
            val startScreen = if (rawStartScreen in listOf("live_tv", "category_list", "home_screen", "entertainment", "education")) rawStartScreen else "home_screen"
            val startScreenContentId = root.optInt("startScreenContentId", 0).takeIf { it > 0 }
            val profile = HomeExperienceProfile(
                logoUrl = root.optString("logoUrl"),
                homeBackgroundUrl = root.optString("homeBackgroundUrl"),
                startScreen = startScreen,
                startScreenContentId = startScreenContentId,
                menus = parseMenus(root.optJSONArray("menus")),
                overlays = parseOverlays(root.optJSONArray("overlays")),
                menuHintText = root.optString("menuHintText", "Gunakan kiri/kanan remote untuk memutar menu, OK untuk memilih, tahan OK 3 detik untuk ubah nama STB"),
                splash = parseSplash(root.optJSONObject("splash")),
                sounds = parseSounds(root.optJSONObject("sounds"))
            )
            if (profile.menus.isEmpty()) profile.copy(menus = defaultMenus()) else profile
        } catch (_: Exception) {
            defaultProfile()
        }
    }

    /**
     * Built-in default menus that mirror `FALLBACK_HOME_EXPERIENCE_CONFIG` on
     * the server (`src/lib/homeExperience.ts`). Used whenever the server
     * response is missing, malformed, or has no enabled menus.
     */
    fun defaultMenus(): List<HomeExperienceMenu> = listOf(
        HomeExperienceMenu(
            id = "tv", enabled = true, type = "tv", title = "TV CHANNEL", subtitle = "Live TV",
            icon = "live_tv", textColorHex = "#FFFFFF", borderColorHex = "#FFE9A6", accentColorHex = "#FFE9A6",
            backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 10
        ),
        HomeExperienceMenu(
            id = "education", enabled = true, type = "education", title = "EDUKASI", subtitle = "Video RS",
            icon = "menu_book", textColorHex = "#FFFFFF", borderColorHex = "#86EFAC", accentColorHex = "#86EFAC",
            backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 30
        ),
        HomeExperienceMenu(
            id = "entertainment", enabled = true, type = "entertainment", title = "HIBURAN", subtitle = "Konten & Musik",
            icon = "movie", textColorHex = "#FFFFFF", borderColorHex = "#FF9A76", accentColorHex = "#FF9A76",
            backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 40
        ),
        HomeExperienceMenu(
            id = "info", enabled = true, type = "info_dialog", title = "INFO APLIKASI", subtitle = "Cek Pembaruan",
            icon = "info", textColorHex = "#FFFFFF", borderColorHex = "#C084FC", accentColorHex = "#C084FC",
            backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 50
        ),
        HomeExperienceMenu(
            id = "settings", enabled = true, type = "settings", title = "SETTING", subtitle = "Sistem",
            icon = "settings", textColorHex = "#FFFFFF", borderColorHex = "#7DD3FC", accentColorHex = "#7DD3FC",
            backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 60
        ),
        HomeExperienceMenu(
            id = "app_drawer", enabled = true, type = "app_drawer", title = "SEMUA APLIKASI", subtitle = "App Drawer",
            icon = "apps", textColorHex = "#FFFFFF", borderColorHex = "#FCA5A5", accentColorHex = "#FCA5A5",
            backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 70
        )
    )

    private fun defaultProfile(): HomeExperienceProfile = HomeExperienceProfile(menus = defaultMenus())

    fun parseRunningTextJson(json: String?): HomeExperienceRunningText {
        if (json.isNullOrBlank()) return HomeExperienceRunningText()
        return try {
            parseRunningText(JSONObject(json))
        } catch (_: Exception) {
            HomeExperienceRunningText()
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

    private fun parseOverlays(array: JSONArray?): List<HomeOverlayItem> {
        if (array == null) return emptyList()
        return buildList {
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                if (!item.optBoolean("enabled", true)) continue
                add(
                    HomeOverlayItem(
                        id = item.optString("id", "overlay_$i"),
                        enabled = true,
                        type = HomeOverlayType.from(item.optString("type", "text")),
                        position = HomeOverlayPosition.from(item.optString("position", "top-left")),
                        text = item.optString("text", ""),
                        imageUrl = item.optString("imageUrl", ""),
                        imageWidth = item.optInt("imageWidth", 120).coerceIn(16, 800),
                        imageHeight = item.optInt("imageHeight", 60).coerceIn(16, 600),
                        textColor = item.optString("textColor", "#FFFFFF"),
                        textSize = item.optInt("textSize", 14).coerceIn(8, 72),
                        fontWeight = item.optString("fontWeight", "normal"),
                        backgroundColor = item.optString("backgroundColor", ""),
                        paddingH = item.optInt("paddingH", 8).coerceIn(0, 120),
                        paddingV = item.optInt("paddingV", 4).coerceIn(0, 120),
                        cornerRadius = item.optInt("cornerRadius", 6).coerceIn(0, 64),
                        offsetX = item.optInt("offsetX", 0).coerceIn(-500, 500),
                        offsetY = item.optInt("offsetY", 0).coerceIn(-500, 500),
                        sortOrder = item.optInt("sortOrder", i * 10)
                    )
                )
            }
        }.sortedBy { it.sortOrder }
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
                        entertainmentItemId = item.optInt("entertainmentItemId", 0),
                        targetPackage = item.optString("targetPackage", ""),
                        useAppIcon = item.optBoolean("useAppIcon", false),
                        sortOrder = item.optInt("sortOrder", index * 10)
                    )
                )
            }
        }.sortedBy { it.sortOrder }.filter { it.enabled }
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
            displaySeconds = obj.optInt("displaySeconds", 10).coerceIn(0, 600),
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
}
