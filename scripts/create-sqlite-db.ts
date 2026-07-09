import fs from "fs";
import { execFileSync } from "child_process";
import path from "path";
import initSqlJs from "sql.js";

const root = process.cwd();
const databasePath = path.join(root, "prisma", "dev.db");

async function main() {
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

  const data = db.export();
  fs.writeFileSync(databasePath, Buffer.from(data));
  db.close();

  console.log(`Banco SQLite criado em ${databasePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
