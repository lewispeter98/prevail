"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="card mt-10">
      <div className="label">Something went wrong</div>
      <p className="mt-2 text-sm text-muted">{error.message || "Prevail couldn't load this screen."}</p>
      <button className="btn mt-4" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
