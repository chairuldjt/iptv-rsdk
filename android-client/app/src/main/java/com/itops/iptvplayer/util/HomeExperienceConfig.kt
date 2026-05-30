package com.itops.iptvplayer.util

import androidx.compose.ui.graphics.Color
import org.json.JSONArray
import org.json.JSONObject

data class HomeExperienceDisplayScale(
    // Threshold lebar layar (dp) untuk masuk mode "small screen"
    val smallScreenWidthDp: Int = 760,
    // Threshold tinggi layar (dp) untuk masuk mode "small screen"
    val smallScreenHeightDp: Int = 500,
    // Threshold lebar layar (dp) untuk masuk mode "ultra compact"
    val ultraCompactWidthDp: Int = 600,
    // Threshold tinggi layar (dp) untuk masuk mode "ultra compact"
    val ultraCompactHeightDp: Int = 400,
    // Paksa mode tertentu: "auto" | "normal" | "small" | "ultra_compact"
    val forceDisplayMode: String = "auto",
    // Multiplier skala UI (0.5 - 2.0). 1.0 = normal, 0.8 = 80%, 1.2 = 120%
    val uiScaleMultiplier: Float = 1.0f
)

data class CarouselConfig(
    val cardCornerRadius: Int = 24,
    val activeCardScale: Float = 1.22f,
    val inactiveCardScale: Float = 0.90f,
    val cardSpacing: Int = 18,
    val showInactiveBorder: Boolean = true,
    val inactiveBorderColor: String = "#73FFFFFF",
    val inactiveBorderWidth: Int = 2,
    val showInactiveGlow: Boolean = true,
    val showLabelBox: Boolean = true,
    val labelBoxBgColor: String = "#6B000000",
    val labelBoxCornerRadius: Int = 14,
    val labelTitleColor: String = "#FFFFFFFF",
    val labelSubtitleColor: String = "#D6FFFFFF",
    val labelTitleSize: Int = 17,
    val labelSubtitleSize: Int = 10,
    val showArrows: Boolean = true,
    val arrowColor: String = "#FFFFFFFF",
    val arrowBgColor: String = "#57000000",
    val showDots: Boolean = true,
    val dotActiveColor: String = "#FFFFE9A6",
    val dotInactiveColor: String = "#47FFFFFF",
    val showHintText: Boolean = true,
)

data class ChannelBrowserConfig(
    val gridColumns: Int = 0,
    val cardAspectRatio: Float = 0.85f,
    val cardPadding: Int = 6,
    val logoSize: Int = 88,
    val logoCornerRadius: Int = 14,
    val cardBgColor: String = "#2E18000000",
    val cardBgFocusedColor: String = "#29FFE9A6",
    val cardBgCurrentColor: String = "#247DD3FC",
    val borderColor: String = "#29FFFFFF",
    val borderFocusedColor: String = "#FFFFFFFF",
    val channelNameColor: String = "#FFFFFFFF",
    val channelNumberColor: String = "#FFFFE9A6",
    val categoryBadgeColor: String = "#1CFFE9A6",
    val categoryBadgeTextColor: String = "#FFFFE9A6",
    val accentColor: String = "#FFFFE9A6",
    val channelNameSize: Int = 15,
    val categoryBadgeSize: Int = 9,
    val showCategoryBadge: Boolean = true,
    val showChannelNumber: Boolean = true,
    val showNowPlayingBadge: Boolean = true,
)

