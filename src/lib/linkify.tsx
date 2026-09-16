import type { ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s<>"]+)/g;

/**
 * Convierte URLs sueltas en un texto plano en links clicables, sin usar HTML
 * crudo (nada de dangerouslySetInnerHTML): sirve para pegar un link de Google
 * Maps u otro sitio dentro de una News.
 */
export function linkify(text: string): ReactNode[] {
  const parts = text.split(URL_RE);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // Los índices impares son lo que capturó el grupo (las URLs).
      const href = part.replace(/[).,;:!?]+$/, "");
      const trail = part.slice(href.length);
      return (
        <span key={i}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ladrillo-deep underline"
          >
            {href}
          </a>
          {trail}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
