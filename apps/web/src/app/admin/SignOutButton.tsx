"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    router.push("/logout");
  };

  return (
    <button
      type="button"
      disabled={isSigningOut}
      onClick={handleSignOut}
      className="rounded-xl bg-rose-600 px-4 py-3 text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
