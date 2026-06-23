# 운영 가이드 (Operations)

## Celery — 배치 / 주기 작업

QuizLog 7일 보관 삭제 등 주기 작업은 Celery worker + beat 로 실행한다.
브로커는 Redis(`CELERY_BROKER_URL`, 기본 `redis://localhost:6379/0`).

### 사전 조건

```bash
# Redis 가 떠 있어야 한다.
redis-cli ping          # -> PONG
# 없으면: brew install redis && brew services start redis
```

모든 명령은 `apps/server` 에서 venv 활성화 후 실행한다.

```bash
cd apps/server
source .venv/bin/activate
```

### Worker 실행 (task 처리)

```bash
celery -A config worker -l info
```

### Beat 실행 (스케줄 트리거)

스케줄러는 `django_celery_beat` DB 스케줄러를 쓴다(`settings.CELERY_BEAT_SCHEDULER`).
worker 와 **별도 프로세스**로 띄운다.

```bash
celery -A config beat -l info
```

> beat 는 스케줄을 트리거만 하고, 실제 실행은 worker 가 한다. 둘 다 떠 있어야 한다.

### 개발용 단일 프로세스 (worker + beat 임베드)

로컬에서 간편히 돌릴 때만 사용(운영 환경에서는 분리 권장).

```bash
celery -A config worker -B -l info
```

## 등록된 주기 작업

| 작업 | 스케줄 | 설명 |
|------|--------|------|
| `learning.tasks.delete_old_quiz_logs` | 매일 03:00 (Asia/Seoul) | 생성 7일 지난 QuizLog 삭제 |

## 수동 실행 (Celery 없이)

배치 로직은 management command 로도 단독 실행할 수 있다.

```bash
python manage.py delete_old_quiz_logs --dry-run   # 삭제 대상 건수만 출력
python manage.py delete_old_quiz_logs             # 실제 삭제 + 건수 로그
```
