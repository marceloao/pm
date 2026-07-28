from fastapi import APIRouter, HTTPException

from app.ai import ask_ai

router = APIRouter(prefix="/api/ai")


@router.get("/ping")
async def ping() -> dict[str, str]:
    question = "What is 2+2? Reply with only the number."
    try:
        answer = await ask_ai(question)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI request failed: {exc}") from exc

    return {"question": question, "answer": answer}
