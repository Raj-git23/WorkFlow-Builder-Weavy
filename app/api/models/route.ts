import { NextResponse } from "next/server";
import { MODELS } from "@/lib/constant";

export async function GET() {
  return NextResponse.json({ models: MODELS });
}
