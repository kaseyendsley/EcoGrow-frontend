"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logout, getToken, me } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = getToken();
    setAuthed(!!token);
  }, [pathname]); // re-check on route change

  async function onLogout() {
    await logout();
    setAuthed(false);
    router.push("/login");
  }

  // Show nothing on the login page (no navbar while unauthenticated)
  if (pathname === "/login") return null;

  // Only show the bar if we’re authenticated
  if (!authed) return null;

  return (
    <nav className="w-full border-b bg-white">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-medium">EcoGrow</Link>
        <div className="flex items-center gap-4">
          <Link href="/quests" className="px-3 py-2 rounded-xl hover:bg-gray-100">All Quests</Link>
          <Link href="/my-quests" className="px-3 py-2 rounded-xl hover:bg-gray-100"> My Quests</Link>
          <Link href="/profile" className="px-3 py-2 rounded-xl hover:bg-gray-100"> Profile</Link>
          <button
            onClick={onLogout}
            className="rounded-md border px-3 py-1 text-sm"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
