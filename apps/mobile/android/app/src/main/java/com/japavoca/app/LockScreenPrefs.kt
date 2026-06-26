package com.japavoca.app

import android.content.Context

/** 잠금화면 학습 켜짐 상태 영속(부팅 후 서비스 복구 판단에도 사용). */
object LockScreenPrefs {
  private const val PREFS = "japavoca_lock"
  private const val KEY_ENABLED = "enabled"

  fun isEnabled(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)

  fun setEnabled(context: Context, enabled: Boolean) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_ENABLED, enabled)
      .apply()
  }
}
