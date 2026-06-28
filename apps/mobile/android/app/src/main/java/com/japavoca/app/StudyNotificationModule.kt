package com.japavoca.app

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * React Native 네이티브 모듈 — 상시 학습 알림 서비스 제어.
 * JS 에서 NativeModules.StudyNotification.start() / .stop() 으로 호출한다.
 */
class StudyNotificationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "StudyNotification"

  @ReactMethod
  fun start(promise: Promise) {
    try {
      StudyNotificationService.start(reactApplicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("STUDY_NOTIF_START_FAILED", e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      StudyNotificationService.stop(reactApplicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("STUDY_NOTIF_STOP_FAILED", e)
    }
  }
}
