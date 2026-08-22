import { cn } from "@/lib/utils"

function Skeleton(/** @type {any} */ {
  className,
  ...props
}) {
  return (
    (<div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props} />)
  );
}

export { Skeleton }
