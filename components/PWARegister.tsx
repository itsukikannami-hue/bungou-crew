"use client";

import { useEffect } from "react";

/** Register only in production; no page or user-data caching. */
export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("Service Worker registration failed:", error);
    });
  }, []);
  return null;
}
