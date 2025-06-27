import inlineCss from "../../../dist/example/index.css?inline";
import { initAppWithShadow } from "@extension/shared";
import App from "@src/matches/example/App";

initAppWithShadow({ id: "chrome-extension-filliny-runtime-example", app: <App />, inlineCss });
