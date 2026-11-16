// Strict JSON Schema validation (draft 2020-12, Ajv) with field-level errors.
import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { readFile } from "node:fs/promises";

// ajv-formats ships CJS; under NodeNext the default import is the module object.
const addFormats = ((addFormatsModule as unknown as { default?: unknown }).default ?? addFormatsModule) as (a: Ajv2020) => void;

export interface FieldError {
  /** JSON Pointer of the offending field, e.g. "/invoice/sessions/3/date". */
  path: string;
  message: string;
}

export class SchemaError extends Error {
  readonly errors: FieldError[];
  readonly subject: string;
  constructor(subject: string, errors: FieldError[]) {
    super(`${subject}: ${errors.map((e) => `${e.path || "/"} ${e.message}`).join("; ")}`);
    this.name = "SchemaError";
    this.subject = subject;
    this.errors = errors;
  }
}

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);
ajv.addKeyword({ keyword: "x-brand", schemaType: "boolean" });

function toFieldErrors(errs: ErrorObject[] | null | undefined): FieldError[] {
  return (errs ?? []).map((e) => {
    let p = e.instancePath;
    let message = e.message ?? "is invalid";
    if (e.keyword === "required") {
      p += `/${(e.params as { missingProperty: string }).missingProperty}`;
      message = "is required";
    }
    if (e.keyword === "additionalProperties") {
      p += `/${(e.params as { additionalProperty: string }).additionalProperty}`;
      message = "is not an allowed field";
    }
    if (e.keyword === "enum") message += `: ${(e.params as { allowedValues: unknown[] }).allowedValues.join(", ")}`;
    return { path: p, message };
  });
}

const compiled = new Map<string, Promise<ValidateFunction>>();

export type Validator = (data: unknown, subject: string) => void;

export async function validatorFor(schemaPath: string): Promise<Validator> {
  let p = compiled.get(schemaPath);
  if (!p) {
    p = readFile(schemaPath, "utf8").then((s) => {
      let schema;
      try {
        schema = JSON.parse(s);
      } catch (e) {
        throw new Error(`${schemaPath}: ${(e as Error).message}`);
      }
      return ajv.getSchema(schema.$id) ?? ajv.compile(schema);
    });
    compiled.set(schemaPath, p);
    p.catch(() => compiled.delete(schemaPath));
  }
  const fn = await p;
  return (data, subject) => {
    if (!fn(data)) throw new SchemaError(subject, toFieldErrors(fn.errors));
  };
}
