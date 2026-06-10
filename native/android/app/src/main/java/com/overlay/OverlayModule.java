package com.overlay;

import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/**
 * React Native bridge: exposes native overlay controls to JavaScript.
 *
 * JS usage:
 *   import { NativeModules } from 'react-native';
 *   const { OverlayModule } = NativeModules;
 *
 *   OverlayModule.showOverlay('hello', 1);
 *   OverlayModule.hideOverlay();
 *   OverlayModule.startServices();
 *   OverlayModule.hasOverlayPermission();  // returns Promise<boolean>
 *   OverlayModule.setLanguageDirection('en_es');
 */
public class OverlayModule extends ReactContextBaseJavaModule {

    private static final String PREFS = "overlay_lang_prefs";
    private static final String PREF_LANG = "lang_direction";
    private final ReactApplicationContext reactContext;

    public OverlayModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @NonNull
    @Override
    public String getName() {
        return "OverlayModule";
    }

    @ReactMethod
    public void showOverlay(String word, int mode) {
        Intent intent = new Intent(reactContext, OverlayService.class);
        intent.putExtra(OverlayService.EXTRA_WORD, word);
        intent.putExtra(OverlayService.EXTRA_MODE, mode);
        reactContext.startService(intent);
    }

    @ReactMethod
    public void hideOverlay() {
        reactContext.stopService(new Intent(reactContext, OverlayService.class));
    }

    @ReactMethod
    public void startServices() {
        reactContext.startService(new Intent(reactContext, OverlayService.class));
        reactContext.startService(new Intent(reactContext, ClipboardMonitorService.class));
    }

    @ReactMethod
    public void stopServices() {
        reactContext.stopService(new Intent(reactContext, OverlayService.class));
        reactContext.stopService(new Intent(reactContext, ClipboardMonitorService.class));
    }

    @ReactMethod
    public void setLanguageDirection(String direction) {
        // direction: "en_es" or "es_en"
        reactContext.getSharedPreferences(PREFS, 0)
                .edit()
                .putString(PREF_LANG, direction)
                .apply();
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public boolean hasOverlayPermissionSync() {
        return Settings.canDrawOverlays(reactContext);
    }

    @ReactMethod
    public void requestOverlayPermission() {
        Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                android.net.Uri.parse("package:" + reactContext.getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
    }

    @ReactMethod
    public void requestAccessibilityPermission() {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
    }

    // Allows JS to emit events back to native (used for close button in overlay)
    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(int count) {}
}
