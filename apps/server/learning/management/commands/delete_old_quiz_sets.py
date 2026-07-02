"""QuizSet/QuizSetItem 7일 보관 배치 삭제.

QuizSet·QuizSetItem은 세트 진행 중(재개·쿨다운 계산)에만 쓰이는 작업 데이터다.
완료/포기된 세트는 그 시점 이후로 코드 어디에서도 다시 읽지 않는다 — 실제 학습
기록은 QuizLog에, 통계는 rewards.Daily에 이미 별도로 남아있으므로 완료된 세트
원본 삭제는 안전하다.

삭제 대상: completed_at 또는 abandoned_at 이 7일 지난 세트(둘 다 null인 진행 중
세트는 절대 삭제 안 됨). QuizSetItem은 QuizSet 의 on_delete=CASCADE 로 함께 삭제.

── 등록 방법 (Cloud Scheduler + Cloud Run Job) ──────────────────────────────
이 커맨드 자체는 스스로 주기 실행되지 않는다. 아래처럼 Cloud Run Job으로 등록하고
Cloud Scheduler가 그 Job을 주기 호출하도록 연결해야 실제로 자동 삭제가 동작한다.
(server 배포에 쓰는 이미지를 그대로 재사용 — docs/배포-플랜.md 의 migrate-job과 동일 패턴)

1) Cloud Run Job 생성 (최초 1회):
   gcloud run jobs create quiz-set-cleanup-job \
     --image asia-northeast3-docker.pkg.dev/japavoca/japavoca/server:latest \
     --command python,manage.py,delete_old_quiz_sets \
     --region asia-northeast3 \
     --set-env-vars "DATABASE_URL=..."

   (서버 코드/이미지를 다시 배포했다면 Job 이미지도 최신으로 갱신 필요:
    gcloud run jobs update quiz-set-cleanup-job --image ...)

2) 수동 1회 실행(테스트용):
   gcloud run jobs execute quiz-set-cleanup-job --region asia-northeast3 --wait

3) Cloud Scheduler로 주기 실행 등록 (예: 매주 월요일 새벽 4시, KST):
   gcloud scheduler jobs create http quiz-set-cleanup-weekly \
     --schedule="0 4 * * 1" \
     --time-zone="Asia/Seoul" \
     --uri="https://asia-northeast3-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/japavoca/jobs/quiz-set-cleanup-job:run" \
     --http-method=POST \
     --oauth-service-account-email="<Cloud Run Job 실행 권한 있는 서비스계정>@japavoca.iam.gserviceaccount.com"

   (스케줄 주기는 삭제 기준이 "완료 후 7일"이라는 조건 자체에 들어있어서 언제
    돌든 안전함 — 매주 1회면 충분하고 서버 부하도 거의 없음.)

4) 배포 전 --dry-run 으로 삭제 대상 건수만 먼저 확인 권장:
   python manage.py delete_old_quiz_sets --dry-run
"""
import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from learning.models import QuizSet

logger = logging.getLogger(__name__)

# 보관 기간(일). 완료/포기 시점 기준 이보다 오래된 세트는 삭제 대상.
RETENTION_DAYS = 7


def purge_old_quiz_sets(dry_run: bool = False, now=None) -> int:
    """완료/포기된 지 보관 기간(7일)을 넘긴 QuizSet 을 삭제한다.

    진행 중인 세트(completed_at, abandoned_at 둘 다 null)는 절대 대상이 아니다.
    QuizSetItem 은 QuizSet 의 CASCADE 로 함께 삭제된다.
    dry_run=True 면 삭제하지 않고 대상 건수만 반환한다.
    now 를 주입하면(테스트 등) 그 시각 기준으로 cutoff 를 계산한다(기본 timezone.now()).
    에러는 그대로 raise 한다(배치 실패는 모니터링이 잡는다).
    반환: 삭제(또는 dry-run 대상) QuizSet 건수.
    """
    reference = now or timezone.now()
    cutoff = reference - timedelta(days=RETENTION_DAYS)
    qs = QuizSet.objects.filter(
        Q(completed_at__lte=cutoff) | Q(abandoned_at__lte=cutoff),
    )

    if dry_run:
        count = qs.count()
        logger.info(
            '[delete_old_quiz_sets] dry-run: %d rows older than %s', count, cutoff.isoformat(),
        )
        return count

    deleted, _ = qs.delete()
    logger.info(
        '[delete_old_quiz_sets] deleted %d rows(QuizSet+QuizSetItem 합계) older than %s',
        deleted, cutoff.isoformat(),
    )
    return deleted


class Command(BaseCommand):
    help = '보관 기간(7일) 지난 완료/포기 QuizSet(+QuizSetItem) 을 삭제한다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 삭제 없이 대상 건수만 출력(운영 안전장치).',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        count = purge_old_quiz_sets(dry_run=dry_run)
        prefix = '[dry-run] 삭제 대상 QuizSet ' if dry_run else '삭제 완료 QuizSet '
        self.stdout.write(self.style.SUCCESS(f'{prefix}{count}건'))
