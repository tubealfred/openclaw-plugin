# TubeAlfred YouTube OpenClaw Plugin

Read-only TubeAlfred YouTube API tools for OpenClaw agents.

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
          timeoutMs: 30000,
          retries: 1
        }
      }
    }
  }
}
```

## Tools

This plugin mirrors the TubeAlfred MCP/API YouTube surface with vendor-prefixed OpenClaw tool names:

```text
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
