export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true">
        <rect x="1" y="1" width="20" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" />
        {[6, 10, 14, 18].map((y) => (
          <line key={y} x1="1" x2="21" y1={y} y2={y} stroke="currentColor" strokeWidth="1" opacity="0.5" />
        ))}
        <rect x="8" y="18" width="6" height="7" fill="var(--color-accent)" />
      </svg>
      <span className="font-display text-[1.15rem] leading-none tracking-tight">
        Vela <span className="text-muted">Residence</span>
      </span>
    </span>
  );
}
