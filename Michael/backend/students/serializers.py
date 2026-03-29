from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Course, Enrollment, Student


class StudentSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True
    )

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Student name is required.")
        return value

    def validate_age(self, value):
        if value < 1:
            raise serializers.ValidationError("Age must be greater than zero.")
        return value

    def validate_phone_number(self, value):
        cleaned_value = value.strip()
        if cleaned_value and len(cleaned_value) < 7:
            raise serializers.ValidationError(
                "Phone number should be at least 7 characters."
            )
        return cleaned_value

    class Meta:
        model = Student
        fields = [
            "id",
            "name",
            "age",
            "phone_number",
            "class_name",
            "comment",
            "created_by",
            "created_by_username",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "created_by", "created_by_username"]


class CourseSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True
    )

    def validate_title(self, value):
        cleaned_value = value.strip()
        if not cleaned_value:
            raise serializers.ValidationError("Course title is required.")
        return cleaned_value

    def validate_code(self, value):
        cleaned_value = value.strip().upper()
        if not cleaned_value:
            raise serializers.ValidationError("Course code is required.")
        return cleaned_value

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "code",
            "description",
            "created_by",
            "created_by_username",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "created_by", "created_by_username"]


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        student = attrs.get("student")
        course = attrs.get("course")

        # Enrollment should only join records owned by the authenticated user.
        if user and student and student.created_by_id != user.id:
            raise serializers.ValidationError(
                {"student": "You can only enroll your own students."}
            )

        if user and course and course.created_by_id != user.id:
            raise serializers.ValidationError(
                {"course": "You can only use your own courses."}
            )

        return attrs

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student",
            "course",
            "student_name",
            "course_title",
            "course_code",
            "created_by",
            "enrolled_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "enrolled_at",
            "student_name",
            "course_title",
            "course_code",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "confirm_password"]
        read_only_fields = ["id"]

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
