package com.overlaylang.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.IBinder
import android.view.Gravity
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

class OverlayService : Service() {

    companion object {
        const val ACTION_SHOW = "com.overlaylang.app.OVERLAY_SHOW"
        const val ACTION_HIDE = "com.overlaylang.app.OVERLAY_HIDE"
        const val EXTRA_TEXT = "overlay_text"
        private const val CHANNEL_ID = "overlay_service"
        private const val NOTIFICATION_ID = 1002
    }

    private var windowManager: WindowManager? = null
    private var overlayView: FrameLayout? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> showOverlay(intent.getStringExtra(EXTRA_TEXT) ?: "")
            ACTION_HIDE -> hideOverlay()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        hideOverlay()
        super.onDestroy()
    }

    private fun showOverlay(text: String) {
        hideOverlay()
        if (text.isBlank()) return

        val container = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#E6060810"))
            setPadding(48, 24, 48, 24)
        }

        val label = TextView(this).apply {
            this.text = text
            textSize = 16f
            setTextColor(Color.parseColor("#7B2FFF"))
            typeface = Typeface.MONOSPACE
            setShadowLayer(4f, 0f, 0f, Color.parseColor("#7B2FFF"))
        }

        container.addView(label)
        overlayView = container

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = 160
        }

        windowManager?.addView(container, params)
    }

    private fun hideOverlay() {
        overlayView?.let {
            try { windowManager?.removeView(it) } catch (_: Exception) {}
        }
        overlayView = null
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Overlay Display",
            NotificationManager.IMPORTANCE_MIN
        ).apply {
            setSound(null, null)
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("OverlayLang overlay active")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }
}
