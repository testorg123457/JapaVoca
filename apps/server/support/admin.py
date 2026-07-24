from django.contrib import admin
from django.db import transaction
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import Inquiry


class AnsweredFilter(admin.SimpleListFilter):
    """답변 여부 필터 — '새 문의가 들어왔나'를 한 번에 보기 위한 것.

    기존엔 is_answer_read(유저가 답변을 읽었는지)만 있어서 미답변 문의를 못 걸러냈다.
    """

    title = '답변 여부'
    parameter_name = 'answered'

    def lookups(self, request, model_admin):
        return [('no', '미답변'), ('yes', '답변 완료')]

    def queryset(self, request, queryset):
        if self.value() == 'no':
            return queryset.filter(answered_at__isnull=True)
        if self.value() == 'yes':
            return queryset.filter(answered_at__isnull=False)
        return queryset


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'status', 'who', 'inquiry_count', 'short_content',
        'created_at', 'answered_at', 'is_answer_read',
    )
    # 미답변 필터를 맨 앞에 — 운영에서 제일 자주 쓰는 조건.
    list_filter = (AnsweredFilter, 'is_answer_read')
    # user__id 로 검색하면 그 사람의 문의만 모아볼 수 있다.
    search_fields = ('user__email', 'user__nickname', 'user__id', 'content')
    readonly_fields = ('user', 'content', 'created_at', 'answered_at', 'is_answer_read')
    # 미답변이 위로 오게 정렬(답변한 건 아래로).
    ordering = ('answered_at', '-created_at')
    list_per_page = 50

    @admin.display(description='상태')
    def status(self, obj):
        # 고정 문자열이라 사용자 입력이 섞이지 않는다(XSS 위험 없음).
        if obj.answered_at:
            return mark_safe('<span style="color:#888">답변 완료</span>')
        return mark_safe('<b style="color:#c23320">미답변</b>')

    @admin.display(description='작성자')
    def who(self, obj):
        """같은 사람인지 구분되게 유저 ID를 함께 보여준다.

        닉네임만으로는 구분이 안 된다 — 게스트는 전원 '게스트'라 화면상 동일해진다.
        ID를 누르면 그 유저의 문의만 검색된다.
        """
        u = obj.user
        label = u.nickname or u.email or u.guest_uid or '—'
        # ⚠️ 정확 필터(user__id__exact)로 링크한다. `?q=`(검색)는 부분일치 OR라
        #    "?q=5" 가 user 15·50·내용에 '5' 포함까지 다 잡아 다른 사람 문의가 섞인다.
        return format_html(
            '<a href="?user__id__exact={}" title="이 사람의 문의만 보기">{} <b>#{}</b></a>'
            '<br><span style="color:#888;font-size:11px">{}</span>',
            u.id, label, u.id, u.get_provider_display(),
        )

    def lookup_allowed(self, lookup, value, request=None):
        # who() 링크가 쓰는 정확 필터를 허용(list_filter 에 없어도).
        if lookup == 'user__id__exact':
            return True
        return super().lookup_allowed(lookup, value, request)

    @admin.display(description='문의 수')
    def inquiry_count(self, obj):
        """이 사람이 지금까지 남긴 문의 총 개수. 2건 이상이면 강조."""
        n = obj.user_inquiry_count
        if n > 1:
            return format_html('<b style="color:#b8860b">{}건</b>', n)
        return f'{n}건'

    @admin.display(description='문의 내용')
    def short_content(self, obj):
        return obj.content[:40] + ('…' if len(obj.content) > 40 else '')

    def has_add_permission(self, request):
        """문의는 앱에서 사용자가 작성한다 — 관리자가 만들 일이 없다.

        작성자(user)가 readonly라 폼에 없어서, 추가를 허용하면 저장 시 NOT NULL 위반으로
        터진다. 애초에 만들 수 없게 막는다.
        """
        return False

    def get_queryset(self, request):
        from django.db.models import Count, OuterRef, Subquery
        counts = (
            Inquiry.objects.filter(user=OuterRef('user'))
            .values('user').annotate(n=Count('id')).values('n')
        )
        return (
            super().get_queryset(request)
            .select_related('user')
            .annotate(user_inquiry_count=Subquery(counts))
        )

    def save_model(self, request, obj, form, change):
        if obj.answer == '':
            obj.answer = None
        # 미답변 → 답변으로 처음 전환될 때만. 이미 답변한 걸 수정하는 경우(오타 정정 등)엔
        # answered_at 을 덮어쓰지 않고 알림도 다시 보내지 않는다.
        # (answered_at 은 readonly라 save_model 진입 시점엔 DB의 기존 값이 그대로 들어있다.)
        newly_answered = (
            change and 'answer' in form.changed_data and obj.answer and not obj.answered_at
        )
        if newly_answered:
            obj.answered_at = timezone.now()
        super().save_model(request, obj, form, change)

        # 답변이 달린 걸 사용자가 알 방법이 없으므로 알림을 보낸다.
        # 커밋 이후에 생성 — 알림 실패로 답변 저장이 롤백되면 안 된다.
        if newly_answered:
            def _notify():
                from notifications.models import Notification
                from notifications.services import notify
                notify(
                    obj.user, Notification.Type.INQUIRY,
                    '문의에 답변이 등록됐어요',
                    obj.answer[:80] + ('…' if len(obj.answer) > 80 else ''),
                    data={'screen': 'Inquiry'}, push=True,
                )
            transaction.on_commit(_notify)
