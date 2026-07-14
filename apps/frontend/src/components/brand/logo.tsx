import { cn } from '@/lib/utils';

interface LogoMarkProps {
  className?: string;
}

/** MetaLayer symbol — three diagonal rounded bars and a dot. */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 906 506"
      role="img"
      aria-label="MetaLayer"
      className={cn('h-6 w-6', className)}
      fill="none"
    >
      <g stroke="currentColor" strokeWidth={150} strokeLinecap="round">
        <path d="M315.9 90.3 90.8 411.7" />
        <path d="M555.7 93.2 330.6 414.6" />
        <path d="M796.5 93.1 571.4 414.5" />
      </g>
      <circle cx="815.2" cy="408.3" r="75" fill="currentColor" />
    </svg>
  );
}

export function LogoWordmark({ className }: LogoMarkProps) {
  return (
    <div className={cn('flex items-center gap-2.5 text-foreground', className)}>
      <LogoMark className="h-7 w-7 text-current" />
      <span className="text-[15px] tracking-tight text-current">
        <span className="font-semibold">Meta</span>
        <span className="font-normal">Layer</span>
      </span>
    </div>
  );
}
