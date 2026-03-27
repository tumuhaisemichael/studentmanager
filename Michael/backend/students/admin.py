from django.contrib import admin

from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "age",
        "subject",
        "phone_number",
        "class_name",
        "created_by",
        "created_at",
    )
    search_fields = (
        "name",
        "subject",
        "phone_number",
        "class_name",
        "created_by__username",
    )
    list_filter = ("subject", "class_name", "created_at")
