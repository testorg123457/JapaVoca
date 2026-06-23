"""rewards URL — /api/rewards/ 하위."""
from django.urls import path

from .views import OpenBoxView, WalletView

app_name = 'rewards'

urlpatterns = [
    path('wallet/', WalletView.as_view(), name='wallet'),
    path('boxes/<int:box_id>/open/', OpenBoxView.as_view(), name='box-open'),
]
