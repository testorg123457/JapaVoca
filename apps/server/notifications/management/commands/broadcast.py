"""전체 공지 발송 — system 알림을 여러 유저에게 한 번에 만든다.

운영자가 서버에서 직접 실행하는 도구다. API로 열지 않았다 — 전체 발송은 되돌릴 수
없어서 인증된 관리자 화면 없이 HTTP로 노출하면 사고 위험이 크다.

사용:
    python manage.py broadcast "제목" "내용"
    python manage.py broadcast "점검 안내" "오늘 22시~23시 점검이 있어요" --screen Home
    python manage.py broadcast "제목" "내용" --dry-run     # 대상 수만 확인
    python manage.py broadcast "제목" "내용" --only-social # 게스트 제외
"""
from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from notifications.services import broadcast_system


class Command(BaseCommand):
    help = '전체 유저에게 시스템 공지(알림)를 발송한다.'

    def add_arguments(self, parser):
        parser.add_argument('title', help='알림 제목')
        parser.add_argument('body', nargs='?', default='', help='알림 본문')
        parser.add_argument(
            '--screen', default='',
            help="탭했을 때 이동할 화면(Home/Exchange/Ledger/Referral 등). 없으면 이동 안 함",
        )
        parser.add_argument(
            '--only-social', action='store_true',
            help='게스트 계정 제외(소셜 로그인 유저에게만)',
        )
        parser.add_argument(
            '--push', action='store_true',
            help='푸시도 시도(현재 FCM 미구현이라 로그만 남음)',
        )
        parser.add_argument(
            '--dry-run', action='store_true', help='발송하지 않고 대상 수만 출력',
        )

    def handle(self, *args, **opts):
        title = opts['title'].strip()
        if not title:
            raise CommandError('제목은 비울 수 없습니다.')

        qs = User.objects.filter(is_active=True, withdrawn_at__isnull=True)
        if opts['only_social']:
            qs = qs.exclude(google_uid__isnull=True, kakao_uid__isnull=True)

        total = qs.count()
        if opts['dry_run']:
            self.stdout.write(f'[dry-run] 대상 {total:,}명 / 제목: {title}')
            return
        if total == 0:
            self.stdout.write('대상이 없습니다.')
            return

        sent = broadcast_system(
            qs, title, opts['body'],
            screen=opts['screen'], push=opts['push'],
        )
        self.stdout.write(self.style.SUCCESS(f'완료 — {sent:,}명에게 발송'))
