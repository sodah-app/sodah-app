"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/inbox");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0b0f19",
        color: "white",
        padding: "24px",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "32px",
          borderRadius: "16px",
          background: "#151b29",
          border: "1px solid #293246",
        }}
      >
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "28px",
          }}
        >
          Sign in
        </h1>

        <p
          style={{
            margin: "0 0 24px",
            color: "#9ca3af",
          }}
        >
          Sign in to access your inbox.
        </p>

        <label
          style={{
            display: "block",
            marginBottom: "8px",
          }}
        >
          Email
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            marginBottom: "16px",
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#0f1420",
            color: "white",
          }}
        />

        <label
          style={{
            display: "block",
            marginBottom: "8px",
          }}
        >
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your password"
          required
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            marginBottom: "16px",
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#0f1420",
            color: "white",
          }}
        />

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              borderRadius: "8px",
              background: "#3b1616",
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: "8px",
            background: loading ? "#4b5563" : "#6366f1",
            color: "white",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}