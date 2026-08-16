import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const entryPath = path.resolve(root, process.argv[2] ?? "entry.json");
const MAX_ENTRY_FILE_BYTES = 64 * 1024;

let entry;
try {
  const entryBuffer = await fs.readFile(entryPath);
  if (entryBuffer.byteLength > MAX_ENTRY_FILE_BYTES) {
    console.error("FAIL entry.json: file must be no larger than 64 KB");
    process.exit(1);
  }
  entry = JSON.parse(entryBuffer.toString("utf8"));
} catch (error) {
  if (error.code === "ENOENT") {
    console.error("FAIL entry.json: file is missing; run npm run setup:entry first");
  } else {
    console.error(`FAIL entry.json: ${error.message}`);
  }
  process.exit(1);
}

if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
  console.error("FAIL entry.json: file must contain one JSON object");
  process.exit(1);
}

let failed = false;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_AGENT_NAME_LENGTH = 160;
const MAX_URL_LENGTH = 2_048;
const MAX_DESCRIPTION_LENGTH = 320;
const MAX_LIST_ITEM_LENGTH = 160;
const MAX_LIST_ITEMS = 30;
const MAX_COMMAND_LENGTH = 500;

function fail(message, scope = "entry.json") {
  failed = true;
  console.error(`FAIL ${scope}: ${message}`);
}

function requiredText(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} is required`);
    return false;
  }
  if (maxLength && value.trim().length > maxLength) {
    fail(`${label} must be no longer than ${maxLength} characters`);
    return false;
  }
  return true;
}

function stringList(value, label, required) {
  if (!Array.isArray(value)) {
    fail(`${label} must be a list`);
    return false;
  }
  if (value.length > MAX_LIST_ITEMS) {
    fail(`${label} must contain no more than ${MAX_LIST_ITEMS} items`);
    return false;
  }
  if (required && value.length === 0) {
    fail(`${label} must contain at least one named item`);
    return false;
  }
  if (value.some((item) => typeof item !== "string" || !item.trim() || item.trim().length > MAX_LIST_ITEM_LENGTH)) {
    fail(`${label} items must be non-empty and no longer than ${MAX_LIST_ITEM_LENGTH} characters`);
    return false;
  }
  return true;
}

requiredText(entry.agentName, "agentName", MAX_AGENT_NAME_LENGTH);
requiredText(entry.oneLineDescription, "oneLineDescription", MAX_DESCRIPTION_LENGTH);

if (!Array.isArray(entry.teamMembers) || entry.teamMembers.length < 1 || entry.teamMembers.length > 4) {
  fail("teamMembers must contain between one and four people");
} else {
  const seenEmails = new Set();
  entry.teamMembers.forEach((member, index) => {
    const position = `teamMembers[${index}]`;
    requiredText(member?.name, `${position}.name`, MAX_NAME_LENGTH);
    if (requiredText(member?.email, `${position}.email`, MAX_EMAIL_LENGTH)) {
      const email = member.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        fail(`${position}.email is not a valid email address`);
      } else if (seenEmails.has(email)) {
        fail(`${position}.email is duplicated`);
      }
      seenEmails.add(email);
    }
  });
}

const allowedBuildStyles = new Set(["headless-agent", "coding-harness", "hybrid", "other"]);
if (!allowedBuildStyles.has(entry.technicalSetup?.buildStyle)) {
  fail("technicalSetup.buildStyle must be headless-agent, coding-harness, hybrid or other");
}
requiredText(entry.technicalSetup?.harnessOrFramework, "technicalSetup.harnessOrFramework", MAX_LIST_ITEM_LENGTH);
stringList(entry.technicalSetup?.primaryModels, "technicalSetup.primaryModels", true);
stringList(entry.technicalSetup?.languagesAndFrameworks, "technicalSetup.languagesAndFrameworks", true);
stringList(entry.technicalSetup?.preExistingComponents, "technicalSetup.preExistingComponents", false);
requiredText(entry.technicalSetup?.humanInputDuringFinalRun, "technicalSetup.humanInputDuringFinalRun", MAX_DESCRIPTION_LENGTH);

if (requiredText(entry.submission?.repositoryUrl, "submission.repositoryUrl", MAX_URL_LENGTH)) {
  try {
    const url = new URL(entry.submission.repositoryUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (url.protocol !== "https:" || url.username || url.password || host !== "github.com" || pathParts.length !== 2) throw new Error();
  } catch {
    fail("submission.repositoryUrl must link to the root of an https://github.com repository");
  }
}

if (requiredText(entry.submission?.finalCommit, "submission.finalCommit") && !/^[a-f0-9]{7,40}$/i.test(entry.submission.finalCommit.trim())) {
  fail("submission.finalCommit must be a 7–40 character Git commit hash");
}
requiredText(entry.submission?.finalCommand, "submission.finalCommand", MAX_COMMAND_LENGTH);

if (entry.emailUseConfirmed !== true) {
  fail("emailUseConfirmed must be true after every team member agrees");
}

const architecturePath = path.join(root, "architecture", "index.html");
try {
  const architectureBuffer = await fs.readFile(architecturePath);
  const architectureHtml = architectureBuffer.toString("utf8");
  if (architectureBuffer.byteLength < 1 || architectureBuffer.byteLength > 2 * 1024 * 1024) {
    fail("must be between 1 byte and 2 MB", "architecture/index.html");
  } else if (Buffer.byteLength(architectureHtml, "utf8") !== architectureBuffer.byteLength || architectureHtml.includes("\0")) {
    fail("must be a readable text file", "architecture/index.html");
  } else if (!/<html(?:\s|>)/i.test(architectureHtml)) {
    fail("must be a complete HTML document", "architecture/index.html");
  }
} catch (error) {
  fail(error.code === "ENOENT" ? "file is missing" : error.message, "architecture/index.html");
}

if (failed) {
  console.error("\nComplete the entry details before final submission.");
  process.exitCode = 1;
} else {
  console.log(`PASS entry.json: ${entry.agentName} (${entry.teamMembers.length} team member${entry.teamMembers.length === 1 ? "" : "s"})`);
}
