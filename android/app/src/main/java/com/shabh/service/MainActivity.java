package com.shabh.service;

import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Native hardening for the WebView that hosts the app.
 *
 * The app itself is a web bundle, so the WebView is the trust boundary. File
 * and content access are disabled (the bundle is served through Capacitor's
 * asset loader over https://localhost), mixed content is never allowed, and
 * remote inspection is switched off for release builds. Debug builds keep
 * inspection on so the QA scripts can drive the app over CDP.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) {
            return;
        }

        WebSettings settings = webView.getSettings();
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        // Ignore taps that are covered by another app's overlay (tapjacking).
        webView.setFilterTouchesWhenObscured(true);

        boolean debuggable =
            (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (!debuggable) {
            WebView.setWebContentsDebuggingEnabled(false);
        }
    }
}
