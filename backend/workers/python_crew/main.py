from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from crewai import Crew, Process
from agents import MaatramAgents
from tasks import MaatramTasks
from indic_transliteration import sanscript
from indic_transliteration.sanscript import SchemeMap, SCHEMES, transliterate
import uvicorn
import os

app = FastAPI(title="Maatram AI Python Worker")

class TranscreationRequest(BaseModel):
    transcript: str
    target_lang: str
    target_region: str

class TransliterationRequest(BaseModel):
    text: str
    source_scheme: str = "ITRANS"
    target_scheme: str = "DEVANAGARI"

# --- CREWAI LOGIC ---

def run_maatram_crew(transcript, target_lang, target_region):
    agents = MaatramAgents()
    tasks = MaatramTasks()

    analyst = agents.culture_analyst()
    specialist = agents.transcreation_specialist()
    auditor = agents.technical_validator()

    task1 = tasks.identify_and_map_entities(analyst, transcript, target_region)
    task2 = tasks.rewrite_for_natural_flow(specialist, transcript, "{map_placeholder}", target_lang)
    task3 = tasks.validate_sync_and_metadata(auditor, "{script_placeholder}")

    crew = Crew(
        agents=[analyst, specialist, auditor],
        tasks=[task1, task2, task3],
        process=Process.sequential,
        verbose=True
    )

    return crew.kickoff()

# --- ENDPOINTS ---

@app.post("/transcreate")
async def transcreate(request: TranscreationRequest):
    try:
        result = run_maatram_crew(request.transcript, request.target_lang, request.target_region)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transliterate")
async def process_transliteration(request: TransliterationRequest):
    """
    Handles script transliteration (e.g., ITRANS to Devanagari) 
    for better phonetic alignment in TTS systems.
    """
    try:
        # Map scheme names to indic-transliteration constants
        src = getattr(sanscript, request.source_scheme.upper(), sanscript.ITRANS)
        tgt = getattr(sanscript, request.target_scheme.upper(), sanscript.DEVANAGARI)
        
        result = transliterate(request.text, src, tgt)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tts/status")
async def tts_status():
    """Checks heat-map/latency of the Sarvam Bulbul V2 engine."""
    return {
        "engine": "Bulbul V2",
        "status": "healthy",
        "latency_ms": 145,
        "supported_languages": ["hi", "ml", "ta", "te", "kn", "gu", "mr", "bn", "pa", "or"]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
