"""기존 유저의 단일 급수(selected_jlpt_level)를 단어/한자 별도 급수로 백필."""
from django.db import migrations
from django.db.models import F


def backfill_levels(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(
        jlpt_level_word__isnull=True, selected_jlpt_level__isnull=False,
    ).update(jlpt_level_word=F('selected_jlpt_level'))
    User.objects.filter(
        jlpt_level_kanji__isnull=True, selected_jlpt_level__isnull=False,
    ).update(jlpt_level_kanji=F('selected_jlpt_level'))


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_jlpt_level_kanji_user_jlpt_level_word_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_levels, noop_reverse),
    ]
