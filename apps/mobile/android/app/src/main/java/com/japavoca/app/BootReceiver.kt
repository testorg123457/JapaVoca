package com.japavoca.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** 재부팅 후 서비스를 복구한다. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

    // 잠금화면 학습이 켜져 있었다면 복구
    if (LockScreenPrefs.isEnabled(context)) {
      LockScreenService.start(context)
    }

    // 상시 학습 알림은 항상 복구
    StudyNotificationService.start(context)
  }
}
