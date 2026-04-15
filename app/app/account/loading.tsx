export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="animate-pulse space-y-6">
        <div className="h-7 w-48 rounded-md bg-muted/60" />
        <div className="h-4 w-64 rounded-md bg-muted/40" />
        <div
          className="h-56 rounded-[22px] border border-border/50 shadow-soft dark:shadow-soft-dark"
          style={{ backgroundColor: "hsl(var(--card))" }}
        />
      </div>
    </div>
  );
}
