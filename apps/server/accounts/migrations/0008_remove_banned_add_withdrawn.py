from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_user_study_kana_hiragana_user_study_kana_katakana_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='status',
            field=models.CharField(
                choices=[
                    ('active', '정상'),
                    ('flagged', '의심(어뷰징)'),
                    ('withdrawn', '탈퇴'),
                ],
                default='active',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='withdrawn_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='회원 탈퇴 시각(soft delete)',
            ),
        ),
    ]
