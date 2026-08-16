import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";

const root = path.resolve(import.meta.dirname, "..");
const definitions = JSON.parse(
  await fs.readFile(path.join(root, "challenge", "companies.json"), "utf8"),
);
const submissionDirectory = path.resolve(root, process.argv[2] ?? "submission");

let failed = false;

function fail(file, message) {
  failed = true;
  console.error(`FAIL ${file}: ${message}`);
}

function sameText(actual, expected) {
  return String(actual ?? "").trim() === expected;
}

for (const company of definitions.companies) {
  const filePath = path.join(submissionDirectory, company.outputFile);
  let fileFailed = false;

  function failFile(message) {
    fileFailed = true;
    fail(company.outputFile, message);
  }

  try {
    await fs.access(filePath);
  } catch {
    failFile("file is missing");
    continue;
  }

  let workbook;
  try {
    workbook = XLSX.readFile(filePath, { cellFormula: false });
  } catch (error) {
    failFile(`cannot be opened as .xlsx (${error.message})`);
    continue;
  }

  const sheet = workbook.Sheets.Summary;
  if (!sheet) {
    failFile("Summary sheet is missing");
    continue;
  }

  const cellValue = (row, column) => {
    const address = XLSX.utils.encode_cell({ r: row - 1, c: column - 1 });
    return sheet[address]?.v;
  };

  let headerRow;
  for (let rowNumber = 1; rowNumber <= 30; rowNumber += 1) {
    if (
      sameText(cellValue(rowNumber, 1), "Metric") &&
      sameText(cellValue(rowNumber, 2), "Units") &&
      sameText(cellValue(rowNumber, 3), company.period)
    ) {
      headerRow = rowNumber;
      break;
    }
  }

  if (!headerRow) {
    failFile(`expected Metric / Units / ${company.period} header was not found`);
    continue;
  }

  company.metrics.forEach((metric, index) => {
    const rowNumber = headerRow + index + 1;
    if (!sameText(cellValue(rowNumber, 1), metric.label)) {
      failFile(`row ${index + 1} metric must be “${metric.label}”`);
    }
    if (!sameText(cellValue(rowNumber, 2), metric.units)) {
      failFile(`${metric.label} units must be “${metric.units}”`);
    }

    const value = cellValue(rowNumber, 3);
    if (typeof value !== "number" || !Number.isFinite(value)) {
      failFile(`${metric.label} needs a numeric forecast`);
    }
  });

  if (!fileFailed) {
    console.log(`PASS ${company.outputFile}`);
  }
}

if (failed) {
  console.error("\nFix the errors above before uploading to OpenStocks.");
  process.exitCode = 1;
} else {
  console.log("\nAll four forecast workbooks are ready for manual upload.");
}
