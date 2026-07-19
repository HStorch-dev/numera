"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

type Mode = "login" | "register";

type ApiError = {
  message?: string | string[];
};

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    const body =
      mode === "login"
        ? {
            email: formData.get("email"),
            password: formData.get("password"),
          }
        : {
            email: formData.get("email"),
            password: formData.get("password"),
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
          };

    try {
      const response = await fetch(
        `/api/auth/${mode}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const data = (await response.json()) as ApiError;

      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message[0]
          : data.message;

        setError(message ?? "הפעולה לא הצליחה.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(
        "לא ניתן להתחבר לשרת. ודאי שה־API פועל.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.glowOne} />
      <div className={styles.glowTwo} />

      <section className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>N</div>

          <div>
            <strong>NUMERA</strong>
            <span>FINANCIAL INTELLIGENCE</span>
          </div>
        </div>

        <div className={styles.heading}>
          <span>מרכז שליטה פיננסי</span>

          <h1>
            {mode === "login"
              ? "ברוכה הבאה"
              : "מתחילים לנהל חכם"}
          </h1>

          <p>
            {mode === "login"
              ? "התחברי כדי להמשיך למערכת."
              : "צרי חשבון חדש והתחילי לנהל את העסק."}
          </p>
        </div>

        <div className={styles.switcher}>
          <button
            type="button"
            className={
              mode === "login" ? styles.active : ""
            }
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            התחברות
          </button>

          <button
            type="button"
            className={
              mode === "register" ? styles.active : ""
            }
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            יצירת חשבון
          </button>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit}
        >
          {mode === "register" && (
            <div className={styles.nameGrid}>
              <label>
                <span>שם פרטי</span>
                <input
                  name="firstName"
                  autoComplete="given-name"
                  placeholder="הניה"
                />
              </label>

              <label>
                <span>שם משפחה</span>
                <input
                  name="lastName"
                  autoComplete="family-name"
                  placeholder="שטורך"
                />
              </label>
            </div>
          )}

          <label>
            <span>כתובת אימייל</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
            />
          </label>

          <label>
            <span>סיסמה</span>
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              required
              minLength={8}
              placeholder="לפחות 8 תווים"
            />
          </label>

          {error && (
            <p className={styles.error}>{error}</p>
          )}

          <button
            className={styles.submit}
            type="submit"
            disabled={loading}
          >
            {loading
              ? "מתחברת..."
              : mode === "login"
                ? "כניסה למערכת"
                : "יצירת החשבון"}
          </button>
        </form>

        <p className={styles.security}>
          הטוקן נשמר בעוגיית HttpOnly ואינו נגיש
          לקוד בדפדפן.
        </p>
      </section>

      <section className={styles.visual}>
        <div className={styles.orbit} />

        <div className={styles.core}>
          <div className={styles.coreLogo}>N</div>
          <strong>העסק שלך, בזמן אמת</strong>
          <span>לקוחות · חשבוניות · תשלומים</span>
        </div>

        <div className={`${styles.floatCard} ${styles.income}`}>
          <span>הכנסות</span>
          <strong>נתונים חיים</strong>
        </div>

        <div className={`${styles.floatCard} ${styles.ai}`}>
          <span>NUMERA AI</span>
          <strong>תובנות חכמות</strong>
        </div>
      </section>
    </main>
  );
}