export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-md bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-md bg-slate-200" />
        <div className="h-28 animate-pulse rounded-md bg-slate-200" />
        <div className="h-28 animate-pulse rounded-md bg-slate-200" />
      </div>
    </div>
  );
}
