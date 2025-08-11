"use client";

import { useState } from "react";
import { login, register, me, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";


export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();


  async function fetchMe() {
    try {
      const u = await me();
      setUser(u);
      setMsg(`Hello, ${u.username}!`);
    } catch (e: any) {
      setMsg(e.message || "Failed to fetch current user");
    }
  }

  async function onLogin(formData: FormData) {
    setLoading(true);
    setMsg(null);
    try {
      const username = String(formData.get("username") || "");
      const password = String(formData.get("password") || "");
      await login(username, password);
      await fetchMe();
      router.push("/"); 
    } catch (e: any) {
      setMsg(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(formData: FormData) {
    setLoading(true);
    setMsg(null);
    try {
      const payload = {
        username: String(formData.get("username") || ""),
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
        first_name: String(formData.get("first_name") || ""),
        last_name: String(formData.get("last_name") || ""),
        profile_img: String(formData.get("profile_img") || ""),
      };
      await register(payload);
      await fetchMe();
      router.push("/"); 
    } catch (e: any) {
      setMsg(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    setLoading(true);
    setMsg(null);
    try {
      await logout();
      setUser(null);
      setMsg("Logged out");
    } catch (e: any) {
      setMsg(e.message || "Logout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        {mode === "login" ? "Log in" : "Create an account"}
      </h1>

      {msg && <p className="rounded-md border p-3 text-sm">{msg}</p>}

      {mode === "login" ? (
        <form action={onLogin} className="space-y-3 border rounded-md p-4">
          <label className="block">
            <span className="text-sm">Username</span>
            <input name="username" className="w-full border rounded p-2" required />
          </label>
          <label className="block">
            <span className="text-sm">Password</span>
            <input type="password" name="password" className="w-full border rounded p-2" required />
          </label>
          <button disabled={loading} className="w-full rounded-md border px-3 py-2">
            {loading ? "Working..." : "Log in"}
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className="text-sm underline"
          >
            Need an account? Register
          </button>
        </form>
      ) : (
        <form action={onRegister} className="space-y-3 border rounded-md p-4">
          <label className="block">
            <span className="text-sm">Username</span>
            <input name="username" className="w-full border rounded p-2" required />
          </label>
          <label className="block">
            <span className="text-sm">Email</span>
            <input type="email" name="email" className="w-full border rounded p-2" required />
          </label>
          <label className="block">
            <span className="text-sm">Password</span>
            <input type="password" name="password" className="w-full border rounded p-2" required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm">First name</span>
              <input name="first_name" className="w-full border rounded p-2" />
            </label>
            <label className="block">
              <span className="text-sm">Last name</span>
              <input name="last_name" className="w-full border rounded p-2" />
            </label>
          </div>
          <label className="block">
            <span className="text-sm">Profile image URL</span>
            <input name="profile_img" className="w-full border rounded p-2" />
          </label>

          <button disabled={loading} className="w-full rounded-md border px-3 py-2">
            {loading ? "Working..." : "Register"}
          </button>
          <button
            type="button"
            onClick={() => setMode("login")}
            className="text-sm underline"
          >
            Already have an account? Log in
          </button>
        </form>
      )}

      {user && (
        <section className="border rounded-md p-4 space-y-2">
          <h2 className="font-medium">Current user</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
          <button
            disabled={loading}
            onClick={onLogout}
            className="w-full rounded-md border px-3 py-2"
          >
            {loading ? "Working..." : "Log out"}
          </button>
        </section>
      )}
    </main>
  );
}
