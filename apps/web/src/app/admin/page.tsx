import { redirect } from "next/navigation";
import { getCurrentAuthSession } from "@/lib/auth-server";
import SignOutButton from "./SignOutButton";

export default async function AdminPage() {
  const authSession = await getCurrentAuthSession();

  if (!authSession?.session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-xl">
        <div className="mb-8 flex flex-col gap-4">
          <h1 className="text-4xl font-semibold">Admin dashboard</h1>
          <p className="text-slate-600">
            Signed in as <span className="font-medium text-slate-900">{authSession.user?.email ?? authSession.session?.user?.email}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <SignOutButton />
          <a href="/" className="rounded-xl border border-slate-200 px-4 py-3 text-slate-700 transition hover:bg-slate-100">
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
