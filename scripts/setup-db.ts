import { execFileSync } from "child_process";

const root = process.cwd();

function run(command: string, args: string[]) {
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function main() {
  run("npx", ["prisma", "generate"]);
  run("npx", ["prisma", "migrate", "deploy"]);
  run("npx", ["prisma", "db", "seed"]);
}

main();
