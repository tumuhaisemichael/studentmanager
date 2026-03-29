from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Course, Enrollment, Student


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
                "phone_number": "+256700123456",
                "class_name": "Senior 6",
                "comment": "Top performer",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Student.objects.count(), 1)
        self.assertEqual(Student.objects.first().created_by, self.user)
        self.assertEqual(Student.objects.first().phone_number, "+256700123456")

        list_response = self.client.get("/api/students/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["created_by_username"], "tester")

    def test_user_only_sees_own_students_in_default_list(self):
        Student.objects.create(
            name="Owner Student",
            age=19,
            phone_number="+256700000001",
            class_name="Year 1",
            comment="Created by tester",
            created_by=self.user,
        )
        Student.objects.create(
            name="Other Student",
            age=20,
            phone_number="+256700000002",
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
            phone_number="+256700000001",
            class_name="Year 1",
            comment="Created by tester",
            created_by=self.user,
        )
        Student.objects.create(
            name="Other Student",
            age=20,
            phone_number="+256700000002",
            class_name="Year 2",
            comment="Created by another",
            created_by=self.other_user,
        )

        self.authenticate()
        response = self.client.get("/api/students/all/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_invalid_student_payload_returns_validation_errors(self):
        self.authenticate()

        response = self.client.post(
            "/api/students/",
            {
                "name": " ",
                "age": 0,
                "phone_number": "123",
                "class_name": "Senior 4",
                "comment": "Needs support",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertIn("age", response.data)
        self.assertIn("phone_number", response.data)


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


class CourseAndEnrollmentApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="teacher1", password="pass12345")
        self.other_user = User.objects.create_user(
            username="teacher2", password="pass12345"
        )

        self.student = Student.objects.create(
            name="Alice",
            age=18,
            class_name="S6",
            created_by=self.user,
        )
        self.other_student = Student.objects.create(
            name="Bob",
            age=19,
            class_name="S5",
            created_by=self.other_user,
        )

        self.course = Course.objects.create(
            title="Calculus I",
            code="MATH101",
            created_by=self.user,
        )
        self.other_course = Course.objects.create(
            title="Chemistry I",
            code="CHEM101",
            created_by=self.other_user,
        )

    def authenticate(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "teacher1", "password": "pass12345"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def test_user_can_create_and_list_own_courses(self):
        self.authenticate()

        create_response = self.client.post(
            "/api/courses/",
            {
                "title": "Data Structures",
                "code": "CS201",
                "description": "Foundational algorithms and structures",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        list_response = self.client.get("/api/courses/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 2)

    def test_user_only_sees_own_enrollments(self):
        Enrollment.objects.create(
            student=self.student,
            course=self.course,
            created_by=self.user,
        )
        Enrollment.objects.create(
            student=self.other_student,
            course=self.other_course,
            created_by=self.other_user,
        )

        self.authenticate()
        response = self.client.get("/api/enrollments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["student_name"], "Alice")
        self.assertEqual(response.data[0]["course_code"], "MATH101")

    def test_enrollment_rejects_student_or_course_owned_by_other_user(self):
        self.authenticate()

        response_with_other_student = self.client.post(
            "/api/enrollments/",
            {"student": self.other_student.id, "course": self.course.id},
            format="json",
        )
        self.assertEqual(
            response_with_other_student.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertIn("student", response_with_other_student.data)

        response_with_other_course = self.client.post(
            "/api/enrollments/",
            {"student": self.student.id, "course": self.other_course.id},
            format="json",
        )
        self.assertEqual(
            response_with_other_course.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertIn("course", response_with_other_course.data)

    def test_duplicate_enrollment_is_rejected(self):
        Enrollment.objects.create(
            student=self.student,
            course=self.course,
            created_by=self.user,
        )

        self.authenticate()
        duplicate_response = self.client.post(
            "/api/enrollments/",
            {"student": self.student.id, "course": self.course.id},
            format="json",
        )

        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
