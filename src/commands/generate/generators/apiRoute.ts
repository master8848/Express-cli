import { DBType } from "../../../types.js";
import { createFile, readConfigFile } from "../../../utils.js";
import { formatFilePath, getFilePaths } from "../../filePaths/index.js";
import { Schema } from "../types.js";
import { formatTableName, toCamelCase } from "../utils.js";

export const scaffoldAPIRoute = (schema: Schema) => {
  const { hasSrc, driver } = readConfigFile();
  const { tableName } = schema;
  const path = `${hasSrc ? "src/" : ""}app/api/${toCamelCase(tableName)}.ts`;
  createFile(path, generateRouteContent(schema, driver));
};

const generateRouteContent = (schema: Schema, driver: DBType) => {
  const { tableName } = schema;
  const {
    tableNameSingularCapitalised,
    tableNameSingular,
    tableNameCamelCase,
  } = formatTableName(tableName);
  const { shared } = getFilePaths();

  const template = `import {  Request, Response, NextFunction  } from "express";
import { z } from "zod";

import {
  create${tableNameSingularCapitalised},
  delete${tableNameSingularCapitalised},
  update${tableNameSingularCapitalised},
} from "${formatFilePath(shared.orm.servicesDir, {
    prefix: "alias",
    removeExtension: false,
  })}/${tableNameCamelCase}/mutations";
import { 
  ${tableNameSingular}IdSchema,
  insert${tableNameSingularCapitalised}Params,
  update${tableNameSingularCapitalised}Params 
} from "${formatFilePath(shared.orm.schemaDir, {
    prefix: "alias",
    removeExtension: false,
  })}/${tableNameCamelCase}";

export const  ${tableNameCamelCase}Get=async function (req: Request,res:Response,next:NextFunction) {
  try {
    const validatedData = insert${tableNameSingularCapitalised}Params.parse(req.body);
    const { ${
      driver === "mysql" ? "success" : tableNameSingular
    } } = await create${tableNameSingularCapitalised}(validatedData);

   
     res.json({data:${
       driver === "mysql" ? "success" : tableNameSingular
     },status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
       res.json({ error: err.issues ,status: 400 });
    } else {
       res.json({ error: err , status: 500 });
    }
  }
}
export const  ${tableNameCamelCase}GetOne=async function (req: Request,res:Response,next:NextFunction) {
  try {
    const validatedData = insert${tableNameSingularCapitalised}Params.parse(req.body);
    const { ${
      driver === "mysql" ? "success" : tableNameSingular
    } } = await create${tableNameSingularCapitalised}(validatedData);

   
     res.json({data:${
       driver === "mysql" ? "success" : tableNameSingular
     },status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
       res.json({ error: err.issues ,status: 400 });
    } else {
       res.json({ error: err , status: 500 });
    }
  }
}

export const  ${tableNameCamelCase}Post=async function (req: Request,res:Response,next:NextFunction) {
  try {
    const validatedData = insert${tableNameSingularCapitalised}Params.parse(req.body);
    const { ${
      driver === "mysql" ? "success" : tableNameSingular
    } } = await create${tableNameSingularCapitalised}(validatedData);

   
     res.json({data:${
       driver === "mysql" ? "success" : tableNameSingular
     },status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
       res.json({ error: err.issues ,status: 400 });
    } else {
       res.json({ error: err , status: 500 });
    }
  }
}


export const  ${tableNameCamelCase}Put=async function (req: Request,res:Response,next:NextFunction) {
  try {
    const id = req.query.id

    const validatedData = update${tableNameSingularCapitalised}Params.parse(await req.body);
    const validatedParams = ${tableNameSingular}IdSchema.parse({ id });

    const { ${
      driver === "mysql" ? "success" : tableNameSingular
    } } = await update${tableNameSingularCapitalised}(validatedParams.id, validatedData);

    return res.json({data:${
      driver === "mysql" ? "success" : tableNameSingular
    },status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.json({ error: err.issues , status: 400 });
    } else {
      return res.json({error:err ,status: 500 });
    }
  }
}

export const  ${tableNameCamelCase}Delete=async function (req: Request,res:Response,next:NextFunction) {
  try {
    const id = req.query.id;

    const validatedParams = ${tableNameSingular}IdSchema.parse({ id });
    const { ${
      driver === "mysql" ? "success" : tableNameSingular
    } } = await delete${tableNameSingularCapitalised}(validatedParams.id);

    return res.json({data:${
      driver === "mysql" ? "success" : tableNameSingular
    }, status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.json({ error: err.issues , status: 400 });
    } else {
      return res.json({error:err, status: 500 });
    }
  }
}
`;
  return template;
};
