package com.overlay;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.speech.tts.TextToSpeech;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.WindowManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactRootView;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.Locale;

/**
 * Foreground service that:
 *  1. Always reads the word/phrase aloud via TTS (no exceptions)
 *  2. Shows a floating ReactRootView overlay card
 *  3. Passes word + mode to JS via a RN event
 */
public class OverlayService extends Service {

    public static final String EXTRA_WORD = "word";
    public static final String EXTRA_MODE = "mode";

    /** Double-tap: translation only */
    public static final int MODE_TRANSLATION_ONLY = 1;
    /** Ghost drag: TTS + translation */
    public static final int MODE_TTS_PLUS_TRANSLATION = 2;
    /** Long press / handle selection: sentence-level full translation */
    public static final int MODE_SENTENCE = 3;
    /** Clipboard copy: translation only */
    public static final int MODE_CLIPBOARD = 4;

    private static final String CHANNEL_ID = "overlay_lang_channel";
    private static final int NOTIF_ID = 1001;
    private static final String PREFS = "overlay_lang_prefs";
    private static final String PREF_LANG_DIRECTION = "lang_direction"; // "en_es" or "es_en"

    private WindowManager windowManager;
    private ReactRootView overlayView;
    private TextToSpeech tts;
    private boolean ttsReady = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIF_ID, buildNotification());
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        initTts();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;

        String word = intent.getStringExtra(EXTRA_WORD);
        int mode = intent.getIntExtra(EXTRA_MODE, MODE_TRANSLATION_ONLY);

        if (word == null || word.isEmpty()) return START_STICKY;

        // 1. Always speak the word/phrase aloud first — no exceptions
        speakAloud(word);

        // 2. Show overlay card
        showOverlay(word, mode);

        return START_STICKY;
    }

    // ── TTS ──────────────────────────────────────────────────────────────────────────

    private void initTts() {
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                ttsReady = true;
                applyTtsLocale();
            }
        });
    }

    private void applyTtsLocale() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String direction = prefs.getString(PREF_LANG_DIRECTION, "en_es");
        // Source language is what gets spoken
        Locale locale = direction.equals("en_es") ? Locale.US : new Locale("es", "ES");
        int result = tts.setLanguage(locale);
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            tts.setLanguage(Locale.US); // fallback
        }
    }

    /**
     * Speaks the text aloud. Called unconditionally on every activation.
     */
    private void speakAloud(String text) {
        if (!ttsReady || tts == null) return;
        applyTtsLocale();
        tts.stop();
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "overlay_lang_utterance");
    }

    // ── Overlay window ───────────────────────────────────────────────────────────────────

    private void showOverlay(String word, int mode) {
        removeOverlay();

        ReactInstanceManager rim = ((ReactApplication) getApplication())
                .getReactNativeHost()
                .getReactInstanceManager();

        overlayView = new ReactRootView(this);

        // Pass data to the JS overlay component via initialProperties
        android.os.Bundle props = new android.os.Bundle();
        props.putString("word", word);
        props.putInt("mode", mode);
        overlayView.startReactApplication(rim, "OverlayCard", props);

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        params.y = 120;

        makeDraggable(params);
        windowManager.addView(overlayView, params);

        // Also send an event to the main RN app in case it's open
        emitWordEvent(rim, word, mode);
    }

    private void makeDraggable(WindowManager.LayoutParams params) {
        // Touch listener is set after addView; stored as tag for later retrieval
        // The actual drag is handled inside the JS OverlayCard using a PanResponder
    }

    public void removeOverlay() {
        if (overlayView != null && overlayView.isAttachedToWindow()) {
            windowManager.removeView(overlayView);
            overlayView.unmountReactApplication();
            overlayView = null;
        }
    }

    private void emitWordEvent(ReactInstanceManager rim, String word, int mode) {
        try {
            rim.getCurrentReactContext()
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onWordActivated", buildEventPayload(word, mode));
        } catch (Exception ignored) {
            // Main app may not be running; overlay still shows
        }
    }

    private WritableMap buildEventPayload(String word, int mode) {
        WritableMap map = Arguments.createMap();
        map.putString("word", word);
        map.putInt("mode", mode);
        return map;
    }

    // ── Foreground notification ─────────────────────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "OverlayLang Active",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps the overlay service running");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent openApp = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, openApp,
                PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("OverlayLang")
                .setContentText("Tap any word to translate")
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .setContentIntent(pi)
                .setOngoing(true)
                .build();
    }

    @Override
    public void onDestroy() {
        removeOverlay();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }
}
