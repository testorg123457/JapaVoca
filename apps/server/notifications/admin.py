from django import forms
from django.contrib import admin, messages
from django.shortcuts import redirect, render
from django.urls import path, reverse

from accounts.models import User

from .models import Notification, PushToken
from .services import broadcast_system

# 알림 탭 시 이동 가능한 화면(클라 NotificationsScreen 의 NAVIGABLE 과 일치해야 한다).
SCREEN_CHOICES = [
    ('', '이동 없음'),
    ('Home', '홈'),
    ('Exchange', '기프티콘 교환'),
    ('Ledger', '캐시 내역'),
    ('AccountSettings', '친구 초대'),
    ('LockQuiz', '퀴즈'),
    ('Settings', '설정'),
]


class BroadcastForm(forms.Form):
    title = forms.CharField(label='제목', max_length=120)
    body = forms.CharField(
        label='내용', required=False, widget=forms.Textarea(attrs={'rows': 4}),
    )
    screen = forms.ChoiceField(
        label='탭하면 이동할 화면', choices=SCREEN_CHOICES, required=False,
    )
    only_social = forms.BooleanField(
        label='게스트 제외(소셜 로그인 유저만)', required=False,
    )

    def target_queryset(self):
        """발송 대상 — 탈퇴/비활성 계정은 제외한다."""
        qs = User.objects.filter(is_active=True, withdrawn_at__isnull=True)
        if self.cleaned_data.get('only_social'):
            qs = qs.exclude(google_uid__isnull=True, kakao_uid__isnull=True)
        return qs


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'type', 'title', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
    search_fields = ('title', 'body')
    change_list_template = 'admin/notifications/notification_changelist.html'

    def get_urls(self):
        return [
            path(
                'broadcast/',
                self.admin_site.admin_view(self.broadcast_view),
                name='notifications_broadcast',
            ),
            *super().get_urls(),
        ]

    def broadcast_view(self, request):
        """전체 공지 발송 화면.

        되돌릴 수 없는 작업이라 '미리보기 → 발송' 두 단계로 나눴다.
        """
        preview = None
        form = BroadcastForm(request.POST or None)

        if request.method == 'POST' and form.is_valid():
            qs = form.target_queryset()
            title = form.cleaned_data['title']
            body = form.cleaned_data['body']

            if request.POST.get('action') == 'preview':
                preview = {'count': qs.count(), 'title': title, 'body': body}
            else:
                sent = broadcast_system(
                    qs, title, body, screen=form.cleaned_data.get('screen') or '',
                )
                messages.success(request, f'{sent:,}명에게 공지를 발송했습니다.')
                return redirect(
                    reverse('admin:notifications_notification_changelist'),
                )

        return render(request, 'admin/notifications/broadcast.html', {
            **self.admin_site.each_context(request),
            'form': form,
            'preview': preview,
            'title': '공지 발송',
        })


@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'platform', 'is_active', 'updated_at')
    list_filter = ('platform', 'is_active')
