import { Separator, checkbox, select, confirm } from "@inquirer/prompts";
import { Packages } from "./utils.js";
import {
  AuthType,
  AvailablePackage,
  ComponentLibType,
  DBProvider,
  DBType,
  InitOptions,
  ORMType,
  PMType,
  PackageChoice,
} from "../../types.js";
import { DBProviders } from "../init/utils.js";
import { AuthProvider, AuthProviders } from "./auth/next-auth/utils.js";
import { readConfigFile } from "../../utils.js";
import { consola } from "consola";

const nullOption = { name: "None", value: null };

export const askOrm = async (options: InitOptions) => {
  return (
    options.orm ??
    ((await select({
      message: "Select an ORM to use:",
      choices: [...Packages.orm, new Separator(), nullOption],
    })) as ORMType | null)
  );
};

export const askDbType = async (options: InitOptions) => {
  return (
    options.db ??
    ((await select({
      message: "Please choose your DB type",
      choices: [
        { name: "Postgres", value: "pg" },
        {
          name: "MySQL",
          value: "mysql",
        },
        {
          name: "SQLite",
          value: "sqlite",
        },
      ],
    })) as DBType)
  );
};

export const askDbProvider = async (
  options: InitOptions,
  dbType: DBType,
  ppm: PMType
) => {
  const dbProviders = DBProviders[dbType].filter((p) => {
    if (ppm === "bun") return p.value !== "better-sqlite3";
    else return p.value !== "bun-sqlite";
  });
  return (
    options.dbProvider ??
    ((await select({
      message: "Please choose your DB Provider",
      choices: dbProviders,
    })) as DBProvider)
  );
};

export const askPscale = async (options: InitOptions) => {
  return (
    options.dbProvider ??
    (await confirm({
      message: "Are you using PlanetScale?",
      default: false,
    }))
  );
};

export const askAuth = async (options: InitOptions) => {
  return (
    options.auth ??
    ((await select({
      message: "Select an authentication package to use:",
      choices: [...Packages.auth, new Separator(), nullOption],
    })) as AuthType | null)
  );
};
