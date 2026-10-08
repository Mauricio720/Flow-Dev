const DOT_DELAYS = ["[animation-delay:0ms]", "[animation-delay:180ms]", "[animation-delay:360ms]"];

export function WorkingIndicator({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-2.5 text-sm text-ink-2">
      <span aria-hidden="true" className="flex shrink-0 gap-1">{DOT_DELAYS.map((delay) => <span key={delay} className={`node-running size-1.5 rounded-full bg-ink ${delay}`} />)}</span>
      {label}
    </p>
  );
}
