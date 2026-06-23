from django.contrib import admin

from .models import AdRewardLog, GiftExchange


@admin.register(GiftExchange)
class GiftExchangeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'product_code', 'cash_cost', 'provider',
                    'provider_order_id', 'status', 'ad_verified', 'created_at', 'issued_at')
    list_filter = ('status', 'provider', 'ad_verified')
    search_fields = ('user__google_uid', 'user__email', 'product_code', 'provider_order_id')
    raw_id_fields = ('user',)


@admin.register(AdRewardLog)
class AdRewardLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'ad_unit', 'verified', 'reward_context', 'ref_id', 'created_at')
    list_filter = ('verified', 'reward_context')
    search_fields = ('user__google_uid', 'user__email', 'ad_unit')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at',)
