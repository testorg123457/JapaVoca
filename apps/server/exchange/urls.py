"""exchange URL — /api/exchange/ 하위."""
from django.urls import path

from .views import (
    AdmobSsvView,
    AdStatusView,
    ExchangeHistoryView,
    ProductsView,
    RequestExchangeView,
)

app_name = 'exchange'

urlpatterns = [
    path('products/', ProductsView.as_view(), name='products'),
    path('request/', RequestExchangeView.as_view(), name='request'),
    path('history/', ExchangeHistoryView.as_view(), name='history'),
    path('ad-status/', AdStatusView.as_view(), name='ad-status'),
    path('admob/ssv/', AdmobSsvView.as_view(), name='admob-ssv'),
]
