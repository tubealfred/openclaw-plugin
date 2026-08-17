# TubeAlfred YouTube OpenClaw Plugin

Read-only TubeAlfred YouTube API tools plus billing usage lookup for OpenClaw agents. It lets agents fetch YouTube video, transcript, comment, reply, channel, Shorts, playlist, community, search, hashtag, suggestion, URL resolution, and account usage data through your TubeAlfred account.

## Requirements

- OpenClaw installed locally.
- A TubeAlfred account.
- A TubeAlfred API key with `youtube.read` for YouTube tools and `billing.read` for billing usage.

Create an API key in TubeAlfred:

```text
https://tubealfred.com/app/api-keys
```

Choose **Create key**, select the scopes you need, then copy the key immediately. TubeAlfred only shows the full key once.

## Install

```bash
openclaw plugins install clawhub:@tubealfred/tubealfred-youtube
openclaw plugins enable tubealfred-youtube
openclaw gateway restart
```

## Configure

Set a TubeAlfred API key in your OpenClaw config:

```js
{
  plugins: {
    entries: {
      "tubealfred-youtube": {
        enabled: true,
        config: {
          apiKey: "ta_live_..."
        }
      }
    }
  }
}
```

Use the key you created at `https://tubealfred.com/app/api-keys`.

Advanced config:

```js
{
  plugins: {
    entries: {
      "tubealfred-youtube": {
        enabled: true,
        config: {
          apiKey: "ta_live_...",
          apiBaseUrl: "https://api.tubealfred.com",
          timeoutMs: 35000,
          retries: 1
        }
      }
    }
  }
}
```

## Tools

This plugin mirrors the TubeAlfred MCP/API YouTube surface and adds billing usage lookup with vendor-prefixed OpenClaw tool names:

```text
tubealfred_billing_usage
tubealfred_youtube_video_get
tubealfred_youtube_video_transcript
tubealfred_youtube_comments_list
tubealfred_youtube_comments_page
tubealfred_youtube_replies_list
tubealfred_youtube_replies_page
tubealfred_youtube_channel_get
tubealfred_youtube_channel_about
tubealfred_youtube_channel_videos
tubealfred_youtube_channel_shorts
tubealfred_youtube_channel_playlists
tubealfred_youtube_channel_community
tubealfred_youtube_search_query
tubealfred_youtube_search_hashtag
tubealfred_youtube_search_suggest
tubealfred_youtube_playlist_get
tubealfred_youtube_url_resolve
```

All tools are read-only and call `https://api.tubealfred.com`.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Tool names, schemas, routes, and request mapping are generated from the versioned TubeAlfred operation manifest. Use `pnpm contract:sync` to refresh it; builds run `pnpm contract:check` to reject drift.

Local OpenClaw install:

```bash
openclaw plugins install --link .
openclaw plugins enable tubealfred-youtube
openclaw plugins inspect tubealfred-youtube --runtime --json
```

## Publish

```bash
clawhub package publish . --dry-run
clawhub package publish .
```

The ClawHub package name is:

```text
@tubealfred/tubealfred-youtube
```
