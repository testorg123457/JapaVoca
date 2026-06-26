from django.urls import path

from .views import (
    InquiryDeleteView,
    InquiryListCreateView,
    InquiryMarkAllReadView,
    InquiryUnreadCountView,
)

urlpatterns = [
    path('inquiries/', InquiryListCreateView.as_view()),
    path('inquiries/unread-count/', InquiryUnreadCountView.as_view()),
    path('inquiries/mark-all-read/', InquiryMarkAllReadView.as_view()),
    path('inquiries/<int:pk>/', InquiryDeleteView.as_view()),
]
