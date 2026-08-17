import { cn } from '@/lib/utils'

/**
 * A skeleton exists for one reason: to hold the exact space the real content
 * will take, so nothing jumps when it arrives (doc 10 §8.7). Sizing it
 * differently from the content it stands in for defeats the purpose.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn('animate-pulse rounded-md bg-zinc-200', className)}
      {...props}
    />
  )
}

export { Skeleton }
