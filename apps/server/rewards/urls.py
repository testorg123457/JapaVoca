"""rewards URL — /api/rewards/ 하위."""
from django.urls import path

from .views import (
    AttendanceTodayView,
    BoxListView,
    DailyTodayView,
    OpenBoxView,
    WalletView,
)

app_name = 'rewards'

urlpatterns = [
    path('wallet/', WalletView.as_view(), name='wallet'),
    path('boxes/', BoxListView.as_view(), name='box-list'),
    path('boxes/<int:box_id>/open/', OpenBoxView.as_view(), name='box-open'),
    path('attendance/today/', AttendanceTodayView.as_view(), name='attendance-today'),
    path('daily/today/', DailyTodayView.as_view(), name='daily-today'),
]
