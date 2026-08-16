import { NextRequest, NextResponse } from "next/server";
import { assemble } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const company = req.nextUrl.searchParams.get("company") ?? "hays";
  return NextResponse.json(assemble(company), {
    headers: { "cache-control": "no-store" },
  });
}
