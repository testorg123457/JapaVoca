package com.japavoca.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * '다른 앱 위에 표시'(SYSTEM_ALERT_WINDOW)는 런타임 권한이 아니라 특수 권한이라
 * PermissionsAndroid로 처리할 수 없다. Settings.canDrawOverlays 확인 +
 * ACTION_MANAGE_OVERLAY_PERMISSION 설정 화면 열기를 네이티브로 노출한다.
 */
class OverlayPermissionModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "OverlayPermission"

  @ReactMethod
  fun canDrawOverlays(promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val granted =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Settings.canDrawOverlays(ctx) else true
      promise.resolve(granted)
    } catch (e: Exception) {
      promise.reject("OVERLAY_CHECK_FAILED", e)
    }
  }

  @ReactMethod
  fun requestOverlayPermission() {
    try {
      val ctx = reactApplicationContext
      val intent =
        Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:" + ctx.packageName),
        )
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(intent)
    } catch (e: Exception) {
      Log.w("OverlayPermission", "Failed to open overlay permission settings", e)
    }
  }
}
