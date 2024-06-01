import { select } from "@inquirer/prompts";
import { createConfigFile } from "../../utils.js";
import { InitOptions, PMType } from "../../types.js";
import { addPackage } from "../add/index.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { checkForPackageManager } from "./utils.js";
import figlet from "figlet";
import chalk from "chalk";

export async function initProject(options?: InitOptions) {
  await configCheckOrGenerate();
  console.clear();
  console.log("\n");

  console.log(chalk(figlet.textSync("sksn", { font: "ANSI Shadow" })));
  const srcExists = true;

  // console.log(options);
  const preferredPackageManager =
    checkForPackageManager() ||
    options?.packageManager ||
    ((await select({
      message: "Please pick your preferred package manager",
      choices: [
        { name: "PNPM", value: "pnpm" },
        { name: "NPM", value: "npm" },
        { name: "Yarn", value: "yarn" },
        { name: "Bun", value: "bun" },
      ],
    })) as PMType);
  // console.log("installing dependencies with", preferredPackageManager);

  let alias: string = "@";
  try {
    const tsConfigString = readFileSync("tsconfig.json", "utf-8");
    if (tsConfigString.includes("@/*")) alias = "@";
    if (tsConfigString.includes("~/*")) alias = "~";
  } catch (error) {}

  createConfigFile({
    driver: undefined,
    hasSrc: srcExists,
    provider: undefined,
    packages: [],
    preferredPackageManager,
    orm: undefined,
    auth: undefined,
    componentLib: undefined,
    t3: false,
    alias,
    analytics: true,
  });
  // consola.success("sksn initialized!");
  // consola.info("You can now add packages.");
  addPackage(options, true);
}

async function configCheckOrGenerate() {
  const packageJsonExists = existsSync("package.json");
  if (!packageJsonExists) {
    const newPackage = JSON.stringify({
      name: "test",
      version: "1.0.0",
      main: "index.js",
      scripts: {},
      keywords: [],
      author: "",
      license: "ISC",
      description: "",
    });
    await writeFileSync("package.json", newPackage);
  }
  const tsConfigExists = existsSync("tsconfig.json");
  if (!tsConfigExists) {
    const newTs = JSON.stringify({
      compilerOptions: {
        skipLibCheck: true,
        module: "ESNext",
        moduleResolution: "bundler",
        target: "ESNext",
        isolatedModules: true,
        esModuleInterop: true,
        noEmit: true,
        allowImportingTsExtensions: true,
        outDir: "dist",
        lib: ["esnext"],
        types: ["node"],
        baseUrl: "./",
      },
      exclude: ["node_modules"],
      include: ["src/**/*.ts", "bin/*.ts"],
    });

    await writeFileSync("tsconfig.json", newTs);
  }
  const dockerCompose = existsSync("compose.yaml");
  if (!dockerCompose) {
    const newPackage = `version: "3.8"
    services:
      db:
        image: postgres:13
        restart: always
        environment:
          POSTGRES_USER: auther
          POSTGRES_PASSWORD: secure%^^.pass
          POSTGRES_DB: appdatabase
        ports:
          - "5432:5432"
        volumes:
          - pgdata:/var/lib/postgresql/data
    volumes:
      pgdata:
    `;
    await writeFileSync("compose.yaml", newPackage);
  }
}
