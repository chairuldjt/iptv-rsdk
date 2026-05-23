package com.example.rsdkiptvplayer.util

import android.content.Context
import android.util.Log
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter

class CrashHandler(private val context: Context) : Thread.UncaughtExceptionHandler {
    private val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()

    companion object {
        private const val CRASH_FILE = "latest_crash.txt"

        fun getSavedCrash(context: Context): String? {
            val file = File(context.filesDir, CRASH_FILE)
            return if (file.exists()) {
                try {
                    file.readText()
                } catch (e: Exception) {
                    null
                }
            } else {
                null
            }
        }

        fun clearSavedCrash(context: Context) {
            val file = File(context.filesDir, CRASH_FILE)
            if (file.exists()) {
                file.delete()
            }
        }
    }

    override fun uncaughtException(thread: Thread, throwable: Throwable) {
        try {
            val sw = StringWriter()
            throwable.printStackTrace(PrintWriter(sw))
            val stackTrace = sw.toString()
            
            // Extract exception message and first application-specific stack line
            val lines = stackTrace.split("\n")
            val formatted = StringBuilder()
            if (lines.isNotEmpty()) {
                formatted.append(lines[0].trim()) // java.lang.NullPointerException: message
            }
            for (i in 1 until lines.size) {
                val line = lines[i].trim()
                if (line.contains("com.example.rsdkiptvplayer")) {
                    formatted.append(" | ").append(line.replace("at com.example.rsdkiptvplayer.", ""))
                    break // Capture the first app frame
                }
            }
            if (formatted.length <= lines[0].length && lines.size > 1) {
                formatted.append(" | ").append(lines[1].trim())
            }

            // Truncate to 190 characters to safely fit in MySQL VARCHAR(191) db column
            val crashMsg = if (formatted.length > 190) {
                formatted.substring(0, 187) + "..."
            } else {
                formatted.toString()
            }

            val file = File(context.filesDir, CRASH_FILE)
            file.writeText(crashMsg)
            Log.e("CrashHandler", "Crash details successfully recorded: $crashMsg")
        } catch (e: Exception) {
            Log.e("CrashHandler", "Failed to record crash locally", e)
        }
        
        // Let the system finish the process (which shows the "Force Close" dialog)
        defaultHandler?.uncaughtException(thread, throwable)
    }
}
