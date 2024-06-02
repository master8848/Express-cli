// files:
//  - app/books/page.tsx
//  - app/books/useOptimisticBooks.tsx
//  - components/books/BookList.tsx
//  - components/books/BookForm.tsx
//
//  SHARED - should probably check for these first
//  - components/shared/Modal.tsx (this is shared so will have to do a check that it exists) [DONE]
//  - lib/utils.ts (need to check that the below exists) [DONE]
//  - lib/hooks/useValidatedForm.tsx
// ---
// export type Action = "create" | "update" | "delete";
//
// export type OptimisticAction<T> = {
//   action: Action;
//   data: T;
// };
//
// CURRENT ERROS
// no validated hook [DONE]
// select not being imported
// didn't format imports properly in form

import { ColumnType, DBField } from "../../../types.js";
import pluralize from "pluralize";
import {
  createFile,
  getFileContents,
  readConfigFile,
  replaceFile,
} from "../../../utils.js";
import { addPackage } from "../../add/index.js";
import { formatFilePath, getFilePaths } from "../../filePaths/index.js";
import { ExtendedSchema, Schema } from "../types.js";
import {
  defaultValueMappings,
  formatTableName,
  toCamelCase,
  toNormalEnglish,
} from "../utils.js";
import { existsSync, readFileSync } from "fs";
import { consola } from "consola";
import { addToShadcnComponentList } from "../../add/utils.js";
import { createformInputComponent } from "./views.js";

export const scaffoldViewsAndComponentsReactQuery = async (
  schema: ExtendedSchema
) => {
  const { packages } = readConfigFile();
  const {
    tableNameCamelCase,
    tableNameSingularCapitalised,
    tableNameKebabCase,
    tableNameCapitalised,
    tableNameSingular,
  } = formatTableName(schema.tableName);
  // require trpc for these views
  if (packages.includes("shadcn-ui")) {
    // check if utils correct
    checkUtils();

    // check if modal exists components/shared/Modal.tsx
    checkModalExists();

    // check if modal exists components/shared/BackButton.tsx
    checkBackButtonExists();

    // check if vfh exists
    checkValidatedForm();

    // create view - tableName/page.tsx
    createFile(
      formatFilePath(`app/(app)/${tableNameKebabCase}/page.tsx`, {
        prefix: "rootPath",
        removeExtension: false,
      }),
      generateView(schema)
    );

    // create components/tableName/TableNameList.tsx
    createFile(
      formatFilePath(
        `components/${tableNameCamelCase}/${tableNameSingularCapitalised}List.tsx`,
        { removeExtension: false, prefix: "rootPath" }
      ),
      createListComponent(schema)
    );

    // create components/tableName/TableNameForm.tsx
    createFile(
      formatFilePath(
        `components/${tableNameCamelCase}/${tableNameSingularCapitalised}Form.tsx`,
        { prefix: "rootPath", removeExtension: false }
      ),
      createFormComponent(schema)
    );

    // create optimisticEntity
    createFile(
      formatFilePath(
        `app/(app)/${tableNameKebabCase}/useOptimistic${tableNameCapitalised}.tsx`,
        {
          prefix: "rootPath",
          removeExtension: false,
        }
      ),
      createOptimisticListHook(schema)
    );

    // install shadcn packages (button, dialog, form, input, label) - exec script: pnpm dlx shadcn-ui@latest add _
    // const baseComponents = ["button", "dialog", "form", "input", "label"];
    const baseComponents = ["dialog"];
    schema.fields.filter((field) => field.type.toLowerCase() === "boolean")
      .length > 0
      ? baseComponents.push("checkbox")
      : null;
    schema.fields.filter((field) => field.type.toLowerCase() === "references")
      .length > 0
      ? baseComponents.push("select")
      : null;
    schema.fields.filter(
      (field) =>
        field.type.toLowerCase() === "date" ||
        field.type.toLowerCase() === "timestamp" ||
        field.type.toLowerCase() === "datetime"
    ).length > 0
      ? baseComponents.push("popover", "calendar")
      : null;
    // await installShadcnUIComponents(baseComponents);
    addToShadcnComponentList(baseComponents);
  } else {
    addPackage();
  }
};

