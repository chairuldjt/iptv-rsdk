import java.util.Properties
import java.io.BufferedReader
import java.io.InputStreamReader

plugins {
  alias(libs.plugins.android.application)
  alias(libs.plugins.compose.compiler)
  alias(libs.plugins.kotlin.serialization)
  alias(libs.plugins.legacy.kapt)
}

val rootEnv = Properties().apply {
    val envFile = rootProject.layout.projectDirectory.file("../.env").asFile
    if (envFile.exists()) {
        envFile.inputStream().use(::load)
    }
}

val releaseEnv = Properties().apply {
    val envFile = rootProject.file(".env")
    if (envFile.exists()) {
        envFile.inputStream().use(::load)
    }
}

fun optionalRootEnv(name: String): String? =
    normalizeEnvValue(rootEnv.getProperty(name))
        ?: normalizeEnvValue(providers.environmentVariable(name).orNull)

fun optionalReleaseEnv(name: String): String? =
    normalizeEnvValue(releaseEnv.getProperty(name))
        ?: normalizeEnvValue(providers.environmentVariable(name).orNull)

fun releaseEnv(name: String): String =
    optionalReleaseEnv(name)
        ?: error("$name must be set in android-client/.env or environment variables")

fun rootEnvBoolean(name: String, fallback: Boolean): Boolean =
    when (optionalRootEnv(name)?.lowercase()) {
        "1", "true", "yes", "on" -> true
        "0", "false", "no", "off" -> false
        else -> fallback
    }

val defaultApiBaseUrl = optionalRootEnv("DEFAULT_API_BASE_URL")
    ?: "https://iptv.teknisirsdk.my.id"
val homeLowEffectMode = rootEnvBoolean("HOME_LOW_EFFECT_MODE", true)

fun normalizeEnvValue(value: String?): String? {
    val trimmed = value?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    return trimmed.removeSurrounding("\"").removeSurrounding("'").trim().takeIf { it.isNotEmpty() }
}

val gitVersionCode: Int = try {
    providers.exec {
        commandLine("git", "rev-list", "--count", "HEAD")
    }.standardOutput.asText.map { it.trim().toIntOrNull() ?: 2 }.get()
} catch (e: Exception) {
    2
}

val gitVersionName: String = try {
    providers.exec {
        commandLine("git", "describe", "--tags", "--always")
    }.standardOutput.asText.map { it.trim().ifBlank { "1.1" } }.get()
} catch (e: Exception) {
    "1.1"
}

android {
    namespace = "com.itops.iptvplayer"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.itops.iptvplayer"
        minSdk = 23
        targetSdk = 36
        versionCode = gitVersionCode
        versionName = gitVersionName
        
        buildConfigField("String", "DEFAULT_API_BASE_URL", "\"$defaultApiBaseUrl\"")
        buildConfigField("boolean", "HOME_LOW_EFFECT_MODE", homeLowEffectMode.toString())
    }

    signingConfigs {
        create("release") {
            storeFile = rootProject.file(releaseEnv("KEYSTORE_FILE"))
            storePassword = releaseEnv("KEYSTORE_STORE_PASSWORD")
            keyAlias = releaseEnv("KEYSTORE_KEY_ALIAS")
            keyPassword = releaseEnv("KEYSTORE_KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
      compose = true
      buildConfig = true
      aidl = false
      shaders = false
    }

    packaging {
      resources {
        excludes += "/META-INF/{AL2.0,LGPL2.1}"
      }
    }
}



dependencies {
  val composeBom = platform(libs.androidx.compose.bom)
  implementation(composeBom)
  androidTestImplementation(composeBom)

  // Core Android dependencies
  implementation(libs.androidx.core.ktx)
  implementation(libs.androidx.lifecycle.runtime.ktx)
  implementation(libs.androidx.activity.compose)

  // Arch Components
  implementation(libs.androidx.lifecycle.runtime.compose)
  implementation(libs.androidx.lifecycle.viewmodel.compose)

  // Compose
  implementation(libs.androidx.compose.ui)
  implementation(libs.androidx.compose.ui.tooling.preview)
  implementation(libs.androidx.compose.material3)
  implementation(libs.androidx.compose.material.icons.core)
  implementation(libs.androidx.compose.material.icons.extended)
  // Tooling
  debugImplementation(libs.androidx.compose.ui.tooling)
  // Instrumented tests
  androidTestImplementation(libs.androidx.compose.ui.test.junit4)
  debugImplementation(libs.androidx.compose.ui.test.manifest)

  // Local tests: jUnit, coroutines, Android runner
  testImplementation(libs.junit)
  testImplementation(libs.kotlinx.coroutines.test)

  // Instrumented tests: jUnit rules and runners
  androidTestImplementation(libs.androidx.test.core)
  androidTestImplementation(libs.androidx.test.ext.junit)
  androidTestImplementation(libs.androidx.test.runner)
  androidTestImplementation(libs.androidx.test.espresso.core)

  // Navigation
  implementation(libs.androidx.navigation3.ui)
  implementation(libs.androidx.navigation3.runtime)
  implementation(libs.androidx.lifecycle.viewmodel.navigation3)

  // Retrofit & OkHttp
  implementation("com.squareup.retrofit2:retrofit:2.11.0")
  implementation("com.squareup.retrofit2:converter-gson:2.11.0")
  implementation("com.squareup.okhttp3:okhttp:4.12.0")
  implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

  // Jetpack Room
  val roomVersion = "2.8.4"
  implementation("androidx.room:room-runtime:$roomVersion")
  implementation("androidx.room:room-ktx:$roomVersion")
  kapt("androidx.room:room-compiler:$roomVersion")

  // Jetpack DataStore
  implementation("androidx.datastore:datastore-preferences:1.1.1")

  // Coil Compose for image loading
  implementation("io.coil-kt:coil-compose:2.6.0")
  implementation("io.coil-kt:coil-svg:2.6.0")

  // Media3 ExoPlayer
  val media3Version = "1.3.1"
  implementation("androidx.media3:media3-exoplayer:$media3Version")
  implementation("androidx.media3:media3-exoplayer-hls:$media3Version")
  implementation("androidx.media3:media3-ui:$media3Version")

  // SMB/CIFS reader for Windows network share education videos
  implementation("eu.agno3.jcifs:jcifs-ng:2.1.10")
}
