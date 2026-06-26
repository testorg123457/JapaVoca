package com.japavoca.app

import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * 잠금화면 위에 뜨는 학습 퀴즈 액티비티.
 * RN 컴포넌트 "JapaVocaLock"(src/LockApp.tsx)을 호스팅한다.
 *
 * showWhenLocked + turnScreenOn 으로 keyguard 위에 표시되고 화면을 깨운다.
 * JS(LockScreenModule.unlock/openApp)에서 종료할 수 있도록 인스턴스를 보관한다.
 */
class LockQuizActivity : ReactActivity() {

  override fun getMainComponentName(): String = "JapaVocaLock"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    super.onCreate(savedInstanceState)
    instance = this
  }

  override fun onDestroy() {
    super.onDestroy()
    if (instance === this) instance = null
  }

  // 뒤로가기로는 빠져나가지 않게(스와이프 해제만 허용). 필요 시 정책 변경.
  override fun onBackPressed() {
    // no-op
  }

  companion object {
    @Volatile
    @JvmStatic
    var instance: LockQuizActivity? = null
  }
}
