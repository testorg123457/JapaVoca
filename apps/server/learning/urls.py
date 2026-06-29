"""learning URL — /api/quiz/ 하위."""
from django.urls import path

from .views import AnswerView, AbandonQuizSetView, BookmarkView, NextQuestionView, QuizSetView, SyncAnswersView

app_name = 'learning'

urlpatterns = [
    path('next/', NextQuestionView.as_view(), name='quiz-next'),
    path('answer/', AnswerView.as_view(), name='quiz-answer'),
    path('set/', QuizSetView.as_view(), name='quiz-set'),
    path('set/abandon/', AbandonQuizSetView.as_view(), name='quiz-set-abandon'),
    path('sync/', SyncAnswersView.as_view(), name='quiz-sync'),
    path('bookmarks/', BookmarkView.as_view(), name='quiz-bookmarks'),
]