data class HomeExperienceProfile(
    val logoUrl: String = "",
    val homeBackgroundUrl: String = "",
    val startScreen: String = "home_screen",
    val startScreenContentId: Int? = null,
    val menus: List<HomeExperienceMenu> = emptyList(),
    val overlays: List<HomeOverlayItem> = emptyList(),
    val menuHintText: String = "Gunakan kiri/kanan remote untuk memutar menu, OK untuk memilih, tahan OK 3 detik untuk ubah nama STB",
    val disableMenuBarGradient: Boolean = false,
    val channelBrowser: ChannelBrowserConfig = ChannelBrowserConfig(),
    val carousel: CarouselConfig = CarouselConfig(),
    val splash: HomeExperienceSplash = HomeExperienceSplash(),
    val sounds: HomeExperienceSounds = HomeExperienceSounds(),
    val displayScale: HomeExperienceDisplayScale = HomeExperienceDisplayScale()
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
    val cardBackgroundColorHex: String,
    val backgroundUrl: String,
    val entertainmentItemId: Int,
    val targetPackage: String,
    val useAppIcon: Boolean,
    val disableGradient: Boolean = false,
    val tvClickBehavior: String = "channel_list", // channel_list | last_played | by_number | most_played
    val tvClickChannelNumber: Int = 1,
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
                disableMenuBarGradient = root.optBoolean("disableMenuBarGradient", false),
                channelBrowser = parseChannelBrowser(root.optJSONObject("channelBrowser")),
                carousel = parseCarousel(root.optJSONObject("carousel")),
                splash = parseSplash(root.optJSONObject("splash")),
                sounds = parseSounds(root.optJSONObject("sounds")),
                displayScale = parseDisplayScale(root.optJSONObject("displayScale"))
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
            cardBackgroundColorHex = "", backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 10
        ),
        HomeExperienceMenu(
            id = "education", enabled = true, type = "education", title = "EDUKASI", subtitle = "Video RS",
            icon = "menu_book", textColorHex = "#FFFFFF", borderColorHex = "#86EFAC", accentColorHex = "#86EFAC",
            cardBackgroundColorHex = "", backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 30
        ),
        HomeExperienceMenu(
            id = "entertainment", enabled = true, type = "entertainment", title = "HIBURAN", subtitle = "Konten & Musik",
            icon = "movie", textColorHex = "#FFFFFF", borderColorHex = "#FF9A76", accentColorHex = "#FF9A76",
            cardBackgroundColorHex = "", backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 40
        ),
        HomeExperienceMenu(
            id = "info", enabled = true, type = "info_dialog", title = "INFO APLIKASI", subtitle = "Cek Pembaruan",
            icon = "info", textColorHex = "#FFFFFF", borderColorHex = "#C084FC", accentColorHex = "#C084FC",
            cardBackgroundColorHex = "", backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 50
        ),
        HomeExperienceMenu(
            id = "settings", enabled = true, type = "settings", title = "SETTING", subtitle = "Sistem",
            icon = "settings", textColorHex = "#FFFFFF", borderColorHex = "#7DD3FC", accentColorHex = "#7DD3FC",
            cardBackgroundColorHex = "", backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 60
        ),
        HomeExperienceMenu(
            id = "app_drawer", enabled = true, type = "app_drawer", title = "SEMUA APLIKASI", subtitle = "App Drawer",
            icon = "apps", textColorHex = "#FFFFFF", borderColorHex = "#FCA5A5", accentColorHex = "#FCA5A5",
            cardBackgroundColorHex = "", backgroundUrl = "", entertainmentItemId = 0, targetPackage = "", useAppIcon = false, sortOrder = 70
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
                8 -> Color(java.lang.Long.parseLong(clean, 16).toInt())
                else -> fallback
            }
        } catch (_: Exception) {
            fallback
        }
    }

    fun colorOrDefault(hex: String, fallback: Color?): Color? {
        return try {
            val clean = hex.removePrefix("#")
            when (clean.length) {
                6 -> Color(android.graphics.Color.parseColor("#$clean"))
                8 -> Color(java.lang.Long.parseLong(clean, 16).toInt())
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
                        cardBackgroundColorHex = item.optString("cardBackgroundColor", ""),
                        backgroundUrl = item.optString("backgroundUrl", ""),
                        entertainmentItemId = item.optInt("entertainmentItemId", 0),
                        targetPackage = item.optString("targetPackage", ""),
                        useAppIcon = item.optBoolean("useAppIcon", false),
                        disableGradient = item.optBoolean("disableGradient", false),
                        tvClickBehavior = item.optString("tvClickBehavior", "channel_list").let {
                            if (it in listOf("channel_list", "last_played", "by_number", "most_played")) it else "channel_list"
                        },
                        tvClickChannelNumber = item.optInt("tvClickChannelNumber", 1).coerceAtLeast(1),
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

    private fun parseDisplayScale(obj: JSONObject?): HomeExperienceDisplayScale {
        if (obj == null) return HomeExperienceDisplayScale()
        val forceMode = obj.optString("forceDisplayMode", "auto").let {
            if (it in listOf("auto", "normal", "small", "ultra_compact")) it else "auto"
        }
        val multiplier = obj.optDouble("uiScaleMultiplier", 1.0).toFloat().coerceIn(0.5f, 2.0f)
        return HomeExperienceDisplayScale(
            smallScreenWidthDp = obj.optInt("smallScreenWidthDp", 760).coerceIn(400, 2000),
            smallScreenHeightDp = obj.optInt("smallScreenHeightDp", 500).coerceIn(300, 2000),
            ultraCompactWidthDp = obj.optInt("ultraCompactWidthDp", 600).coerceIn(300, 2000),
            ultraCompactHeightDp = obj.optInt("ultraCompactHeightDp", 400).coerceIn(200, 2000),
            forceDisplayMode = forceMode,
            uiScaleMultiplier = multiplier
        )
    }

    private fun parseChannelBrowser(obj: JSONObject?): ChannelBrowserConfig {        if (obj == null) return ChannelBrowserConfig()
        val d = ChannelBrowserConfig()
        return ChannelBrowserConfig(
            gridColumns = obj.optInt("gridColumns", d.gridColumns).coerceIn(0, 10),
            cardAspectRatio = obj.optDouble("cardAspectRatio", d.cardAspectRatio.toDouble()).toFloat().coerceIn(0.5f, 2.0f),
            cardPadding = obj.optInt("cardPadding", d.cardPadding).coerceIn(0, 32),
            logoSize = obj.optInt("logoSize", d.logoSize).coerceIn(32, 200),
            logoCornerRadius = obj.optInt("logoCornerRadius", d.logoCornerRadius).coerceIn(0, 50),
            cardBgColor = obj.optString("cardBgColor", d.cardBgColor).ifBlank { d.cardBgColor },
            cardBgFocusedColor = obj.optString("cardBgFocusedColor", d.cardBgFocusedColor).ifBlank { d.cardBgFocusedColor },
            cardBgCurrentColor = obj.optString("cardBgCurrentColor", d.cardBgCurrentColor).ifBlank { d.cardBgCurrentColor },
            borderColor = obj.optString("borderColor", d.borderColor).ifBlank { d.borderColor },
            borderFocusedColor = obj.optString("borderFocusedColor", d.borderFocusedColor).ifBlank { d.borderFocusedColor },
            channelNameColor = obj.optString("channelNameColor", d.channelNameColor).ifBlank { d.channelNameColor },
            channelNumberColor = obj.optString("channelNumberColor", d.channelNumberColor).ifBlank { d.channelNumberColor },
            categoryBadgeColor = obj.optString("categoryBadgeColor", d.categoryBadgeColor).ifBlank { d.categoryBadgeColor },
            categoryBadgeTextColor = obj.optString("categoryBadgeTextColor", d.categoryBadgeTextColor).ifBlank { d.categoryBadgeTextColor },
            accentColor = obj.optString("accentColor", d.accentColor).ifBlank { d.accentColor },
            channelNameSize = obj.optInt("channelNameSize", d.channelNameSize).coerceIn(8, 32),
            categoryBadgeSize = obj.optInt("categoryBadgeSize", d.categoryBadgeSize).coerceIn(6, 20),
            showCategoryBadge = obj.optBoolean("showCategoryBadge", d.showCategoryBadge),
            showChannelNumber = obj.optBoolean("showChannelNumber", d.showChannelNumber),
            showNowPlayingBadge = obj.optBoolean("showNowPlayingBadge", d.showNowPlayingBadge),
        )
    }

    private fun parseCarousel(obj: JSONObject?): CarouselConfig {
        if (obj == null) return CarouselConfig()
        val d = CarouselConfig()
        return CarouselConfig(
            cardCornerRadius = obj.optInt("cardCornerRadius", d.cardCornerRadius).coerceIn(0, 64),
            activeCardScale = obj.optDouble("activeCardScale", d.activeCardScale.toDouble()).toFloat().coerceIn(0.5f, 2.0f),
            inactiveCardScale = obj.optDouble("inactiveCardScale", d.inactiveCardScale.toDouble()).toFloat().coerceIn(0.3f, 1.5f),
            cardSpacing = obj.optInt("cardSpacing", d.cardSpacing).coerceIn(0, 64),
            showInactiveBorder = obj.optBoolean("showInactiveBorder", d.showInactiveBorder),
            inactiveBorderColor = obj.optString("inactiveBorderColor", d.inactiveBorderColor).ifBlank { d.inactiveBorderColor },
            inactiveBorderWidth = obj.optInt("inactiveBorderWidth", d.inactiveBorderWidth).coerceIn(0, 8),
            showInactiveGlow = obj.optBoolean("showInactiveGlow", d.showInactiveGlow),
            showLabelBox = obj.optBoolean("showLabelBox", d.showLabelBox),
            labelBoxBgColor = obj.optString("labelBoxBgColor", d.labelBoxBgColor).ifBlank { d.labelBoxBgColor },
            labelBoxCornerRadius = obj.optInt("labelBoxCornerRadius", d.labelBoxCornerRadius).coerceIn(0, 64),
            labelTitleColor = obj.optString("labelTitleColor", d.labelTitleColor).ifBlank { d.labelTitleColor },
            labelSubtitleColor = obj.optString("labelSubtitleColor", d.labelSubtitleColor).ifBlank { d.labelSubtitleColor },
            labelTitleSize = obj.optInt("labelTitleSize", d.labelTitleSize).coerceIn(8, 40),
            labelSubtitleSize = obj.optInt("labelSubtitleSize", d.labelSubtitleSize).coerceIn(6, 32),
            showArrows = obj.optBoolean("showArrows", d.showArrows),
            arrowColor = obj.optString("arrowColor", d.arrowColor).ifBlank { d.arrowColor },
            arrowBgColor = obj.optString("arrowBgColor", d.arrowBgColor).ifBlank { d.arrowBgColor },
            showDots = obj.optBoolean("showDots", d.showDots),
            dotActiveColor = obj.optString("dotActiveColor", d.dotActiveColor).ifBlank { d.dotActiveColor },
            dotInactiveColor = obj.optString("dotInactiveColor", d.dotInactiveColor).ifBlank { d.dotInactiveColor },
            showHintText = obj.optBoolean("showHintText", d.showHintText),
        )
    }
}
