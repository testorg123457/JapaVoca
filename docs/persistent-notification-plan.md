# 상시 알림(Persistent Notification) 구현 계획

## 목표

앱 실행/종료 무관하게 상단 알림바에 항상 고정 알림 표시.  
탭하면 앱 열림. 텍스트: `"지금 일본어 단어를 공부해봐요! 📖"`

---

## 라이브러리 vs 직접 구현 결정

`react-native-foreground-service` 대신 **직접 네이티브 모듈**로 구현한다.

이유:
- 프로젝트가 이미 `LockScreenService` + `BatteryOptimizationModule` 패턴으로 네이티브를 직접 다루고 있음
- `react-native-foreground-service`가 New Architecture(RN 0.86)를 공식 지원하지 않음 (브릿지 레거시 의존)
- 직접 구현 시 알림 채널·텍스트·동작을 완전히 제어 가능

---

## 구현 파일 목록

### 네이티브 (Kotlin)

| 파일 | 역할 |
|---|---|
| `StudyNotificationService.kt` | 상시 알림을 보유하는 포그라운드 서비스. `START_STICKY`로 종료 후 재시작 |
| `StudyNotificationModule.kt` | RN 브릿지 — `start()` / `stop()` 메서드 노출 |
| `StudyNotificationPackage.kt` | `ReactPackage` 래퍼 |

### JS/TS

| 파일 | 역할 |
|---|---|
| `src/lib/studyNotification.ts` | `NativeModules.StudyNotification` 래핑, `startStudyNotification()` / `stopStudyNotification()` export |

### 기존 수정

| 파일 | 변경 내용 |
|---|---|
| `MainApplication.kt` | `StudyNotificationPackage()` 추가 |
| `AndroidManifest.xml` | `StudyNotificationService` 서비스 등록 |
| `App.tsx` | 앱 마운트 시 `startStudyNotification()` 호출 |

---

## 네이티브 구현 상세

### StudyNotificationService.kt

```kotlin
class StudyNotificationService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIF_ID, buildNotification())
    }

    private fun buildNotification(): Notification {
        // 채널: "study_reminder", IMPORTANCE_LOW (소리/진동 없음)
        // setOngoing(true) — 스와이프로 지울 수 없음
        // setContentIntent → MainActivity PendingIntent (탭하면 앱 열림)
        // setSmallIcon(R.mipmap.ic_launcher)
        // title: "일본어 한자 보카"
        // text: "지금 일본어 단어를 공부해봐요! 📖"
    }

    companion object {
        const val NOTIF_ID = 5151
        private const val CHANNEL_ID = "study_reminder"

        fun start(context: Context) { ... }
        fun stop(context: Context) { ... }
    }
}
```

### StudyNotificationModule.kt

`BatteryOptimizationModule`과 동일한 패턴:
```kotlin
class StudyNotificationModule(reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "StudyNotification"

    @ReactMethod fun start(promise: Promise) { StudyNotificationService.start(...) }
    @ReactMethod fun stop(promise: Promise) { StudyNotificationService.stop(...) }
}
```

---

## AndroidManifest.xml 추가

```xml
<service
  android:name=".StudyNotificationService"
  android:exported="false"
  android:foregroundServiceType="specialUse">
  <property
    android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
    android:value="study_reminder" />
</service>
```

`FOREGROUND_SERVICE` 권한은 이미 등록되어 있음.

---

## JS 레이어

```ts
// src/lib/studyNotification.ts
import { NativeModules, Platform } from 'react-native';
const { StudyNotification } = NativeModules;

export function startStudyNotification(): void {
  if (Platform.OS === 'android') StudyNotification?.start();
}
export function stopStudyNotification(): void {
  if (Platform.OS === 'android') StudyNotification?.stop();
}
```

```ts
// App.tsx
useEffect(() => {
  startStudyNotification();
  // stop은 나중에 설정 토글 기능 붙일 때 사용
}, []);
```

---

## 알림 스펙

| 항목 | 값 |
|---|---|
| 채널 ID | `study_reminder` |
| 채널 이름 | `학습 리마인더` |
| 중요도 | `IMPORTANCE_LOW` (소리·진동 없음) |
| 제목 | `일본어 한자 보카` |
| 내용 | `지금 일본어 단어를 공부해봐요! 📖` |
| ongoing | `true` (스와이프 제거 불가) |
| 탭 동작 | `MainActivity` 실행 (앱 열림) |
| 서비스 ID | `5151` (기존 LockScreenService `4242`와 충돌 없음) |

---

## 단계별 작업

1. `StudyNotificationService.kt` 생성
2. `StudyNotificationModule.kt` + `StudyNotificationPackage.kt` 생성
3. `MainApplication.kt`에 패키지 등록
4. `AndroidManifest.xml`에 서비스 등록
5. `src/lib/studyNotification.ts` 생성
6. `App.tsx`에서 시작 호출
7. 빌드 & 검증

---

## 추후 확장 (지금은 구현 X)

- 설정 화면에서 알림 ON/OFF 토글
- 알림 텍스트를 오늘의 단어로 동적 변경
- 클릭 시 퀴즈 화면 바로 진입 (딥링크)
- `BootReceiver`에서 재부팅 후 자동 재시작 (현재 `LockScreenService`만 연결됨)
