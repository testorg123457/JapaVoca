from django.urls import path

from .views import KanjiComponentView

urlpatterns = [
    path('kanji/<str:character>/components/', KanjiComponentView.as_view(), name='kanji-components'),
]
