"""출석 기능 제거 (2026-07-31).

⚠️ 되돌릴 수 없는 데이터 삭제다.
   - tbl_rewards_attendance 테이블을 드롭한다(적용 시점 실데이터 7행).
   - Daily.attended 컬럼을 드롭한다.

원장(Ledger)은 건드리지 않으므로 `wallet.balance == earn합 − use합` 정합성은 유지된다.
과거 출석 지급 기록 5건(reason=attendance/streak)은 그대로 남고 캐시 내역에도 계속 보인다.
다만 그 원장 행의 `ref_type='attendance'` / `ref_id`는 가리킬 대상이 없어진다(soft ref라
DB 제약은 깨지지 않는다). 감사에 필요한 정보(사용자·금액·사유·시각)는 원장 행 자체에 있다.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rewards', '0011_referral_uniq_referral_device'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='attendance',
            name='uniq_attendance_user_date',
        ),
        migrations.RemoveField(
            model_name='daily',
            name='attended',
        ),
        migrations.DeleteModel(
            name='Attendance',
        ),
    ]
