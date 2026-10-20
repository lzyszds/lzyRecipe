package com.lzyrecipe.recipes

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.updatePadding
import kotlin.math.max

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // 不让 WebView 绘制到状态栏下方，由系统保留状态栏区域
    WindowCompat.setDecorFitsSystemWindows(window, true)

    applySystemBarPadding(findViewById(android.R.id.content))
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    webView.fitsSystemWindows = true
    webView.addJavascriptInterface(StatusBarBridge(), "AndroidStatusBar")
  }

  // 由前端调用：同步状态栏背景色与图标颜色（darkIcons 为 true 时使用深色图标）
  private inner class StatusBarBridge {
    @JavascriptInterface
    fun setStatusBar(color: String, darkIcons: Boolean) {
      runOnUiThread {
        window.statusBarColor = Color.parseColor(color)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars =
          darkIcons
      }
    }
  }

  private fun applySystemBarPadding(view: View) {
    ViewCompat.setOnApplyWindowInsetsListener(view) { v, insets ->
      val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      val displayCutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())
      val imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())
      val imeBottom =
        if (imeVisible) insets.getInsets(WindowInsetsCompat.Type.ime()).bottom else 0

      v.updatePadding(
        left = max(systemBars.left, displayCutout.left),
        top = max(systemBars.top, displayCutout.top),
        right = max(systemBars.right, displayCutout.right),
        bottom = max(max(systemBars.bottom, displayCutout.bottom), imeBottom),
      )
      insets
    }
    ViewCompat.requestApplyInsets(view)
  }
}
