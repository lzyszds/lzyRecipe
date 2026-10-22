package com.lzyrecipe.recipes

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
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

    // 窗口背景设为页面底色，避免首帧绘制前系统栏区域出现未定义颜色
    window.setBackgroundDrawable(ColorDrawable(APP_BACKGROUND))

    // 全版本统一走边到边：内容铺到系统栏下方，状态栏区域直接显示页面自身的顶部背景
    // （首页/菜谱库是吸顶头、详情页是整幅大图），不会再出现与页面不一致的色带
    useEdgeToEdgeSystemBars()
    applySystemBarPadding(findViewById(android.R.id.content))
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    webView.fitsSystemWindows = false
    webView.addJavascriptInterface(StatusBarBridge(), "AndroidStatusBar")
  }

  // 由前端调用：同步状态栏背景色与图标颜色（darkIcons 为 true 时使用深色图标）
  private inner class StatusBarBridge {
    @JavascriptInterface
    fun setStatusBar(color: String, darkIcons: Boolean) {
      runOnUiThread {
        // 系统栏透明，颜色来自页面本身；这里只需保证图标明暗与窗口底色兜底一致
        WindowInsetsControllerCompat(window, window.decorView).apply {
          isAppearanceLightStatusBars = darkIcons
          isAppearanceLightNavigationBars = darkIcons
        }
        try {
          window.setBackgroundDrawable(ColorDrawable(Color.parseColor(color)))
        } catch (e: IllegalArgumentException) {
          // 颜色格式异常时保留原窗口底色
        }
      }
    }
  }

  // 边到边显示：系统栏透明、内容铺满到系统栏下方，由窗口底色 + 页面背景兜底
  @Suppress("DEPRECATION")
  private fun useEdgeToEdgeSystemBars() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.TRANSPARENT
    window.isNavigationBarContrastEnforced = false
    WindowInsetsControllerCompat(window, window.decorView).apply {
      isAppearanceLightStatusBars = true
      isAppearanceLightNavigationBars = true
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

  private companion object {
    // 与 tailwind.config.js 中 oat-50 (#FCF9F5) 保持一致
    const val APP_BACKGROUND: Int = 0xFFFCF9F5.toInt()
  }
}
