import Ajv, { ErrorObject, Schema } from "ajv";
import addFormats from "ajv-formats";

export const ajv = addFormats(new Ajv({ allErrors: true }), {
  formats: [
    "date",
    "time",
    "date-time",
    "duration",
    "uri",
    "uri-reference",
    "uri-template",
    "email",
    "hostname",
    "ipv4",
    "ipv6",
    "regex",
    "uuid",
    "json-pointer",
    "relative-json-pointer",
    "byte",
    "int32",
    "int64",
    "float",
    "double",
    "password",
    "binary",
  ],
});

function getAdditionalProperties() {
  return ajv.errors
    ?.filter((error) => error.keyword === "additionalProperties")
    .map((error) => error.params.additionalProperty);
}

function formatErrors(
  errors: ErrorObject<string, Record<string, string>, unknown>[],
  additionalProperties: string[] | undefined
) {
  const errorTexts = errors.map((error) => ajv.errorsText([error]));
  let additionalPropsText = "";

  if (additionalProperties && additionalProperties.length > 0) {
    additionalPropsText = `data must NOT have additional properties: ${additionalProperties.join(", ")}`;
  }

  return [...errorTexts, additionalPropsText].filter(Boolean);
}

export function validate(
  scheme: string | Schema,
  data: unknown
): { valid: true; error: undefined } | { valid: false; error: string[] } {
  ajv.validate(scheme, data);
  const errors = ajv.errors;
  if (errors) {
    const additionalProperties = getAdditionalProperties();
    return {
      valid: false,
      error: formatErrors(errors, additionalProperties),
    };
  }
  return { valid: true, error: undefined };
}
