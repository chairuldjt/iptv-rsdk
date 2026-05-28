package com.itops.iptvplayer.data.cache

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

import androidx.room.Transaction

@Dao
interface ChannelDao {
    @Query("SELECT * FROM channels ORDER BY sortOrder ASC, name ASC")
    fun getAllChannelsFlow(): Flow<List<ChannelEntity>>

    @Query("SELECT * FROM channels ORDER BY sortOrder ASC, name ASC")
    suspend fun getAllChannels(): List<ChannelEntity>

    @Query("SELECT DISTINCT groupName FROM channels ORDER BY groupName ASC")
    fun getAllCategoriesFlow(): Flow<List<String>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(channels: List<ChannelEntity>)

    @Query("DELETE FROM channels")
    suspend fun clearAll()

    @Transaction
    suspend fun replaceAllChannels(channels: List<ChannelEntity>) {
        clearAll()
        insertAll(channels)
    }
}
