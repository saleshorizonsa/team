import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./_components/login-form";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: `Sign In — ${APP_NAME}` };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Brand mark */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
          <span className="text-xl font-bold text-primary-foreground">T</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-slate-400">Commission Tracker</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/50 bg-slate-800/60 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-400">Sign in to your account to continue</p>
        </div>
        <LoginForm />
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Account access is managed by your admin.
      </p>
    </div>
  );
}
