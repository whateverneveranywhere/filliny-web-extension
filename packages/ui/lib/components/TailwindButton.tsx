import { cn } from "../utils";
import type { ComponentPropsWithoutRef } from "react";

export type TWButtonProps = {
  theme?: "light" | "dark";
} & ComponentPropsWithoutRef<"button">;

export function TailwindButton({ theme, className, children, ...props }: TWButtonProps) {
  return (
    <button
      className={cn(
        className,
        "filliny-py-1 filliny-px-4 filliny-rounded filliny-shadow hover:filliny-scale-105",
        theme === "light" ? "filliny-bg-white filliny-text-black" : "filliny-bg-black filliny-text-white",
      )}
      {...props}>
      {children}
    </button>
  );
}
