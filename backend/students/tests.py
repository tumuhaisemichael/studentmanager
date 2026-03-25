from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Student


class StudentApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="pass12345")
        self.other_user = User.objects.create_user(
            username="another", password="pass12345"
        )

    def authenticate(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "tester", "password": "pass12345"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def test_authentication_required_for_student_list(self):
        response = self.client.get("/api/students/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_create_and_list_students(self):
        self.authenticate()

        create_response = self.client.post(
            "/api/students/",
            {
                "name": "Grace Hopper",
                "age": 22,
                "subject": "Computer Science",
                "class_name": "Senior 6",
                "comment": "Top performer",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Student.objects.count(), 1)
        self.assertEqual(Student.objects.first().created_by, self.user)

        list_response = self.client.get("/api/students/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["created_by_username"], "tester")

    def test_user_only_sees_own_students_in_default_list(self):
        Student.objects.create(
            name="Owner Student",
            age=19,
            subject="Physics",
            class_name="Year 1",
            comment="Created by tester",
            created_by=self.user,
        )
        Student.objects.create(
            name="Other Student",
            age=20,
            subject="Math",
            class_name="Year 2",
            comment="Created by another",
            created_by=self.other_user,
        )

        self.authenticate()
        response = self.client.get("/api/students/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Owner Student")

    def test_authenticated_user_can_view_all_students_page(self):
        Student.objects.create(
            name="Owner Student",
            age=19,
            subject="Physics",
            class_name="Year 1",
            comment="Created by tester",
            created_by=self.user,
        )
        Student.objects.create(
            name="Other Student",
            age=20,
            subject="Math",
            class_name="Year 2",
            comment="Created by another",
            created_by=self.other_user,
        )

        self.authenticate()
        response = self.client.get("/api/students/all/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)


class RegistrationTests(APITestCase):
    def test_user_can_register(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "strongpass123",
                "confirm_password": "strongpass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_registration_requires_matching_passwords(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "nomatch",
                "email": "nomatch@example.com",
                "password": "strongpass123",
                "confirm_password": "wrongpass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
