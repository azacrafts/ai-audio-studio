import { PRESETS } from "@/constants/presets";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ presets: PRESETS });
}
