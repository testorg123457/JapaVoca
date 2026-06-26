from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Inquiry
from .serializers import InquiryReadSerializer, InquiryWriteSerializer

DAILY_LIMIT = 10


class InquiryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Inquiry.objects.filter(user=request.user)
        return Response(InquiryReadSerializer(qs, many=True).data)

    def post(self, request):
        today = timezone.localdate()
        if Inquiry.objects.filter(user=request.user, created_at__date=today).count() >= DAILY_LIMIT:
            return Response(
                {'detail': '오늘 문의 한도에 도달했어요.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        serializer = InquiryWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        inquiry = Inquiry.objects.create(
            user=request.user,
            content=serializer.validated_data['content'],
        )
        return Response(InquiryReadSerializer(inquiry).data, status=status.HTTP_201_CREATED)


class InquiryUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Inquiry.objects.filter(
            user=request.user,
            answer__isnull=False,
            is_answer_read=False,
        ).count()
        return Response({'count': count})


class InquiryMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        Inquiry.objects.filter(
            user=request.user,
            answer__isnull=False,
            is_answer_read=False,
        ).update(is_answer_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
