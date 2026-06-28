package com.japavoca.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * 상시 학습 알림 포그라운드 서비스.
 * 앱 실행/종료 무관하게 상단 알림바에 항상 고정 알림을 표시한다.
 * 탭하면 MainActivity를 열며, ongoing = true 로 스와이프 제거 불가.
 */
class StudyNotificationService : Service() {

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    startAsForeground()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startAsForeground()
    return START_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
  }

  private fun startAsForeground() {
    val n = buildNotification()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIF_ID, n)
    }
  }

  private fun buildNotification(): Notification {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(NotificationManager::class.java)
      if (nm.getNotificationChannel(CHANNEL_ID) == null) {
        val ch = NotificationChannel(
          CHANNEL_ID,
          "학습 알림",
          NotificationManager.IMPORTANCE_LOW,
        ).apply {
          setShowBadge(false)
          enableVibration(false)
          setSound(null, null)
        }
        nm.createNotificationChannel(ch)
      }
    }

    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      Intent(this, MainActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("일본어 한자 보카")
      .setContentText("지금 일본어 단어를 공부해봐요! 📖")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setOngoing(false)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(contentIntent)
      .build()
  }

  companion object {
    const val NOTIF_ID = 5151
    private const val CHANNEL_ID = "study_reminder"

    fun start(context: Context) {
      val i = Intent(context, StudyNotificationService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(i)
      } else {
        context.startService(i)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, StudyNotificationService::class.java))
    }
  }
}
