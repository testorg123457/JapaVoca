"""QuizLog 7일 보관 배치 삭제.

장기 통계는 rewards.Daily 에 집계되어 있으므로 QuizLog 원본 삭제는 안전하다.
삭제 로직은 purge_old_quiz_logs() 한 곳에 캡슐화해 커맨드/Celery task 가 공유한다.
"""
import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from learning.models import QuizLog

logger = logging.getLogger(__name__)

# 보관 기간(일). 이보다 오래된 행은 삭제 대상.
RETENTION_DAYS = 7


def purge_old_quiz_logs(dry_run: bool = False, now=None) -> int:
    """보관 기간(7일)을 넘긴 QuizLog 를 삭제한다.

    경계: created_at <= (now - RETENTION_DAYS). 즉 만 7일 이상 지난 행이 대상이며,
    '정확히 7일'된 행도 삭제 대상에 포함한다(__lte).
    dry_run=True 면 삭제하지 않고 대상 건수만 반환한다.
    now 를 주입하면(테스트 등) 그 시각 기준으로 cutoff 를 계산한다(기본 timezone.now()).
    에러는 그대로 raise 한다(배치 실패는 모니터링이 잡는다).
    반환: 삭제(또는 dry-run 대상) QuizLog 건수.
    """
    reference = now or timezone.now()
    cutoff = reference - timedelta(days=RETENTION_DAYS)
    qs = QuizLog.objects.filter(created_at__lte=cutoff)

    if dry_run:
        count = qs.count()
        logger.info(
            '[delete_old_quiz_logs] dry-run: %d rows older than %s', count, cutoff.isoformat(),
        )
        return count

    _, per_model = qs.delete()
    deleted = per_model.get('learning.QuizLog', 0)
    logger.info(
        '[delete_old_quiz_logs] deleted %d rows older than %s', deleted, cutoff.isoformat(),
    )
    return deleted


class Command(BaseCommand):
    help = '보관 기간(7일) 이전 QuizLog 를 삭제한다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 삭제 없이 대상 건수만 출력(운영 안전장치).',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        count = purge_old_quiz_logs(dry_run=dry_run)
        prefix = '[dry-run] 삭제 대상 ' if dry_run else '삭제 완료 '
        self.stdout.write(self.style.SUCCESS(f'{prefix}{count}건'))
