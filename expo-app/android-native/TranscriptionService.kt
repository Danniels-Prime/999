package com.overlaylang.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import okhttp3.*
import okio.ByteString
import org.json.JSONObject

class TranscriptionService : Service() {

    companion object {
        const val ACTION_TRANSCRIPTION         = "com.overlaylang.app.ACTION_TRANSCRIPTION"
        const val ACTION_TRANSCRIPTION_PARTIAL = "com.overlaylang.app.ACTION_TRANSCRIPTION_PARTIAL"
        const val EXTRA_TEXT       = "transcription_text"
        const val EXTRA_IS_FINAL   = "is_final"
        const val EXTRA_API_KEY    = "api_key"
        const val EXTRA_LANGUAGE   = "language"
        private const val CHANNEL_ID      = "transcription_service"
        private const val NOTIFICATION_ID = 1001
        private const val SAMPLE_RATE     = 16000
        // 100 ms of PCM-16 mono = 16000 * 2 * 0.1 = 3200 bytes
        private const val CHUNK_BYTES     = 3200
    }

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val httpClient   = OkHttpClient()
    private var audioRecord: AudioRecord? = null
    private var webSocket:   WebSocket?   = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val apiKey   = intent?.getStringExtra(EXTRA_API_KEY)   ?: return START_NOT_STICKY
        val language = intent.getStringExtra(EXTRA_LANGUAGE)  ?: "en-US"
        startForeground(NOTIFICATION_ID, buildNotification())
        serviceScope.launch { startStreaming(apiKey, language) }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        webSocket?.close(1000, "Service stopped")
        webSocket = null
        serviceScope.cancel()
        audioRecord?.apply {
            if (recordingState == AudioRecord.RECORDSTATE_RECORDING) stop()
            release()
        }
        audioRecord = null
        super.onDestroy()
    }

    private suspend fun startStreaming(apiKey: String, language: String) {
        val langCode = if (language.startsWith("es")) "es" else "en-US"
        val url = "wss://api.deepgram.com/v1/listen" +
            "?model=nova-2&language=$langCode" +
            "&interim_results=true&punctuate=true" +
            "&encoding=linear16&sample_rate=$SAMPLE_RATE&channels=1"

        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Token $apiKey")
            .build()

        val ready = CompletableDeferred<Unit>()

        val listener = object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                ready.complete(Unit)
            }
            override fun onMessage(ws: WebSocket, text: String) {
                parseAndBroadcast(text)
            }
            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                ready.completeExceptionally(t)
                stopSelf()
            }
            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                stopSelf()
            }
        }

        webSocket = httpClient.newWebSocket(request, listener)

        try {
            ready.await()
            recordAndStream()
        } catch (_: Exception) {
            stopSelf()
        }
    }

    private suspend fun recordAndStream() {
        val minBuf = AudioRecord.getMinBufferSize(
            SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
        )
        val recorder = try {
            AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                maxOf(CHUNK_BYTES * 4, minBuf)
            )
        } catch (e: SecurityException) {
            stopSelf(); return
        }

        audioRecord = recorder
        recorder.startRecording()
        val buffer = ByteArray(CHUNK_BYTES)

        val job = currentCoroutineContext()[Job] ?: return
        while (job.isActive) {
            val read = recorder.read(buffer, 0, CHUNK_BYTES)
            if (read > 0) webSocket?.send(ByteString.of(*buffer.copyOf(read)))
        }
    }

    private fun parseAndBroadcast(json: String) {
        try {
            val obj = JSONObject(json)
            if (obj.optString("type") != "Results") return
            val isFinal = obj.optBoolean("is_final", false)
            val transcript = obj
                .getJSONObject("channel")
                .getJSONArray("alternatives")
                .getJSONObject(0)
                .getString("transcript")
                .trim()
            if (transcript.isBlank()) return
            val action = if (isFinal) ACTION_TRANSCRIPTION else ACTION_TRANSCRIPTION_PARTIAL
            sendBroadcast(Intent(action)
                .putExtra(EXTRA_TEXT, transcript)
                .putExtra(EXTRA_IS_FINAL, isFinal))
        } catch (_: Exception) {}
    }

    private fun createNotificationChannel() {
        val ch = NotificationChannel(CHANNEL_ID, "Live Transcription", NotificationManager.IMPORTANCE_LOW)
        ch.setSound(null, null)
        getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
    }

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("OverlayLang — live captions")
            .setContentText("Tap to return to app")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true).setSilent(true)
            .build()
}
