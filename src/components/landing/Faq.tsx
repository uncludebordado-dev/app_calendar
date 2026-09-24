"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const FAQS: { q: string; a: string[] }[] = [
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
];

export function Faq() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        fullWidth
        className="tracking-wide"
        aria-expanded={open}
        aria-controls="faq-list"
        onClick={() => setOpen((v) => !v)}
      >
        FAQS
      </Button>

      {open && (
        <div id="faq-list" className="mt-2 space-y-3 text-left">
          {FAQS.map((item) => (
            <section key={item.q} className="card p-4">
              <h2 className="text-sm font-semibold text-piedra-deep">{item.q}</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-piedra">
                {item.a.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
