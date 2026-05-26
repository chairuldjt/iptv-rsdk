package com.example.rsdkiptvplayer.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

// --- DATA TRANSFER OBJECTS ---

data class RegisterRequest(
    val device_id: String,
    val device_name: String,
    val app_version: String,
    val android_version: String,
    val mac_address: String?,
    val local_ip: String?
)

data class RegisterResponse(
    val status: Boolean,
    val message: String,
    val data: RegisterData?
)

data class RegisterData(
    val device_id: String,
    val active: Boolean,
    val sync_interval: Int
)

data class ConfigResponse(
    val status: Boolean,
    val message: String,
    val data: ConfigData?
)

data class ConfigData(
    val device_id: String,
    val active: Boolean,
    val playlist_id: Int?,
    val sync_mode: String?,
    val custom_m3u_url: String?,
    val default_category: String?,
    val default_channel_id: Int?,
    val aspect_ratio: String?,
    val sync_interval: Int?,
    val start_screen: String?,
    val lock_settings: Boolean?,
    val force_sync: Boolean?,
    val clear_cache_trigger: Boolean?,
    val auto_start_on_boot: Boolean?,
    val technician_pin: String?,
    val education_video_path: String?,
    val education_smb_username: String?,
    val education_smb_password: String?,
    val education_smb_domain: String?,
    val education_repeat_mode: String? = "all",
    val education_play_order: String? = "alphabetical",
    val education_source: String? = "smb",
    val education_playback_mode: String? = "copy",
    val education_force_sync: Boolean? = false,
    val ntp_server: String? = "0.id.pool.ntp.org",
    val home_experience_json: String? = null
)

data class EducationVideoResponse(
    val status: Boolean,
    val message: String,
    val data: List<EducationVideoData>?
)

data class EducationVideoData(
    val id: Int,
    val title: String,
    val video_url: String,
    val thumbnail_url: String? = null,
    val folder_id: Int? = null,
    val folder_name: String? = null
)

data class EntertainmentItemsResponse(
    val status: Boolean,
    val message: String,
    val data: List<EntertainmentItemData>?
)

data class EntertainmentItemData(
    val id: Int,
    val title: String,
    val subtitle: String?,
    val url: String?,
    val content_type: String? = "webview",
    val thumbnail_url: String? = null,
    val sort_order: Int? = 0
)

data class ChannelResponse(
    val status: Boolean,
    val message: String,
    val data: List<ChannelData>?
)

data class ChannelData(
    val id: Int,
    val name: String,
    val logo: String?,
    val group: String,
    val stream_url: String,
    val sort_order: Int,
    val active: Boolean
)

data class StatusRequest(
    val device_id: String,
    val current_channel_id: Int?,
    val uptime_seconds: Long,
    val memory_free_mb: Long,
    val cpu_usage_percent: Float,
    val local_ip: String?
)

data class StatusResponse(
    val status: Boolean,
    val message: String,
    val data: StatusData?
)

data class StatusData(
    val force_sync: Boolean,
    val lock_settings: Boolean,
    val active: Boolean? = true
)

data class LogRequest(
    val device_id: String,
    val error_type: String,
    val error_message: String,
    val channel_id: Int?,
    val stream_url: String?,
    val android_sdk: Int,
    val timestamp: String
)

data class LogResponse(
    val status: Boolean,
    val message: String
)

// --- RETROFIT INTERFACE ---

interface IptvApiService {
    @POST("api/device/register")
    suspend fun registerDevice(@Body request: RegisterRequest): Response<RegisterResponse>

    @GET("api/device/config/{device_id}")
    suspend fun getDeviceConfig(@Path("device_id") deviceId: String): Response<ConfigResponse>

    @GET("api/device/channels/{device_id}")
    suspend fun getDeviceChannels(@Path("device_id") deviceId: String): Response<ChannelResponse>

    @POST("api/device/status")
    suspend fun sendHeartbeat(@Body request: StatusRequest): Response<StatusResponse>

    @POST("api/device/log")
    suspend fun sendErrorLog(@Body request: LogRequest): Response<LogResponse>

    @GET("api/app-update/check")
    suspend fun checkUpdate(@Query("versionCode") currentCode: Int): Response<UpdateCheckResponse>

    @GET("api/device/remote/poll")
    suspend fun pollCommands(@Query("deviceId") deviceId: String): Response<PollResponse>

    @POST("api/device/remote/screenshot/upload")
    suspend fun uploadScreenshot(@Body request: UploadScreenshotRequest): Response<LogResponse>

    @GET("api/education/videos")
    suspend fun getEducationVideos(): Response<EducationVideoResponse>

    @GET("api/entertainment/items")
    suspend fun getEntertainmentItems(): Response<EntertainmentItemsResponse>
}

data class UpdateCheckResponse(
    val status: Boolean,
    val update_available: Boolean,
    val version_name: String?,
    val version_code: Int?,
    val apk_url: String?,
    val apk_file_name: String?,
    val is_mandatory: Boolean?,
    val changelog: String?
)

data class PollResponse(
    val status: Boolean,
    val capture_screenshot: Boolean? = false,
    val commands: List<QueuedCommand>
)

data class QueuedCommand(
    val command: String,
    val value: String?
)

data class UploadScreenshotRequest(
    val deviceId: String,
    val image: String
)
