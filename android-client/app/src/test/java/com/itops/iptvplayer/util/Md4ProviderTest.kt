package com.itops.iptvplayer.util

import org.junit.Assert.assertEquals
import org.junit.Test
import java.security.MessageDigest

class Md4ProviderTest {
    @Test
    fun md4MatchesKnownVectors() {
        assertEquals("31d6cfe0d16ae931b73c59d7e0c089c0", md4Hex(""))
        assertEquals("bde52cb31de33e46245e05fbdbd6fb24", md4Hex("a"))
        assertEquals("a448017aaf21d8525fc10ae87aa6729d", md4Hex("abc"))
    }

    private fun md4Hex(value: String): String {
        val digest = MessageDigest.getInstance("MD4", Md4Provider())
            .digest(value.toByteArray(Charsets.US_ASCII))
        return digest.joinToString("") { "%02x".format(it) }
    }
}
