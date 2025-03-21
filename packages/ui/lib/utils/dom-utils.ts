import { useEffect, useState } from "react";

export const useDOMReady = () => {
  const [isDOMReady, setIsDOMReady] = useState(false);

  useEffect(() => {
    const handleLoad = () => setIsDOMReady(true);
    const handleUnload = () => setIsDOMReady(false);

    if (document.readyState === "complete") {
      setIsDOMReady(true);
    } else {
      window.addEventListener("load", handleLoad);
      window.addEventListener("beforeunload", handleUnload);
    }

    return () => {
      window.removeEventListener("load", handleLoad);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  return isDOMReady;
};
