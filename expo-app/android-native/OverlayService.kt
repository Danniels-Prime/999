package com.overlaylang.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import okhttp3.*
import org.json.JSONObject
import java.io.IOException
import java.net.URLEncoder

class OverlayService : Service() {

    companion object {
        const val ACTION_SHOW   = "com.overlaylang.app.OVERLAY_SHOW"
        const val ACTION_HIDE   = "com.overlaylang.app.OVERLAY_HIDE"
        const val EXTRA_TEXT    = "overlay_text"
        const val EXTRA_LANG    = "overlay_lang"   // "en_es" or "es_en"
        private const val CHANNEL_ID      = "overlay_service"
        private const val NOTIFICATION_ID = 1002
        private const val DETAIL_AUTO_DISMISS_MS = 5000L
    }

    private val mainHandler  = Handler(Looper.getMainLooper())
    private val httpClient   = OkHttpClient()
    private var windowManager: WindowManager? = null
    private var captionView:   FrameLayout?   = null
    private var detailView:    FrameLayout?   = null
    private var currentLang  = "en_es"
    private var dismissRunnable: Runnable?    = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> {
                currentLang = intent.getStringExtra(EXTRA_LANG) ?: "en_es"
                showCaption(intent.getStringExtra(EXTRA_TEXT) ?: "")
            }
            ACTION_HIDE -> {
                hideCaption()
                hideDetail()
            }
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        hideCaption()
        hideDetail()
        super.onDestroy()
    }

    // ── Caption bar ───────────────────────────────────────────────────────────

    private fun showCaption(text: String) {
        mainHandler.post {
            hideCaption()
            if (text.isBlank()) return@post

            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(24, 12, 24, 12)
            }

            text.trim().split(" ").forEach { rawWord ->
                val clean = rawWord.replace(Regex("[^a-zA-ZÀ-ÿ''\\-]"), "")
                val chip = TextView(this).apply {
                    this.text = "$rawWord "
                    textSize  = 15f
                    setTextColor(Color.parseColor("#F0EEFF"))
                    typeface  = Typeface.DEFAULT
                    setPadding(2, 4, 2, 4)
                    if (clean.isNotEmpty()) {
                        setOnClickListener { onWordTapped(clean) }
                    }
                }
                row.addView(chip)
            }

            val scroll = HorizontalScrollView(this).apply {
                setBackgroundColor(Color.parseColor("#EE0A0C18"))
                addView(row)
            }

            captionView = FrameLayout(this).apply { addView(scroll) }

            val params = overlayParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                yOffset = 0
            )
            try { windowManager?.addView(captionView, params) } catch (_: Exception) {}
        }
    }

    private fun hideCaption() {
        mainHandler.post {
            captionView?.let { try { windowManager?.removeView(it) } catch (_: Exception) {} }
            captionView = null
        }
    }

    // ── Word tap → translation detail ────────────────────────────────────────

    private fun onWordTapped(word: String) {
        val srcFlag = if (currentLang == "en_es") "🇺🇸" else "🇪🇸"
        val tgtFlag = if (currentLang == "en_es") "🇪🇸" else "🇺🇸"
        val langpair = if (currentLang == "en_es") "en|es" else "es|en"

        showDetail("$srcFlag  $word  ···")

        val url = "https://api.mymemory.translated.net/get" +
            "?q=${URLEncoder.encode(word, "UTF-8")}&langpair=$langpair"

        httpClient.newCall(Request.Builder().url(url).build())
            .enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    updateDetailText("$srcFlag  $word  →  $tgtFlag  —")
                }
                override fun onResponse(call: Call, response: Response) {
                    val translation = try {
                        val body = response.body?.string() ?: ""
                        JSONObject(body)
                            .getJSONObject("responseData")
                            .getString("translatedText")
                            .trim()
                    } catch (_: Exception) { "—" }
                    updateDetailText("$srcFlag  $word  →  $tgtFlag  $translation")
                }
            })
    }

    private fun showDetail(text: String) {
        mainHandler.post {
            // If already showing, just update the text
            if (detailView != null) {
                updateDetailText(text)
                return@post
            }

            val label = TextView(this).apply {
                this.text = text
                textSize  = 16f
                setTextColor(Color.parseColor("#A96FFF"))
                typeface  = Typeface.MONOSPACE
                setPadding(32, 20, 32, 20)
                setShadowLayer(6f, 0f, 0f, Color.parseColor("#7B2FFF"))
            }

            val frame = FrameLayout(this).apply {
                setBackgroundColor(Color.parseColor("#F2060810"))
                addView(label)
                setOnClickListener { hideDetail() }
            }
            detailView = frame

            val params = overlayParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                yOffset = 64
            )
            try { windowManager?.addView(frame, params) } catch (_: Exception) {}

            scheduleDismiss()
        }
    }

    private fun updateDetailText(text: String) {
        mainHandler.post {
            val label = detailView?.getChildAt(0) as? TextView
            if (label != null) {
                label.text = text
                scheduleDismiss()
            } else {
                showDetail(text)
            }
        }
    }

    private fun scheduleDismiss() {
        dismissRunnable?.let { mainHandler.removeCallbacks(it) }
        val r = Runnable { hideDetail() }
        dismissRunnable = r
        mainHandler.postDelayed(r, DETAIL_AUTO_DISMISS_MS)
    }

    private fun hideDetail() {
        mainHandler.post {
            dismissRunnable?.let { mainHandler.removeCallbacks(it) }
            dismissRunnable = null
            detailView?.let { try { windowManager?.removeView(it) } catch (_: Exception) {} }
            detailView = null
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun overlayParams(w: Int, h: Int, yOffset: Int) =
        WindowManager.LayoutParams(
            w, h,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = yOffset
        }

    private fun createNotificationChannel() {
        val ch = NotificationChannel(CHANNEL_ID, "Overlay Display", NotificationManager.IMPORTANCE_MIN)
        ch.setSound(null, null); ch.setShowBadge(false)
        getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
    }

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("OverlayLang overlay active")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true).setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
}
