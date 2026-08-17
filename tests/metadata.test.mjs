import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expectedTools = [
  "tubealfred_billing_usage",
  "tubealfred_youtube_video_get",
  "tubealfred_youtube_video_enhanced",
  "tubealfred_youtube_video_transcript_full",
  "tubealfred_youtube_video_transcript",
  "tubealfred_youtube_comments_list",
  "tubealfred_youtube_comments_page",
  "tubealfred_youtube_replies_list",
  "tubealfred_youtube_replies_page",
  "tubealfred_youtube_related_videos",
  "tubealfred_youtube_related_videos_page",
  "tubealfred_youtube_channel_get",
  "tubealfred_youtube_channel_about",
  "tubealfred_youtube_channel_videos",
  "tubealfred_youtube_channel_videos_page",
  "tubealfred_youtube_channel_streams",
  "tubealfred_youtube_channel_streams_page",
  "tubealfred_youtube_channel_shorts",
  "tubealfred_youtube_channel_shorts_page",
  "tubealfred_youtube_channel_playlists",
  "tubealfred_youtube_channel_playlists_page",
  "tubealfred_youtube_channel_community",
  "tubealfred_youtube_channel_community_page",
  "tubealfred_youtube_search_query",
  "tubealfred_youtube_search_page",
  "tubealfred_youtube_search_hashtag",
  "tubealfred_youtube_search_hashtag_page",
  "tubealfred_youtube_search_suggest",
  "tubealfred_youtube_trending",
  "tubealfred_youtube_trending_shorts",
  "tubealfred_youtube_playlist_metadata",
  "tubealfred_youtube_playlist_get",
  "tubealfred_youtube_playlist_page",
  "tubealfred_youtube_url_resolve",
  "tubealfred_youtube_videos_batch",
  "tubealfred_youtube_channels_batch",
];

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

test("package uses the intended OpenClaw package identity", async () => {
  const pkg = await readJson("../package.json");

  assert.equal(pkg.name, "@tubealfred/tubealfred-youtube");
  assert.equal(pkg.openclaw.extensions[0], "./dist/index.js");
  assert.equal(pkg.openclaw.install.clawhubSpec, "@tubealfred/tubealfred-youtube");
});

test("manifest declares full TubeAlfred tool coverage", async () => {
  const manifest = await readJson("../openclaw.plugin.json");

  assert.equal(manifest.id, "tubealfred-youtube");
  assert.deepEqual(manifest.contracts.tools, expectedTools);
  assert.equal(new Set(manifest.contracts.tools).size, expectedTools.length);
});

test("manifest keeps API key config sensitive", async () => {
  const manifest = await readJson("../openclaw.plugin.json");

  assert.equal(manifest.uiHints.apiKey.sensitive, true);
  assert.equal(manifest.configSchema.additionalProperties, false);
});

test("manifest leaves response margin above the API timeout", async () => {
  const manifest = await readJson("../openclaw.plugin.json");

  assert.equal(manifest.uiHints.timeoutMs.placeholder, "35000");
  assert.equal(manifest.configSchema.properties.timeoutMs.default, 35000);
});
