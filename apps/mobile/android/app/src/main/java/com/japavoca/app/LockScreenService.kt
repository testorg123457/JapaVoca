package com.japavoca.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * 잠금화면 학습 포그라운드 서비스.
 * 화면 켜짐/잠금해제(USER_PRESENT·SCREEN_ON)를 동적 수신해 LockQuizActivity 를 띄운다.
 * (이 브로드캐스트들은 매니페스트 정적 등록이 막혀 있어 살아있는 프로세스가 필요 → FGS.)
 */
class LockScreenService : Service() {

  private var receiver: BroadcastReceiver? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    startAsForeground()
    registerScreenReceiver()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

  private fun startAsForeground() {
    val n = buildNotification()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIF_ID, n)
    }
  }

  private fun registerScreenReceiver() {
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_USER_PRESENT)
      addAction(Intent.ACTION_SCREEN_ON)
    }
    receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        if (!LockScreenPrefs.isEnabled(context)) return
        val launch = Intent(context, LockQuizActivity::class.java).apply {
          addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
              Intent.FLAG_ACTIVITY_SINGLE_TOP or
              Intent.FLAG_ACTIVITY_NO_ANIMATION,
          )
        }
        context.startActivity(launch)
      }
    }
    // 시스템 보호 브로드캐스트라 RECEIVER_NOT_EXPORTED 가 자연스럽다(외부 송신 불가).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      registerReceiver(receiver, filter)
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    receiver?.let { runCatching { unregisterReceiver(it) } }
    receiver = null
  }

  private fun buildNotification(): Notification {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(NotificationManager::class.java)
      if (nm.getNotificationChannel(CHANNEL_ID) == null) {
        val ch = NotificationChannel(
          CHANNEL_ID,
          "잠금화면 학습",
          NotificationManager.IMPORTANCE_LOW,
        ).apply { setShowBadge(false) }
        nm.createNotificationChannel(ch)
      }
    }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("잠금화면 학습 켜짐")
      .setContentText("화면을 켤 때 일본어 퀴즈가 나와요")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
  }

  companion object {
    const val NOTIF_ID = 4242
    private const val CHANNEL_ID = "lock_learning"

    fun start(context: Context) {
      val i = Intent(context, LockScreenService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(i)
      } else {
        context.startService(i)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, LockScreenService::class.java))
    }
  }
}
