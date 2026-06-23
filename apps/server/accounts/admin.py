from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """커스텀 유저(google_uid 기반) admin.

    Django 기본 UserAdmin 은 username 결합 폼(UserChangeForm/UserCreationForm)을 써서
    커스텀 유저와 충돌하므로, 데이터 확인·관리용 일반 ModelAdmin 으로 등록한다.
    """

    ordering = ('id',)
    list_display = ('id', 'google_uid', 'email', 'nickname',
                    'selected_jlpt_level', 'status', 'is_staff', 'created_at')
    list_filter = ('status', 'selected_jlpt_level', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('google_uid', 'email', 'nickname')
    readonly_fields = ('password', 'last_login', 'last_login_at', 'created_at')
    filter_horizontal = ('groups', 'user_permissions')
    fieldsets = (
        (None, {'fields': ('google_uid', 'email', 'password')}),
        ('프로필', {'fields': ('nickname', 'selected_jlpt_level', 'status')}),
        ('권한', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('일시', {'fields': ('last_login', 'last_login_at', 'created_at')}),
    )
