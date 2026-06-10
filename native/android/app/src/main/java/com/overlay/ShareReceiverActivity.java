package com.overlay;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Invisible activity registered for android.intent.action.PROCESS_TEXT.
 * When the user selects text in any app and taps "OverlayLang" in the
 * selection toolbar, Android calls this activity with the selected text.
 *
 * It immediately forwards to OverlayService (which speaks + shows overlay)
 * then finishes — the user never sees this activity.
 */
public class ShareReceiverActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CharSequence text = getIntent().getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
        if (text != null && text.length() > 0) {
            Intent serviceIntent = new Intent(this, OverlayService.class);
            serviceIntent.putExtra(OverlayService.EXTRA_WORD, text.toString().trim());
            // Sentence-level mode since user explicitly selected this text
            serviceIntent.putExtra(OverlayService.EXTRA_MODE, OverlayService.MODE_SENTENCE);
            startService(serviceIntent);
        }

        finish();
    }
}