const getRelations = (fields: DBField[]) => {
  return fields.filter((field) => field.type.toLowerCase() === "references");
};

const formatRelations = (relations: DBField[]) => {
  const { shared } = getFilePaths();
  return relations.map((relation) => {
    const {
      tableNameCapitalised,
      tableNameCamelCase,
      tableNameSingularCapitalised,
      tableNameSingular,
    } = formatTableName(relation.references);
    const importStatementQueries = `import { get${tableNameCapitalised} } from "${formatFilePath(
      shared.orm.servicesDir.concat(`/${tableNameCamelCase}/queries.ts`),
      { prefix: "alias", removeExtension: true }
    )}";`;
    const importStatementSchemaType = `import { type ${tableNameSingularCapitalised} } from "${formatFilePath(
      shared.orm.schemaDir.concat(`/${tableNameCamelCase}`),
      { prefix: "alias", removeExtension: false }
    )}";`;

    const importStatementCompleteSchemaType = `import { type ${tableNameSingularCapitalised}, type ${tableNameSingularCapitalised}Id } from "${formatFilePath(
      shared.orm.schemaDir.concat(`/${tableNameCamelCase}`),
      { prefix: "alias", removeExtension: false }
    )}";`;

    const invocation = `const { ${tableNameCamelCase} } = await get${tableNameCapitalised}();`;
    const componentImport = `${tableNameCamelCase}: ${tableNameSingularCapitalised}[]`;
    const componentImportCompleteType = `${tableNameCamelCase}: ${tableNameSingularCapitalised}[]`;
    const componentImportCompleteTypeAndId = `${tableNameCamelCase}: ${tableNameSingularCapitalised}[];\n  ${tableNameSingular}Id?: ${tableNameSingularCapitalised}Id`;

    const mapped = `${tableNameCamelCase}.map(${tableNameSingular} => ${tableNameSingular}.${tableNameSingular})`;

    const props = `${tableNameCamelCase}={${tableNameCamelCase}}`;
    const propsWithMap = `${tableNameCamelCase}={${mapped}}`;
    const propsWithId = `${tableNameCamelCase}={${tableNameCamelCase}}\n        ${tableNameSingular}Id={${tableNameSingular}Id}`;

    const propsWithMapWithCustomId = (id: string) =>
      `${tableNameCamelCase}={${mapped}}\n        ${tableNameSingular}Id={${id}.${tableNameSingular}Id}`;
    const propsWithCustomId = (id: string) =>
      `${tableNameCamelCase}={${tableNameCamelCase}}\n        ${tableNameSingular}Id={${id}.${tableNameSingular}Id}`;

    const optimisticFind = `const optimistic${tableNameSingularCapitalised} = ${tableNameCamelCase}.find(
        (${tableNameSingular}) => ${tableNameSingular}.id === data.${tableNameSingular}Id,
      )!;`;
    const optimisticEntityRelation = `${tableNameSingular}: optimistic${tableNameSingularCapitalised},`;

    const tableNameSingularWithId = tableNameSingular + "Id";
    const tnCamelCaseAndTnId =
      tableNameCamelCase + ",\n  " + tableNameSingularWithId;

    return {
      importStatementQueries,
      importStatementSchemaType,
      invocation,
      props,
      componentImport,
      tableNameCamelCase,
      tableNameSingularCapitalised,
      optimisticEntityRelation,
      optimisticFind,
      hasJoins: false,
      importStatementCompleteSchemaType,
      componentImportCompleteType,
      mapped,
      propsWithMap,
      tnCamelCaseAndTnId,
      componentImportCompleteTypeAndId,
      propsWithId,
      tableNameSingularWithId,
      propsWithCustomId,
      propsWithMapWithCustomId,
    };
  });
};
//DONE
const generateView = (schema: Schema) => {
  const {
    tableNameCamelCase,
    tableNameSingularCapitalised,
    tableNameCapitalised,
    tableNameNormalEnglishCapitalised,
  } = formatTableName(schema.tableName);
  const { shared } = getFilePaths();
  const relations = getRelations(schema.fields);
  const relationsFormatted = formatRelations(relations);

  return `import { Suspense } from "react";

import Loading from "${formatFilePath("app/loading", {
    prefix: "alias",
    removeExtension: false,
  })}";
import ${tableNameSingularCapitalised}List from "${formatFilePath(
    `components/${tableNameCamelCase}/${tableNameSingularCapitalised}List`,
    { removeExtension: false, prefix: "alias" }
  )}";
import { get${tableNameCapitalised} } from "${formatFilePath(
    shared.orm.servicesDir.concat(`/${tableNameCamelCase}/queries.ts`),
    { prefix: "alias", removeExtension: true }
  )}";
${
  relationsFormatted
    ? relationsFormatted
        .map((relation) => relation.importStatementQueries)
        .join("\n")
    : ""
}${
    schema.belongsToUser
      ? `\nimport { checkAuth } from "${formatFilePath(shared.auth.authUtils, {
          prefix: "alias",
          removeExtension: true,
        })}";`
      : ""
  }

