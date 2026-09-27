/** Stand-in for screens that arrive in a later build phase. */
export function Placeholder({ title, phase, children }: { title: string; phase: string; children?: React.ReactNode }) {
  return (
    <section className="card">
      <div className="label">{title}</div>
      <p className="mt-2 font-serif text-xl italic text-muted">Coming in {phase}.</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </section>
  );
}
