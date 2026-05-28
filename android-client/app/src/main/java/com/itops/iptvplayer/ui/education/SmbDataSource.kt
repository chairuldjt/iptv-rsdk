package com.itops.iptvplayer.ui.education

import android.net.Uri
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.BaseDataSource
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import jcifs.CIFSContext
import jcifs.smb.SmbFile
import jcifs.smb.SmbFileInputStream
import java.io.IOException
import java.io.InputStream

@UnstableApi
class SmbDataSource(
    private val cifsContext: CIFSContext
) : BaseDataSource(false) {
    private var inputStream: InputStream? = null
    private var opened = false
    private var currentUri: Uri? = null
    private var bytesRemaining = 0L

    override fun open(dataSpec: DataSpec): Long {
        currentUri = dataSpec.uri
        transferInitializing(dataSpec)

        val file = SmbFile(dataSpec.uri.toString(), cifsContext)
        inputStream = SmbFileInputStream(file)
        skipFully(inputStream!!, dataSpec.position)

        bytesRemaining = if (dataSpec.length != C.LENGTH_UNSET.toLong()) {
            dataSpec.length
        } else {
            file.length() - dataSpec.position
        }

        opened = true
        transferStarted(dataSpec)
        return bytesRemaining
    }

    override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
        if (length == 0) return 0
        if (bytesRemaining == 0L) return C.RESULT_END_OF_INPUT

        val bytesToRead = if (bytesRemaining == C.LENGTH_UNSET.toLong()) {
            length
        } else {
            minOf(length.toLong(), bytesRemaining).toInt()
        }

        val bytesRead = inputStream?.read(buffer, offset, bytesToRead) ?: C.RESULT_END_OF_INPUT
        if (bytesRead == -1) return C.RESULT_END_OF_INPUT

        if (bytesRemaining != C.LENGTH_UNSET.toLong()) {
            bytesRemaining -= bytesRead
        }
        bytesTransferred(bytesRead)
        return bytesRead
    }

    override fun getUri(): Uri? = currentUri

    override fun close() {
        currentUri = null
        try {
            inputStream?.close()
        } finally {
            inputStream = null
            if (opened) {
                opened = false
                transferEnded()
            }
        }
    }

    private fun skipFully(stream: InputStream, bytesToSkip: Long) {
        var remaining = bytesToSkip
        while (remaining > 0) {
            val skipped = stream.skip(remaining)
            if (skipped <= 0) {
                if (stream.read() == -1) {
                    throw IOException("Unable to skip to requested SMB media position.")
                }
                remaining--
            } else {
                remaining -= skipped
            }
        }
    }

    class Factory(private val cifsContext: CIFSContext) : DataSource.Factory {
        override fun createDataSource(): DataSource = SmbDataSource(cifsContext)
    }
}