export const revalidate = 0;

export default async function ${tableNameCapitalised}Page() {
  return (
    <main>
      <div className="relative">
        <div className="flex justify-between">
          <h1 className="font-semibold text-2xl my-2">${tableNameNormalEnglishCapitalised}</h1>
        </div>
        <${tableNameCapitalised} />
      </div>
    </main>
  );
}

const ${tableNameCapitalised} = async () => {
  ${schema.belongsToUser ? "await checkAuth();\n" : ""}
  const { ${tableNameCamelCase} } = await get${tableNameCapitalised}();
  ${
    relationsFormatted
      ? relationsFormatted.map((relation) => relation.invocation).join("\n  ")
      : ""
  }
  return (
    <Suspense fallback={<Loading />}>
      <${tableNameSingularCapitalised}List ${tableNameCamelCase}={${tableNameCamelCase}} ${
    relationsFormatted
      ? relationsFormatted
          .map((relation) =>
            relation.hasJoins ? relation.propsWithMap : relation.props
          )
          .join(" ")
      : ""
  } />
    </Suspense>
  );
};
`;
};

const createListComponent = (schema: ExtendedSchema) => {
  const {
    tableNameCamelCase,
    tableNameSingular,
    tableNameSingularCapitalised,
    tableNameNormalEnglishSingularLowerCase,
    tableNameNormalEnglishLowerCase,
    tableNamePluralCapitalised,
    tableNameKebabCase,
    tableNameNormalEnglishCapitalised,
    tableNameNormalEnglishSingular,
  } = formatTableName(schema.tableName);
  const { shared } = getFilePaths();
  const relations = getRelations(schema.fields);
  const relationsFormatted = formatRelations(relations);
  const entityName = tableNameSingular;
  const hasParents = schema.parents.length > 0;
  const parents = hasParents
    ? schema.parents.map((p) => formatTableName(p))
    : [];

  return `"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "${formatFilePath(`lib/utils`, {
    prefix: "alias",
    removeExtension: false,
  })}";
import { type ${tableNameSingularCapitalised}, Complete${tableNameSingularCapitalised} } from "${formatFilePath(
    shared.orm.schemaDir.concat(`/${tableNameCamelCase}`),
    { prefix: "alias", removeExtension: false }
  )}";
import Modal from "${formatFilePath(`components/shared/Modal.tsx`, {
    removeExtension: true,
    prefix: "alias",
  })}";
${
  relationsFormatted
    ? relationsFormatted
        .map((relation) => relation.importStatementCompleteSchemaType)
        .join("\n")
    : ""
}
import { useOptimistic${tableNamePluralCapitalised} } from "${formatFilePath(
    `app/(app)/${tableNameKebabCase}/useOptimistic${tableNamePluralCapitalised}`,
    { prefix: "alias", removeExtension: false }
  )}";
import { Button } from "${formatFilePath(`components/ui/button`, {
    prefix: "alias",
    removeExtension: false,
  })}";
import ${tableNameSingularCapitalised}Form from "./${tableNameSingularCapitalised}Form";
import { PlusIcon } from "lucide-react";

