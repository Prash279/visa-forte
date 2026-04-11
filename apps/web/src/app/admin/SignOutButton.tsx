"use client";

import { useState } from "react";

export default function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = () => {
    setIsSigningOut(true);
    window.location.href = "/logout";
  };

  return (
    <button
      type="button"
      disabled={isSigningOut}
      onClick={handleSignOut}
      className="font-sans text-[11px] tracking-[0.18em] uppercase text-pearl/60 hover:text-pearl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {isSigningOut ? "Signing out…" : "Sign Out"}
    </button>
  );
}