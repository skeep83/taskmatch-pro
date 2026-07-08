import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { getAdvancedErrorLogger } from './utils/advancedErrorLogger'

declare const __BUILD_TIME__: string;
// eslint-disable-next-line no-console
console.info(`ServiceHub build: ${typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev'}`);

const pathname = window.location.pathname;
const routerBase = import.meta.env.BASE_URL || "/";
const isSubpathDeployment = routerBase !== "/";
const isAuthOnlyEntry = !isSubpathDeployment && (pathname === "/auth" || pathname.endsWith("/auth"));

const loadApp = async () => {
  const mod = isAuthOnlyEntry ? await import("./AuthEntry") : await import("./App");
  return mod.default;
};

loadApp().then((AppComponent) => {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <AppComponent />
    </React.StrictMode>
  );

  queueMicrotask(() => {
    try {
      getAdvancedErrorLogger();
    } catch (error) {
      console.warn('Advanced error logger init skipped:', error);
    }
  });
});
