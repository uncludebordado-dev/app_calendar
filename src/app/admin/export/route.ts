import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { parseMonthParam, monthRange } from "@/lib/calendar";
import { todayKey, MONTH_NAMES_ES } from "@/lib/date";
import { formatPhoneForDisplay } from "@/lib/phone";
import type { StudentOverviewRow } from "@/types/database.types";

export const dynamic = "force-dynamic";

/** CSV separado por ";" con BOM para que Excel lo abra bien en español. */
function csv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("No autorizado", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const { year, month } = parseMonthParam(searchParams.get("mes") ?? undefined, todayKey());
  const { from, to } = monthRange(year, month);

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_students_overview", { p_from: from, p_to: to });
  const students = (data ?? []) as StudentOverviewRow[];

  const rows: (string | number)[][] = [
    [`un clu de bordado — ${MONTH_NAMES_ES[month]} ${year}`],
    [],
    ["Alumna", "Email", "Teléfono", "Fecha clase", "Hora", "Asistió", "Pagó", "Monto (€)"],
  ];

  let asistencias = 0;
  let inasistencias = 0;
  let recaudado = 0;

  for (const s of students) {
    if (s.bookings.length === 0) {
      rows.push([s.full_name, s.email, formatPhoneForDisplay(s.phone_e164), "—", "—", "—", "—", ""]);
      continue;
    }
    for (const b of s.bookings) {
      const asistio = b.attended === true ? "Sí" : b.attended === false || b.no_show ? "No" : "—";
      if (b.attended === true) asistencias++;
      if (b.attended === false || b.no_show) inasistencias++;
      if (b.paid && b.amount) recaudado += Number(b.amount);
      rows.push([
        s.full_name,
        s.email,
        formatPhoneForDisplay(s.phone_e164),
        b.class_date,
        b.start_time,
        asistio,
        b.paid ? "Sí" : "No",
        b.amount != null ? Number(b.amount) : "",
      ]);
    }
  }

  rows.push([]);
  rows.push(["TOTALES"]);
  rows.push(["Asistencias", asistencias]);
  rows.push(["Inasistencias", inasistencias]);
  rows.push(["Dinero recaudado (€)", recaudado]);
  rows.push(["Alumnas registradas", students.length]);

  const body = csv(rows);
  const filename = `clu-bordado_${year}-${String(month + 1).padStart(2, "0")}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
