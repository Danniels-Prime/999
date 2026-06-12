package com.overlaylang.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Fires on BOOT_COMPLETED, QUICKBOOT_POWERON, and MY_PACKAGE_REPLACED.
 * Starts the OverlayService in idle (hidden) state so the app is ready
 * the moment the user needs it — no manual launch required after a reboot.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val validActions = setOf(
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            Intent.ACTION_MY_PACKAGE_REPLACED,
        )
        if (intent.action !in validActions) return

        val svcIntent = Intent(context, OverlayService::class.java).apply {
            action = OverlayService.ACTION_HIDE
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(svcIntent)
            } else {
                context.startService(svcIntent)
            }
        } catch (_: Exception) {
            // If SYSTEM_ALERT_WINDOW hasn't been granted yet, the service
            // will request the permission next time the app is opened.
        }
    }
}
