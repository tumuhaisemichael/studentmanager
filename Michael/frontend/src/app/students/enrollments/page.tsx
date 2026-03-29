"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { clearTokens, getAccessToken } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

type Student = {
  id: number;
  name: string;
  class_name: string;
};

type Course = {
  id: number;
  title: string;
  code: string;
};

type Enrollment = {
  id: number;
  student: number;
  course: number;
  student_name?: string;
  course_title?: string;
  course_code?: string;
  enrolled_at?: string;
};

type EnrollmentFormState = {
  student: string;
  course: string;
};

const initialFormState: EnrollmentFormState = {
  student: "",
  course: "",
};

export default function EnrollmentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [form, setForm] = useState<EnrollmentFormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // A single formatter keeps backend errors readable across load/create/delete actions.
  function formatErrorMessage(issue: unknown) {
    if (!(issue instanceof Error)) {
      return "Something went wrong.";
    }

    const rawMessage = issue.message;
    const jsonStart = rawMessage.indexOf("{");

    if (jsonStart === -1) {
      return rawMessage;
    }

    try {
      const parsed = JSON.parse(rawMessage.slice(jsonStart)) as Record<string, unknown>;

      return Object.entries(parsed)
        .map(([field, value]) => {
          const normalizedField = field.replaceAll("_", " ");
          const messages = Array.isArray(value) ? value.join(", ") : String(value);
          return `${normalizedField}: ${messages}`;
        })
        .join(" | ");
    } catch {
      return rawMessage;
    }
  }

  // We intentionally share the same auth behavior used in other pages for consistency.
  const handleAuthError = useCallback((issue: unknown) => {
    const message = formatErrorMessage(issue);

    if (message.toLowerCase().includes("401")) {
      clearTokens();
      router.replace("/login");
      return;
    }

    setError(message);
  }, [router]);

  useEffect(() => {
    async function loadPageData() {
      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // We fetch all three resources together so the form has both dropdowns
        // and we can immediately display existing enrollments below.
        const [studentResponse, courseResponse, enrollmentResponse] = await Promise.all([
          apiRequest<Student[]>("/api/students/"),
          apiRequest<Course[]>("/api/courses/"),
          apiRequest<Enrollment[]>("/api/enrollments/"),
        ]);

        setStudents(studentResponse);
        setCourses(courseResponse);
        setEnrollments(enrollmentResponse);
      } catch (loadError) {
        handleAuthError(loadError);
      } finally {
        setIsLoading(false);
      }
    }

    void loadPageData();
  }, [handleAuthError, router]);

  const studentsById = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const coursesById = useMemo(() => {
    return new Map(courses.map((course) => [course.id, course]));
  }, [courses]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.student || !form.course) {
      setError("Please choose both student and course.");
      return;
    }

    setIsSaving(true);

    const payload = {
      student: Number(form.student),
      course: Number(form.course),
    };

    try {
      // Enrollment is the relation row itself. It stores only keys (student, course),
      // which keeps the relationship normalized and avoids duplicate text data.
      const createdEnrollment = await apiRequest<Enrollment>("/api/enrollments/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setEnrollments((currentEnrollments) => [createdEnrollment, ...currentEnrollments]);
      setForm(initialFormState);
    } catch (saveError) {
      handleAuthError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(enrollmentId: number) {
    setError("");

    try {
      await apiRequest(`/api/enrollments/${enrollmentId}/`, {
        method: "DELETE",
      });

      setEnrollments((currentEnrollments) =>
        currentEnrollments.filter((enrollment) => enrollment.id !== enrollmentId),
      );
    } catch (deleteError) {
      handleAuthError(deleteError);
    }
  }

  return (
    <main className="shell" style={{ paddingTop: "2rem" }}>
      <section className="panel" style={{ padding: "1.5rem", display: "grid", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <span className="eyebrow">Relation Management</span>
            <h1 style={{ marginTop: "0.35rem" }}>Enrollments</h1>
            <p style={{ marginTop: "0.5rem" }}>
              Connect students to courses using a simple many-to-many join table.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <Link className="button button-secondary" href="/students">
              Back to Students
            </Link>
            <Link className="button button-secondary" href="/students/courses">
              Back to Courses
            </Link>
          </div>
        </div>

        <form className="panel" onSubmit={handleSubmit} style={{ padding: "1.1rem", display: "grid", gap: "0.9rem" }}>
          <div className="section-heading">
            <span className="form-kicker">Create relation</span>
            <h2>Enroll a student</h2>
            <p>
              This form writes one enrollment row with <code>student_id</code> and <code>course_id</code>.
            </p>
          </div>

          <label>
            Student
            <select
              className="input"
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  student: event.target.value,
                }))
              }
              required
              value={form.student}
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                  {student.class_name ? ` (${student.class_name})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Course
            <select
              className="input"
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  course: event.target.value,
                }))
              }
              required
              value={form.course}
            >
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="status error">{error}</p> : null}

          <div className="button-row">
            <button className="button button-primary" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Create Enrollment"}
            </button>
          </div>
        </form>

        <section className="panel" style={{ padding: "1.1rem", display: "grid", gap: "0.9rem" }}>
          <div className="section-heading">
            <span className="form-kicker">Saved relations</span>
            <h2>Enrollment list</h2>
            <p>
              Each row represents one student-to-course relationship and can be removed independently.
            </p>
          </div>

          {isLoading ? <p className="status">Loading enrollments...</p> : null}

          {!isLoading && enrollments.length === 0 ? (
            <p className="empty-state">
              No enrollments yet. If <code>/api/enrollments/</code> is not ready, this is expected until the backend step.
            </p>
          ) : null}

          <div className="teacher-record-list">
            {enrollments.map((enrollment) => {
              const student = studentsById.get(enrollment.student);
              const course = coursesById.get(enrollment.course);

              const studentLabel = enrollment.student_name ?? student?.name ?? `Student #${enrollment.student}`;
              const courseTitle = enrollment.course_title ?? course?.title ?? `Course #${enrollment.course}`;
              const courseCode = enrollment.course_code ?? course?.code ?? "";

              return (
                <article className="teacher-record-card" key={enrollment.id}>
                  <div className="teacher-record-copy">
                    <div className="student-meta">
                      <h3>{studentLabel}</h3>
                      <span className="badge">{courseCode || "Enrollment"}</span>
                    </div>

                    <p>
                      Enrolled in <strong>{courseTitle}</strong>
                    </p>

                    <p>
                      Keys used: student_id <strong>{enrollment.student}</strong> and course_id <strong>{enrollment.course}</strong>
                    </p>

                    {enrollment.enrolled_at ? (
                      <span>Created {new Date(enrollment.enrolled_at).toLocaleString()}</span>
                    ) : null}
                  </div>

                  <div className="button-row">
                    <button
                      className="button button-danger"
                      onClick={() => handleDelete(enrollment.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
