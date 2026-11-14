# YouTube Studio - Google Sheets Schema

This schema defines the structure of the central tracking sheet used by the n8n automation workflow.

## Sheet Name: `ContentPipeline`

| Column Name | Data Type | Validation Rules / Notes |
| :--- | :--- | :--- |
| **Channel** | Dropdown | `WealthMind AI`, `GoldenYears Guide`, `Justice Told`, `FluentFast AI` |
| **Topic** | Text | The main subject or title of the video. |
| **Script Status** | Dropdown | `Pending`, `Generating`, `Completed`, `Review Required` |
| **Video Status** | Dropdown | `Pending`, `Rendering`, `Uploaded`, `Error` |
| **Published URL** | URL | The direct link to the YouTube video (once uploaded). |
| **Scheduled Time** | DateTime | Format: `YYYY-MM-DD HH:mm:ss`. Must be in future. |
| **SEO Status** | Dropdown | `Pending`, `Done` |
| **Affiliate Link** | URL | Specific product link to be featured in the description. |
| **Notes** | Text | Any internal comments or specific instruction for the LLM. |
| **Week #** | Number | 1-52. Used for tracking weekly publication targets. |

## Workflow Rules
1. **Cron Trigger**: The n8n workflow polls this sheet every day at 06:00.
2. **Filter**: Only rows with `Script Status = Pending` and `Video Status = Pending` are processed.
3. **Update**: Upon successful upload, `Video Status` is changed to `Uploaded`, and `Published URL` is populated.
4. **Error Handling**: If a step fails, `Video Status` is set to `Error` and a comment is added to the `Notes` column.
