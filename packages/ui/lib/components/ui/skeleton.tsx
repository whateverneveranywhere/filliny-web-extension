import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("filliny-animate-pulse filliny-rounded-md filliny-bg-muted", className)} {...props} />;
}

export { Skeleton };
