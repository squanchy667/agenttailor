/**
 * Minimal Zod-to-JSON-Schema converter for MCP tool input schemas.
 * Supports the subset of Zod types used by our MCP tool inputs.
 */

import type { ZodTypeAny, ZodObject } from 'zod';

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  default?: unknown;
  enum?: string[];
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
}

function zodTypeToJsonSchema(schema: ZodTypeAny): JsonSchema {
  const def = schema._def as Record<string, unknown>;
  const description = def['description'] as string | undefined;

  // ZodDefault — unwrap and add default
  if (def['typeName'] === 'ZodDefault') {
    const inner = zodTypeToJsonSchema(def['innerType'] as ZodTypeAny);
    inner.default = (def as { defaultValue: () => unknown }).defaultValue();
    if (description) inner.description = description;
    return inner;
  }

  // ZodOptional — unwrap
  if (def['typeName'] === 'ZodOptional') {
    const inner = zodTypeToJsonSchema(def['innerType'] as ZodTypeAny);
    if (description) inner.description = description;
    return inner;
  }

  // ZodString
  if (def['typeName'] === 'ZodString') {
    const result: JsonSchema = { type: 'string' };
    if (description) result.description = description;
    return result;
  }

  // ZodNumber
  if (def['typeName'] === 'ZodNumber') {
    const result: JsonSchema = { type: 'number' };
    if (description) result.description = description;
    return result;
  }

  // ZodBoolean
  if (def['typeName'] === 'ZodBoolean') {
    const result: JsonSchema = { type: 'boolean' };
    if (description) result.description = description;
    return result;
  }

  // ZodEnum
  if (def['typeName'] === 'ZodEnum') {
    const result: JsonSchema = {
      type: 'string',
      enum: (def as { values: string[] }).values,
    };
    if (description) result.description = description;
    return result;
  }

  // ZodArray
  if (def['typeName'] === 'ZodArray') {
    const result: JsonSchema = {
      type: 'array',
      items: zodTypeToJsonSchema(def['type'] as ZodTypeAny),
    };
    if (description) result.description = description;
    return result;
  }

  // Fallback
  return { type: 'string' };
}

/**
 * Convert a ZodObject to a JSON Schema object suitable for MCP tool input schemas.
 */
export function zodToJsonSchema(schema: ZodObject<Record<string, ZodTypeAny>>): JsonSchema {
  const shape = schema.shape as Record<string, ZodTypeAny>;
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    properties[key] = zodTypeToJsonSchema(fieldSchema);

    const fieldDef = fieldSchema._def as Record<string, unknown>;
    const isOptional = fieldDef['typeName'] === 'ZodOptional' || fieldDef['typeName'] === 'ZodDefault';
    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}
