from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Student


class StudentSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True
    )

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Student name is required.")
        return value

    def validate_subject(self, value):
        if not value.strip():
            raise serializers.ValidationError("Subject is required.")
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
            "subject",
            "phone_number",
            "class_name",
            "comment",
            "created_by",
            "created_by_username",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "created_by", "created_by_username"]


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
