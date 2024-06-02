import { existsSync, writeFileSync } from "fs";

export async function configCheckOrGenerate() {
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
      dependencies: {
        express: "^4.19.2",
      },
      devDependencies: {
        "@types/node": "^20.13.0",
        dotenv: "^16.4.5",
      },
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
