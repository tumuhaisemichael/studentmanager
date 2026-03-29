from django.contrib import admin

from .models import Course, Enrollment, Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "age",
        "phone_number",
        "class_name",
        "created_by",
        "created_at",
    )
    search_fields = (
        "name",
        "phone_number",
        "class_name",
        "created_by__username",
    )
    list_filter = ("class_name", "created_at")


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "code", "created_by", "created_at")
    search_fields = ("title", "code", "created_by__username")
    list_filter = ("created_at",)


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("student", "course", "created_by", "enrolled_at")
    search_fields = (
        "student__name",
        "course__title",
        "course__code",
        "created_by__username",
    )
    list_filter = ("enrolled_at",)
