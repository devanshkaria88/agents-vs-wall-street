// Agent configuration API: the dashboard reads and edits agent/config.json —
// the single source of Reader-agent configuration (model, effort, runs, tool
// flags, per-company skill files). GET also lists the skill files on disk and
// a static catalog of the tools the config flags can toggle.
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { REPO } from "@/lib/state";

export const dynamic = "force-dynamic";

const CONFIG_PATH = path.join(REPO, "agent", "config.json");
const SKILLS_DIR = path.join(REPO, "agent", "skills");

const TOOL_CATALOG = [
  { id: "search_corpus", kind: "custom", desc: "ripgrep over the frozen corpus" },
  { id: "read_doc", kind: "custom", desc: "read corpus documents" },
  {
    id: "web_search",
    kind: "server",
    desc: "Anthropic server-side web search (web_search_20260209) — off for the offline final run",
  },
];

interface AgentConfig {
  model: string;
  effort: string;
  runs: number;
  system_prompt_extra: string;
  tools: Record<string, boolean>;
  web_search_max_uses: number;
  skills: Record<string, string[]>;
}

function validateConfig(cfg: unknown): string | null {
  if (typeof cfg !== "object" || cfg === null || Array.isArray(cfg)) return "config must be an object";
  const c = cfg as Record<string, unknown>;
  if (typeof c.model !== "string" || !c.model) return "config.model must be a non-empty string";
  if (typeof c.effort !== "string" || !c.effort) return "config.effort must be a non-empty string";
  if (!Number.isInteger(c.runs) || (c.runs as number) < 1 || (c.runs as number) > 10)
    return "config.runs must be an integer between 1 and 10";
  if (typeof c.system_prompt_extra !== "string") return "config.system_prompt_extra must be a string";
  if (typeof c.tools !== "object" || c.tools === null || Array.isArray(c.tools))
    return "config.tools must be an object of booleans";
  for (const [k, v] of Object.entries(c.tools as Record<string, unknown>)) {
    if (typeof v !== "boolean") return `config.tools.${k} must be a boolean`;
  }
  if (!Number.isInteger(c.web_search_max_uses) || (c.web_search_max_uses as number) < 1)
    return "config.web_search_max_uses must be a positive integer";
  if (typeof c.skills !== "object" || c.skills === null || Array.isArray(c.skills))
    return "config.skills must be an object mapping company -> skill file list";
  for (const [company, files] of Object.entries(c.skills as Record<string, unknown>)) {
    if (!Array.isArray(files) || files.some((f) => typeof f !== "string"))
      return `config.skills.${company} must be an array of file names`;
  }
  return null;
}

export async function GET() {
  let config: AgentConfig | null = null;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    config = null;
  }
  let availableSkills: string[] = [];
  try {
    availableSkills = fs
      .readdirSync(SKILLS_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort();
  } catch {
    availableSkills = [];
  }
  return NextResponse.json(
    { config, availableSkills, toolCatalog: TOOL_CATALOG },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(req: NextRequest) {
  let body: { config?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const err = validateConfig(body.config);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(body.config, null, 2) + "\n");
  return NextResponse.json(
    { ok: true, config: body.config },
    { headers: { "cache-control": "no-store" } },
  );
}
