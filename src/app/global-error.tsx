"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#FBF8F3",
          color: "#566567",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <h1 style={{ color: "#B9552F", fontSize: 18 }}>Algo salió mal</h1>
          <pre
            style={{
              textAlign: "left",
              fontSize: 11,
              background: "#fff",
              border: "1px solid #DFD7CC",
              borderRadius: 12,
              padding: 12,
              overflow: "auto",
              maxHeight: 220,
            }}
          >
            {error?.message || "Error desconocido"}
            {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              background: "#D9704A",
              color: "#fff",
              border: 0,
              borderRadius: 12,
              padding: "10px 16px",
              fontWeight: 600,
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
