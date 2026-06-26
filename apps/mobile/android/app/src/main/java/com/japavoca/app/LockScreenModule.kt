package com.japavoca.app

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * 잠금화면 학습 제어(JS ↔ 네이티브).
 *  - enable/disable: 켜짐 상태 영속 + 포그라운드 서비스 시작/중지
 *  - showNow: 잠금 퀴즈 액티비티 즉시 표시(테스트)
 *  - unlock: 잠금 퀴즈 액티비티 종료(스와이프 해제)
 *  - openApp: 메인 앱 실행 + 잠금 액티비티 종료
 */
class LockScreenModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "LockScreen"

  @ReactMethod
  fun enable() {
    LockScreenPrefs.setEnabled(reactContext, true)
    LockScreenService.start(reactContext)
  }

  @ReactMethod
  fun disable() {
    LockScreenPrefs.setEnabled(reactContext, false)
    LockScreenService.stop(reactContext)
  }

  @ReactMethod
  fun isEnabled(promise: Promise) {
    promise.resolve(LockScreenPrefs.isEnabled(reactContext))
  }

  @ReactMethod
  fun showNow() {
    val i = Intent(reactContext, LockQuizActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    reactContext.startActivity(i)
  }

  @ReactMethod
  fun unlock() {
    LockQuizActivity.instance?.finish()
  }

  @ReactMethod
  fun openApp() {
    val i = Intent(reactContext, MainActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    reactContext.startActivity(i)
    LockQuizActivity.instance?.finish()
  }
}
