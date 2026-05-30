export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Team Trading</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>
        {/* Login form — Phase 1 */}
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Login form — Phase 1
        </div>
      </div>
    </div>
  );
}
