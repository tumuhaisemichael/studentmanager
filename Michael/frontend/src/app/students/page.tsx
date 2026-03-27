"use client";

import { FormEvent, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { clearTokens, getAccessToken } from "@/lib/auth";

type Student = {
  id: number;
  name: string;
  age: number;
  subject: string;
  phone_number: string;
  class_name: string;
  comment: string;
  created_by_username: string | null;
  created_at: string;
};

type CurrentUser = {
  id: number;
  username: string;
  email: string;
};

type StudentFormState = {
  name: string;
  age: string;
  subject: string;
  phone_number: string;
  class_name: string;
  comment: string;
};

type DashboardTab = "form" | "records" | "all";

const initialFormState: StudentFormState = {
  name: "",
  age: "",
  subject: "",
  phone_number: "",
  class_name: "",
  comment: "",
};

export default function StudentsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentFormState>(initialFormState);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("form");
  const [isLoading, setIsLoading] = useState(true);
  const [isAllLoading, setIsAllLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [perPage, setPerPage] = useState("9");
  const deferredSearchTerm = useDeferredValue(searchTerm);

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

  useEffect(() => {
    async function loadDashboard() {
      const token = getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [user, studentRecords] = await Promise.all([
          apiRequest<CurrentUser>("/api/auth/me/"),
          apiRequest<Student[]>("/api/students/"),
        ]);

        setCurrentUser(user);
        setStudents(studentRecords);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Something went wrong.";

        if (message.toLowerCase().includes("401")) {
          clearTokens();
          router.replace("/login");
          return;
        }

        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  useEffect(() => {
    async function loadAllStudents() {
      if (activeTab !== "all" || allStudents.length > 0) {
        return;
      }

      setIsAllLoading(true);

      try {
        const response = await apiRequest<Student[]>("/api/students/all/");
        setAllStudents(response);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Something went wrong.";
        setError(message);
      } finally {
        setIsAllLoading(false);
      }
    }

    void loadAllStudents();
  }, [activeTab, allStudents.length]);

  function resetForm() {
    setForm(initialFormState);
    setEditingId(null);
  }

  function handleAuthError(issue: unknown) {
    const message = formatErrorMessage(issue);

    if (message.toLowerCase().includes("401")) {
      clearTokens();
      router.replace("/login");
      return;
    }

    setError(message);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      age: Number(form.age),
      subject: form.subject.trim(),
      phone_number: form.phone_number.trim(),
      class_name: form.class_name.trim(),
      comment: form.comment.trim(),
    };

    const endpoint = editingId ? `/api/students/${editingId}/` : "/api/students/";
    const method = editingId ? "PUT" : "POST";

    try {
      const savedStudent = await apiRequest<Student>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      setStudents((currentStudents) => {
        if (editingId) {
          return currentStudents.map((student) =>
            student.id === editingId ? savedStudent : student,
          );
        }

        return [savedStudent, ...currentStudents];
      });

      setAllStudents((currentStudents) => {
        if (editingId) {
          return currentStudents.map((student) =>
            student.id === editingId ? savedStudent : student,
          );
        }

        return currentStudents.length > 0 ? [savedStudent, ...currentStudents] : currentStudents;
      });

      resetForm();
      setActiveTab("records");
      window.dispatchEvent(new Event("student-records-changed"));
    } catch (saveError) {
      handleAuthError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(studentId: number) {
    setError("");

    try {
      await apiRequest(`/api/students/${studentId}/`, {
        method: "DELETE",
      });

      setStudents((currentStudents) =>
        currentStudents.filter((student) => student.id !== studentId),
      );
      setAllStudents((currentStudents) =>
        currentStudents.filter((student) => student.id !== studentId),
      );

      if (editingId === studentId) {
        resetForm();
      }

      if (selectedStudent?.id === studentId) {
        setSelectedStudent(null);
      }

      window.dispatchEvent(new Event("student-records-changed"));
    } catch (deleteError) {
      handleAuthError(deleteError);
    }
  }

  function handleEdit(student: Student) {
    setEditingId(student.id);
    setForm({
      name: student.name,
      age: String(student.age),
      subject: student.subject,
      phone_number: student.phone_number,
      class_name: student.class_name,
      comment: student.comment,
    });
    setActiveTab("form");
    setIsMenuOpen(false);
  }

  function handleLogout() {
    clearTokens();
    router.replace("/login");
  }

  function handleTabChange(tab: DashboardTab) {
    setActiveTab(tab);
    setIsMenuOpen(false);
  }

  function exportStudentsToCsv() {
    const rows = [
      [
        "Name",
        "Age",
        "Subject",
        "Phone Number",
        "Class",
        "Comment",
        "Created By",
        "Created At",
      ],
      ...students.map((student) => [
        student.name,
        String(student.age),
        student.subject,
        student.phone_number,
        student.class_name,
        student.comment,
        student.created_by_username ?? "",
        new Date(student.created_at).toLocaleString(),
      ]),
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "studentmanager-my-students.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const filteredStudents = [...allStudents]
    .filter((student) => {
      const query = deferredSearchTerm.trim().toLowerCase();

      if (!query) {
        return true;
      }

      return [
        student.name,
        student.subject,
        student.class_name,
        student.comment,
        student.created_by_username ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((firstStudent, secondStudent) => {
      if (sortBy === "name") {
        return firstStudent.name.localeCompare(secondStudent.name);
      }

      if (sortBy === "subject") {
        return firstStudent.subject.localeCompare(secondStudent.subject);
      }

      return (
        new Date(secondStudent.created_at).getTime() -
        new Date(firstStudent.created_at).getTime()
      );
    });

  const visibleStudents = filteredStudents.slice(0, Number(perPage));
  const teacherName = currentUser?.username ?? "Teacher";
  const totalClasses = new Set(
    students.map((student) => student.class_name).filter(Boolean),
  ).size;
  const totalSubjects = new Set(students.map((student) => student.subject)).size;
  const totalAllClasses = new Set(
    allStudents.map((student) => student.class_name).filter(Boolean),
  ).size;
  const totalAllSubjects = new Set(allStudents.map((student) => student.subject)).size;

  return (
    <main className="teacher-dashboard-shell">
      <section className="teacher-layout">
        <div className="teacher-mobile-bar">
          <div className="teacher-brand">
            <div className="teacher-brand-mark">S</div>
            <div>
              <strong>StudentManager</strong>
              <span>Teacher workspace</span>
            </div>
          </div>

          <button
            aria-expanded={isMenuOpen}
            aria-label="Open dashboard menu"
            className="teacher-menu-button"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            Menu
          </button>
        </div>

        {isMenuOpen ? (
          <button
            aria-label="Close dashboard menu"
            className="teacher-sidebar-backdrop"
            onClick={() => setIsMenuOpen(false)}
            type="button"
          />
        ) : null}

        <aside className={`panel teacher-sidebar ${isMenuOpen ? "teacher-sidebar-open" : ""}`}>
          <div className="teacher-brand">
            <div className="teacher-brand-mark">S</div>
            <div>
              <strong>StudentManager</strong>
              <span>Teacher workspace</span>
            </div>
          </div>

          <nav className="teacher-nav">
            <button
              className={
                activeTab === "form"
                  ? "teacher-nav-item teacher-nav-item-active"
                  : "teacher-nav-item"
              }
              onClick={() => handleTabChange("form")}
              type="button"
            >
              Add student
            </button>
            <button
              className={
                activeTab === "records"
                  ? "teacher-nav-item teacher-nav-item-active"
                  : "teacher-nav-item"
              }
              onClick={() => handleTabChange("records")}
              type="button"
            >
              Saved entries
            </button>
            <button
              className={
                activeTab === "all"
                  ? "teacher-nav-item teacher-nav-item-active"
                  : "teacher-nav-item"
              }
              onClick={() => handleTabChange("all")}
              type="button"
            >
              View all students
            </button>
            <button className="teacher-nav-item" onClick={handleLogout} type="button">
              Logout
            </button>
          </nav>

          <div className="teacher-sidebar-card">
            <span className="form-kicker">Signed in</span>
            <h3>{teacherName}</h3>
            <p>Create and manage the student records assigned to your account.</p>
          </div>

          <div className="teacher-sidebar-card">
            <span className="form-kicker">Your records</span>
            <h3>{students.length}</h3>
            <p>Switch sections from the nav while keeping the dashboard frame in place.</p>
          </div>
        </aside>

        <section className="teacher-content">
          {activeTab === "form" ? (
            <>
              <div className="teacher-page-header">
                <div>
                  <span className="eyebrow">Teacher Dashboard</span>
                  <h1>{editingId ? "Update Student Record" : "Add New Student"}</h1>
                  <p>Enter student details to keep your class list complete and organized.</p>
                </div>
              </div>

              <section className="teacher-stats-grid">
                <article className="teacher-stat-card">
                  <span>Total students</span>
                  <strong>{students.length}</strong>
                </article>
                <article className="teacher-stat-card">
                  <span>Total classes</span>
                  <strong>{totalClasses}</strong>
                </article>
                <article className="teacher-stat-card">
                  <span>Total subjects</span>
                  <strong>{totalSubjects}</strong>
                </article>
              </section>

              <form className="panel teacher-entry-panel" onSubmit={handleSubmit}>
                <div className="teacher-entry-shell">
                  <div className="section-heading">
                    <span className="form-kicker">Personal Information</span>
                    <h2>{editingId ? "Edit this student" : "Student details"}</h2>
                    <p>Capture the main information teachers need without extra clutter.</p>
                  </div>

                  <div className="teacher-form-grid">
                    <label>
                      Student Name
                      <input
                        className="input"
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Ada Lovelace"
                        required
                        value={form.name}
                      />
                    </label>

                    <label>
                      Age
                      <input
                        className="input"
                        min="1"
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            age: event.target.value,
                          }))
                        }
                        placeholder="21"
                        required
                        type="number"
                        value={form.age}
                      />
                    </label>
                  </div>

                  <div className="teacher-form-section">
                    <span className="form-kicker">Academic Details</span>
                    <div className="teacher-form-grid">
                      <label>
                        Subject
                        <input
                          className="input"
                          onChange={(event) =>
                            setForm((currentForm) => ({
                              ...currentForm,
                              subject: event.target.value,
                            }))
                          }
                          placeholder="Computer Science"
                          required
                          value={form.subject}
                        />
                      </label>

                      <label>
                        Phone Number
                        <input
                          className="input"
                          onChange={(event) =>
                            setForm((currentForm) => ({
                              ...currentForm,
                              phone_number: event.target.value,
                            }))
                          }
                          placeholder="+256700123456"
                          value={form.phone_number}
                        />
                      </label>

                      <label>
                        Class
                        <input
                          className="input"
                          onChange={(event) =>
                            setForm((currentForm) => ({
                              ...currentForm,
                              class_name: event.target.value,
                            }))
                          }
                          placeholder="Senior 6"
                          value={form.class_name}
                        />
                      </label>

                      <label className="teacher-form-wide">
                        Comment
                        <textarea
                          className="input textarea"
                          onChange={(event) =>
                            setForm((currentForm) => ({
                              ...currentForm,
                              comment: event.target.value,
                            }))
                          }
                          placeholder="Add a note on progress, participation, or support needs"
                          rows={5}
                          value={form.comment}
                        />
                      </label>
                    </div>
                  </div>

                  {error ? <p className="status error">{error}</p> : null}

                  <div className="button-row">
                    <button className="button button-primary" disabled={isSaving} type="submit">
                      {isSaving ? "Saving..." : editingId ? "Update Student" : "Save Student"}
                    </button>

                    {editingId ? (
                      <button
                        className="button button-secondary"
                        onClick={resetForm}
                        type="button"
                      >
                        Cancel edit
                      </button>
                    ) : null}
                  </div>
                </div>
              </form>
            </>
          ) : null}

          {activeTab === "records" ? (
            <>
              <div className="teacher-page-header">
                <div>
                  <span className="eyebrow">My Students</span>
                  <h1>Saved Student Entries</h1>
                  <p>Open, review, edit, or remove the student records you have already created.</p>
                </div>
                <button
                  className="button button-secondary"
                  onClick={exportStudentsToCsv}
                  type="button"
                >
                  Export CSV
                </button>
              </div>

              <section className="teacher-stats-grid">
                <article className="teacher-stat-card">
                  <span>Total students</span>
                  <strong>{students.length}</strong>
                </article>
                <article className="teacher-stat-card">
                  <span>Total classes</span>
                  <strong>{totalClasses}</strong>
                </article>
                <article className="teacher-stat-card">
                  <span>Total subjects</span>
                  <strong>{totalSubjects}</strong>
                </article>
              </section>

              <section className="panel teacher-records-panel">
                <div className="section-heading">
                  <span className="form-kicker">My Students</span>
                  <h2>Saved student entries</h2>
                  <p>{students.length} record(s) created by you so far.</p>
                </div>

                {error ? <p className="status error">{error}</p> : null}
                {isLoading ? <p className="status">Loading your students...</p> : null}

                {!isLoading && students.length === 0 ? (
                  <p className="empty-state">
                    You have not added any students yet. Use the Add Student section to
                    create your first record.
                  </p>
                ) : null}

                <div className="teacher-record-list">
                  {students.map((student) => (
                    <article className="teacher-record-card" key={student.id}>
                      <div className="teacher-record-copy">
                        <div className="student-meta">
                          <h3>{student.name}</h3>
                          <span className="badge">{student.subject}</span>
                        </div>
                        <div className="student-chip-row">
                          <span className="meta-chip">Created by me</span>
                          <span className="meta-chip">
                            {new Date(student.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p>
                          Age {student.age}
                          {student.class_name ? ` • Class ${student.class_name}` : ""}
                        </p>
                        {student.phone_number ? <p>Phone {student.phone_number}</p> : null}
                        {student.comment ? <p>{student.comment}</p> : null}
                        <span>Added {new Date(student.created_at).toLocaleString()}</span>
                      </div>

                      <div className="button-row">
                        <button
                          className="button button-secondary"
                          onClick={() => setSelectedStudent(student)}
                          type="button"
                        >
                          View details
                        </button>
                        <button
                          className="button button-secondary"
                          onClick={() => handleEdit(student)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="button button-danger"
                          onClick={() => handleDelete(student.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {activeTab === "all" ? (
            <section className="panel class-browser">
              <section className="teacher-stats-grid">
                <article className="teacher-stat-card">
                  <span>Total students</span>
                  <strong>{allStudents.length}</strong>
                </article>
                <article className="teacher-stat-card">
                  <span>Total classes</span>
                  <strong>{totalAllClasses}</strong>
                </article>
                <article className="teacher-stat-card">
                  <span>Total subjects</span>
                  <strong>{totalAllSubjects}</strong>
                </article>
              </section>

              <div className="class-browser-topbar">
                <div className="class-browser-heading">
                  <span className="eyebrow">All Students</span>
                  <h1>Student Directory</h1>
                  <p>
                    Browse the full collection of student entries in a classroom-style
                    board built with the StudentManager color theme.
                  </p>
                </div>

                <div className="class-browser-actions">
                  <div className="directory-stat">
                    <strong>{allStudents.length}</strong>
                    <span>registered</span>
                  </div>
                </div>
              </div>

              <div className="class-toolbar">
                <label className="toolbar-search">
                  <span className="sr-only">Search students</span>
                  <input
                    className="input"
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by student, subject, class, or teacher"
                    value={searchTerm}
                  />
                </label>

                <label className="toolbar-select">
                  <span>Sort by</span>
                  <select
                    className="input toolbar-native-select"
                    onChange={(event) => setSortBy(event.target.value)}
                    value={sortBy}
                  >
                    <option value="latest">Latest added</option>
                    <option value="name">Student name</option>
                    <option value="subject">Subject</option>
                  </select>
                </label>

                <label className="toolbar-select toolbar-pages">
                  <span>Show</span>
                  <select
                    className="input toolbar-native-select"
                    onChange={(event) => setPerPage(event.target.value)}
                    value={perPage}
                  >
                    <option value="6">6</option>
                    <option value="9">9</option>
                    <option value="12">12</option>
                  </select>
                </label>

                <div className="toolbar-chip">
                  <strong>{filteredStudents.length}</strong>
                  <span>matching</span>
                </div>
              </div>

              {error ? <p className="status error">{error}</p> : null}
              {isAllLoading ? <p className="status">Loading all students...</p> : null}

              {!isAllLoading && filteredStudents.length === 0 ? (
                <p className="empty-state">No student records match your current search.</p>
              ) : null}

              <section className="directory-grid">
                {visibleStudents.map((student, index) => (
                  <article className="directory-card" key={student.id}>
                    <div className={`directory-card-banner accent-${(index % 6) + 1}`}>
                      <span className="directory-avatar">
                        {student.subject.slice(0, 1).toUpperCase()}
                      </span>
                      <button
                        aria-label={`Open details for ${student.name}`}
                        className="directory-dots"
                        onClick={() => setSelectedStudent(student)}
                        type="button"
                      >
                        •••
                      </button>
                    </div>

                    <div className="directory-card-body">
                      <h3>{student.subject}</h3>
                      <p className="directory-student-name">{student.name}</p>
                      <div className="student-chip-row">
                        <span className="meta-chip">
                          {student.created_by_username === teacherName
                            ? "Created by me"
                            : `By ${student.created_by_username ?? "Unknown user"}`}
                        </span>
                        <span className="meta-chip">
                          {new Date(student.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="directory-avatars">
                        <span className="directory-mini-avatar">
                          {(student.created_by_username ?? "U").slice(0, 1).toUpperCase()}
                        </span>
                        <span>{student.created_by_username ?? "Unknown user"}</span>
                      </div>

                      <div className="directory-divider" />

                      <div className="directory-schedule">
                        <span>{student.class_name || "General class"}</span>
                        <strong>Age {student.age}</strong>
                        {student.phone_number ? <p>{student.phone_number}</p> : null}
                        <p>{new Date(student.created_at).toLocaleDateString()}</p>
                      </div>

                      <div className="directory-card-footer">
                        <button
                          className="directory-link-button"
                          onClick={() => setSelectedStudent(student)}
                          type="button"
                        >
                          View Student
                        </button>
                        <button
                          className="button button-secondary directory-action"
                          onClick={() => setSelectedStudent(student)}
                          type="button"
                        >
                          Open Card
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            </section>
          ) : null}
        </section>
      </section>

      {selectedStudent ? (
        <div
          className="overlay"
          onClick={() => setSelectedStudent(null)}
          role="presentation"
        >
          <section
            aria-labelledby="student-details-title"
            aria-modal="true"
            className="overlay-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="overlay-header">
              <div>
                <span className="eyebrow">Student Details</span>
                <h2 id="student-details-title">{selectedStudent.name}</h2>
              </div>
              <button
                aria-label="Close student details"
                className="button button-secondary"
                onClick={() => setSelectedStudent(null)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="overlay-grid">
              <div className="detail-item">
                <span>Subject</span>
                <strong>{selectedStudent.subject}</strong>
              </div>
              <div className="detail-item">
                <span>Age</span>
                <strong>{selectedStudent.age}</strong>
              </div>
              <div className="detail-item">
                <span>Class</span>
                <strong>{selectedStudent.class_name || "Not provided"}</strong>
              </div>
              <div className="detail-item">
                <span>Phone Number</span>
                <strong>{selectedStudent.phone_number || "Not provided"}</strong>
              </div>
              <div className="detail-item">
                <span>Added by</span>
                <strong>{selectedStudent.created_by_username || "Unknown user"}</strong>
              </div>
              <div className="detail-item detail-item-wide">
                <span>Comment</span>
                <strong>{selectedStudent.comment || "No comment added."}</strong>
              </div>
              <div className="detail-item detail-item-wide">
                <span>Created at</span>
                <strong>{new Date(selectedStudent.created_at).toLocaleString()}</strong>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
