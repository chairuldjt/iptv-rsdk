package com.example.rsdkiptvplayer.ui.education

import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.TransferListener

@OptIn(UnstableApi::class)
class DelegatingDataSource(
    private val defaultDataSource: DataSource,
    private val smbDataSource: DataSource
) : DataSource {
    private var activeDataSource: DataSource? = null

    override fun addTransferListener(transferListener: TransferListener) {
        defaultDataSource.addTransferListener(transferListener)
        smbDataSource.addTransferListener(transferListener)
    }

    override fun open(dataSpec: DataSpec): Long {
        val scheme = dataSpec.uri.scheme
        activeDataSource = if (scheme == "smb") {
            smbDataSource
        } else {
            defaultDataSource
        }
        return activeDataSource!!.open(dataSpec)
    }

    override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
        return activeDataSource!!.read(buffer, offset, length)
    }

    override fun getUri(): Uri? {
        return activeDataSource?.getUri()
    }

    override fun getResponseHeaders(): Map<String, List<String>> {
        return activeDataSource?.getResponseHeaders() ?: emptyMap()
    }

    override fun close() {
        activeDataSource?.close()
        activeDataSource = null
    }
}
