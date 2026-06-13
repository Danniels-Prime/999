package com.overlaylang.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class TranscriptionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var receiver: BroadcastReceiver? = null

    override fun getName() = "TranscriptionModule"

    override fun initialize() {
        super.initialize()
        val br = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val text   = intent.getStringExtra(TranscriptionService.EXTRA_TEXT)   ?: return
                val isFinal = intent.getBooleanExtra(TranscriptionService.EXTRA_IS_FINAL, true)
                val event  = if (isFinal) "onTranscription" else "onTranscriptionPartial"
                val params = Arguments.createMap().apply {
                    putString("text", text)
                    putBoolean("isFinal", isFinal)
                }
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(event, params)
            }
        }
        receiver = br
        val filter = IntentFilter().apply {
            addAction(TranscriptionService.ACTION_TRANSCRIPTION)
            addAction(TranscriptionService.ACTION_TRANSCRIPTION_PARTIAL)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(br, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            reactContext.registerReceiver(br, filter)
        }
    }

    override fun invalidate() {
        receiver?.let { try { reactContext.unregisterReceiver(it) } catch (_: Exception) {} }
        receiver = null
        super.invalidate()
    }

    @ReactMethod
    fun startTranscription(apiKey: String, language: String) {
        val intent = Intent(reactContext, TranscriptionService::class.java).apply {
            putExtra(TranscriptionService.EXTRA_API_KEY, apiKey)
            putExtra(TranscriptionService.EXTRA_LANGUAGE, language)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            reactContext.startForegroundService(intent)
        else
            reactContext.startService(intent)
    }

    @ReactMethod
    fun stopTranscription() {
        reactContext.stopService(Intent(reactContext, TranscriptionService::class.java))
    }

    @ReactMethod
    fun showOverlay(text: String) {
        val intent = Intent(reactContext, OverlayService::class.java).apply {
            action = OverlayService.ACTION_SHOW
            putExtra(OverlayService.EXTRA_TEXT, text)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            reactContext.startForegroundService(intent)
        else
            reactContext.startService(intent)
    }

    @ReactMethod
    fun hideOverlay() {
        reactContext.startService(Intent(reactContext, OverlayService::class.java).apply {
            action = OverlayService.ACTION_HIDE
        })
    }

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(reactContext))
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
