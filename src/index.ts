import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "typebox";

const PLUGIN_ID = "tubealfred-youtube";
const PRODUCT_NAME = "TubeAlfred YouTube OpenClaw plugin";
const PACKAGE_VERSION = "0.1.1";
const DEFAULT_API_URL = "https://api.tubealfred.com";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 1;
const MAX_COUNT = 500;

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
  parameters: ReturnType<typeof Type.Object>;
  request(params: Record<string, unknown>): RequestSpec;
}

const Count = Type.Optional(
  Type.Integer({
    minimum: 1,
    maximum: MAX_COUNT,
    description: `Number of items to fetch per page (1-${MAX_COUNT}).`,
  }),
);

const ContinuationToken = Type.Optional(
  Type.String({
    minLength: 1,
    description: "Pagination continuation token from a previous TubeAlfred response.",
  }),
);

const SEARCH_UPLOAD_DATE = ["all", "today", "week", "month", "year"] as const;
const SEARCH_DURATION = ["all", "under_three_mins", "three_to_twenty_mins", "over_twenty_mins"] as const;
const SEARCH_SORT = ["relevance", "popularity"] as const;
const SEARCH_TYPE = ["all", "video", "shorts", "channel", "playlist", "movie"] as const;

function enumParam(values: readonly string[], description: string) {
  return Type.Optional(
    Type.Unsafe<string>({ type: "string", enum: [...values], description }),
  );
}

const VideoId = Type.String({
  minLength: 1,
  description: "YouTube video ID.",
});

const ChannelId = Type.String({
  minLength: 1,
  description: "YouTube UC channel ID, @handle, or username.",
});

const CommentId = Type.String({
  minLength: 1,
  description: "Top-level YouTube comment ID returned by the comments endpoint.",
});

const PlaylistId = Type.String({
  minLength: 1,
  description: "YouTube playlist ID.",
});

