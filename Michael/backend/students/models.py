from django.contrib.auth.models import User
from django.db import models


class Student(models.Model):
    name = models.CharField(max_length=255)
    age = models.PositiveIntegerField()
    subject = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=30, blank=True, default="")
    class_name = models.CharField(max_length=255, blank=True, default="")
    comment = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="students",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} - {self.subject}"
