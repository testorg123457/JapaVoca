package com.japavoca.app

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // 자체 네이티브 모듈(오버레이 권한). New Arch에서도 레거시 모듈 interop로 동작한다.
          add(OverlayPermissionPackage())
          add(BatteryOptimizationPackage())
          add(LockScreenPackage())
        },
      // useDevSupport는 기본값이 react-android(AAR)의 BuildConfig.DEBUG라 릴리스로 빌드된
      // AAR에선 항상 false → debug 빌드에서도 Metro를 안 거치고 assets 번들을 찾다 크래시.
      // 앱 자신의 BuildConfig.DEBUG를 넘겨야 debug에서 Metro 개발 서버를 사용한다.
      useDevSupport = BuildConfig.DEBUG,
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
