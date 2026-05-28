package com.itops.iptvplayer.data.parser

import com.itops.iptvplayer.data.cache.ChannelEntity

object M3uParser {
    fun parse(m3uContent: String): List<ChannelEntity> {
        val channels = mutableListOf<ChannelEntity>()
        val lines = m3uContent.lineSequence().map { it.trim() }.toList()
        var currentChannelId = 1
        var currentName = ""
        var currentLogo: String? = null
        var currentGroup = "Lainnya" // Default other category
        
        var i = 0
        while (i < lines.size) {
            val line = lines[i]
            if (line.startsWith("#EXTINF:")) {
                // Parse logo, group-title, and name
                currentLogo = parseAttribute(line, "tvg-logo") ?: parseAttribute(line, "logo")
                currentGroup = parseAttribute(line, "group-title") ?: "Lainnya"
                
                // Name is after the last comma
                val commaIndex = line.lastIndexOf(',')
                currentName = if (commaIndex != -1 && commaIndex < line.length - 1) {
                    line.substring(commaIndex + 1).trim()
                } else {
                    "Saluran $currentChannelId"
                }
                
                // Find next line that starts the stream URL
                var nextLineIdx = i + 1
                while (nextLineIdx < lines.size && (lines[nextLineIdx].isEmpty() || lines[nextLineIdx].startsWith("#"))) {
                    nextLineIdx++
                }
                if (nextLineIdx < lines.size) {
                    val streamUrl = lines[nextLineIdx]
                    if (streamUrl.startsWith("http://") || streamUrl.startsWith("https://") || streamUrl.startsWith("rtmp://") || streamUrl.startsWith("rtsp://")) {
                        channels.add(
                            ChannelEntity(
                                id = currentChannelId,
                                name = currentName,
                                logo = currentLogo,
                                groupName = currentGroup,
                                streamUrl = streamUrl,
                                sortOrder = currentChannelId,
                                isActive = true
                            )
                        )
                        currentChannelId++
                    }
                }
                i = nextLineIdx
            }
            i++
        }
        return channels
    }

    private fun parseAttribute(line: String, attributeName: String): String? {
        val key = "$attributeName=\""
        val startIdx = line.indexOf(key)
        if (startIdx == -1) return null
        val valueStart = startIdx + key.length
        val endIdx = line.indexOf("\"", valueStart)
        if (endIdx == -1) return null
        return line.substring(valueStart, endIdx)
    }
}
