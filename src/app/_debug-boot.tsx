"use client";

import { useEffect } from "react";

const ENDPOINT = "http://127.0.0.1:7583/ingest/3c7cd91c-4751-48a4-8c56-83b8f52b75f0";
const SESSION = "06c1e7";

function send(payload: Record<string, unknown>) {
  try {
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION },
      body: JSON.stringify({ sessionId: SESSION, timestamp: Date.now(), ...payload }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export default function DebugBoot() {
  useEffect(() => {
    // #region agent log
    send({
      hypothesisId: "A/B/C/E",
      location: "src/app/_debug-boot.tsx:mount",
      message: "RootLayout client booted",
      data: {
        url: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        port: window.location.port,
        userAgent: navigator.userAgent.slice(0, 80),
      },
    });

    const onError = (e: ErrorEvent) => {
      send({
        hypothesisId: "D",
        location: "src/app/_debug-boot.tsx:window.error",
        message: "Uncaught error",
        data: {
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
          stack: e.error?.stack?.slice(0, 600),
        },
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      send({
        hypothesisId: "D",
        location: "src/app/_debug-boot.tsx:unhandledrejection",
        message: "Unhandled promise rejection",
        data: {
          reason: String(e.reason).slice(0, 600),
          stack: (e.reason as Error)?.stack?.slice(0, 600),
        },
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    // #endregion

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
