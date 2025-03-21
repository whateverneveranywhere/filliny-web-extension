import baseConfig from "@extension/tailwindcss-config";
import { withUI } from "@extension/ui";
import type { Config } from "tailwindcss";

export default withUI({
  ...baseConfig,
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
} as Config);
