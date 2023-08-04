import { consola } from "consola";
import {
  type PMType,
  type DBType,
  createFile,
  createFolder,
  installPackages,
} from "../../utils.js";
import fs from "fs";
import path from "path";

export const createDrizzleConfig = (libPath: string, driver: DBType) => {
  createFile(
    "drizzle.config.ts",
    `import type { Config } from "drizzle-kit";

export default {
  schema: "./${libPath}/db/schema",
  out: "./${libPath}/db/migrations",
  driver: "${driver}",
  //connection string
} satisfies Config;`
  );
};

export const createIndexTs = (libPath: string, dbType: DBType) => {
  switch (dbType) {
    case "pg":
      createFile(
        `${libPath}/db/index.ts`,
        `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import "dotenv/config";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);`
      );
      break;
    case "mysql":
      return ` not supported `;
    case "sqlite":
      return ` not supported `;
    default:
      break;
  }
};

export const createMigrateTs = (libPath: string, dbType: DBType) => {
  switch (dbType) {
    case "pg":
      createFile(
        `${libPath}/db/migrate.ts`,
        `import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import "dotenv/config";

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const connection = postgres(process.env.DATABASE_URL, { max: 1 });

  const db = drizzle(connection);

  console.log("⏳ Running migrations...");

  const start = Date.now();

  await migrate(db, { migrationsFolder: '${libPath}/db/migrations' });

  const end = Date.now();

  console.log("✅ Migrations completed in ", end - start, "ms");

  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});`
      );
    case "mysql":
      return ` not supported `;
    case "sqlite":
      return ` not supported `;
    default:
      break;
  }
};

export const createInitSchema = (libPath: string, dbType: DBType) => {
  switch (dbType) {
    case "pg":
      // create db/schema folder
      createFolder(`${libPath}/db/schema`);

      // create model in schema folder
      createFile(
        `./${libPath}/db/schema/user.ts`,
        `import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  password: text("password").notNull(),
});`
      );
  }
};

export const addScriptsToPackageJson = (libPath: string) => {
  // Define the path to package.json
  const packageJsonPath = path.resolve("package.json");

  // Read package.json
  const packageJsonData = fs.readFileSync(packageJsonPath, "utf-8");

  // Parse package.json content
  let packageJson = JSON.parse(packageJsonData);

  // Update the scripts property
  packageJson.scripts = {
    ...packageJson.scripts,
    migrate: `tsx ${libPath}/db/migrate.ts`,
    generate: "drizzle-kit generate:pg",
  };

  // Stringify the updated content
  const updatedPackageJsonData = JSON.stringify(packageJson, null, 2);

  // Write the updated content back to package.json
  fs.writeFileSync(packageJsonPath, updatedPackageJsonData);

  consola.success("Scripts added to package.json");
};

export const installDependencies = async (
  dbType: DBType,
  preferredPackageManager: PMType
) => {
  const packages = {
    pg: {
      regular: "drizzle-orm postgres",
      dev: "drizzle-kit tsx dotenv",
    },
    mysql: {
      regular: "drizzle-orm mysql2",
      dev: "drizzle-kit tsx dotenv",
    },
    sqlite: {
      regular: "drizzle-orm better-sqlite3",
      dev: "drizzle-kit tsx dotenv",
    },
  };
  // install dotenv for all
  switch (dbType) {
    case "pg":
      installPackages(packages.pg, preferredPackageManager);
  }
};

export const createDotEnv = (databaseUrl?: string) => {
  const dburl =
    databaseUrl ?? "postgresql://postgres:postgres@localhost:5432/{DB_NAME}";

  createFile(".env", `DATABASE_URL=${dburl}`);
};