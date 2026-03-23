import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[1rem] border border-white/70 bg-[linear-gradient(110deg,rgba(255,255,255,0.72),rgba(243,239,255,0.96),rgba(255,255,255,0.72))] bg-[length:200%_100%] shadow-[0_10px_30px_rgba(125,104,196,0.08)]',
        className,
      )}
    />
  );
}
