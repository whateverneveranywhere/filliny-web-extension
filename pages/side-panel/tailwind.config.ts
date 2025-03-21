import baseConfig from "@extension/tailwindcss-config";
import { withUI } from "@extension/ui";
import type { Config } from "tailwindcss";

export default withUI({
  ...baseConfig,
  content: ["./src/**/*.{ts,tsx}"],
} as Config);
