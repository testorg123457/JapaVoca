"""QuizLog 7일 배치 삭제 테스트."""
from datetime import timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from learning.management.commands.delete_old_quiz_logs import (
    RETENTION_DAYS,
    purge_old_quiz_logs,
)
from learning.models import QuizLog

User = get_user_model()


class DeleteOldQuizLogsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            google_uid='retention-test', email='r@x.com',
        )

    def _make_log(self, age_days):
        """age_days 일 전에 생성된 QuizLog 를 만든다(created_at 은 auto_now_add 라 update 로 덮어씀)."""
        log = QuizLog.objects.create(
            user=self.user,
            mode=QuizLog.Mode.WORD,
            item_type='word',
            item_id=1,
            question_type=QuizLog.QuestionType.WORD_TO_MEANING,
            is_correct=True,
        )
        QuizLog.objects.filter(pk=log.pk).update(
            created_at=timezone.now() - timedelta(days=age_days),
        )
        return log

    def test_deletes_logs_older_than_retention(self):
        """보관 기간 초과(7일·8일) 행은 삭제된다. 경계값(정확히 7일) 포함."""
        boundary = self._make_log(RETENTION_DAYS)       # 정확히 7일 → 삭제 대상
        older = self._make_log(RETENTION_DAYS + 1)       # 8일 → 삭제 대상

        deleted = purge_old_quiz_logs(dry_run=False)

        self.assertEqual(deleted, 2)
        self.assertFalse(QuizLog.objects.filter(pk=boundary.pk).exists())
        self.assertFalse(QuizLog.objects.filter(pk=older.pk).exists())

    def test_exact_boundary_is_deleted(self):
        """결정론적 경계 검증: created_at == (now-7일) 인 행은 삭제, 1초 모자라면 보존."""
        ref = timezone.now()
        exact = self._make_log(0)
        just_under = self._make_log(0)
        QuizLog.objects.filter(pk=exact.pk).update(
            created_at=ref - timedelta(days=RETENTION_DAYS),
        )
        QuizLog.objects.filter(pk=just_under.pk).update(
            created_at=ref - timedelta(days=RETENTION_DAYS) + timedelta(seconds=1),
        )

        deleted = purge_old_quiz_logs(now=ref)

        self.assertEqual(deleted, 1)
        self.assertFalse(QuizLog.objects.filter(pk=exact.pk).exists())
        self.assertTrue(QuizLog.objects.filter(pk=just_under.pk).exists())

    def test_keeps_logs_within_retention(self):
        """보관 기간 이내(6일·방금) 행은 보존된다."""
        recent = self._make_log(RETENTION_DAYS - 1)      # 6일 → 보존
        fresh = self._make_log(0)                        # 방금 → 보존

        deleted = purge_old_quiz_logs(dry_run=False)

        self.assertEqual(deleted, 0)
        self.assertTrue(QuizLog.objects.filter(pk=recent.pk).exists())
        self.assertTrue(QuizLog.objects.filter(pk=fresh.pk).exists())

    def test_dry_run_reports_count_without_deleting(self):
        """--dry-run 은 삭제하지 않고 대상 건수만 반환한다."""
        self._make_log(RETENTION_DAYS + 3)
        self._make_log(RETENTION_DAYS + 5)

        count = purge_old_quiz_logs(dry_run=True)

        self.assertEqual(count, 2)
        self.assertEqual(QuizLog.objects.count(), 2)  # 그대로 남아있음

    def test_no_targets_exits_cleanly(self):
        """삭제 대상 0건이어도 정상 종료(예외 없음, 0 반환)."""
        self._make_log(1)  # 보관 기간 이내만 존재

        deleted = purge_old_quiz_logs(dry_run=False)

        self.assertEqual(deleted, 0)
        self.assertEqual(QuizLog.objects.count(), 1)

    def test_management_command_dry_run_output(self):
        """커맨드 --dry-run 실행 시 대상 건수를 출력하고 삭제하지 않는다."""
        self._make_log(RETENTION_DAYS + 2)
        out = StringIO()

        call_command('delete_old_quiz_logs', '--dry-run', stdout=out)

        self.assertIn('1건', out.getvalue())
        self.assertEqual(QuizLog.objects.count(), 1)

    def test_management_command_deletes(self):
        """커맨드 실행 시 실제 삭제 + 건수 출력."""
        self._make_log(RETENTION_DAYS + 2)
        out = StringIO()

        call_command('delete_old_quiz_logs', stdout=out)

        self.assertIn('1건', out.getvalue())
        self.assertEqual(QuizLog.objects.count(), 0)
