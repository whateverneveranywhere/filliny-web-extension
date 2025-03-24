import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

// WebappEnvs enum definition
enum WebappEnvs {
  DEV = "dev",
  PREVIEW = "preview",
  PROD = "prod",
}

// Get environment from process.env
const envFromEnv = process.env.VITE_WEBAPP_ENV || "";
console.log(`[manifest.ts] Environment from VITE_WEBAPP_ENV: "${envFromEnv}"`);

// Use the environment if it's valid, otherwise default to DEV
const env = Object.values(WebappEnvs).includes(envFromEnv as WebappEnvs) ? (envFromEnv as WebappEnvs) : WebappEnvs.DEV;

console.log(`[manifest.ts] Using environment for extension name: "${env}"`);
console.log(
  `[manifest.ts] Extension name will be: ${env === WebappEnvs.PROD ? "Filliny" : `Filliny ${env.toUpperCase()}`}`,
);

// Get the appropriate extension name message key based on the environment
const getExtensionNameKey = (environment: WebappEnvs): string => {
  switch (environment) {
    case WebappEnvs.DEV:
      return "__MSG_extensionNameDev__";
    case WebappEnvs.PREVIEW:
      return "__MSG_extensionNamePreview__";
    case WebappEnvs.PROD:
      return "__MSG_extensionNameProd__";
    default:
      // Default to DEV naming if an unknown environment is provided
      console.warn(`Unknown environment: ${environment}, using DEV extension name`);
      return "__MSG_extensionNameDev__";
  }
};

/**
 * @prop default_locale
 * if you want to support multiple languages, you can use the following reference
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
 *
 * @prop browser_specific_settings
 * Must be unique to your extension to upload to addons.mozilla.org
 * (you can delete if you only want a chrome extension)
 *
 * @prop permissions
 * Firefox doesn't support sidePanel (It will be deleted in manifest parser)
 */
const manifest = {
  manifest_version: 3,
  default_locale: "en",
  name: getExtensionNameKey(env),
  browser_specific_settings: {
    gecko: {
      id: "example@example.com",
      strict_min_version: "109.0",
    },
  },
  version: packageJson.version,
  description: "__MSG_extensionDescription__",
  host_permissions: ["<all_urls>"],
  permissions: ["storage", "tabs", "notifications", "sidePanel", "cookies"],
  background: {
    service_worker: "background.js",
    type: "module",
  },
  action: {
    default_popup: "popup/index.html",
    default_icon: "icon-34.png",
  },
  icons: {
    128: "icon-128.png",
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*", "<all_urls>"],
      js: ["content/index.iife.js"],
    },
    {
      matches: ["http://*/*", "https://*/*", "<all_urls>"],
      js: ["content-runtime/index.iife.js"],
    },
    {
      matches: ["http://*/*", "https://*/*", "<all_urls>"],
      css: ["content.css"],
    },
  ],
  web_accessible_resources: [
    {
      resources: ["*.js", "*.css", "*.svg", "icon-128.png", "icon-34.png"],
      matches: ["*://*/*"],
    },
  ],
  side_panel: {
    default_path: "side-panel/index.html",
  },
} satisfies chrome.runtime.ManifestV3;

export default manifest;
