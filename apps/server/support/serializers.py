from rest_framework import serializers
from .models import Inquiry


class InquiryWriteSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=2000)


class InquiryReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inquiry
        fields = ('id', 'content', 'created_at', 'answer', 'answered_at', 'is_answer_read')
        read_only_fields = fields
