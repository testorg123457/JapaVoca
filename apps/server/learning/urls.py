"""learning URL — /api/quiz/ 하위."""
from django.urls import path

from .views import AnswerView, NextQuestionView

app_name = 'learning'

urlpatterns = [
    path('next/', NextQuestionView.as_view(), name='quiz-next'),
    path('answer/', AnswerView.as_view(), name='quiz-answer'),
]
