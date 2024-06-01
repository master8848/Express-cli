import { consola } from "consola";
import {
  AuthSubType,
  AuthType,
  AvailablePackage,
  InitOptions,
  PMType,
  PackageType,
} from "../../types.js";
import {
  installPackages,
  installShadcnUIComponents,
  readConfigFile,
  replaceFile,
} from "../../utils.js";
import fs from "fs";
import { formatFilePath, getFilePaths } from "../filePaths/index.js";
import { spinner } from "./index.js";
import chalk from "chalk";
import { AuthProviders } from "./auth/next-auth/utils.js";

export const Packages: {
  [key in PackageType]: {
    name: string;
    value: AvailablePackage;
    disabled?: boolean;
  }[];
} = {
  orm: [
    { name: "Drizzle", value: "drizzle" },
    { name: "Prisma", value: "prisma" },
  ],
  auth: [{ name: "Lucia", value: "lucia" }],
  misc: [
    { name: "TRPC", value: "trpc" },
    { name: "Stripe", value: "stripe" },
    { name: "Resend", value: "resend" },
  ],
};

export const addContextProviderToRootLayout = (provider: "ThemeProvider") => {
  const { hasSrc, alias } = readConfigFile();
  const path = `${hasSrc ? "src/" : ""}app/layout.tsx`;

  const fileContent = fs.readFileSync(path, "utf-8");

  // Add import statement after the last import
  const importInsertionPoint = fileContent.lastIndexOf("import");
  const nextLineAfterLastImport =
    fileContent.indexOf("\n", importInsertionPoint) + 1;
  const beforeImport = fileContent.slice(0, nextLineAfterLastImport);
  const afterImport = fileContent.slice(nextLineAfterLastImport);

  let importStatement: string;
  switch (provider) {
    case "ThemeProvider":
      importStatement = `import { ThemeProvider } from "${alias}/components/ThemeProvider";`;
      break;
  }

  // check if the provider already exists
  if (fileContent.includes(importStatement)) {
    // consola.info(`Provider ${provider} already exists in layout.tsx`);
    return;
  }
  const modifiedImportContent = `${beforeImport}${importStatement}\n${afterImport}`;

  const rootChildrenText = "{children}";
  let replacementText = "";
  switch (provider) {
    case "ThemeProvider":
      replacementText = `\n<${provider} attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>${rootChildrenText}</${provider}>\n`;
      break;
    default:
      replacementText = `\n<${provider}>${rootChildrenText}</${provider}>\n`;
      break;
  }

  const searchValue = "{children}";
  const newLayoutContent = modifiedImportContent.replace(
    searchValue,
    replacementText
  );
  replaceFile(path, newLayoutContent);
};

export const AuthSubTypeMapping: Record<AuthType, AuthSubType> = {
  clerk: "managed",
  kinde: "managed",
  "next-auth": "self-hosted",
  lucia: "managed",
};

const installList: { regular: string[]; dev: string[] } = {
  regular: [],
  dev: [],
};

export const addToInstallList = (packages: {
  regular: string[];
  dev: string[];
}) => {
  installList.regular.push(...packages.regular);
  installList.dev.push(...packages.dev);
};

export const installPackagesFromList = async () => {
  const { preferredPackageManager } = readConfigFile();

  if (installList.dev.length === 0 && installList.regular.length === 0) return;

  const dedupedList = {
    regular: [...new Set(installList.regular)],
    dev: [...new Set(installList.dev)],
  };

  const formattedInstallList = {
    regular: dedupedList.regular
      .map((i) => i.trim())
      .join(" ")
      .trim(),
    dev: dedupedList.dev
      .map((i) => i.trim())
      .join(" ")
      .trim(),
  };
  spinner.text = "Installing Packages";
  await installPackages(formattedInstallList, preferredPackageManager);
};
const shadCnComponentList: string[] = [];
export const addToShadcnComponentList = (components: string[]) =>
  shadCnComponentList.push(...components);
export const installShadcnComponentList = async () => {
  // consola.start("Installing shadcn components:", shadCnComponentList);
  if (shadCnComponentList.length === 0) return;
  await installShadcnUIComponents(shadCnComponentList);
  // consola.ready("Successfully installed components.");
};

