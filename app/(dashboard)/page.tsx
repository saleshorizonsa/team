export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to the Team Trading commission tracker.
        </p>
      </div>

      {/* KPI cards — Phase 3 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["Total Revenue", "Total Profit", "My Commission", "Open Deals"].map(
          (label) => (
            <div
              key={label}
              className="rounded-xl border bg-card p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">—</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Available after Phase 3
              </p>
            </div>
          )
        )}
      </div>

      {/* Charts placeholder — Phase 3 */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">
          Revenue &amp; Profit chart — Phase 3
        </p>
      </div>
    </div>
  );
}
