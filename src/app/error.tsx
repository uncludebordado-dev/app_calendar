"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-ladrillo-deep">Algo salió mal</h1>
      <p className="mt-2 text-sm text-piedra">
        Ya estamos al tanto. Podés reintentar o volver al inicio.
      </p>

      <pre className="mt-4 max-h-56 w-full overflow-auto rounded-xl border border-lino bg-white p-3 text-left text-[11px] leading-relaxed text-piedra-deep">
        {error?.message || "Error desconocido"}
        {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
      </pre>

      <div className="mt-5 flex gap-2">
        <button
          onClick={reset}
          className="rounded-xl bg-ladrillo px-4 py-2.5 text-sm font-semibold text-white hover:bg-ladrillo-deep"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-xl border border-lino px-4 py-2.5 text-sm font-semibold text-piedra-deep hover:bg-lino-soft"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
