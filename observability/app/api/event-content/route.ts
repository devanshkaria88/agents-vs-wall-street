// Event drill-down: reconstructs the FULL content behind a feed event from its
// tool input. The corpus is frozen, so re-reading a doc slice or re-running a
// ripgrep query yields exactly what the agent saw — full markdown without
// storing megabytes in the JSONL traces (which keep only a 400-char head).
import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { COMPANIES, REPO } from "@/lib/state";

export const dynamic = "force-dynamic";

const CORPUS = path.resolve(REPO, "challenge", "offline-data");
const SKILLS = path.resolve(REPO, "agent", "skills");
// Same fallback as agent/tools.py — the dev server's PATH may lack homebrew.
const RG = fs.existsSync("/opt/homebrew/bin/rg") ? "/opt/homebrew/bin/rg" : "rg";

type Payload =
  | { kind: "markdown"; title: string; content: string }
  | { kind: "code"; title: string; content: string }
  | { kind: "none" };

function json(payload: Payload, status = 200) {
  return NextResponse.json(payload, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(req: NextRequest) {
  let body: { tool?: string; input?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ kind: "none" }, 400);
  }
  const tool = String(body.tool ?? "");
  const input = body.input ?? {};

  if (tool === "read_doc" && typeof input.path === "string") {
    const abs = path.resolve(REPO, input.path);
    if (!abs.startsWith(CORPUS + path.sep) || !fs.existsSync(abs)) return json({ kind: "none" }, 404);
    const lines = fs.readFileSync(abs, "utf8").split("\n");
    const start = Math.max(Number(input.start_line) || 1, 1);
    const count = Math.min(Number(input.num_lines) || 150, 400);
    const slice = lines.slice(start - 1, start - 1 + count).join("\n");
    return json({
      kind: "markdown",
      title: `${input.path} · lines ${start}–${Math.min(start + count - 1, lines.length)} of ${lines.length}`,
      content: slice,
    });
  }

  if (tool === "load_skill" && typeof input.file === "string") {
    const abs = path.resolve(REPO, input.file);
    if (!abs.startsWith(SKILLS + path.sep) || !fs.existsSync(abs)) return json({ kind: "none" });
    return json({ kind: "markdown", title: input.file, content: fs.readFileSync(abs, "utf8") });
  }

  if (tool === "search_corpus" && typeof input.query === "string") {
    const company = String(input.company ?? "");
    if (!Object.hasOwn(COMPANIES, company)) return json({ kind: "none" }, 404);
    try {
      const out = execFileSync(
        RG,
        ["-i", "-n", "--max-columns", "400", "--max-count", "60", "--", input.query, path.join(CORPUS, company)],
        { timeout: 5000, maxBuffer: 1024 * 1024, encoding: "utf8" },
      );
      const shown = out
        .split("\n")
        .slice(0, 80)
        .map((l) => l.replace(REPO + path.sep, ""))
        .join("\n");
      return json({ kind: "code", title: `rg -i "${input.query}" · ${company}`, content: shown || "NO MATCHES" });
    } catch (e) {
      // rg exits 1 on zero matches; anything else (timeout, bad regex) → none
      const err = e as { status?: number };
      if (err.status === 1) return json({ kind: "code", title: `rg -i "${input.query}" · ${company}`, content: "NO MATCHES" });
      return json({ kind: "none" });
    }
  }

  return json({ kind: "none" });
}
