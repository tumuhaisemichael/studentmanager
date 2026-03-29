"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { clearTokens, getAccessToken } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

type Course = {
  id: number;
  title: string;
  code: string;
  description: string;
  created_at?: string;
};

type CourseFormState = {
  title: string;
  code: string;
  description: string;
};

const initialFormState: CourseFormState = {
  title: "",
  code: "",
  description: "",
};

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState<CourseFormState>(initialFormState);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // We centralize error formatting so every API action shows a readable message.
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

  // This keeps auth expiration behavior consistent with the existing student page.
  const handleAuthError = useCallback((issue: unknown) => {
    const message = formatErrorMessage(issue);

    if (message.toLowerCase().includes("401")) {
      clearTokens();
      router.replace("/login");
      return;
    }

    setError(message);
  }, [router]);

  // We load courses on first render so this page can act as the single source of truth
  // for course CRUD before we wire enrollments.
  useEffect(() => {
    async function loadCourses() {
      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await apiRequest<Course[]>("/api/courses/");
        setCourses(response);
      } catch (loadError) {
        handleAuthError(loadError);
      } finally {
        setIsLoading(false);
      }
    }

    void loadCourses();
  }, [handleAuthError, router]);

  // Resetting form in one helper avoids subtle bugs where fields are half-reset.
  function resetForm() {
    setForm(initialFormState);
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const payload = {
      title: form.title.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
    };

    const endpoint = editingId ? `/api/courses/${editingId}/` : "/api/courses/";
    const method = editingId ? "PUT" : "POST";

    try {
      const savedCourse = await apiRequest<Course>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      setCourses((currentCourses) => {
        if (editingId) {
          return currentCourses.map((course) =>
            course.id === editingId ? savedCourse : course,
          );
        }

        return [savedCourse, ...currentCourses];
      });

      resetForm();
    } catch (saveError) {
      handleAuthError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(courseId: number) {
    setError("");

    try {
      await apiRequest(`/api/courses/${courseId}/`, {
        method: "DELETE",
      });

      setCourses((currentCourses) =>
        currentCourses.filter((course) => course.id !== courseId),
      );

      if (editingId === courseId) {
        resetForm();
      }
    } catch (deleteError) {
      handleAuthError(deleteError);
    }
  }

  function handleEdit(course: Course) {
    setEditingId(course.id);
    setForm({
      title: course.title,
      code: course.code,
      description: course.description,
    });
  }

  return (
    <main className="shell" style={{ paddingTop: "2rem" }}>
      <section className="panel" style={{ padding: "1.5rem", display: "grid", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <span className="eyebrow">Course Management</span>
            <h1 style={{ marginTop: "0.35rem" }}>Courses</h1>
            <p style={{ marginTop: "0.5rem" }}>
              Create and manage courses before assigning students through enrollments.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <Link className="button button-secondary" href="/students">
              Back to Students
            </Link>
            <Link className="button button-secondary" href="/students/enrollments">
              Go to Enrollments
            </Link>
          </div>
        </div>

        <form className="panel" onSubmit={handleSubmit} style={{ padding: "1.1rem", display: "grid", gap: "0.85rem" }}>
          <div className="section-heading">
            <span className="form-kicker">Course form</span>
            <h2>{editingId ? "Edit course" : "Add new course"}</h2>
            <p>
              We store a short code (like MATH101) so enrollments stay consistent even if title text changes later.
            </p>
          </div>

          <label>
            Course Title
            <input
              className="input"
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  title: event.target.value,
                }))
              }
              placeholder="Introduction to Physics"
              required
              value={form.title}
            />
          </label>

          <label>
            Course Code
            <input
              className="input"
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  code: event.target.value,
                }))
              }
              placeholder="PHY101"
              required
              value={form.code}
            />
          </label>

          <label>
            Description
            <textarea
              className="input textarea"
              onChange={(event) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  description: event.target.value,
                }))
              }
              placeholder="Basic mechanics, motion, and laboratory practice"
              rows={4}
              value={form.description}
            />
          </label>

          {error ? <p className="status error">{error}</p> : null}

          <div className="button-row">
            <button className="button button-primary" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : editingId ? "Update Course" : "Create Course"}
            </button>

            {editingId ? (
              <button className="button button-secondary" onClick={resetForm} type="button">
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <section className="panel" style={{ padding: "1.1rem", display: "grid", gap: "0.9rem" }}>
          <div className="section-heading">
            <span className="form-kicker">Saved courses</span>
            <h2>Course list</h2>
            <p>
              This list becomes the source used by the enrollments page when linking students to courses.
            </p>
          </div>

          {isLoading ? <p className="status">Loading courses...</p> : null}

          {!isLoading && courses.length === 0 ? (
            <p className="empty-state">
              No courses found yet. If your backend for <code>/api/courses/</code> is not live,
              this is expected until we add it.
            </p>
          ) : null}

          <div className="teacher-record-list">
            {courses.map((course) => (
              <article className="teacher-record-card" key={course.id}>
                <div className="teacher-record-copy">
                  <div className="student-meta">
                    <h3>{course.title}</h3>
                    <span className="badge">{course.code}</span>
                  </div>

                  {course.description ? <p>{course.description}</p> : <p>No description provided.</p>}
                  {course.created_at ? (
                    <span>Created {new Date(course.created_at).toLocaleString()}</span>
                  ) : null}
                </div>

                <div className="button-row">
                  <button
                    className="button button-secondary"
                    onClick={() => handleEdit(course)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="button button-danger"
                    onClick={() => handleDelete(course.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
