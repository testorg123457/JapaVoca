"""translate URL — /api/translate/ 하위."""
from django.urls import path

from .views import TranslateImageView, TranslateTextView

app_name = 'translate'

urlpatterns = [
    path('image/', TranslateImageView.as_view(), name='image'),
    path('text/', TranslateTextView.as_view(), name='text'),
]
