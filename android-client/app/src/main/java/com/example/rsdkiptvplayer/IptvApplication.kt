package com.example.rsdkiptvplayer

import android.app.Application
import com.example.rsdkiptvplayer.data.cache.IptvDatabase
import com.example.rsdkiptvplayer.data.datastore.DataStoreManager
import com.example.rsdkiptvplayer.data.repository.IptvRepository

class IptvApplication : Application() {
    
    lateinit var dataStoreManager: DataStoreManager
        private set
        
    lateinit var database: IptvDatabase
        private set
        
    lateinit var repository: IptvRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        
        dataStoreManager = DataStoreManager(this)
        database = IptvDatabase.getDatabase(this)
        repository = IptvRepository(this, database.channelDao(), dataStoreManager)
    }

    companion object {
        lateinit var instance: IptvApplication
            private set
    }
}

