import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type LoadingProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

function Loading({ className, size = "md" }: LoadingProps) {
  const sizeClasses = {
    sm: "filliny-size-4",
    md: "filliny-size-5",
    lg: "filliny-size-6",
    xl: "filliny-size-8",
  };

  return (
    <div className="filliny-m-auto filliny-flex filliny-size-full filliny-items-center filliny-justify-center">
      <Loader2 className={cn("filliny-animate-spin", sizeClasses[size], className)} />
    </div>
  );
}

export { Loading };
