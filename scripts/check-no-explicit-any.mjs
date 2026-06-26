import { readFile } from "node:fs/promises";
import { join } from "node:path";

const files = ["src/types/database.ts"];

const explicitAnyPattern = /\bany\b/;
const violations = [];

for (const file of files) {
  const content = await readFile(join(process.cwd(), file), "utf8");
  if (explicitAnyPattern.test(content)) {
    violations.push(file);
  }
}

if (violations.length > 0) {
  console.error(`Explicit any found in: ${violations.join(", ")}`);
  process.exit(1);
}
