"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { logout, getToken } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const [authed, setAuthed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Re-check auth on route change
  useEffect(() => {
    const token = getToken();
    setAuthed(!!token);
    // close the mobile menu when navigating
    setMobileOpen(false);
  }, [pathname]);

  async function onLogout() {
    await logout();
    setAuthed(false);
    setMobileOpen(false);
    router.push("/login");
  }

  // Hide on login route or when not authed
  if (pathname === "/login" || !authed) return null;

  return (
    <nav className="w-full border-b bg-white sticky top-0 z-40">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
        {/* Left: logo → home */}
        <Link href="/" className="flex items-center gap-2" aria-label="Go to home">
          <Image
            src="/ecogrow.png"
            alt="EcoGrow"
            width={50}
            height={50}
            className="rounded-md"
            priority
          />
          <span className="sr-only">EcoGrow</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          <Link href="/quests" className="px-3 py-2 rounded-xl hover:bg-gray-100">
            All Quests
          </Link>
          <Link href="/my-quests" className="px-3 py-2 rounded-xl hover:bg-gray-100">
            My Quests
          </Link>
          <Link href="/profile" className="px-3 py-2 rounded-xl hover:bg-gray-100">
            Profile
          </Link>
          <button
            onClick={onLogout}
            className="ml-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Log out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden p-2 rounded-xl hover:bg-gray-100"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className="text-xl leading-none">{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden border-t bg-white">
          <div className="mx-auto max-w-4xl px-4 py-2 flex flex-col gap-1">
            <Link
              href="/"
              className="block px-3 py-2 rounded-xl hover:bg-gray-100"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/quests"
              className="block px-3 py-2 rounded-xl hover:bg-gray-100"
              onClick={() => setMobileOpen(false)}
            >
              All Quests
            </Link>
            <Link
              href="/my-quests"
              className="block px-3 py-2 rounded-xl hover:bg-gray-100"
              onClick={() => setMobileOpen(false)}
            >
              My Quests
            </Link>
            <Link
              href="/profile"
              className="block px-3 py-2 rounded-xl hover:bg-gray-100"
              onClick={() => setMobileOpen(false)}
            >
              Profile
            </Link>
            <button
              onClick={onLogout}
              className="mt-1 block w-full text-left px-3 py-2 rounded-xl border hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
