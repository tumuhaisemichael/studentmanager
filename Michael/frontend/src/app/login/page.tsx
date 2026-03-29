"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { getAccessToken, setTokens } from "@/lib/auth";

type LoginResponse = {
  access: string;
  refresh: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/students");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await apiRequest<LoginResponse>("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      setTokens(response);
      router.replace("/students");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Login failed.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-layout">
        <aside className="auth-showcase">
          <div className="auth-showcase-inner">
            <span className="eyebrow">StudentManager</span>
            <h1>Welcome back to your student workspace.</h1>
            <p className="auth-lead">
              Keep student records organized, review entries quickly, and stay on top
              of your class data from one calm, focused dashboard.
            </p>

            <div className="auth-feature-list">
              <article className="auth-feature-card">
                <strong>Track every record</strong>
                <p>View all students, comments, classes, and courses in one place.</p>
              </article>
              <article className="auth-feature-card">
                <strong>Designed for daily use</strong>
                <p>Simple workflows make adding and reviewing student information easy.</p>
              </article>
              <article className="auth-feature-card">
                <strong>Fast access</strong>
                <p>Sign in and continue exactly where you left off.</p>
              </article>
            </div>
          </div>
        </aside>

        <section className="auth-card panel">
          <div className="auth-card-copy">
            <span className="auth-kicker">Sign in</span>
            <h2>Access your account</h2>
            <p>
              Enter your details below to continue to your student management
              dashboard.
            </p>
          </div>

          <form className="auth-form auth-form-card" onSubmit={handleSubmit}>
            <label>
              Username
              <input
                autoComplete="username"
                className="input"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                required
                value={username}
              />
            </label>

            <label>
              Password
              <input
                autoComplete="current-password"
                className="input"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                type="password"
                value={password}
              />
            </label>

            {error ? <p className="status error">{error}</p> : null}

            <button className="button button-primary auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="auth-switch auth-switch-subtle">
            Don&apos;t have an account yet? <Link href="/register">Create one</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
