# YouTube Studio — the engine behind all four channels

One pipeline: a topic row in Google Sheets becomes a rendered, uploaded video.

```
Sheets queue -> LLM script -> ElevenLabs TTS -> Pexels footage -> MoneyPrinterTurbo render -> YouTube upload -> status back to the sheet
```

Workflow: `n8n/workflows/youtube-automation.json` (imported automatically by this stack).

## Run it

```bash
cd youtube-studio
cp .env.template .env          # every key is marked FREE or PAID inside
$EDITOR .env
./scripts/init-mpt-config.sh   # fills config/config.toml from .env
docker compose up -d
```

Then, once, in n8n at http://localhost:5678:

1. **Credentials -> Google Sheets OAuth2** and attach it to the three Google Sheets nodes.
2. **Credentials -> YouTube OAuth2** and attach it to the YouTube Upload node.
3. Open the workflow, press **Activate**. It runs daily at 08:00 UTC.

The workflow ships inactive so nothing spends money before the keys and credentials exist.

## Before the first run

- **Sheet**: one tab named `ContentPipeline` with the columns in `sheets-schema.md`.
  Rows are matched on **Channel + Topic**, so keep that pair unique.
- **Scheduled Time** is UTC (`YYYY-MM-DD HH:mm:ss`). A future time uploads the video
  as private with a YouTube publish schedule; empty or past uploads it public.
- **Channel** must be exactly one of `WealthMind AI`, `GoldenYears Guide`,
  `Justice Told`, `FluentFast AI`.

## If a key is missing

The run stops at **Validate Config (fail loud)** with a message naming the exact key,
whether it is free or paid, and where to get it. Nothing is generated or charged before
that gate. A failed step after that writes `Video Status = Error` and the reason into
`Notes`, then fails the execution so it shows up in n8n.

## Cost per video

| Step | Cost |
| --- | --- |
| LLM script + SEO (OpenAI) | ~$0.02-0.15 |
| ElevenLabs narration | ~7k credits per 1,100-word video |
| Pexels footage | free |
| MoneyPrinterTurbo render | free (self-hosted CPU) |
| YouTube upload | free (quota 10k units/day ≈ 6 uploads) |

`ELEVENLABS_NARRATION=hook` (default) synthesises only the opening line — a cheap check
that the key and voice work. Set it to `full` to also get a master narration file for
Shorts/Reels. The render itself always speaks through MoneyPrinterTurbo's own ElevenLabs
provider with the same voice id, so each video is paid for once.

## Per-channel config

`channels/*.json` holds the identity, voice, footage queries, SEO defaults and affiliate
stack for each channel (from `channel-identity.md`). The n8n **Channel Config** node
carries the same map — update both when a channel changes.

## Ports

`5678` n8n, `8080` render API, `8501` render WebUI (manual test renders).
Port 5678 clashes with `docker/docker-compose.yml` — run one stack or the other.
