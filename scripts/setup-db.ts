import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";

const root = process.cwd();
const databasePath = path.join(root, "prisma", "dev.db");

function run(command: string, args: string[]) {
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

async function createDatabase() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const sql = execFileSync(
    "npx",
    ["prisma", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
    {
      cwd: root,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );

  db.run("PRAGMA foreign_keys = ON;");
  db.run(sql);
  fs.writeFileSync(databasePath, Buffer.from(db.export()));
  db.close();
}

async function main() {
  run("npx", ["prisma", "generate"]);
  await createDatabase();
  run("npx", ["prisma", "db", "seed"]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