type TOpenModal = (${tableNameSingular}?: ${tableNameSingularCapitalised}) => void;

export default function ${tableNameSingularCapitalised}List({
  ${tableNameCamelCase},
  ${
    relationsFormatted
      ? relationsFormatted
          .map((relation) => relation.tnCamelCaseAndTnId)
          .join(",\n  ")
      : ""
  } 
}: {
  ${tableNameCamelCase}: Complete${tableNameSingularCapitalised}[];
  ${
    relationsFormatted
      ? relationsFormatted
          .map((relation) => relation.componentImportCompleteTypeAndId)
          .join(";\n  ")
      : ""
  } 
}) {
  const { optimistic${tableNamePluralCapitalised}, addOptimistic${tableNameSingularCapitalised} } = useOptimistic${tableNamePluralCapitalised}(
    ${tableNameCamelCase},
    ${
      relationsFormatted
        ? relationsFormatted
            .map((relation) => relation.tableNameCamelCase)
            .join(",\n  ")
        : ""
    } 
  );
  const [open, setOpen] = useState(false);
  const [active${tableNameSingularCapitalised}, setActive${tableNameSingularCapitalised}] = useState<${tableNameSingularCapitalised} | null>(null);
  const openModal = (${tableNameSingular}?: ${tableNameSingularCapitalised}) => {
    setOpen(true);
    ${tableNameSingular} ? setActive${tableNameSingularCapitalised}(${tableNameSingular}) : setActive${tableNameSingularCapitalised}(null);
  };
  const closeModal = () => setOpen(false);

  return (
    <div>
      <Modal
        open={open}
        setOpen={setOpen}
        title={active${tableNameSingularCapitalised} ? "Edit ${tableNameSingularCapitalised}" : "Create ${tableNameNormalEnglishSingular}"}
      >
        <${tableNameSingularCapitalised}Form
          ${tableNameSingular}={active${tableNameSingularCapitalised}}
          addOptimistic={addOptimistic${tableNameSingularCapitalised}}
          openModal={openModal}
          closeModal={closeModal}
          ${
            relationsFormatted
              ? relationsFormatted
                  .map((relation) => relation.propsWithId)
                  .join("\n        ")
              : ""
          }
        />
      </Modal>
      <div className="absolute right-0 top-0 ">
        <Button onClick={() => openModal()} variant={"outline"}>
          +
        </Button>
      </div>
      {optimistic${tableNamePluralCapitalised}.length === 0 ? (
        <EmptyState openModal={openModal} />
      ) : (
        <ul>
          {optimistic${tableNamePluralCapitalised}.map((${tableNameSingular}) => (
            <${tableNameSingularCapitalised}
              ${tableNameSingular}={${tableNameSingular}}
              key={${entityName}.id}
              openModal={openModal}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

const ${tableNameSingularCapitalised} = ({
  ${tableNameSingular},
  openModal,
}: {
  ${tableNameSingular}: Complete${tableNameSingularCapitalised};
  openModal: TOpenModal;
}) => {
  const optimistic = ${entityName}.id === "optimistic";
  const deleting = ${entityName}.id === "delete";
  const mutating = optimistic || deleting;
  const pathname = usePathname();
  const basePath = pathname.includes("${tableNameKebabCase}")
    ? pathname
    : pathname + "/${tableNameKebabCase}/";


  return (
    <li
      className={cn(
        "flex justify-between my-2",
        mutating ? "opacity-30 animate-pulse" : "",
        deleting ? "text-destructive" : "",
      )}
    >
      <div className="w-full">
        <div>{${entityName}.${toCamelCase(schema.fields[0].name)}${
    schema.fields[0].type === "date" ||
    schema.fields[0].type === "timestamp" ||
    schema.fields[0].type === "DateTime"
      ? ".toUTCString()"
      : ""
  }}</div>
      </div>
      <Button variant={"link"} asChild>
        <Link href={ basePath + "/" + ${entityName}.id }>
          Edit
        </Link>
      </Button>
    </li>
  );
};

const EmptyState = ({ openModal }: { openModal: TOpenModal }) => {
  return (
    <div className="text-center">
      <h3 className="mt-2 text-sm font-semibold text-secondary-foreground">
        No ${tableNameNormalEnglishLowerCase}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Get started by creating a new ${tableNameNormalEnglishSingularLowerCase}.
      </p>
      <div className="mt-6">
        <Button onClick={() => openModal()}>
          <PlusIcon className="h-4" /> New ${tableNameNormalEnglishCapitalised} </Button>
      </div>
    </div>
  );
};
`;
};

const createFormInputComponentImports = (field: ColumnType) => {
  switch (field) {
    case "boolean":
    case "Boolean":
      return `import { Checkbox } from "${formatFilePath(
        `components/ui/checkbox`,
        {
          prefix: "alias",
          removeExtension: false,
        }
      )}"`;
    case "references":
    case "References":
      return `import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "${formatFilePath(`components/ui/select`, {
        prefix: "alias",
        removeExtension: false,
      })}";`;
    case "date":
    case "DateTime":
    case "timestamp":
      return `import { Popover, PopoverContent, PopoverTrigger } from "${formatFilePath(
        `components/ui/popover`,
        {
          prefix: "alias",
          removeExtension: false,
        }
      )}";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "${formatFilePath(`components/ui/calendar`, {
        prefix: "alias",
        removeExtension: false,
      })}";
import { format } from "date-fns";`;
    default:
      return "";
  }
};

const createFormComponent = (schema: Schema) => {
  const {
    tableNameCamelCase,
    tableNameSingular,
    tableNameSingularCapitalised,
    tableNamePluralCapitalised,
    tableNameKebabCase,
  } = formatTableName(schema.tableName);
  const { packages, driver, alias, t3 } = readConfigFile();
  const { shared } = getFilePaths();
  const relations = schema.fields.filter(
    (field) => field.type.toLowerCase() === "references"
  );

  // terrible code, rewrite
  const relationsFormattedNew = formatRelations(relations);
  const relationsFormatted = relations.map((relation) => {
    const {
      tableNameCapitalised,
      tableNameCamelCase,
      tableNameSingularCapitalised,
      tableNameSingular,
    } = formatTableName(relation.references);
    const importStatement = `import { type ${tableNameSingularCapitalised} } from "${formatFilePath(
      shared.orm.schemaDir.concat(`/${tableNameCamelCase}.ts`),
      { prefix: "alias", removeExtension: true }
    )}";`;
    const invocation = `const { ${tableNameCamelCase} } = get${tableNameCapitalised}();`;
    const props = `${tableNameCamelCase}: ${tableNameSingularCapitalised}[];`;
    return {
      importStatement,
      invocation,
      props,
      tableNameSingularCapitalised,
      tableNameCamelCase,
      tableNameSingular,
    };
  });

  const dateFields = schema.fields.filter(
    (field) =>
      field.type === "date" ||
      field.type === "DateTime" ||
      field.type === "timestamp"
  );
  const uniqueFieldTypes = [
    ...new Set(schema.fields.map((field) => field.type)),
  ] as ColumnType[];

  return `
  "use client";
  import { z } from "zod";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  ${packages.includes("shadcn-ui") ? `\nimport { toast } from "sonner";` : ""}


  import {
    create${tableNameSingularCapitalised}Action,
    delete${tableNameSingularCapitalised}Action,
    update${tableNameSingularCapitalised}Action,
  } from "${formatFilePath(`lib/actions/${tableNameCamelCase}`, {
    prefix: "alias",
    removeExtension: false,
  })}";
  import { ${tableNameSingularCapitalised}, New${tableNameSingularCapitalised}Params, insert${tableNameSingularCapitalised}Params } from "${formatFilePath(
    shared.orm.schemaDir,
    { prefix: "alias", removeExtension: false }
  )}/${tableNameCamelCase}";

    import {
      Form,
      FormControl,
      FormField,
      FormItem,
      FormLabel,
      FormMessage,
    } from "${alias}/components/ui/form";
    import { Input } from "${alias}/components/ui/input";
    import { Button } from "${alias}/components/ui/button";${
    schema.fields.filter((field) => field.type.toLowerCase() === "boolean")
      .length > 0
      ? `\nimport { Checkbox } from "${alias}/components/ui/checkbox";`
      : ""
  }${
    relations.length > 0
      ? `\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "${alias}/components/ui/select";`
      : ""
  }${
    schema.fields.filter(
      (field) =>
        field.type === "date" ||
        field.type === "timestamp" ||
        field.type === "DateTime"
    ).length > 0
      ? `import { Popover, PopoverContent, PopoverTrigger } from "${alias}/components/ui/popover";
        import { CalendarIcon } from "lucide-react";
        import { Calendar } from "${alias}/components/ui/calendar";`
      : ""
  }
import { type Action, cn } from "${formatFilePath(shared.init.libUtils, {
    prefix: "alias",
    removeExtension: true,
  })}";

import { useRouter } from "next/navigation";

import { useBackPath } from "${formatFilePath(`components/shared/BackButton`, {
    prefix: "alias",
    removeExtension: false,
  })}";

${uniqueFieldTypes
  .map((field) => createFormInputComponentImports(field))
  .join("\n")}



${
  relationsFormattedNew
    ? relationsFormattedNew
        .map((relation) => relation.importStatementCompleteSchemaType)
        .join("\n")
    : ""
}

const ${tableNameSingularCapitalised}Form = ({
  ${tableNameSingular},
  closeModal,
}: {
  ${tableNameSingular}?: ${tableNameSingularCapitalised};
  closeModal?: () => void;
}) =>  {
    const form = useForm<z.infer<typeof insert${tableNameSingularCapitalised}Params>>({
      resolver: zodResolver(insert${tableNameSingularCapitalised}Params),
      defaultValues: ${tableNameSingular} ?? {
        ${schema.fields
          .map(
            (field) =>
              `${toCamelCase(field.name)}: ${
                defaultValueMappings[driver][field.type]
              }`
          )
          .join(",\n     ")}
      },
    });
  const editing = !!${tableNameSingular}?.id;
  ${
    dateFields.length > 0
      ? dateFields.map((field) => {
          const {
            tableNameCamelCase: camelCase,
            tableNameCapitalised: capitalised,
          } = formatTableName(field.name);
          return `  const [${camelCase}, set${capitalised}] = useState<Date | undefined>(
    ${tableNameSingular}?.${camelCase},
  );
`;
        })
      : ""
  }
  const [isDeleting, setIsDeleting] = useState(false);
  const [pending, startMutation] = useTransition();


  const { mutate: create${tableNameSingularCapitalised}, isLoading: isCreating } = useMutation({
    mutationFn: (values) => create${tableNameSingularCapitalised}Action(values),
    onSuccess: (res) => onSuccess("create"),
    onError: (err) => console.error({ error: err.message }),
  });

  const { mutate: update${tableNameSingularCapitalised}, isLoading: isUpdating } = useMutation({
    mutationFn: (values) =>
      update${tableNameSingularCapitalised}Action({ ...values, id: ${tableNameSingular}?.id || "" }),

    onSuccess: (res) => onSuccess("update"),
    onError: (err) => console.error({ error: err.message }),
  });

  const { mutate: delete${tableNameSingularCapitalised}, isLoading: isDeleting } = useMutation({
    mutationFn: (values) =>
      delete${tableNameSingularCapitalised}Action(${tableNameSingular}?.id as string),
    onSuccess: (res) => onSuccess("delete"),
    onError: (err) => console.error({ error: err.message }),
  });

  const router = useRouter();
  const backpath = useBackPath("${tableNameKebabCase}");



  const onSuccess = (
    action: Action,
    data?: { error: string; values: ${tableNameSingularCapitalised} },
  ) => {
    const failed = Boolean(data?.error);
    if (failed) {
      openModal && openModal(data?.values);
      toast.error(\`Failed to \${action}\`, {
        description: data?.error ?? "Error",
      });
      return;
    }
    router.refresh();
    postSuccess?.();
    closeModal?.();
    toast.success(\`${tableNameSingularCapitalised} \${action}d!\`);
    if (action === "delete") router.push(backpath);
  };

  const handleSubmit = (values: New${tableNameSingularCapitalised}Params) => {
    if (editing) {
      update${tableNameSingularCapitalised}({ ...values, id: ${tableNameSingular}.id });
    } else {
      create${tableNameSingularCapitalised}(values);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={"space-y-8"}>
        ${schema.fields
          .map(
            (field) => `<FormField
          control={form.control}
          name="${toCamelCase(field.name)}"
          render={({ field }) => (<FormItem>
              <FormLabel>${toNormalEnglish(field.name)}</FormLabel>
                ${createformInputComponent(field)}
              <FormMessage />
            </FormItem>
          )}
        />`
          )
          .join("\n        ")}
        <Button
          type="submit"
          className="mr-1"
          disabled={isCreating || isUpdating}
        >
          {editing
            ? \`Sav\${isUpdating ? "ing..." : "e"}\`
            : \`Creat\${isCreating ? "ing..." : "e"}\`}
        </Button>
        {editing ? (
          <Button
            type="button"
            variant={"destructive"}
            onClick={() => delete${tableNameSingularCapitalised}({ id: ${tableNameSingular}.id })}
          >
            Delet{isDeleting ? "ing..." : "e"}
          </Button>
        ) : null}
      </form>
    </Form>
  );
};

export default ${tableNameSingularCapitalised}Form;

};
`;
};

const checkUtils = () => {
  const utilTsPath = formatFilePath("lib/utils.ts", {
    removeExtension: false,
    prefix: "rootPath",
  });

  const utilTsExists = existsSync(utilTsPath);
  if (!utilTsExists) consola.error("Utils do not exists");

  const utilTsContent = readFileSync(utilTsPath, "utf-8");
  const contentToQuery = `export type Action = "create" | "update" | "delete";

export type OptimisticAction<T> = {
  action: Action;
  data: T;
};
`;
  if (utilTsContent.includes(contentToQuery)) {
    return;
  } else {
    const newUtilTs = utilTsContent.concat("\n\n".concat(contentToQuery));
    replaceFile(utilTsPath, newUtilTs);
  }
};

const checkModalExists = () => {
  const modalPath = formatFilePath("components/shared/Modal.tsx", {
    removeExtension: false,
    prefix: "rootPath",
  });

  const modalExists = existsSync(modalPath);
  if (!modalExists) {
    const modalContents = `import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "${formatFilePath(`components/ui/dialog`, {
      prefix: "alias",
      removeExtension: false,
    })}";

export default function Modal({
  title,
  open,
  setOpen,
  children,
}: {
  title?: string;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
}) {
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>{title ?? "Modal"}</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
`;
    createFile(modalPath, modalContents);
  }
};

const checkBackButtonExists = () => {
  const bbPath = formatFilePath("components/shared/BackButton.tsx", {
    removeExtension: false,
    prefix: "rootPath",
  });

  const bbExists = existsSync(bbPath);
  if (!bbExists) {
    const bbContents = `
"use client";

import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "${formatFilePath("components/ui/button", {
      removeExtension: false,
      prefix: "alias",
    })}";


export function useBackPath(currentResource: string) {
  const pathname = usePathname();
  const segmentCount = pathname.slice(1).split("/");
  const backPath =
    segmentCount.length > 2
      ? pathname.slice(0, pathname.indexOf(currentResource) - 1)
      : pathname.slice(0, pathname.indexOf(segmentCount[1]));
  return backPath;
}

export function BackButton({
  currentResource,
}: {
  /* must be in kebab-case */
  currentResource: string;
}) {
  const backPath = useBackPath(currentResource);
  return (
    <Button variant={"ghost"} asChild>
      <Link href={backPath}>
        <ChevronLeftIcon />
      </Link>
    </Button>
  );
}
`;
    createFile(bbPath, bbContents);
  }
};

const createOptimisticListHook = (schema: Schema) => {
  const {
    tableNameCamelCase,
    tableNameSingularCapitalised,
    tableNamePluralCapitalised,
    tableNameSingular,
  } = formatTableName(schema.tableName);

  const { shared } = getFilePaths();
  const relations = getRelations(schema.fields);
  const relationsFormatted = formatRelations(relations);
  return `${
    relationsFormatted
      ? relationsFormatted
          .map((relation) => relation.importStatementSchemaType)
          .join("\n")
      : ""
  }
import { type ${tableNameSingularCapitalised}, type Complete${tableNameSingularCapitalised} } from "${formatFilePath(
    shared.orm.schemaDir.concat(`/${tableNameCamelCase}`),
    { prefix: "alias", removeExtension: false }
  )}";
import { OptimisticAction } from "${formatFilePath(shared.init.libUtils, {
    prefix: "alias",
    removeExtension: true,
  })}";
import { useOptimistic } from "react";

export type TAddOptimistic = (action: OptimisticAction<${tableNameSingularCapitalised}>) => void;

export const useOptimistic${tableNamePluralCapitalised} = (
  ${tableNameCamelCase}: Complete${tableNameSingularCapitalised}[],
  ${
    relationsFormatted
      ? relationsFormatted
          .map((relation) => relation.componentImport)
          .join(",\n  ")
      : ""
  }
) => {
  const [optimistic${tableNamePluralCapitalised}, addOptimistic${tableNameSingularCapitalised}] = useOptimistic(
    ${tableNameCamelCase},
    (
      currentState: Complete${tableNameSingularCapitalised}[],
      action: OptimisticAction<${tableNameSingularCapitalised}>,
    ): Complete${tableNameSingularCapitalised}[] => {
      const { data } = action;

      ${
        relationsFormatted
          ? relationsFormatted
              .map((relation) => relation.optimisticFind)
              .join("\n\n      ")
          : ""
      }

      ${`const optimistic${tableNameSingularCapitalised} = {
        ...data,${
          relationsFormatted
            ? "\n        ".concat(
                relationsFormatted
                  .map((relation) => relation.optimisticEntityRelation)
                  .join("\n       ")
              )
            : ""
        }
        id: "optimistic",
      };`}

      switch (action.action) {
        case "create":
          return currentState.length === 0
            ? [optimistic${tableNameSingularCapitalised}]
            : [...currentState, optimistic${tableNameSingularCapitalised}];
        case "update":
          return currentState.map((item) =>
            item.id === data.id ? { ...item, ...optimistic${tableNameSingularCapitalised} } : item,
          );
        case "delete":
          return currentState.map((item) =>
        item.id === data.id ? { ...item, id: "delete" } : item,
          );
        default:
          return currentState;
      }
    },
  );

  return { addOptimistic${tableNameSingularCapitalised}, optimistic${tableNamePluralCapitalised} };
};
`;
};

const checkValidatedForm = () => {
  const vfhPath = formatFilePath("lib/hooks/useValidatedForm.tsx", {
    prefix: "rootPath",
    removeExtension: false,
  });

  const vfhContent = `"use client";

import { FormEvent, useState } from "react";
import { ZodSchema } from "zod";

type EntityZodErrors<T> = Partial<Record<keyof T, string[] | undefined>>;

export function useValidatedForm<Entity>(insertEntityZodSchema: ZodSchema) {
  const [errors, setErrors] = useState<EntityZodErrors<Entity> | null>(null);
  const hasErrors =
    errors !== null &&
    Object.values(errors).some((error) => error !== undefined);

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target as EventTarget;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    ) {
      if (!(target instanceof HTMLInputElement && target.type === "submit")) {
        const field = target.name as keyof Entity;
        const result = insertEntityZodSchema.safeParse({
          [field]: target.value,
        });
        const fieldError = result.success
          ? undefined
          : result.error.flatten().fieldErrors[field];

        setErrors((prev) => ({
          ...prev,
          [field]: fieldError,
        }));
      }
    }
  };
  return { errors, setErrors, handleChange, hasErrors };
}
`;

  const vfhExists = existsSync(vfhPath);
  if (!vfhExists) {
    createFile(vfhPath, vfhContent);
  }
};

const queryHasJoins = (tableName: string) => {
  // const { hasSrc } = readConfigFile();
  const { orm } = readConfigFile();
  return false;
};
