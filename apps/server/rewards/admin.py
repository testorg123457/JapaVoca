from django.contrib import admin

from .models import Attendance, CashBox, Daily, Ledger, Wallet


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'total_earned', 'total_used', 'updated_at')
    search_fields = ('user__google_uid', 'user__email')
    raw_id_fields = ('user',)


@admin.register(Ledger)
class LedgerAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'direction', 'amount', 'reason', 'balance_after',
                    'ad_verified', 'created_at')
    list_filter = ('direction', 'reason', 'ad_verified')
    search_fields = ('user__google_uid', 'user__email', 'ref_type')
    raw_id_fields = ('user',)
    # 원장은 append-only(불변): 수정/삭제 금지.
    readonly_fields = ('user', 'direction', 'amount', 'reason', 'ref_type', 'ref_id',
                       'balance_after', 'ad_verified', 'created_at')

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CashBox)
class CashBoxAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'grade', 'status', 'reward_cash', 'opened_via_ad',
                    'created_at', 'opened_at')
    list_filter = ('grade', 'status', 'opened_via_ad')
    search_fields = ('user__google_uid', 'user__email')
    raw_id_fields = ('user',)


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'date', 'streak_count', 'bonus_cash', 'is_cycle_reward')
    list_filter = ('is_cycle_reward',)
    search_fields = ('user__google_uid', 'user__email')
    raw_id_fields = ('user',)


@admin.register(Daily)
class DailyAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'date', 'quiz_count', 'correct_count', 'boxes_earned',
                    'cash_earned', 'ad_bonus_count', 'attended')
    list_filter = ('attended',)
    search_fields = ('user__google_uid', 'user__email')
    raw_id_fields = ('user',)
