package com.itops.iptvplayer.data.cache

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "channels")
data class ChannelEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val logo: String?,
    val groupName: String, // Acts as Category name
    val streamUrl: String,
    val sortOrder: Int,
    val isActive: Boolean
)
