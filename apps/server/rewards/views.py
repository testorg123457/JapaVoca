"""rewards 뷰 — 지갑 조회 / 캐시상자 개봉."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CashBox
from .services import BoxAlreadyOpened, get_balance, open_cash_box


class WalletView(APIView):
    """GET /api/rewards/wallet/ — 내 잔액."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'balance': get_balance(request.user)})


class OpenBoxView(APIView):
    """POST /api/rewards/boxes/<id>/open/ — 캐시상자 개봉(보상 적립).

    body(optional): {"ad_verified": bool} — 광고 보고 개봉(실제 SSV 검증은 추후 연동).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, box_id):
        ad_verified = bool(request.data.get('ad_verified', False))
        try:
            box, ledger = open_cash_box(request.user, box_id, ad_verified=ad_verified)
        except CashBox.DoesNotExist:
            return Response({'detail': '상자를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        except BoxAlreadyOpened as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response({
            'box_id': box.id,
            'grade': box.grade,
            'reward_cash': box.reward_cash,
            'balance_after': ledger.balance_after,
        })
