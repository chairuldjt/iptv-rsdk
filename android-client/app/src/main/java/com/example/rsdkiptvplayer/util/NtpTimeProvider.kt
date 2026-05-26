package com.example.rsdkiptvplayer.util

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.LinkedHashSet

object NtpTimeProvider {
    private const val DEFAULT_TIMEOUT_MS = 3_000
    private const val NTP_PORT = 123
    private const val NTP_PACKET_SIZE = 48
    private const val NTP_MODE_CLIENT = 3
    private const val NTP_VERSION = 3
    private const val TRANSMIT_TIME_OFFSET = 40
    private const val UNIX_EPOCH_OFFSET_SECONDS = 2_208_988_800L

    private val fallbackServers = listOf(
        "0.id.pool.ntp.org",
        "1.id.pool.ntp.org",
        "2.id.pool.ntp.org",
        "3.id.pool.ntp.org"
    )

    suspend fun resolveTimeOffsetMillis(primaryServer: String?): Long? = withContext(Dispatchers.IO) {
        val candidates = LinkedHashSet<String>().apply {
            primaryServer
                ?.trim()
                ?.lowercase()
                ?.removeSuffix(".")
                ?.takeIf { it.isNotBlank() }
                ?.let(::add)
            addAll(fallbackServers)
        }

        candidates.forEach { server ->
            val ntpTime = runCatching { queryServerTimeMillis(server, DEFAULT_TIMEOUT_MS) }.getOrNull()
            if (ntpTime != null) {
                return@withContext ntpTime - System.currentTimeMillis()
            }
        }

        null
    }

    private fun queryServerTimeMillis(server: String, timeoutMs: Int): Long {
        val address = InetAddress.getByName(server)
        val buffer = ByteArray(NTP_PACKET_SIZE)
        buffer[0] = (NTP_MODE_CLIENT or (NTP_VERSION shl 3)).toByte()

        DatagramSocket().use { socket ->
            socket.soTimeout = timeoutMs
            val request = DatagramPacket(buffer, buffer.size, address, NTP_PORT)
            socket.send(request)

            val response = DatagramPacket(buffer, buffer.size)
            socket.receive(response)
        }

        val seconds = readUnsignedInt(buffer, TRANSMIT_TIME_OFFSET)
        val fraction = readUnsignedInt(buffer, TRANSMIT_TIME_OFFSET + 4)
        val millis = ((fraction * 1000L) ushr 32).toLong()
        return (seconds - UNIX_EPOCH_OFFSET_SECONDS) * 1000L + millis
    }

    private fun readUnsignedInt(buffer: ByteArray, offset: Int): Long {
        var value = 0L
        for (index in 0 until 4) {
            value = (value shl 8) or (buffer[offset + index].toLong() and 0xFF)
        }
        return value
    }
}
