package com.overlay;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.content.Intent;
import android.graphics.Path;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.LinkedList;

/**
 * System-wide accessibility service powering the three activation methods:
 *
 * 1. DOUBLE-TAP  — two TYPE_VIEW_CLICKED on the same node within 400ms → translation only
 * 2. GHOST DRAG  — slow horizontal touch from start to lift over a text node → TTS + translation
 * 3. LONG PRESS  — TYPE_VIEW_LONG_CLICKED on a text node → sentence selection + full translation
 */
public class LanguageAccessibilityService extends AccessibilityService {

    private static final long DOUBLE_TAP_WINDOW_MS = 400;
    private static final long LONG_PRESS_HAPTIC_MS = 300;
    private static final long LONG_PRESS_OVERLAY_MS = 600;

    private final Handler handler = new Handler(Looper.getMainLooper());

    // Double-tap tracking
    private String lastClickedNodeId = null;
    private long lastClickTime = 0;

    // Ghost drag tracking
    private long touchStartTime = 0;
    private AccessibilityNodeInfo dragStartNode = null;
    private static final long GHOST_DRAG_MIN_MS = 250;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        switch (event.getEventType()) {

            case AccessibilityEvent.TYPE_VIEW_CLICKED:
                handleClick(event);
                break;

            case AccessibilityEvent.TYPE_VIEW_LONG_CLICKED:
                handleLongPress(event);
                break;

            case AccessibilityEvent.TYPE_TOUCH_INTERACTION_START:
                touchStartTime = System.currentTimeMillis();
                dragStartNode = event.getSource();
                break;

            case AccessibilityEvent.TYPE_TOUCH_INTERACTION_END:
                handleTouchEnd(event);
                break;

            case AccessibilityEvent.TYPE_VIEW_TEXT_SELECTION_CHANGED:
                handleSelectionChanged(event);
                break;
        }
    }

    // --- Activation 1: Double-tap → translation only ---
    private void handleClick(AccessibilityEvent event) {
        AccessibilityNodeInfo node = event.getSource();
        if (node == null) return;

        String nodeId = node.getViewIdResourceName() != null
                ? node.getViewIdResourceName()
                : String.valueOf(node.hashCode());

        long now = System.currentTimeMillis();

        if (nodeId.equals(lastClickedNodeId) && (now - lastClickTime) < DOUBLE_TAP_WINDOW_MS) {
            String word = extractWord(node);
            if (word != null && !word.isEmpty()) {
                triggerOverlay(word, OverlayService.MODE_TRANSLATION_ONLY);
            }
            lastClickedNodeId = null;
        } else {
            lastClickedNodeId = nodeId;
            lastClickTime = now;
        }
        node.recycle();
    }

    // --- Activation 2: Ghost drag → TTS + translation ---
    private void handleTouchEnd(AccessibilityEvent event) {
        long duration = System.currentTimeMillis() - touchStartTime;
        if (duration < GHOST_DRAG_MIN_MS) return;

        AccessibilityNodeInfo endNode = event.getSource();
        if (endNode == null || dragStartNode == null) return;

        // Only fires if drag ended over a text-bearing node different from start (or same if text was under)
        String word = extractWord(endNode);
        if (word != null && !word.isEmpty()) {
            triggerOverlay(word, OverlayService.MODE_TTS_PLUS_TRANSLATION);
        }

        if (endNode != dragStartNode) endNode.recycle();
        dragStartNode = null;
    }

    // --- Activation 3: Long press → sentence-level selection + full translation ---
    private void handleLongPress(AccessibilityEvent event) {
        AccessibilityNodeInfo node = event.getSource();
        if (node == null) return;

        String text = getFullText(node);
        if (text == null || text.isEmpty()) {
            node.recycle();
            return;
        }

        // Haptic at 300ms confirms the press
        Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (v != null && v.hasVibrator()) {
            v.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE));
        }

        // Show overlay at 600ms with sentence mode
        handler.postDelayed(() -> {
            triggerOverlay(text.trim(), OverlayService.MODE_SENTENCE);
        }, LONG_PRESS_OVERLAY_MS - LONG_PRESS_HAPTIC_MS);

        node.recycle();
    }

    // --- Selection change: used when user drags handles to select a passage ---
    private void handleSelectionChanged(AccessibilityEvent event) {
        CharSequence text = event.getText().isEmpty() ? null : event.getText().get(0);
        if (text == null) return;

        int start = event.getFromIndex();
        int end = event.getToIndex();
        if (end <= start || (end - start) < 3) return;

        String selection = text.toString().substring(
                Math.max(0, start),
                Math.min(text.length(), end)
        ).trim();

        if (!selection.isEmpty()) {
            // Sentence selection — delay slightly to let user finish adjusting handles
            handler.removeCallbacksAndMessages(null);
            handler.postDelayed(() ->
                    triggerOverlay(selection, OverlayService.MODE_SENTENCE), 800);
        }
    }

    // --- Helpers ---

    private String extractWord(AccessibilityNodeInfo node) {
        CharSequence text = node.getText();
        if (text == null || text.length() == 0) text = node.getContentDescription();
        if (text == null) return null;

        // Return the whole text if it's a single word; otherwise try to find word under cursor
        String str = text.toString().trim();
        if (!str.contains(" ")) return str;

        // Multi-word text: return first word as a fallback (double-tap targets individual words)
        String[] parts = str.split("\\s+");
        return parts.length > 0 ? parts[0] : str;
    }

    private String getFullText(AccessibilityNodeInfo node) {
        CharSequence text = node.getText();
        if (text != null && text.length() > 0) return text.toString();
        text = node.getContentDescription();
        if (text != null && text.length() > 0) return text.toString();

        // Walk children for compound views
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                String t = getFullText(child);
                if (t != null) sb.append(t).append(" ");
                child.recycle();
            }
        }
        return sb.toString().trim();
    }

    private void triggerOverlay(String text, int mode) {
        Intent intent = new Intent(this, OverlayService.class);
        intent.putExtra(OverlayService.EXTRA_WORD, text);
        intent.putExtra(OverlayService.EXTRA_MODE, mode);
        startService(intent);
    }

    @Override
    public void onInterrupt() {}
}
