import { consola } from "consola";
import fs from "fs";
import path from "path";
import {
  createFile,
  installPackages,
  readConfigFile,
  replaceFile,
} from "../../../../utils.js";
import {
  DBProvider,
  DBType,
  DotEnvItem,
  ORMType,
  PMType,
} from "../../../../types.js";
import {
  formatFilePath,
  getDbIndexPath,
  getFilePaths,
  removeFileExtension,
} from "../../../filePaths/index.js";
import stripJsonComments from "strip-json-comments";
import { addToInstallList } from "../../utils.js";

type ConfigDriver = "pg" | "turso" | "libsql" | "mysql" | "better-sqlite";

const configDriverMappings = {
  postgresjs: "pg",
  "node-postgres": "pg",
  "vercel-pg": "pg",
  neon: "pg",
  supabase: "pg",
  aws: "pg",
  planetscale: "mysql2",
  "mysql-2": "mysql2",
  "better-sqlite3": "better-sqlite",
  turso: "turso",
};

export const createDrizzleConfig = (libPath: string, provider: DBProvider) => {
  const {
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();
  createFile(
    "drizzle.config.ts",
    `import type { Config } from "drizzle-kit";
     import 'dotenv/config'

export default {
  schema: "./${libPath}/db/schema",
  out: "./${libPath}/db/migrations",
  dialect: "postgresql",
  // driver: "${configDriverMappings[provider]}",
  dbCredentials: {
    ${
      provider === "turso"
        ? `url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN`
        : provider === "better-sqlite3"
        ? "url: process.env.DATABASE_URL"
        : provider === "mysql-2" || provider === "planetscale"
        ? "uri: process.env.DATABASE_URL"
        : "connectionString: process.env.DATABASE_URL"
    }${provider === "vercel-pg" ? '.concat("?sslmode=require")' : ""},
    // url: process.env.DATABASE_URL,
  }
} satisfies Config;`
  );
};

export const createIndexTs = (dbProvider: DBProvider) => {
  const {
    shared: {
      init: { envMjs },
    },
    drizzle,
  } = getFilePaths();
  const dbIndex = getDbIndexPath("drizzle");
  let indexTS = "";
  switch (dbProvider) {
    case "postgresjs":
      indexTS = `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import 'dotenv/config'

export const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client);`;
      break;
    case "node-postgres":
      indexTS = `import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg"
import 'dotenv/config'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
export const db = drizzle(pool);`;
      break;
    case "neon":
      indexTS = `import { neon, neonConfig, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import 'dotenv/config'

neonConfig.fetchConnectionCache = true;
 
export const sql: NeonQueryFunction<boolean, boolean> = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);
`;
      break;
    case "vercel-pg":
      indexTS = `import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import 'dotenv/config'
 
export const db = drizzle(sql)
`;
      break;
    case "supabase":
      indexTS = `import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import 'dotenv/config'
 
const connectionString = process.env.DATABASE_URL
const client = postgres(connectionString)
export const db = drizzle(client);
`;
      break;
    case "aws":
      indexTS = `import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { fromIni } from '@aws-sdk/credential-providers';
import "dotenv/config";

 
const rdsClient = new RDSDataClient({
  	credentials: fromIni({ profile: env['PROFILE'] }),
		region: 'us-east-1',
});
 
export const db = drizzle(rdsClient, {
  database: env['DATABASE']!,
  secretArn: env['SECRET_ARN']!,
  resourceArn: env['RESOURCE_ARN']!,
});
`;
      break;
    case "planetscale":
      indexTS = `import { drizzle } from "drizzle-orm/planetscale-serverless";
import { connect } from "@planetscale/database";
import 'dotenv/config'
 
// create the connection
export const connection = connect({
  url: process.env.DATABASE_URL
});
 
export const db = drizzle(connection);
`;
      break;
    case "mysql-2":
      indexTS = `import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import 'dotenv/config'
 
export const poolConnection = mysql.createPool(process.env.DATABASE_URL);
 
export const db = drizzle(poolConnection);
`;
      break;
    case "better-sqlite3":
      indexTS = `import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
 
export const sqlite = new Database('sqlite.db');
export const db: BetterSQLite3Database = drizzle(sqlite);
`;
      break;
    case "turso":
      indexTS = `import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from "@libsql/client";
import 'dotenv/config'
 
export const sqlite = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(sqlite);
`;
      break;
    // case "bun-sqlite":
    //   indexTS = `import { drizzle, BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
    // import { Database } from 'bun:sqlite';
    //
    // const sqlite = new Database('sqlite.db');
    // export const db: BunSQLiteDatabase = drizzle(sqlite);
    // `;
    //   break;
    default:
      break;
  }

  createFile(
    formatFilePath(dbIndex, { prefix: "rootPath", removeExtension: false }),
    indexTS
  );
};

export const createMigrateTs = (
  libPath: string,
  dbType: DBType,
  dbProvider: DBProvider
) => {
  const {
    drizzle: { dbMigrate, migrationsDir },
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();
  let imports = "";
  let connectionLogic = "";

  switch (dbProvider) {
    //done
    case "postgresjs":
      imports = `
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
`;
      connectionLogic = `
const connection = postgres(process.env.DATABASE_URL, { max: 1 });

const db = drizzle(connection);
`;
      break;
    //done
    case "node-postgres":
      imports = `
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
`;
      connectionLogic = `
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();
const db = drizzle(client);
`;
      break;
    //done
    case "neon":
      imports = `
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { neon, neonConfig, NeonQueryFunction } from '@neondatabase/serverless';
`;
      connectionLogic = `
neonConfig.fetchConnectionCache = true;
 
const sql: NeonQueryFunction<boolean, boolean> = neon(process.env.DATABASE_URL);
const db = drizzle(sql);
`;
      break;
    case "vercel-pg":
      imports = `
import { drizzle } from "drizzle-orm/vercel-postgres";
import { migrate } from "drizzle-orm/vercel-postgres/migrator";
import { sql } from '@vercel/postgres';
`;
      connectionLogic = `
  const db = drizzle(sql);
`;
      break;
    //done
    case "supabase":
      imports = `
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
`;
      connectionLogic = `
  const connection = postgres(process.env.DATABASE_URL, { max: 1 });

  const db = drizzle(connection);
`;
      break;
    // done
    case "aws":
      imports = `
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { migrate } from "drizzle-orm/aws-data-api/pg/migrator";
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { fromIni } from '@aws-sdk/credential-providers';
`;
      connectionLogic = `
const rdsClient = new RDSDataClient({
  	credentials: fromIni({ profile: process.env['PROFILE'] }),
		region: 'us-east-1',
});
 
const db = drizzle(rdsClient, {
  database: process.env['DATABASE']!,
  secretArn: process.env['SECRET_ARN']!,
  resourceArn: process.env['RESOURCE_ARN']!,
});
`;
      break;
    // done
    case "planetscale":
      imports = `
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { migrate } from "drizzle-orm/planetscale-serverless/migrator";
import { connect } from "@planetscale/database";
`;
      connectionLogic = `
const connection = connect({ url: process.env.DATABASE_URL });
 
const db = drizzle(connection);
`;
      break;
    case "mysql-2":
      imports = `
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
`;
      connectionLogic = `
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  const db = drizzle(connection);
`;
      break;
    case "better-sqlite3":
      imports = `
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from 'better-sqlite3';
`;
      connectionLogic = `
const sqlite = new Database('sqlite.db');
const db: BetterSQLite3Database = drizzle(sqlite);
`;
      break;
    case "turso":
      imports = `
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
`;
      connectionLogic = `
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  const db = drizzle(client);
`;
      break;
    default:
      break;
  }
  const template = `import 'dotenv/config'
  ${imports}

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  ${connectionLogic}

  console.log("⏳ Running migrations...");

  const start = Date.now();

  await migrate(db, { migrationsFolder: '${formatFilePath(migrationsDir, {
    removeExtension: false,
    prefix: "rootPath",
  })}' });

  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");

  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});`;

  createFile(
    formatFilePath(dbMigrate, { prefix: "rootPath", removeExtension: false }),
    template
  );
};

export const addScriptsToPackageJson = (
  libPath: string,
  driver: DBType,
  preferredPackageManager: PMType
) => {
  // Define the path to package.json
  const packageJsonPath = path.resolve("package.json");

  // Read package.json
  const packageJsonData = fs.readFileSync(packageJsonPath, "utf-8");

  // Parse package.json content
  const packageJson = JSON.parse(packageJsonData);

  const newItems = {
    "db:generate": `drizzle-kit generate`,
    "db:migrate": `tsx ${libPath}/db/migrate.ts`,
    "db:drop": "drizzle-kit drop",
    "db:pull": `drizzle-kit introspect`,
    ...(driver !== "pg" ? { "db:push": `drizzle-kit push:${driver}` } : {}),
    "db:studio": "drizzle-kit studio",
    "db:check": `drizzle-kit check:${driver}`,
  };
  packageJson.scripts = {
    ...packageJson.scripts,
    ...newItems,
  };

  // Stringify the updated content
  const updatedPackageJsonData = JSON.stringify(packageJson, null, 2);

  // Write the updated content back to package.json
  fs.writeFileSync(packageJsonPath, updatedPackageJsonData);

  // consola.success("Scripts added to package.json");
};

export const installDependencies = async (
  dbType: DBProvider,
  preferredPackageManager: PMType
) => {
  const packages: {
    [key in DBProvider]: { regular: string[]; dev: string[] };
  } = {
    postgresjs: { regular: ["postgres"], dev: ["pg"] },
    "node-postgres": { regular: ["pg"], dev: ["@types/pg"] },
    neon: { regular: ["@neondatabase/serverless"], dev: ["pg"] },
    "vercel-pg": { regular: ["@vercel/postgres"], dev: ["pg"] },
    supabase: { regular: ["postgres"], dev: ["pg"] },
    aws: { regular: [""], dev: [""] }, // disabled
    planetscale: { regular: ["@planetscale/database"], dev: ["mysql2"] },
    "mysql-2": { regular: ["mysql2"], dev: [""] },
    "better-sqlite3": {
      regular: ["better-sqlite3"],
      dev: ["@types/better-sqlite3"],
    },
    turso: { regular: ["@libsql/client"], dev: [""] },
    // "bun-sqlite": { regular: "drizzle-orm", dev: "drizzle-kit" },
  };
  // note this change hasnt been tested yet
  const dbSpecificPackage = packages[dbType];
  if (dbSpecificPackage) {
    addToInstallList({
      regular: [
        "drizzle-orm",
        "drizzle-zod",
        // "@t3-oss/env-nextjs",
        "zod",
        "nanoid",

        ...dbSpecificPackage.regular,
      ],
      dev: ["drizzle-kit", "tsx", "dotenv", ...dbSpecificPackage.dev],
    });
    // await installPackages(
    //   {
    //     regular: `drizzle-orm drizzle-zod @t3-oss/env-nextjs zod ${dbSpecificPackage.regular}`,
    //     dev: `drizzle-kit tsx dotenv ${dbSpecificPackage.dev}`,
    //   },
    //   preferredPackageManager
    // );
  }
};

export const createDotEnv = (
  orm: ORMType,
  preferredPackageManager: PMType,
  databaseUrl?: string,
  usingPlanetscale: boolean = false,
  rootPathOld: string = ""
) => {
  const {
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();
  const dburl =
    databaseUrl ??
    "DATABASE_URL=postgresql://auther:secure%^^.pass@localhost:5432/appdatabase";

  const envPath = path.resolve(".env");
  const envExists = fs.existsSync(envPath);
  if (!envExists)
    createFile(
      ".env",
      `${
        orm === "drizzle" && usingPlanetscale
          ? `# When using the PlanetScale driver with Drizzle, your connection string must end with ?ssl={"rejectUnauthorized":true} instead of ?sslaccept=strict.\n`
          : ""
      }DATABASE_URL=${dburl}`
    );

  const envmjsfilePath = formatFilePath(envMjs, {
    prefix: "rootPath",
    removeExtension: false,
  });
};

export const addToDotEnv = (
  items: DotEnvItem[],
  rootPathOld?: string,
  excludeDbUrlIfBlank = false
) => {
  const { orm, preferredPackageManager } = readConfigFile();
  const {
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();
  // handling dotenv
  const envPath = path.resolve(".env");
  const envExists = fs.existsSync(envPath);
  const newData = items.map((item) => `${item.key}=${item.value}`).join("\n");
  if (envExists) {
    const envData = fs.readFileSync(envPath, "utf-8");
    const updatedEnvData = `${envData}\n${newData}`;
    fs.writeFileSync(envPath, updatedEnvData);
  } else {
    fs.writeFileSync(envPath, newData);
  }
  // handling process.env.mjs
  const envmjsfilePath = formatFilePath(envMjs, {
    removeExtension: false,
    prefix: "rootPath",
  });
  const envMjsExists = fs.existsSync(envmjsfilePath);
  if (!envMjsExists && orm === null) {
    return;
  }
  if (!envMjsExists)
    createFile(
      envmjsfilePath,
      generateEnvMjs(preferredPackageManager, orm, excludeDbUrlIfBlank)
    );
  let envmjsfileContents = fs.readFileSync(envmjsfilePath, "utf-8");

  const formatItemForDotEnvMjs = (item: DotEnvItem) =>
    `${item.key}: ${
      item.customZodImplementation ??
      `z.string().${item.isUrl ? "url()" : "min(1)"}`
    },`;

  const formatPublicItemForRuntimeEnv = (item: DotEnvItem) =>
    `${item.key}: process.env.${item.key},`;

  const serverItems = items
    .filter((item) => !item.public)
    .map(formatItemForDotEnvMjs)
    .join("\n    ");
  const clientItems = items
    .filter((item) => item.public)
    .map(formatItemForDotEnvMjs)
    .join("\n    ");
  const runtimeEnvItems = items
    .filter((item) => item.public)
    .map(formatPublicItemForRuntimeEnv)
    .join("\n    ");

  // Construct the replacement string for both server and client sections
  const replacementStr = `    ${serverItems}\n  },\n  client: {\n    ${clientItems}`;

  // Replace content using the known pattern
  const regex = /  },\n  client: {\n/s;
  envmjsfileContents = envmjsfileContents.replace(regex, replacementStr);

  const runtimeEnvRegex = /experimental__runtimeEnv: {\n/s;
  envmjsfileContents = envmjsfileContents.replace(
    runtimeEnvRegex,
    `experimental__runtimeEnv: {\n    ${runtimeEnvItems}`
  );
  // Write the updated contents back to the file
  fs.writeFileSync(envmjsfilePath, envmjsfileContents);
};

export async function updateTsConfigTarget() {
  // Define the path to the tsconfig.json file
  const tsConfigPath = path.join(process.cwd(), "tsconfig.json");

  // Read the file
  fs.readFile(tsConfigPath, "utf8", (err, data) => {
    if (err) {
      console.error(
        `An error occurred while reading the tsconfig.json file: ${err}`
      );
      return;
    }

    // Parse the content as JSON
    const tsConfig = JSON.parse(
      stripJsonComments(data, {
        whitespace: false,
        trailingCommas: false,
      })
    );

    // Modify the target property
    tsConfig.compilerOptions.target = "esnext";

    // Convert the modified object back to a JSON string
    const updatedContent = JSON.stringify(tsConfig, null, 2); // 2 spaces indentation

    // Write the updated content back to the file
    replaceFile(tsConfigPath, updatedContent);
  });
}

const generateEnvMjs = (
  preferredPackageManager: PMType,
  ormType: ORMType,
  blank = false
) => {
  return `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";${
    preferredPackageManager !== "bun" && ormType === "drizzle"
      ? '\nimport "dotenv/config";'
      : ""
  }

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    ${blank ? "// " : ""}DATABASE_URL: z.string().min(1),
    
  },
  client: {
    // NEXT_PUBLIC_PUBLISHABLE_KEY: z.string().min(1),
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  // runtimeEnv: {
  //   DATABASE_URL: process.env.DATABASE_URL,
  //   NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  // },
  // For Next.js >= 13.4.4, you only need to destructure client variables:
  experimental__runtimeEnv: {
    // NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  },
});
`;
};