export const printNextSteps = (
  promptResponses: InitOptions,
  duration: number
) => {
  const config = readConfigFile();
  const ppm = config?.preferredPackageManager ?? "npm";

  const packagesInstalledList = [
    ...(promptResponses.orm === "drizzle"
      ? [
          `${chalk.underline("ORM")}: Drizzle (using ${
            promptResponses.dbProvider
          })`,
        ]
      : []),
    ...(promptResponses.orm === "prisma"
      ? [`${chalk.underline("ORM")}: Prisma`]
      : []),
    ...(promptResponses.auth === "next-auth"
      ? [
          `${chalk.underline("Authentication")}: Auth.js ${
            promptResponses.authProviders &&
            promptResponses.authProviders.length > 0
              ? `(with ${promptResponses.authProviders
                  .map((p) => p)
                  .join(", ")} providers)`
              : ""
          }`,
        ]
      : []),
    ...(promptResponses.auth === "clerk"
      ? [`${chalk.underline("Authentication")}: Clerk`]
      : []),
    ...(promptResponses.auth === "lucia"
      ? [`${chalk.underline("Authentication")}: Lucia`]
      : []),
    ...(promptResponses.auth === "kinde"
      ? [`${chalk.underline("Authentication")}: Kinde`]
      : []),
    ...(promptResponses.miscPackages &&
    promptResponses.miscPackages.includes("stripe")
      ? [`${chalk.underline("Payments")}: Stripe`]
      : []),
    ...(promptResponses.miscPackages &&
    promptResponses.miscPackages.includes("resend")
      ? [`${chalk.underline("Email")}: Resend`]
      : []),
    ...(promptResponses.miscPackages &&
    promptResponses.miscPackages.includes("trpc")
      ? [`${chalk.underline("RPC")}: tRPC`]
      : []),
  ];

  const wouldHaveSecrets =
    promptResponses.orm ||
    promptResponses.auth ||
    (promptResponses.miscPackages &&
      promptResponses.miscPackages.includes("resend")) ||
    (promptResponses.miscPackages &&
      promptResponses.miscPackages.includes("stripe"));

  const dbMigration = [
    ...(config.t3 === true ? [] : [`Run \`${ppm} run db:generate\``]),
    `Run \`${ppm} run db:${promptResponses.db === "pg" ? "migrate" : "push"}\``,
    `Run \`${ppm} run dev\``,
    "Open http://localhost:3000 in your browser",
  ];
  const runMigration =
    (promptResponses.orm && promptResponses.includeExample) ||
    (promptResponses.orm &&
      promptResponses.auth !== "clerk" &&
      promptResponses.auth !== "kinde") ||
    promptResponses.auth === "lucia" ||
    promptResponses.auth === "next-auth" ||
    (promptResponses.miscPackages &&
      promptResponses.miscPackages.includes("stripe"));

  const includesStripe =
    promptResponses.miscPackages &&
    promptResponses.miscPackages.includes("stripe");

  const nextSteps = [
    ...(wouldHaveSecrets ? ["Add Environment Variables to your .env"] : []),
    ...(runMigration ? dbMigration : []),
    ...(includesStripe
      ? [`Run \`${ppm} run stripe:listen\` in a separate terminal`]
      : []),
    "Build something awesome!",
  ];

  const authProviderInstructions =
    promptResponses.authProviders && promptResponses.authProviders.length > 0
      ? promptResponses.authProviders.map((provider) => {
          return `${provider} auth: create credentials at ${AuthProviders[provider].website}\n  (redirect URI: /api/auth/callback/${provider})`;
        })
      : [];

  const stripe = [
    "To use Stripe locally, you need the Stripe CLI (https://stripe.com/docs/stripe-cli)",
    "Create Stripe product (https://dashboard.stripe.com/products)",
  ];

  const notes = [
    ...authProviderInstructions,
    ...(promptResponses.miscPackages &&
    promptResponses.miscPackages.includes("stripe")
      ? stripe
      : []),
    "If you have any issues, please open an issue on GitHub\n  (https://github.com/master8848/sksn/issues)",
  ];

  showNextSteps(packagesInstalledList, nextSteps, notes, duration);
};
export const createNextStepsList = (steps: string[]) => {
  return `
${chalk.bold.underline("Next Steps")}
${steps.map((item, i) => `${i + 1}. ${item}`).join("\n")}`;
};

export const createNotesList = (notes: string[]) => {
  return `
${chalk.bold.underline("Notes")}
${notes.map((item) => `- ${item}`).join("\n")}`;
};

const formatInstallList = (installList: string[]) => {
  return `${"The following packages are now installed and configured:"}
- ${installList.join("\n- ")}`;
};

export const showNextSteps = (
  installList: string[],
  steps: string[],
  notes: string[],
  duration: number
) => {
  const nextStepsFormatted = `🚀 Thanks for using sksn to kickstart your express app!

${formatInstallList(installList)}

${chalk.bgGreen(
  `[installed and configured in just ${duration / 1000} seconds]`
)}
${createNextStepsList(steps)}
${notes.length > 0 ? createNotesList(notes) : ""}

Hint: use \`sksn generate\` to quickly scaffold entire entities for your application`;
  consola.box(nextStepsFormatted);
};
