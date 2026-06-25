"""exchange 뷰 — 상품 목록 / 교환 요청 / 교환 내역 / AdMob SSV 콜백."""
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rewards.services import InsufficientBalance
from notifications.models import Notification
from notifications.services import notify

from .models import AdRewardLog, GiftExchange
from .products import list_products
from .serializers import ExchangeRequestSerializer, GiftExchangeSerializer
from .services import (
    AdNotVerified,
    ExchangeIssueFailed,
    GuestNotAllowed,
    InvalidProduct,
    request_exchange,
)
from .ssv import SsvError, verify_ssv

User = get_user_model()


class ProductsView(APIView):
    """GET /api/exchange/products/ — 교환 가능 상품 목록."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(list_products())


class RequestExchangeView(APIView):
    """POST /api/exchange/request/ — 교환 요청(차감 + 발급)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ExchangeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            gift = request_exchange(
                request.user,
                data['product_code'],
                data['ad_verified'],
                idempotency_key=data.get('idempotency_key') or None,
                ad_log_id=data.get('ad_log_id'),
            )
        except GuestNotAllowed as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except AdNotVerified as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except InvalidProduct as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except InsufficientBalance as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ExchangeIssueFailed as exc:
            # 발급 실패(환불 완료) — 클라가 실패 사실과 환불을 알 수 있게 내역 동봉.
            notify(
                request.user, Notification.Type.EXCHANGE,
                '기프티콘 교환 실패',
                f'{exc.gift.product_code} 교환에 실패해 캐시가 환불됐어요.',
                data={'screen': 'Exchange'}, push=True,
            )
            return Response(
                {
                    'detail': str(exc),
                    'exchange': GiftExchangeSerializer(exc.gift).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        notify(
            request.user, Notification.Type.EXCHANGE,
            '기프티콘 교환 완료',
            f'{gift.product_code} 교환이 완료됐어요. ({gift.cash_cost:,}C 사용)',
            data={'screen': 'Exchange'}, push=True,
        )
        return Response(GiftExchangeSerializer(gift).data, status=status.HTTP_200_OK)


class ExchangeHistoryPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ExchangeHistoryView(ListAPIView):
    """GET /api/exchange/history/ — 내 교환 내역(최신순, 페이지네이션)."""

    permission_classes = [IsAuthenticated]
    serializer_class = GiftExchangeSerializer
    pagination_class = ExchangeHistoryPagination

    def get_queryset(self):
        return GiftExchange.objects.filter(user=self.request.user).order_by(
            '-created_at', '-id',
        )


_REWARD_CONTEXTS = set(AdRewardLog.RewardContext.values)


class AdmobSsvView(APIView):
    """GET /api/exchange/admob/ssv/ — AdMob 보상형 광고 SSV 콜백(서버↔AdMob).

    AdMob 서버가 직접 호출하므로 인증 없음. transaction_id 로 멱등 처리하고,
    ADMOB_SSV_VERIFY=True 면 서명을 검증한다(False=dev 면 통과로 본다).
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params
        transaction_id = q.get('transaction_id')
        if not transaction_id:
            return Response(
                {'detail': 'transaction_id required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1) 멱등 — 같은 콜백 재수신은 그대로 200.
        if AdRewardLog.objects.filter(transaction_id=transaction_id).exists():
            return Response(status=status.HTTP_200_OK)

        # 유저 매핑 — 클라가 SSV userId 로 우리 User.pk 를 넘긴다고 가정.
        user = User.objects.filter(pk=q.get('user_id')).first() if q.get('user_id') else None
        if user is None:
            return Response({'detail': 'unknown user'}, status=status.HTTP_400_BAD_REQUEST)

        # 2) 서명 검증(Mock 모드면 스킵).
        if settings.ADMOB_SSV_VERIFY:
            try:
                verified = verify_ssv(request.META.get('QUERY_STRING', ''))
            except SsvError:
                return Response(
                    {'detail': 'verification unavailable'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
        else:
            verified = True

        custom_data = q.get('custom_data', '')
        context = (
            custom_data
            if custom_data in _REWARD_CONTEXTS
            else AdRewardLog.RewardContext.BOX_OPEN
        )

        # 3) 로그 기록(검증 결과 그대로).
        AdRewardLog.objects.create(
            user=user,
            ad_unit=q.get('ad_unit_id', ''),
            ssv_signature=q.get('signature', ''),
            transaction_id=transaction_id,
            verified=verified,
            reward_context=context,
        )

        if not verified:
            return Response({'detail': 'invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_200_OK)
