import json
import os

import httpx
from pydantic import ValidationError

from app.schemas import AiChatOutput

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-oss-20b:free"

# The free gpt-oss-20b model ignores OpenRouter's `response_format: json_schema`
# (verified manually: it returns its own ad-hoc JSON shape instead). Describing
# the exact schema in the system prompt and parsing tolerantly is what actually
# gets a matching JSON object back from this model.
CHAT_SYSTEM_PROMPT = """You are an assistant embedded in a Kanban board app.
Reply with ONLY a single JSON object, no markdown fences, no extra text, matching exactly this shape:
{{"reply": string, "actions": [{{"type": "create_card"|"update_card"|"move_card"|"delete_card"|"rename_column", "column_id": string|null, "card_id": string|null, "title": string|null, "details": string|null, "position": integer|null}}]}}

Required fields per action type (omitted/unused fields must be null):
- create_card: column_id, title (details optional)
- update_card: card_id, and title and/or details
- move_card: card_id, column_id, position (0-based index within the target column)
- delete_card: card_id
- rename_column: column_id, title

If no board change is needed, use an empty actions array.

Current board JSON:
{board_json}"""


async def ask_ai(prompt: str) -> str:
    api_key = os.environ["OPENROUTER_API_KEY"]

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            OPENROUTER_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def ask_ai_chat(board: dict, history: list[dict], message: str) -> str:
    api_key = os.environ["OPENROUTER_API_KEY"]

    messages = [
        {
            "role": "system",
            "content": CHAT_SYSTEM_PROMPT.format(board_json=json.dumps(board)),
        },
        *history,
        {"role": "user", "content": message},
    ]

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            OPENROUTER_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": MODEL, "messages": messages},
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


def parse_ai_chat_output(content: str) -> AiChatOutput:
    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end > start:
        try:
            return AiChatOutput(**json.loads(content[start : end + 1]))
        except (json.JSONDecodeError, ValidationError):
            pass

    return AiChatOutput(reply=content.strip(), actions=[])
