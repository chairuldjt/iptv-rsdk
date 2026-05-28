package com.itops.iptvplayer.util

import java.security.MessageDigestSpi
import java.security.Provider

class Md4Provider : Provider("RSDK-MD4", 1.0, "RSDK IPTV MD4 provider for SMB NTLM auth") {
    init {
        put("MessageDigest.MD4", Md4MessageDigest::class.java.name)
    }
}

class Md4MessageDigest : MessageDigestSpi(), Cloneable {
    private val state = IntArray(4)
    private val buffer = ByteArray(64)
    private var bufferOffset = 0
    private var byteCount = 0L

    init {
        resetState()
    }

    override fun engineGetDigestLength(): Int = 16

    override fun engineUpdate(input: Byte) {
        buffer[bufferOffset++] = input
        byteCount++
        if (bufferOffset == 64) {
            processBlock(buffer, 0)
            bufferOffset = 0
        }
    }

    override fun engineUpdate(input: ByteArray, offset: Int, len: Int) {
        var inOffset = offset
        var remaining = len
        while (remaining > 0) {
            val toCopy = minOf(remaining, 64 - bufferOffset)
            input.copyInto(buffer, bufferOffset, inOffset, inOffset + toCopy)
            bufferOffset += toCopy
            inOffset += toCopy
            remaining -= toCopy
            byteCount += toCopy.toLong()

            if (bufferOffset == 64) {
                processBlock(buffer, 0)
                bufferOffset = 0
            }
        }
    }

    override fun engineDigest(): ByteArray {
        val bitLength = byteCount shl 3
        engineUpdate(0x80.toByte())
        while (bufferOffset != 56) {
            engineUpdate(0)
        }

        val lengthBytes = ByteArray(8)
        for (i in lengthBytes.indices) {
            lengthBytes[i] = (bitLength ushr (8 * i)).toByte()
        }
        engineUpdate(lengthBytes, 0, lengthBytes.size)

        val digest = ByteArray(16)
        for (i in state.indices) {
            writeLittleEndian(state[i], digest, i * 4)
        }
        engineReset()
        return digest
    }

    override fun engineReset() {
        resetState()
        buffer.fill(0)
        bufferOffset = 0
        byteCount = 0L
    }

    public override fun clone(): Any {
        val copy = Md4MessageDigest()
        state.copyInto(copy.state)
        buffer.copyInto(copy.buffer)
        copy.bufferOffset = bufferOffset
        copy.byteCount = byteCount
        return copy
    }

    private fun resetState() {
        state[0] = 0x67452301
        state[1] = -0x10325477
        state[2] = -0x67452302
        state[3] = 0x10325476
    }

    private fun processBlock(block: ByteArray, offset: Int) {
        val x = IntArray(16)
        for (i in x.indices) {
            x[i] = readLittleEndian(block, offset + i * 4)
        }

        var a = state[0]
        var b = state[1]
        var c = state[2]
        var d = state[3]

        a = round1(a, b, c, d, x[0], 3)
        d = round1(d, a, b, c, x[1], 7)
        c = round1(c, d, a, b, x[2], 11)
        b = round1(b, c, d, a, x[3], 19)
        a = round1(a, b, c, d, x[4], 3)
        d = round1(d, a, b, c, x[5], 7)
        c = round1(c, d, a, b, x[6], 11)
        b = round1(b, c, d, a, x[7], 19)
        a = round1(a, b, c, d, x[8], 3)
        d = round1(d, a, b, c, x[9], 7)
        c = round1(c, d, a, b, x[10], 11)
        b = round1(b, c, d, a, x[11], 19)
        a = round1(a, b, c, d, x[12], 3)
        d = round1(d, a, b, c, x[13], 7)
        c = round1(c, d, a, b, x[14], 11)
        b = round1(b, c, d, a, x[15], 19)

        a = round2(a, b, c, d, x[0], 3)
        d = round2(d, a, b, c, x[4], 5)
        c = round2(c, d, a, b, x[8], 9)
        b = round2(b, c, d, a, x[12], 13)
        a = round2(a, b, c, d, x[1], 3)
        d = round2(d, a, b, c, x[5], 5)
        c = round2(c, d, a, b, x[9], 9)
        b = round2(b, c, d, a, x[13], 13)
        a = round2(a, b, c, d, x[2], 3)
        d = round2(d, a, b, c, x[6], 5)
        c = round2(c, d, a, b, x[10], 9)
        b = round2(b, c, d, a, x[14], 13)
        a = round2(a, b, c, d, x[3], 3)
        d = round2(d, a, b, c, x[7], 5)
        c = round2(c, d, a, b, x[11], 9)
        b = round2(b, c, d, a, x[15], 13)

        a = round3(a, b, c, d, x[0], 3)
        d = round3(d, a, b, c, x[8], 9)
        c = round3(c, d, a, b, x[4], 11)
        b = round3(b, c, d, a, x[12], 15)
        a = round3(a, b, c, d, x[2], 3)
        d = round3(d, a, b, c, x[10], 9)
        c = round3(c, d, a, b, x[6], 11)
        b = round3(b, c, d, a, x[14], 15)
        a = round3(a, b, c, d, x[1], 3)
        d = round3(d, a, b, c, x[9], 9)
        c = round3(c, d, a, b, x[5], 11)
        b = round3(b, c, d, a, x[13], 15)
        a = round3(a, b, c, d, x[3], 3)
        d = round3(d, a, b, c, x[11], 9)
        c = round3(c, d, a, b, x[7], 11)
        b = round3(b, c, d, a, x[15], 15)

        state[0] += a
        state[1] += b
        state[2] += c
        state[3] += d
    }

    private fun round1(a: Int, b: Int, c: Int, d: Int, x: Int, s: Int): Int =
        Integer.rotateLeft(a + ((b and c) or (b.inv() and d)) + x, s)

    private fun round2(a: Int, b: Int, c: Int, d: Int, x: Int, s: Int): Int =
        Integer.rotateLeft(a + ((b and c) or (b and d) or (c and d)) + x + 0x5A827999, s)

    private fun round3(a: Int, b: Int, c: Int, d: Int, x: Int, s: Int): Int =
        Integer.rotateLeft(a + (b xor c xor d) + x + 0x6ED9EBA1, s)

    private fun readLittleEndian(bytes: ByteArray, offset: Int): Int =
        (bytes[offset].toInt() and 0xff) or
            ((bytes[offset + 1].toInt() and 0xff) shl 8) or
            ((bytes[offset + 2].toInt() and 0xff) shl 16) or
            ((bytes[offset + 3].toInt() and 0xff) shl 24)

    private fun writeLittleEndian(value: Int, bytes: ByteArray, offset: Int) {
        bytes[offset] = value.toByte()
        bytes[offset + 1] = (value ushr 8).toByte()
        bytes[offset + 2] = (value ushr 16).toByte()
        bytes[offset + 3] = (value ushr 24).toByte()
    }
}
