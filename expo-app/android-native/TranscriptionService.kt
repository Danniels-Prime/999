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
import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

class TranscriptionService : Service() {

    companion object {
        const val ACTION_TRANSCRIPTION = "com.overlaylang.app.ACTION_TRANSCRIPTION"
        const val EXTRA_TEXT = "transcription_text"
        const val EXTRA_API_KEY = "api_key"
        const val EXTRA_LANGUAGE = "language"
        private const val CHANNEL_ID = "transcription_service"
        private const val NOTIFICATION_ID = 1001
        private const val SAMPLE_RATE = 16000
        private const val CHUNK_SECONDS = 4
    }

    private var serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var audioRecord: AudioRecord? = null
    private var apiKey: String = ""
    private var language: String = "en-US"

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        apiKey = intent?.getStringExtra(EXTRA_API_KEY) ?: ""
        language = intent?.getStringExtra(EXTRA_LANGUAGE) ?: "en-US"

        startForeground(NOTIFICATION_ID, buildNotification())
        serviceScope.launch { recordAndTranscribe() }

        return START_NOT_STICKY
    }

    override fun onDestroy() {
        serviceScope.cancel()
        audioRecord?.let {
            if (it.recordingState == AudioRecord.RECORDSTATE_RECORDING) it.stop()
            it.release()
        }
        audioRecord = null
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Background Transcription",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "OverlayLang is listening in the background"
            setSound(null, null)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("OverlayLang — listening...")
            .setContentText("Tap to return to app")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private suspend fun recordAndTranscribe() {
        val bufferSize = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        ).coerceAtLeast(SAMPLE_RATE * 2)

        val recorder = try {
            AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize
            )
        } catch (e: SecurityException) {
            return
        }

        audioRecord = recorder
        recorder.startRecording()

        val chunkSamples = SAMPLE_RATE * CHUNK_SECONDS
        val buffer = ShortArray(chunkSamples)

        while (currentCoroutineContext().isActive) {
            var totalRead = 0
            while (totalRead < chunkSamples && currentCoroutineContext().isActive) {
                val read = recorder.read(buffer, totalRead, chunkSamples - totalRead)
                if (read <= 0) break
                totalRead += read
            }
            if (totalRead > 0 && apiKey.isNotBlank()) {
                val wavBytes = buildWav(buffer, totalRead)
                try {
                    val text = postToDeepgram(wavBytes, apiKey, language)
                    if (text.isNotBlank()) broadcastResult(text)
                } catch (_: Exception) {}
            }
        }
    }

    private fun buildWav(pcm: ShortArray, samples: Int): ByteArray {
        val out = ByteArrayOutputStream()
        val dos = DataOutputStream(out)
        val dataSize = samples * 2
        val chunkSize = 36 + dataSize

        // RIFF header
        dos.writeBytes("RIFF")
        dos.writeIntLE(chunkSize)
        dos.writeBytes("WAVE")
        // fmt chunk
        dos.writeBytes("fmt ")
        dos.writeIntLE(16)
        dos.writeShortLE(1)  // PCM
        dos.writeShortLE(1)  // mono
        dos.writeIntLE(SAMPLE_RATE)
        dos.writeIntLE(SAMPLE_RATE * 2)
        dos.writeShortLE(2)
        dos.writeShortLE(16)
        // data chunk
        dos.writeBytes("data")
        dos.writeIntLE(dataSize)
        for (i in 0 until samples) {
            val s = pcm[i].toInt()
            dos.write(s and 0xFF)
            dos.write((s shr 8) and 0xFF)
        }
        dos.flush()
        return out.toByteArray()
    }

    private fun postToDeepgram(wav: ByteArray, key: String, lang: String): String {
        val langCode = if (lang.startsWith("es")) "es" else "en-US"
        val url = URL("https://api.deepgram.com/v1/listen?model=nova-2&language=$langCode")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Authorization", "Token $key")
        conn.setRequestProperty("Content-Type", "audio/wav")
        conn.doOutput = true
        conn.connectTimeout = 10_000
        conn.readTimeout = 15_000
        conn.outputStream.use { it.write(wav) }

        if (conn.responseCode != 200) return ""
        val body = conn.inputStream.bufferedReader().readText()
        val json = JSONObject(body)
        return json
            .getJSONObject("results")
            .getJSONArray("channels")
            .getJSONObject(0)
            .getJSONArray("alternatives")
            .getJSONObject(0)
            .getString("transcript")
            .trim()
    }

    private fun broadcastResult(text: String) {
        sendBroadcast(Intent(ACTION_TRANSCRIPTION).putExtra(EXTRA_TEXT, text))
    }
}

// Little-endian helpers for DataOutputStream
private fun DataOutputStream.writeIntLE(v: Int) {
    write(v and 0xFF)
    write((v shr 8) and 0xFF)
    write((v shr 16) and 0xFF)
    write((v shr 24) and 0xFF)
}

private fun DataOutputStream.writeShortLE(v: Int) {
    write(v and 0xFF)
    write((v shr 8) and 0xFF)
}
