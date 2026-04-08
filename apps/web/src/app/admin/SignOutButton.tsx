"use client";

import { useState } from "react";

export default function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = () => {
    setIsSigningOut(true);
    // Full page navigation so the browser applies the set-cookie response
    // from the /logout route handler before rendering /login.
    window.location.href = "/logout";
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
