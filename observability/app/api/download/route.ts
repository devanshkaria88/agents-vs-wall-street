// Workbook download: streams the company's submission workbook so it can be
// saved and uploaded to OpenStocks BY HAND — uploads are manual per the rules
// (RULES.md:55); this endpoint never talks to OpenStocks.
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { COMPANIES, REPO } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const company = req.nextUrl.searchParams.get("company") ?? "";
  // Own-property gate: a plain [company] lookup would resolve prototype keys
  // like "constructor" to truthy values and skip the whitelist branch.
  const meta = Object.hasOwn(COMPANIES, company) ? COMPANIES[company] : undefined;
  if (!meta) {
    return NextResponse.json(
      { error: `unknown company: ${company || "(missing)"}` },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }

  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(path.join(REPO, "submission", meta.file));
  } catch {
    return NextResponse.json(
      { error: `workbook not found: submission/${meta.file}` },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename=${meta.file}`,
      "cache-control": "no-store",
    },
  });
}
