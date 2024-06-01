import { select } from "@inquirer/prompts";
import { camelCaseToSnakeCase, getCurrentSchemas } from "../generate/utils.js";

// export const removePackage = async (options, init: boolean = false) => {
//   const currentSchemas = getCurrentSchemas();

//   const referencesTable = await select({
//     message: "Which table do you want to remove?",
//     choices: currentSchemas.map((schema) => {
//       return {
//         name: camelCaseToSnakeCase(schema),
//         value: camelCaseToSnakeCase(schema),
//       };
//     }),
//   });
// };
