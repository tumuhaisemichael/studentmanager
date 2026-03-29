"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { getAccessToken, setTokens } from "@/lib/auth";

type RegisterResponse = {
  id: number;
  username: string;
  email: string;
  message: string;
};

type LoginResponse = {
  access: string;
  refresh: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      await apiRequest<RegisterResponse>("/api/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          username,
          email,
          password,
          confirm_password: confirmPassword,
        }),
      });

      const loginResponse = await apiRequest<LoginResponse>("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      setTokens(loginResponse);
      router.replace("/students");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Registration failed.";

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
            <h1>Create your account and set up your teacher workspace.</h1>
            <p className="auth-lead">
              Get a simple space for adding students, keeping classroom notes, and
              reviewing records without the clutter.
            </p>

            <div className="auth-feature-list">
              <article className="auth-feature-card">
                <strong>Create records quickly</strong>
                <p>Add student details, classes, and comments in one flow.</p>
              </article>
              <article className="auth-feature-card">
                <strong>Stay organized</strong>
                <p>Keep your own entries tidy while still being able to view the full list.</p>
              </article>
              <article className="auth-feature-card">
                <strong>Start in minutes</strong>
                <p>Register once and continue straight into your dashboard.</p>
              </article>
            </div>
          </div>
        </aside>

        <section className="auth-card panel">
          <div className="auth-card-copy">
            <span className="auth-kicker">Register</span>
            <h2>Create your account</h2>
            <p>Fill in your details below to open your StudentManager workspace.</p>
          </div>

          <form className="auth-form auth-form-card" onSubmit={handleSubmit}>
            <label>
              Username
              <input
                autoComplete="username"
                className="input"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Choose a username"
                required
                value={username}
              />
            </label>

            <label>
              Email
              <input
                autoComplete="email"
                className="input"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label>
              Password
              <input
                autoComplete="new-password"
                className="input"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                type="password"
                value={password}
              />
            </label>

            <label>
              Confirm password
              <input
                autoComplete="new-password"
                className="input"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                required
                type="password"
                value={confirmPassword}
              />
            </label>

            {error ? <p className="status error">{error}</p> : null}

            <button className="button button-primary auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-switch auth-switch-subtle">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
