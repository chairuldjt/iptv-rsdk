# Retrofit/Gson models are serialized by field name.
-keepattributes Signature
-keepattributes *Annotation*

-keep class com.example.rsdkiptvplayer.data.api.** { *; }

# Media3 and jcifs use some reflective entry points internally.
-dontwarn androidx.media3.**
-dontwarn eu.agno3.jcifs.**
-dontwarn org.slf4j.impl.StaticLoggerBinder

# Registered reflectively through java.security.Provider for jcifs MD4/NTLM auth.
-keep class com.example.rsdkiptvplayer.util.Md4MessageDigest { *; }
-keep class com.example.rsdkiptvplayer.util.Md4Provider { *; }
