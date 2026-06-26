from django.conf import settings
from django.db import models


class Inquiry(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='inquiries',
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    answer = models.TextField(null=True, blank=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    is_answer_read = models.BooleanField(default=False)

    class Meta:
        db_table = 'tbl_support_inquiry'
        ordering = ['-created_at']

    def __str__(self):
        return f'Inquiry#{self.pk} by {self.user_id}'
