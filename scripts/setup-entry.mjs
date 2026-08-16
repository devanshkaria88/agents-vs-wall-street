import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const templatePath = path.join(root, "entry.template.json");
const entryPath = path.join(root, "entry.json");

try {
  await fs.copyFile(templatePath, entryPath, constants.COPYFILE_EXCL);
  console.log("Created private entry.json. Complete it before final submission.");
} catch (error) {
  if (error.code === "EEXIST") {
    console.log("entry.json already exists; it was not overwritten.");
  } else {
    throw error;
  }
}
