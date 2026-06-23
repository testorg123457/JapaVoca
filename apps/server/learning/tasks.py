"""learning Celery tasks."""
from celery import shared_task

from .management.commands.delete_old_quiz_logs import purge_old_quiz_logs


@shared_task(name='learning.tasks.delete_old_quiz_logs', max_retries=0)
def delete_old_quiz_logs() -> int:
    """QuizLog 7일 배치 삭제 task.

    삭제 배치는 멱등적이라 실패해도 재시도하지 않는다(max_retries=0). 다음 주기에 다시 실행.
    예외는 그대로 전파해 모니터링이 잡게 한다.
    """
    return purge_old_quiz_logs(dry_run=False)
