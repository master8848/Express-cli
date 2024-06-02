import { confirm } from "@inquirer/prompts";
import { readConfigFile, updateConfigFile } from "../../utils.js";
import { addDrizzle } from "./orm/drizzle/index.js";
import { consola } from "consola";
import { initProject } from "../init/index.js";
import { addPrisma } from "./orm/prisma/index.js";
import { ORMType, InitOptions } from "../../types.js";
import { addLucia } from "./auth/lucia/index.js";
import { checkForExistingPackages } from "../init/utils.js";

import {
  askAuth,
  askDbProvider,
  askDbType,
  askOrm,
  askPscale,
} from "./prompts.js";
import {
  addToInstallList,
  installPackagesFromList,
  printNextSteps,
} from "./utils.js";
import ora from "ora";
import { SchemaToResourceGenerator, userData } from "../generate/index.js";

const promptUser = async (options?: InitOptions): Promise<InitOptions> => {
  const config = readConfigFile();
  // console.log(config);

  // prompt orm
  let orm: ORMType;
  orm = config.orm ? undefined : await askOrm(options);
  if (orm === null) {
    const confirmedNoORM = await confirm({
      message:
        "Are you sure you don't want to install an ORM? Note: you will not be able to install auth or Stripe.",
    });
    if (confirmedNoORM === false) {
      orm = await askOrm(options);
    }
  }

  // prompt db type
  const dbType =
    orm === null || config.driver ? undefined : await askDbType(options);

  let dbProvider =
    config.orm ||
    orm === "prisma" ||
    orm === null ||
    (config.driver && config.t3 === true) ||
    (config.provider && config.t3 === false)
      ? undefined
      : await askDbProvider(options, dbType, config.preferredPackageManager);

  if (orm === "prisma" && dbType === "mysql") {
    const usePscale = await askPscale(options);
    if (usePscale) dbProvider = "planetscale";
  }

  // const auth = config.auth || !orm ? undefined : await askAuth(options);

  return {
    orm,
    dbProvider,
    db: dbType,
    auth: undefined,
    miscPackages: [],
  };
};

export const spinner = ora();

export const addPackage = async (
  options: InitOptions = {},
  init: boolean = false
) => {
  const initialConfig = readConfigFile();

  if (initialConfig) {
    if (initialConfig.packages?.length === 0)
      await checkForExistingPackages(initialConfig.rootPath);
    const config = readConfigFile();

    console.log("\n");
    const promptResponse = await promptUser(options);
    const start = Date.now();
    spinner.start();
    spinner.text = "Beginning Configuration Process";

    // check if orm
    if (config.orm === undefined) {
      if (promptResponse.orm === "drizzle") {
        spinner.text = "Configuring Drizzle ORM";

        await addDrizzle(
          promptResponse.db,
          promptResponse.dbProvider,
          promptResponse.includeExample,
          options
        );
      }
      if (promptResponse.orm === "prisma") {
        spinner.text = "Configuring Prisma";

        await addPrisma(
          promptResponse.includeExample,
          promptResponse.db,
          options
        );
      }
      if (promptResponse === null)
        updateConfigFile({ orm: null, driver: null, provider: null });
    }
    // check if auth
    // if (config.auth === undefined) {
    //   if (promptResponse.auth && promptResponse.auth !== null)
    //     spinner.text =
    //       "Configuring " +
    //       promptResponse.auth[0].toUpperCase() +
    //       promptResponse.orm.slice(1);

    //   if (promptResponse.auth === "lucia") await addLucia();
    // }

    spinner.text = "Finishing configuration";

    spinner.succeed("Configuration complete");

    await installPackagesFromList();
    // await installShadcnComponentList();

    const end = Date.now();
    const duration = end - start;
    await SchemaToResourceGenerator(userData);
    printNextSteps(promptResponse, duration);
  } else {
    consola.warn("No config file found, initializing project...");
    initProject(options);
  }
};
