from django.contrib import admin

from .models import Kanji, Word, WordMeaning


@admin.register(Kanji)
class KanjiAdmin(admin.ModelAdmin):
    list_display = ('id', 'character', 'meaning_ko', 'stroke_count', 'jlpt_level')
    list_filter = ('jlpt_level',)
    search_fields = ('character', 'meaning_ko', 'on_reading', 'kun_reading')


class WordMeaningInline(admin.TabularInline):
    model = WordMeaning
    extra = 1


@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = ('id', 'surface', 'word_type', 'reading', 'pos', 'jlpt_level')
    list_filter = ('word_type', 'jlpt_level')
    search_fields = ('surface', 'reading')
    inlines = [WordMeaningInline]


@admin.register(WordMeaning)
class WordMeaningAdmin(admin.ModelAdmin):
    list_display = ('id', 'word', 'sense_no', 'meaning_ko')
    search_fields = ('meaning_ko', 'word__surface')
