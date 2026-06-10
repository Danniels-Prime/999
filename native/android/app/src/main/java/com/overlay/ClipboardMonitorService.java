package com.overlay;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.ClipboardManager;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Monitors the system clipboard. When the user copies a word or short phrase,
 * triggers the overlay with a 400ms delay (lets the copy action settle first).
 *
 * Runs as a foreground service alongside OverlayService.
 */
public class ClipboardMonitorService extends Service {

    private static final String CHANNEL_ID = "clipboard_monitor_channel";
    private static final int NOTIF_ID = 1002;
    private static final long TRIGGER_DELAY_MS = 400;
    private static final int MAX_CLIPBOARD_LENGTH = 200;

    private ClipboardManager clipboardManager;
    private ClipboardManager.OnPrimaryClipChangedListener clipListener;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String lastClip = "";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIF_ID, buildNotification());

        clipboardManager = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        clipListener = () -> handler.postDelayed(this::checkClipboard, TRIGGER_DELAY_MS);
        clipboardManager.addPrimaryClipChangedListener(clipListener);
    }

    private void checkClipboard() {
        if (clipboardManager.hasPrimaryClip()) {
            CharSequence text = clipboardManager.getPrimaryClip()
                    .getItemAt(0)
                    .coerceToText(this);

            if (text == null) return;
            String clip = text.toString().trim();

            // Ignore if empty, unchanged, or too long to be a word/phrase
            if (clip.isEmpty() || clip.equals(lastClip) || clip.length() > MAX_CLIPBOARD_LENGTH) return;

            lastClip = clip;

            Intent intent = new Intent(this, OverlayService.class);
            intent.putExtra(OverlayService.EXTRA_WORD, clip);
            intent.putExtra(OverlayService.EXTRA_MODE, OverlayService.MODE_CLIPBOARD);
            startService(intent);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Clipboard Monitor",
                    NotificationManager.IMPORTANCE_MIN
            );
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("OverlayLang")
                .setContentText("Clipboard monitoring active")
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .setOngoing(true)
                .build();
    }

    @Override
    public void onDestroy() {
        if (clipboardManager != null && clipListener != null) {
            clipboardManager.removePrimaryClipChangedListener(clipListener);
        }
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }
}
