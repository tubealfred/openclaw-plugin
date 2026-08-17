import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type, type TSchema } from "typebox";
import { OPERATIONS } from "./generated/operations.js";

const PLUGIN_ID = "tubealfred-youtube";
const PRODUCT_NAME = "TubeAlfred OpenClaw plugin";
const PACKAGE_VERSION = "0.1.1";
const DEFAULT_API_URL = "https://api.tubealfred.com";
const DEFAULT_TIMEOUT_MS = 35_000;
const DEFAULT_RETRIES = 1;

type HttpMethod = "GET" | "POST";
type QueryValue = string | number | boolean | undefined;

interface TubeAlfredPluginConfig {
  apiKey?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  retries?: number;
}

interface ResolvedConfig {
  apiKey: string;
  apiBaseUrl: string;
  timeoutMs: number;
  retries: number;
}

interface RequestSpec {
  method?: HttpMethod;
  path: string;
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: TSchema;
  request(params: Record<string, unknown>): RequestSpec;
}

interface ManifestParameter {
  name: string;
  in: "path" | "query" | "body";
  required: boolean;
  schema: {
    type?: string;
    enum?: readonly string[];
    minimum?: number;
    maximum?: number;
  };
}

interface ManifestOperation {
  name: string;
  description: string;
  method: HttpMethod;
  path: string;
  parameters: TSchema;
  request_parameters: readonly ManifestParameter[];
}

function manifestValue(parameter: ManifestParameter, value: unknown): unknown {
  if (parameter.schema.type === "array") {
    return requiredStringList(value, parameter.name);
  }

  if (parameter.schema.type === "integer") {
    const parsed = optionalPositiveInteger(value, parameter.name);

    if (parsed === undefined && parameter.required) {
      throw new Error(`${parameter.name} is required.`);
    }
    if (parsed !== undefined && parameter.schema.maximum !== undefined && parsed > parameter.schema.maximum) {
      throw new Error(`${parameter.name} must be between ${parameter.schema.minimum ?? 1} and ${parameter.schema.maximum}.`);
    }

    return parsed;
  }

  if (parameter.schema.type === "boolean") {
    if (value === undefined) return undefined;
    if (typeof value !== "boolean") throw new Error(`${parameter.name} must be a boolean.`);
    return value;
  }

  if (parameter.schema.enum) {
    const parsed = optionalEnum(value, parameter.schema.enum, parameter.name);
    if (parsed === undefined && parameter.required) throw new Error(`${parameter.name} is required.`);
    return parsed;
  }

  return parameter.required
    ? requiredString(value, parameter.name)
    : optionalString(value);
}

function manifestRequest(
  operation: ManifestOperation,
  params: Record<string, unknown>,
): RequestSpec {
  let path = operation.path;
  const query: Record<string, QueryValue> = {};
  const body: Record<string, unknown> = {};

  for (const parameter of operation.request_parameters) {
    const value = manifestValue(parameter, params[parameter.name]);

    if (parameter.in === "path") {
      path = path.replace(`{${parameter.name}}`, encodeURIComponent(String(value)));
    } else if (parameter.in === "query") {
      query[parameter.name] = value as QueryValue;
    } else if (value !== undefined) {
      body[parameter.name] = value;
    }
  }

  return {
    method: operation.method,
    path,
    query,
    body: Object.keys(body).length === 0 ? undefined : body,
  };
}

const generatedTools: ToolDefinition[] = (OPERATIONS as readonly ManifestOperation[]).map((operation) => ({
  name: operation.name,
  description: operation.description,
  parameters: Type.Unsafe(operation.parameters),
  request: (params) => manifestRequest(operation, params),
}));

const TOOLS: ToolDefinition[] = [
  {
    name: "tubealfred_billing_usage",
    description: "Fetch TubeAlfred credit balance and billing usage.",
    parameters: Type.Object({}),
    request: () => ({ path: "/v1/billing/usage" }),
  },
  ...generatedTools,
];

export default definePluginEntry({
  id: PLUGIN_ID,
  name: "TubeAlfred YouTube",
  description: "Read-only TubeAlfred YouTube API tools plus billing usage lookup for OpenClaw agents.",
  register(api) {
    for (const tool of TOOLS) {
      api.registerTool({
        name: tool.name,
        label: labelForTool(tool.name),
        description: tool.description,
        parameters: tool.parameters,
        async execute(_id, params) {
          const data = await requestTubeAlfred(
            resolveConfig(toRecord(api.pluginConfig)),
            tool.request(toRecord(params)),
          );

          return {
            content: [
              {
                type: "text",
                text: `${JSON.stringify(data, null, 2)}\n`,
              },
            ],
            details: {
              status: "ok",
              data,
            },
          };
        },
      });
    }
  },
});

