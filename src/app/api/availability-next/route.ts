import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { apiSuccess } from "@/lib/apiResponse";
import { getAvailableSlots } from "@/lib/availability";

export async function GET() {
  if (!hasSupabaseConfig) return apiSuccess({ nextSlot: null });

  // Find the first available slot in the next 14 days across all stylists
  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration")
    .eq("active", true)
    .order("sort_order")
    .limit(1);

  const { data: stylists } = await supabase
    .from("stylists")
    .select("id")
    .eq("active", true);

  if (!services?.length || !stylists?.length) return apiSuccess({ nextSlot: null });

  const serviceId = services[0].id;
  const today = new Date();

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    for (const stylist of stylists) {
      try {
        const slots = await getAvailableSlots(stylist.id, serviceId, dateStr);
        if (slots.length > 0) {
          return apiSuccess({
            nextSlot: { date: dateStr, time: slots[0] },
          });
        }
      } catch {
        // ignore errors for this stylist and continue
      }
    }
  }

  return apiSuccess({ nextSlot: null });
}
