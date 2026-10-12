"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
    if (process.env.NODE_ENV === "development") console.error("Global error:", error);
  }, [error]);
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 26 }}>アプリを表示できませんでした</h1>
          <p style={{ maxWidth: 480, lineHeight: 1.8 }}>予期しないエラーが発生しました。再試行するか、ホームに戻ってください。</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 20 }}>
            <button type="button" onClick={() => reset()} style={{ background: "#0284c7", color: "white", padding: "12px 20px", border: 0, borderRadius: 10, cursor: "pointer" }}>もう一度試す</button>
            <a href="/" style={{ color: "#0369a1", padding: "12px 20px" }}>ホームに戻る</a>
          </div>
        </main>
      </body>
    </html>
  );
}
