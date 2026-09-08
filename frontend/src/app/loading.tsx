import { Spinner } from "@/ui/Spinner";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-border bg-surface shadow-md">
        <span className="text-3xl animate-bounce">🏟️</span>
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Spinner className="h-4 w-4" />
        <span>Loading FieldCast…</span>
      </div>
    </div>
  );
}
