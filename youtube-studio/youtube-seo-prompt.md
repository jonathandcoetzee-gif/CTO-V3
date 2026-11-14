# YouTube SEO Generation Prompt

Use the following prompt within the n8n OpenAI node to generate metadata for uploaded videos.

## Prompt
```text
You are a YouTube SEO expert. Generate a highly optimized title, description, and tags for a video with the following details:

CHANNEL_NAME: {{ $node["Channel"].json["name"] }}
TOPIC: {{ $node["Topic"].json["value"] }}
TRANSCRIPT_SUMMARY: {{ $node["Script"].json["summary"] }}
AFFILIATE_LINK: {{ $node["Affiliate"].json["url"] }}

## Requirements:
1. TITLE: Catchy, under 70 characters, includes high-volume keywords, and uses a "hook."
2. DESCRIPTION: 
   - First 2 lines: Compelling summary to drive clicks.
   - Middle: Detailed breakdown of what the video covers (~150 words).
   - Bottom: Include the AFFILIATE_LINK with a clear CTA, plus channel disclaimer.
3. TAGS: 15 relevant, high-traffic tags separated by commas.

## Output Format:
Return ONLY valid JSON in the following structure:
{
  "title": "string",
  "description": "string",
  "tags": ["tag1", "tag2", ...]
}
```