const TOOLS: ToolDefinition[] = [
  {
    name: "tubealfred_youtube_video_get",
    description: "Fetch YouTube video details through TubeAlfred.",
    parameters: Type.Object({
      video_id: VideoId,
    }),
    request: (params) => ({
      path: `/v1/youtube/video/${encodeURIComponent(requiredString(params.video_id, "video_id"))}`,
    }),
  },
  {
    name: "tubealfred_youtube_video_transcript",
    description: "Fetch a YouTube video transcript through TubeAlfred.",
    parameters: Type.Object({
      video_id: VideoId,
    }),
    request: (params) => ({
      path: `/v1/youtube/video/${encodeURIComponent(requiredString(params.video_id, "video_id"))}/transcript/fast`,
    }),
  },
  {
    name: "tubealfred_youtube_comments_list",
    description: "Fetch the first YouTube comments page for a video through TubeAlfred.",
    parameters: Type.Object({
      video_id: VideoId,
      count: Count,
    }),
    request: (params) => ({
      path: `/v1/youtube/video/${encodeURIComponent(requiredString(params.video_id, "video_id"))}/comments`,
      query: {
        count: optionalCount(params.count),
      },
    }),
  },
  {
    name: "tubealfred_youtube_comments_page",
    description: "Fetch a paginated YouTube comments page through TubeAlfred.",
    parameters: Type.Object({
      video_id: VideoId,
      continuation_token: Type.String({
        minLength: 1,
        description: "Comment pagination continuation token returned by the previous comments response.",
      }),
      count: Count,
    }),
    request: (params) => ({
      method: "POST",
      path: `/v1/youtube/video/${encodeURIComponent(requiredString(params.video_id, "video_id"))}/comments/page`,
      body: compactRecord({
        continuation_token: requiredString(params.continuation_token, "continuation_token"),
        count: optionalCount(params.count),
      }),
    }),
  },
  {
    name: "tubealfred_youtube_replies_list",
    description: "Fetch the first replies page for a top-level YouTube comment through TubeAlfred.",
    parameters: Type.Object({
      video_id: VideoId,
      comment_id: CommentId,
      count: Count,
    }),
    request: (params) => ({
      path: `/v1/youtube/video/${encodeURIComponent(requiredString(params.video_id, "video_id"))}/comments/${encodeURIComponent(requiredString(params.comment_id, "comment_id"))}/replies`,
      query: {
        count: optionalCount(params.count),
      },
    }),
  },
  {
    name: "tubealfred_youtube_replies_page",
    description: "Fetch a paginated replies page for a top-level YouTube comment through TubeAlfred.",
    parameters: Type.Object({
      video_id: VideoId,
      comment_id: CommentId,
      continuation_token: Type.String({
        minLength: 1,
        description: "Reply pagination continuation token returned by the previous replies response.",
      }),
      count: Count,
    }),
    request: (params) => ({
      method: "POST",
      path: `/v1/youtube/video/${encodeURIComponent(requiredString(params.video_id, "video_id"))}/comments/${encodeURIComponent(requiredString(params.comment_id, "comment_id"))}/replies/page`,
      body: compactRecord({
        continuation_token: requiredString(params.continuation_token, "continuation_token"),
        count: optionalCount(params.count),
      }),
    }),
  },
  {
    name: "tubealfred_youtube_channel_get",
    description: "Fetch YouTube channel details through TubeAlfred.",
    parameters: Type.Object({
      channel_id: ChannelId,
    }),
    request: (params) => ({
      path: `/v1/youtube/channel/${encodeURIComponent(requiredString(params.channel_id, "channel_id"))}`,
    }),
  },
  {
    name: "tubealfred_youtube_channel_about",
    description: "Fetch a YouTube channel about section through TubeAlfred.",
    parameters: Type.Object({
      channel_id: ChannelId,
    }),
    request: (params) => ({
      path: `/v1/youtube/channel/${encodeURIComponent(requiredString(params.channel_id, "channel_id"))}/about`,
    }),
  },
  {
    name: "tubealfred_youtube_channel_videos",
    description: "Fetch recent YouTube videos for a channel through TubeAlfred.",
    parameters: Type.Object({
      channel_id: ChannelId,
      continuation_token: ContinuationToken,
    }),
    request: (params) => ({
      path: `/v1/youtube/channel/${encodeURIComponent(requiredString(params.channel_id, "channel_id"))}/videos`,
      query: {
        continuation_token: optionalString(params.continuation_token),
      },
    }),
  },
  {
    name: "tubealfred_youtube_channel_shorts",
    description: "Fetch YouTube Shorts for a channel through TubeAlfred.",
    parameters: Type.Object({
      channel_id: ChannelId,
      continuation_token: ContinuationToken,
    }),
    request: (params) => ({
      path: `/v1/youtube/channel/${encodeURIComponent(requiredString(params.channel_id, "channel_id"))}/shorts`,
      query: {
        continuation_token: optionalString(params.continuation_token),
      },
    }),
  },
  {
    name: "tubealfred_youtube_channel_playlists",
    description: "Fetch YouTube channel playlists through TubeAlfred.",
    parameters: Type.Object({
      channel_id: ChannelId,
      continuation_token: ContinuationToken,
    }),
    request: (params) => ({
      path: `/v1/youtube/channel/${encodeURIComponent(requiredString(params.channel_id, "channel_id"))}/playlists`,
      query: {
        continuation_token: optionalString(params.continuation_token),
      },
    }),
  },
  {
    name: "tubealfred_youtube_channel_community",
    description: "Fetch YouTube channel community posts through TubeAlfred.",
    parameters: Type.Object({
      channel_id: ChannelId,
      continuation_token: ContinuationToken,
    }),
    request: (params) => ({
      path: `/v1/youtube/channel/${encodeURIComponent(requiredString(params.channel_id, "channel_id"))}/community`,
      query: {
        continuation_token: optionalString(params.continuation_token),
      },
    }),
  },
  {
    name: "tubealfred_youtube_search_query",
    description: "Search YouTube through TubeAlfred.",
    parameters: Type.Object({
      query: Type.String({
        minLength: 1,
        description: "YouTube search query.",
      }),
      upload_date: enumParam(
        SEARCH_UPLOAD_DATE,
        "Filter by upload date. One of: all, today, week, month, year.",
      ),
      duration: enumParam(
        SEARCH_DURATION,
        "Filter by video duration. One of: all, under_three_mins, three_to_twenty_mins, over_twenty_mins.",
      ),
      sort: enumParam(SEARCH_SORT, "Search ranking preference. One of: relevance, popularity."),
      type: enumParam(
        SEARCH_TYPE,
        "Restrict result type. One of: all, video, shorts, channel, playlist, movie.",
      ),
      features: Type.Optional(
        Type.String({
          minLength: 1,
          description:
            "Comma-separated feature filters: hd, subtitles, creative_commons, 3d, live, purchased, 4k, 360, location, hdr, vr180.",
        }),
      ),
      live: Type.Optional(Type.Boolean({ description: "Shortcut for features=live." })),
      shorts: Type.Optional(Type.Boolean({ description: "Shortcut for type=shorts." })),
      continuation_token: ContinuationToken,
    }),
    request: (params) => ({
      path: "/v1/youtube/search/",
      query: {
        query: requiredString(params.query, "query"),
        upload_date: optionalEnum(params.upload_date, SEARCH_UPLOAD_DATE, "upload_date"),
        duration: optionalEnum(params.duration, SEARCH_DURATION, "duration"),
        sort: optionalEnum(params.sort, SEARCH_SORT, "sort"),
        type: optionalEnum(params.type, SEARCH_TYPE, "type"),
        features: optionalString(params.features),
        live: optionalBoolean(params.live),
        shorts: optionalBoolean(params.shorts),
        continuation_token: optionalString(params.continuation_token),
      },
    }),
  },
  {
    name: "tubealfred_youtube_search_hashtag",
    description: "Search YouTube by hashtag through TubeAlfred.",
    parameters: Type.Object({
      hashtag: Type.String({
        minLength: 1,
        description: "YouTube hashtag, with or without the # prefix.",
      }),
      continuation_token: ContinuationToken,
    }),
    request: (params) => ({
      path: "/v1/youtube/search/hashtag",
      query: {
        hashtag: requiredString(params.hashtag, "hashtag"),
        continuation_token: optionalString(params.continuation_token),
      },
    }),
  },
  {
    name: "tubealfred_youtube_search_suggest",
    description: "Fetch YouTube search autocomplete suggestions through TubeAlfred.",
    parameters: Type.Object({
      q: Type.String({
        minLength: 2,
        description: "Partial search query.",
      }),
      prev: Type.Optional(
        Type.String({
          minLength: 1,
          description: "Optional previous query context.",
        }),
      ),
    }),
    request: (params) => ({
      path: "/v1/youtube/search/suggestions",
      query: {
        q: requiredString(params.q, "q"),
        prev: optionalString(params.prev),
      },
    }),
  },
  {
    name: "tubealfred_youtube_playlist_get",
    description: "Fetch YouTube playlist contents through TubeAlfred.",
    parameters: Type.Object({
      playlist_id: PlaylistId,
      continuation_token: ContinuationToken,
    }),
    request: (params) => ({
      path: `/v1/youtube/playlist/${encodeURIComponent(requiredString(params.playlist_id, "playlist_id"))}`,
      query: {
        continuation_token: optionalString(params.continuation_token),
      },
    }),
  },
  {
    name: "tubealfred_youtube_url_resolve",
    description: "Resolve a YouTube URL to canonical identifiers through TubeAlfred.",
    parameters: Type.Object({
      url: Type.String({
        minLength: 1,
        description: "Full YouTube URL.",
      }),
    }),
    request: (params) => ({
      path: "/v1/youtube/utility/resolve",
      query: {
        url: requiredString(params.url, "url"),
      },
    }),
  },
];

export default definePluginEntry({
  id: PLUGIN_ID,
  name: "TubeAlfred YouTube",
  description: "Read-only TubeAlfred YouTube API tools for OpenClaw agents.",
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
    .replace(/^tubealfred_youtube_/, "")
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

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
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

function optionalBoolean(value: unknown): boolean | undefined {
  return value === true ? true : undefined;
}

function optionalCount(value: unknown): number | undefined {
  const count = optionalPositiveInteger(value, "count");

  if (count !== undefined && count > MAX_COUNT) {
    throw new Error(`count must be between 1 and ${MAX_COUNT}.`);
  }

  return count;
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
