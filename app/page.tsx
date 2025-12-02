"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

type AuthMode = "login" | "register";

export default function HomePage() {
  const router = useRouter();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // If already logged in, go straight to /discover
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("mp_sessionToken");
    const user = window.localStorage.getItem("mp_username");
    if (token && user) {
      router.replace("/discover");
    }
  }, [router]);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setInfoMessage(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setAuthError("Username and password are required.");
      return;
    }

    try {
      setAuthLoading(true);

      const path =
        authMode === "login" ? "/auth/login" : "/auth/register";

      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: trimmedUser,
          password: trimmedPass
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAuthError(
          data?.error ||
            (authMode === "login"
              ? "Login failed"
              : "Registration failed")
        );
        return;
      }

      if (authMode === "register") {
        // After register, switch to login mode
        setAuthMode("login");
        setInfoMessage("Account created. Please log in.");
        return;
      }

      // Login success — expect { sessionToken }
      if (!data.sessionToken) {
        setAuthError("No session token returned from server.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("mp_sessionToken", data.sessionToken);
        window.localStorage.setItem("mp_username", trimmedUser);
      }

      // Go to discover page
      router.push("/discover");
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message ?? "Auth error");
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2f2f2f] bg-[#151515] p-6 shadow-2xl shadow-black/50">
        <div className="mb-4 flex items-center gap-2 justify-center">
          <div className="rounded bg-[#f5c518] px-2 py-1 text-xl font-bold text-black">
            MP
          </div>
          <span className="text-lg font-semibold tracking-wide">
            Movie Planner
          </span>
        </div>

        <h1 className="mb-1 text-center text-xl font-semibold text-white">
          {authMode === "login" ? "Log in" : "Create an account"}
        </h1>
        <p className="mb-4 text-center text-xs text-gray-400">
          Track movies you&apos;ve watched and plan to watch. Each account
          has its own list.
        </p>

        {authError && (
          <div className="mb-3 rounded border border-red-500 bg-red-900/30 px-3 py-2 text-xs text-red-200">
            {authError}
          </div>
        )}
        {infoMessage && (
          <div className="mb-3 rounded border border-green-500 bg-green-900/30 px-3 py-2 text-xs text-green-200">
            {infoMessage}
          </div>
        )}

        <form className="space-y-3" onSubmit={handleAuthSubmit}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Username
            </label>
            <input
              className="mt-1 w-full rounded bg-[#1f1f1f] px-3 py-2 text-sm text-white outline-none ring-[#f5c518]/40 placeholder:text-gray-500 focus:ring-2"
              placeholder="myusername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Password
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded bg-[#1f1f1f] px-3 py-2 text-sm text-white outline-none ring-[#f5c518]/40 placeholder:text-gray-500 focus:ring-2"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                authMode === "login"
                  ? "current-password"
                  : "new-password"
              }
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="mt-2 inline-flex w-full items-center justify-center rounded bg-[#f5c518] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#e0b214] disabled:opacity-60"
          >
            {authLoading
              ? authMode === "login"
                ? "Logging in..."
                : "Registering..."
              : authMode === "login"
              ? "Log in"
              : "Register"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            className="text-xs text-[#f5c518] hover:underline"
            onClick={() =>
              setAuthMode(authMode === "login" ? "register" : "login")
            }
          >
            {authMode === "login"
              ? "Need an account? Create one"
              : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}





