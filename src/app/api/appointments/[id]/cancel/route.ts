import { supabase } from "@/lib/supabase";
import { sendCancellationEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Cancel token required" }, { status: 400 });
  }

  // Find appointment by cancel token
  const { data: appointment, error: findError } = await supabase
    .from("appointments")
    .select("*")
    .eq("cancel_token", token)
    .single();

  if (findError || !appointment) {
    return NextResponse.json({ error: "Invalid cancel token" }, { status: 404 });
  }

  if (appointment.status === "cancelled") {
    return NextResponse.json({ message: "Already cancelled" });
  }

  // Update appointment status
  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", appointment.id);

  if (updateError) {
    console.error("Error cancelling appointment:", updateError);
    return NextResponse.json({ error: "Failed to cancel appointment" }, { status: 500 });
  }

  // Get service & stylist names for email
  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", appointment.service_id)
    .single();
  
  const { data: stylist } = await supabase
    .from("stylists")
    .select("*")
    .eq("id", appointment.stylist_id)
    .single();

  sendCancellationEmail({
    clientName: appointment.client_name,
    clientEmail: appointment.client_email,
    serviceName: service?.name || "Your Service",
    stylistName: stylist?.name || "Your Stylist",
    date: appointment.date,
    startTime: appointment.start_time,
  }).catch(console.error);

  return NextResponse.json({ message: "Appointment cancelled" });
}
