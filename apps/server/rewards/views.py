"""rewards 뷰 — 지갑 / 거래내역 / 캐시상자 / 출석 / 데일리 현황."""
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CashBox, Ledger, Wallet
from .serializers import LedgerSerializer
from .services import (
    AdNotVerifiedForBox,
    AlreadyCheckedIn,
    BoxAlreadyOpened,
    check_in,
    get_today_attendance,
    get_today_daily,
    list_unopened_boxes,
    open_cash_box,
)


class WalletView(APIView):
    """GET /api/rewards/wallet/ — 내 잔액 + 누적 적립/사용."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet = Wallet.objects.filter(pk=request.user.pk).first()
        if wallet is None:
            return Response({'balance': 0, 'total_earned': 0, 'total_used': 0})
        return Response({
            'balance': wallet.balance,
            'total_earned': wallet.total_earned,
            'total_used': wallet.total_used,
        })


class LedgerPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class LedgerListView(ListAPIView):
    """GET /api/rewards/ledger/?direction=earn|use — 내 거래 내역(최신순, 페이지네이션)."""

    permission_classes = [IsAuthenticated]
    serializer_class = LedgerSerializer
    pagination_class = LedgerPagination

    def get_queryset(self):
        # created_at 동률 시 안정 정렬을 위해 id 보조키. (페이지 경계 중복/누락 방지)
        qs = Ledger.objects.filter(user=self.request.user).order_by('-created_at', '-id')
        direction = self.request.query_params.get('direction')
        if direction in (Ledger.Direction.EARN, Ledger.Direction.USE):
            qs = qs.filter(direction=direction)
        return qs


class OpenBoxView(APIView):
    """POST /api/rewards/boxes/<id>/open/ — 캐시상자 개봉(보상 적립).

    body(optional): {"ad_verified": bool, "ad_log_id": int} — 광고 보고 개봉.
    실제 검증 모드면 ad_log_id 의 AdRewardLog.verified 를 확인한다(Mock 모드는 스킵).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, box_id):
        ad_verified = bool(request.data.get('ad_verified', False))
        ad_log_id = request.data.get('ad_log_id')
        try:
            box, ledger = open_cash_box(
                request.user, box_id, ad_verified=ad_verified, ad_log_id=ad_log_id,
            )
        except CashBox.DoesNotExist:
            return Response({'detail': '상자를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        except AdNotVerifiedForBox as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except BoxAlreadyOpened as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response({
            'box_id': box.id,
            'grade': box.grade,
            'reward_cash': box.reward_cash,
            'balance_after': ledger.balance_after,
        })


class BoxListView(APIView):
    """GET /api/rewards/boxes/ — 미개봉 캐시상자 목록(인벤토리)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        boxes = list_unopened_boxes(request.user)
        return Response([{'id': box.id, 'grade': box.grade} for box in boxes])


class AttendanceTodayView(APIView):
    """GET/POST /api/rewards/attendance/today/ — 오늘 출석 상태 조회 / 체크인."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_today_attendance(request.user))

    def post(self, request):
        try:
            attendance = check_in(request.user)
        except AlreadyCheckedIn:
            return Response(
                get_today_attendance(request.user), status=status.HTTP_409_CONFLICT,
            )
        return Response({
            'checked_in': True,
            'streak_count': attendance.streak_count,
            'bonus_cash': attendance.bonus_cash,
        })


class DailyTodayView(APIView):
    """GET /api/rewards/daily/today/ — 오늘의 학습 현황(문제수/정답수/획득 상자수)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_today_daily(request.user))
