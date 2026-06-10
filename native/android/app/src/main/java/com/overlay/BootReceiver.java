package com.overlay;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restarts overlay + clipboard services after device reboot. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            context.startService(new Intent(context, OverlayService.class));
            context.startService(new Intent(context, ClipboardMonitorService.class));
        }
    }
}
