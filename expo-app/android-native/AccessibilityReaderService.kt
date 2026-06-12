package com.overlaylang.app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Reads visible text from any foreground app and broadcasts it so the
 * overlay can translate or explain words/phrases in real time — like
 * Juur, Duolingo, or similar apps do when they float over other content.
 *
 * The user must enable this in Settings → Accessibility → OverlayLang.
 * Once enabled it runs automatically, even after a reboot.
 */
class AccessibilityReaderService : AccessibilityService() {

    companion object {
        const val ACTION_TEXT_CAPTURED = "com.overlaylang.app.TEXT_CAPTURED"
        const val EXTRA_TEXT    = "captured_text"
        const val EXTRA_PACKAGE = "source_package"

        @Volatile var instance: AccessibilityReaderService? = null
        val isRunning: Boolean get() = instance != null
    }

    override fun onServiceConnected() {
        instance = this
        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = (
                AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED       or
                AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED  or
                AccessibilityEvent.TYPE_VIEW_FOCUSED            or
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            )
            feedbackType     = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags            = (
                AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS              or
                AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            )
            notificationTimeout = 150L
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val ev  = event ?: return
        val pkg = ev.packageName?.toString() ?: return
        // Never spy on ourselves
        if (pkg == packageName) return

        val root = rootInActiveWindow ?: return
        val text = gatherText(root).trim()
        root.recycle()

        if (text.isBlank()) return

        sendBroadcast(Intent(ACTION_TEXT_CAPTURED).apply {
            putExtra(EXTRA_TEXT, text)
            putExtra(EXTRA_PACKAGE, pkg)
        })
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    private fun gatherText(node: AccessibilityNodeInfo): String {
        val parts = mutableListOf<String>()
        if (!node.text.isNullOrBlank())               parts += node.text.toString()
        if (!node.contentDescription.isNullOrBlank()) parts += node.contentDescription.toString()
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val childText = gatherText(child)
            child.recycle()
            if (childText.isNotBlank()) parts += childText
        }
        return parts.joinToString(" ")
    }
}
