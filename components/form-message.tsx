export function FormMessage({ message, error }: { message?: string; error?: string }) {
  if (!message && !error) {
    return null;
  }

  return (
    <p className={`rounded-md px-3 py-2 text-sm ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
      {error ?? message}
    </p>
  );
}
