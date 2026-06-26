package com.japavoca.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * 배터리 사용량 최적화 제외(doze mode 면제) 확인 + 요청.
 * PowerManager.isIgnoringBatteryOptimizations 는 특수 권한이라 PermissionsAndroid 로 처리 불가.
 * ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS 로 시스템 다이얼로그를 띄운다.
 */
class BatteryOptimizationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "BatteryOptimization"

  @ReactMethod
  fun isIgnoring(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        promise.resolve(true)
        return
      }
      val pm = reactApplicationContext.getSystemService(PowerManager::class.java)
      promise.resolve(pm?.isIgnoringBatteryOptimizations(reactApplicationContext.packageName) ?: true)
    } catch (e: Exception) {
      promise.reject("BATTERY_CHECK_FAILED", e)
    }
  }

  @ReactMethod
  fun requestExemption() {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
      val intent = Intent(
        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
        Uri.parse("package:" + reactApplicationContext.packageName),
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
    } catch (e: Exception) {
      Log.w("BatteryOptimization", "Failed to request battery exemption", e)
    }
  }
}
