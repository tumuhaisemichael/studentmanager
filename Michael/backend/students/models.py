from django.contrib.auth.models import User
from django.db import models


class Student(models.Model):
    name = models.CharField(max_length=255)
    age = models.PositiveIntegerField()
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
    # We expose a real many-to-many relation via Enrollment so we can attach
    # metadata and enforce uniqueness at the join-table level.
    courses = models.ManyToManyField(
        "Course",
        through="Enrollment",
        related_name="students",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class Course(models.Model):
    title = models.CharField(max_length=255)
    code = models.CharField(max_length=40)
    description = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="courses",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["created_by", "code"],
                name="unique_course_code_per_creator",
            )
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.title}"


class Enrollment(models.Model):
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name="enrollments"
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="enrollments"
    )
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="enrollments",
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-enrolled_at"]
        # Prevent duplicate relation rows for the same pair of keys.
        constraints = [
            models.UniqueConstraint(
                fields=["student", "course"],
                name="unique_student_course_enrollment",
            )
        ]

    def __str__(self) -> str:
        return f"{self.student_id} -> {self.course_id}"
