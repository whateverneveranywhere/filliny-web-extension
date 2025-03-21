import baseConfig from "@extension/tailwindcss-config";
import { withUI } from "@extension/ui";

export default withUI({
  ...baseConfig,
  // content: ['./src/**/*.{ts,tsx}', '../../packages/ui/lib/**/*.{ts,tsx}'],
  content: ["./src/**/*.{ts,tsx}"],
});