function labelForTool(name: string): string {
  return name
    .replace(/^tubealfred_(?:youtube_)?/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function resolveConfig(rawConfig: Record<string, unknown>): ResolvedConfig {
  const config = rawConfig as TubeAlfredPluginConfig;
  const apiKey = optionalString(config.apiKey);
  const apiBaseUrl = optionalString(config.apiBaseUrl) ?? DEFAULT_API_URL;
  const timeoutMs = optionalPositiveInteger(config.timeoutMs, "timeoutMs") ?? DEFAULT_TIMEOUT_MS;
  const retries = optionalNonNegativeInteger(config.retries, "retries") ?? DEFAULT_RETRIES;

  if (!apiKey) {
    throw new Error("Missing TubeAlfred API key. Configure plugins.entries.\"tubealfred-youtube\".config.apiKey.");
  }

  if (!/^ta_(live|test)_[A-Za-z0-9_-]+$/.test(apiKey)) {
    throw new Error("TubeAlfred API key must look like ta_live_... or ta_test_....");
  }

  if (timeoutMs < 1_000 || timeoutMs > 300_000) {
    throw new Error("timeoutMs must be between 1000 and 300000.");
  }

  if (retries > 5) {
    throw new Error("retries must be between 0 and 5.");
  }

  return {
    apiKey,
    apiBaseUrl: validateBaseUrl(apiBaseUrl),
    timeoutMs,
    retries,
  };
}

function validateBaseUrl(value: string): string {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      throw new Error("TubeAlfred API base URL must use https unless it points to localhost.");
    }

    return url.toString().replace(/\/+$/, "");
  } catch (error) {
    if (error instanceof Error && error.message.includes("https")) {
      throw error;
    }

    throw new Error("TubeAlfred API base URL must be a valid URL.");
  }
}

async function requestTubeAlfred(config: ResolvedConfig, spec: RequestSpec): Promise<unknown> {
  const url = new URL(spec.path, `${config.apiBaseUrl}/`);
  appendQuery(url, spec.query);

  let lastError: unknown;

  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: spec.method ?? "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": `tubealfred-openclaw/${PACKAGE_VERSION} (${PRODUCT_NAME}; node ${process.versions.node})`,
        },
        body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
        signal: controller.signal,
      });

      const text = await response.text();
      const body = text ? parseJson(text) : null;

      if (response.ok) {
        return body;
      }

      if (attempt < config.retries && isTransientStatus(response.status)) {
        await delay(250 * (attempt + 1));
        continue;
      }

      const detail = typeof body === "object" && body !== null ? JSON.stringify(body, null, 2) : text;

      throw new Error(`TubeAlfred API request failed with HTTP ${response.status}.\n${detail}`);
    } catch (error) {
      lastError = error;

      if (attempt < config.retries && isNetworkError(error)) {
        await delay(250 * (attempt + 1));
        continue;
      }

      throw networkError(error, config.timeoutMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw networkError(lastError, config.timeoutMs);
}

function appendQuery(url: URL, query: Record<string, QueryValue> = {}): void {
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isTransientStatus(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && error.name === "AbortError");
}

function networkError(error: unknown, timeoutMs: number): Error {
  if (error instanceof Error && error.name === "AbortError") {
    return new Error(`TubeAlfred API request timed out after ${timeoutMs}ms.`);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("TubeAlfred API request failed.");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requiredString(value: unknown, label: string): string {
  const text = optionalString(value);

  if (text === undefined) {
    throw new Error(`${label} is required.`);
  }

  return text;
}

function requiredStringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty list.`);
  }

  if (value.length > 50) {
    throw new Error(`${label} must contain at most 50 items.`);
  }

  const items = value.map((item) => requiredString(item, `${label} item`));

  if (new Set(items).size !== items.length) {
    throw new Error(`${label} items must be unique.`);
  }

  return items;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed === "" ? undefined : trimmed;
}

function optionalEnum(value: unknown, allowed: readonly string[], label: string): string | undefined {
  const text = optionalString(value);

  if (text === undefined) {
    return undefined;
  }

  if (!allowed.includes(text)) {
    throw new Error(`${label} must be one of: ${allowed.join(", ")}.`);
  }

  return text;
}

function optionalPositiveInteger(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function optionalNonNegativeInteger(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return parsed;
}
