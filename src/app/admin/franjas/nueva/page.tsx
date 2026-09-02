import { SlotForm } from "@/components/admin/SlotForm";
import { todayKey } from "@/lib/date";

export default function NuevaFranjaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Nueva franja</h1>
      <SlotForm mode="create" defaultValues={{ classDate: todayKey(), startTime: "18:00", endTime: "20:00" }} />
    </div>
  );
}
