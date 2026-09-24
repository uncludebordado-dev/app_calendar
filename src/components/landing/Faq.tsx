"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/components/i18n/LangProvider";
import type { Lang } from "@/lib/i18n/config";

type FaqItem = { q: string; a: string[] };

const FAQS: Record<Lang, FaqItem[]> = {
  es: [
    {
      q: "¿Cómo funciona el Clu?",
      a: [
        "Nos reunimos durante dos horas en la tarde para aprender a bordar, desarrollar la creatividad y compartir en red, mientras compartimos una merienda en un espacio seguro, respetuoso y flexible.",
        "No importa si ya sabes bordar o si nunca enhebraste una aguja. Clase a clase irás incorporando nuevos puntos y recibiendo asesoramiento para trabajar en tus proyectos. Cada alumna va a su ritmo, aquí no hay apuro ni días perdidos.",
      ],
    },
    {
      q: "¿Cómo me inscribo?",
      a: [
        "Para reservar tu lugar, es necesario que te registres en la plataforma y selecciones el/los días que quieras venir para asegurar tu lugar en la mesa. Los cupos son súper reducidos! Así que no olvides hacer tu reserva con anticipación antes de venir.",
      ],
    },
    {
      q: "¿Tengo que llevar mis propios materiales?",
      a: [
        "Si tienes materiales propios puedes traerlos, y sino, al inscribirte en tu primer clase podrás reservar un kit con todo lo que necesitas para empezar, te estará esperando en tu primer día listo para que lo estrenes. Hay tres modelos para elegir con distintos valores según la cantidad de materiales que contiene.",
        "En el Clu tenemos un pequeño surtido de hilos de distintos colores y tipos, bastidores en diversos tamaños y más accesorios que podrás adquirir si te falta algo o quieres ampliar tu stock.",
      ],
    },
    {
      q: "¿Cuánto cuestan las clases?",
      a: ["Cada clase tiene un aporte de 10€, se abona el mismo día que asistas en efectivo o por Bizum."],
    },
    {
      q: "¿Cómo cancelo una clase?",
      a: [
        "Si te anotaste en una clase y no puedes asistir, es necesario cancelarla con al menos 24 horas de anticipación para que el cupo quede libre, de lo contrario, se te cobrará la clase como tomada y deberás abonarla la próxima vez que vengas.",
      ],
    },
  ],
  ca: [
    {
      q: "Com funciona el Clu?",
      a: [
        "Ens trobem durant dues hores a la tarda per aprendre a brodar, desenvolupar la creativitat i compartir en xarxa, mentre compartim una berenada en un espai segur, respectuós i flexible.",
        "No importa si ja saps brodar o si mai has enfilat una agulla. Classe a classe aniràs incorporant nous punts i rebent assessorament per treballar en els teus projectes. Cada alumna va al seu ritme, aquí no hi ha pressa ni dies perduts.",
      ],
    },
    {
      q: "Com m'inscric?",
      a: [
        "Per reservar el teu lloc, cal que et registris a la plataforma i triïs el/els dies que vulguis venir per assegurar el teu lloc a la taula. Les places són molt reduïdes! Així que no t'oblidis de fer la reserva amb antelació abans de venir.",
      ],
    },
    {
      q: "He de portar els meus propis materials?",
      a: [
        "Si tens materials propis pots portar-los, i si no, en inscriure't a la teva primera classe podràs reservar un kit amb tot el que necessites per començar; t'esperarà el primer dia a punt perquè l'estrenis. Hi ha tres models per triar, amb diferents valors segons la quantitat de materials que conté.",
        "Al Clu tenim un petit assortiment de fils de diferents colors i tipus, bastidors de diverses mides i més accessoris que podràs adquirir si et falta alguna cosa o vols ampliar el teu estoc.",
      ],
    },
    {
      q: "Quant costen les classes?",
      a: ["Cada classe té una aportació de 10€, que s'abona el mateix dia que assisteixis, en efectiu o per Bizum."],
    },
    {
      q: "Com cancel·lo una classe?",
      a: [
        "Si t'has apuntat a una classe i no pots assistir-hi, cal cancel·lar-la amb almenys 24 hores d'antelació perquè la plaça quedi lliure; si no, se't cobrarà la classe com a feta i l'hauràs d'abonar la propera vegada que vinguis.",
      ],
    },
  ],
};

export function Faq({ ctaClassName = "" }: { ctaClassName?: string }) {
  const { lang, t } = useT();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const items = FAQS[lang];

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        fullWidth
        className={ctaClassName}
        aria-expanded={open}
        aria-controls="faq-list"
        onClick={() => {
          setOpen((v) => !v);
          setCurrent(null);
        }}
      >
        {t("PREGUNTAS FRECUENTES")}
      </Button>

      {open && (
        <div id="faq-list" className="min-h-0 space-y-[1dvh] overflow-y-auto overflow-x-hidden text-left">
          {items.map((item, i) => {
            const expanded = current === i;
            return (
              <section key={item.q} className="card px-3.5 py-[1.2dvh]">
                <h2 className="text-[clamp(12px,1.9dvh,14px)] font-semibold text-piedra-deep">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setCurrent(expanded ? null : i)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span>{item.q}</span>
                    <span aria-hidden className="shrink-0 text-piedra">
                      {expanded ? "−" : "+"}
                    </span>
                  </button>
                </h2>
                {expanded && (
                  <div className="mt-[0.8dvh] space-y-[0.8dvh] text-[clamp(11px,1.7dvh,13px)] leading-snug text-piedra">
                    {item.a.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
