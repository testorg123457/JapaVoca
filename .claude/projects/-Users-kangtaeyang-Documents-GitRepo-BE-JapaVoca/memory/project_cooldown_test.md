---
name: cooldown-test-mode
description: 퀴즈 세트 쿨다운이 테스트용 30초로 설정되어 있음 — 배포 전 1시간으로 복원 필요
metadata:
  type: project
---

`apps/server/learning/services.py`의 `SET_COOLDOWN`이 현재 `timedelta(seconds=30)`로 설정되어 있음.

**Why:** 개발/테스트 중 퀴즈 10문제를 다 풀고 1시간 기다리는 불편함 해소

**How to apply:** 프로덕션 배포 전 반드시 `timedelta(hours=1)`로 복원할 것
