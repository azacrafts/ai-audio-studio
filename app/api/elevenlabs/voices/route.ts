import { NextResponse } from "next/server";
import { getVoices } from "@/lib/ai/elevenlabs";

export async function GET() {
  try {
    const voices = await getVoices();
    return NextResponse.json({ voices });
  } catch (err) {
    console.error("[/api/elevenlabs/voices]", err);
    return NextResponse.json({ error: "Failed to load voices" }, { status: 500 });
  }
}
