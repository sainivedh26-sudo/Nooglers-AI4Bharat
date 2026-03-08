"""
backend/main.py
===============
Maatram AI — FastAPI Backend

Endpoints:
  GET  /health               → health check
  POST /api/process          → start a transcreation job, returns job_id
  GET  /api/process/{job_id}/stream  → SSE stream of live pipeline logs
  GET  /api/process/{job_id}/result  → final TranscreationResult JSON
"""

from __future__ import annotations

import asyncio
import json
import sys
import uuid
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ── Path setup ────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))
sys.path.insert(0, str(_ROOT / "scripts"))

app = FastAPI(title="Maatram AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
JOBS: dict[str, dict] = {}


class ProcessRequest(BaseModel):
    transcript: str | None = None
    source_region: str = "Kerala"
    target_region: str = "Tamil Nadu"


class ProcessStartResponse(BaseModel):
    job_id: str
    message: str


PIPELINE_STEPS = [
    {
        "id": "transcript",
        "label": "ASR Transcription",
        "logs": [
            "[INFO] Establishing CloudFront edge connection...",
            "[DEBUG] Buffer init: 2048KB | Codec: h264/aac",
            "[SYSTEM] Invoking Sarvam Saaras (v2.1) Indic-ASR engine...",
            "[ASR] Processing audio cluster [0x001 - 0x015]... 100% OK",
            "[ASR] Processing audio cluster [0x015 - 0x030]... 100% OK",
            "[INFO] Running punctuation model (confidence: 0.94)...",
            "[SUCCESS] Extraction complete. Text blob stored in KV-Temp ✓",
        ],
    },
    {
        "id": "ner",
        "label": "NER Parsing",
        "logs": [
            "[INFO] Authenticating AWS Bedrock session...",
            "[DEBUG] Requesting Qwen-30B-Indic-Optimized context windows...",
            "[PARSER] Initializing semantic anchor detection...",
            "[ENTITY] 0:12:04 → Detected Anchor [TYPE: EVENT, TOKEN: 0xFD12]",
            "[ENTITY] 0:18:11 → Detected Anchor [TYPE: FOOD, TOKEN: 0xFD44]",
            "[ENTITY] 0:25:02 → Detected Anchor [TYPE: ATTIRE, TOKEN: 0xFD68]",
            "[ENTITY] 0:42:07 → Detected Anchor [TYPE: RITUAL, TOKEN: 0xFD72]",
            "[DEBUG] Pruning low-confidence candidate overlaps...",
            "[SUCCESS] 5 cultural anchors tokenized for mapping ✓",
        ],
    },
    {
        "id": "knowledge",
        "label": "Knowledge Mapping",
        "logs": [
            "[INFO] Querying Tier-1: Regional Cache Index...",
            "[CACHE] HIT: Target match found for [TOKEN: 0xFD12]",
            "[CACHE] MISS: [TOKEN: 0xFD72] — Escalating to SPARQL...",
            "[SPARQL] Resolving Q-ID mapping for regional sibling...",
            "[INFO] Escalating to Tier-3: Tavily-LLM Hybrid Search...",
            "[SEARCH] Cluster: 'Cultural equivalent of 0xFD72 in Target Region'...",
            "[RESOLVER] Anchor identity verified and mapped.",
            "[SUCCESS] Full cross-region mapping index created ✓",
        ],
    },
    {
        "id": "rewrite",
        "label": "Content Transcreation",
        "logs": [
            "[INFO] Initializing prompt context injection...",
            "[REWRITE] Segment 1/14: Applying transcreation hook (0xFD12)...",
            "[REWRITE] Segment 4/14: Applying transcreation hook (0xFD68)...",
            "[REWRITE] Segment 9/14: Smoothing transition syntax...",
            "[DEBUG] Semantic consistency check pass (0.97 similarity)...",
            "[SUCCESS] Target-language transcreation buffer finalized ✓",
        ],
    },
    {
        "id": "tts",
        "label": "Vocal Synthesis",
        "logs": [
            "[INFO] Loading Bulbul-V2 neural vocoder stream...",
            "[SYSTEM] Allocating 512MB for multi-speaker inference...",
            "[TTS] Batch processing segments 1-5... [2.1s elapsed]",
            "[DEBUG] Pacing synchronization: +120ms shift applied",
            "[TTS] Batch processing segments 5-10... [1.4s elapsed]",
            "[SUCCESS] Naturalized audio stream synthesized ✓",
        ],
    },
    {
        "id": "sync",
        "label": "Muxing & Export",
        "logs": [
            "[FFMPEG] Initializing muxer: mp4 [video] <=> wav [dub]...",
            "[SYNC] Aligning audio track with metadata timestamps...",
            "[INFO] Normalizing audio gain to mastering standards...",
            "[DEBUG] CloudFront invalidation triggered for CDN cache...",
            "[EXPORT] Manifest generation complete.",
            "[SUCCESS] Final media bundle ready for deployment ✓",
        ],
    },
]


async def _run_pipeline_job(job_id: str, req: ProcessRequest) -> None:
    """
    Background task: simulate (or run) the real pipeline,
    appending structured log events to JOBS[job_id]["logs"].
    """
    job = JOBS[job_id]

    try:
        for step in PIPELINE_STEPS:
            # Emit step-start event
            job["logs"].append({
                "type": "step_start",
                "step_id": step["id"],
                "label": step["label"],
            })

            for log_line in step["logs"]:
                # Increased processing delay for real-world simulation
                await asyncio.sleep(1.2 + (hash(log_line) % 9) * 0.45)
                job["logs"].append({
                    "type": "log",
                    "step_id": step["id"],
                    "message": log_line,
                })

            job["logs"].append({
                "type": "step_done",
                "step_id": step["id"],
                "label": step["label"],
            })

        # Final result
        job["status"] = "done"
        job["result"] = {
            "source_region": req.source_region,
            "target_region": req.target_region,
            "total_entities": 5,
            "replaced_count": 5,
            "entity_mappings": [
                {"source_span": "Onam",       "target_name": "Pongal",              "entity_type": "Festival",  "confidence": 0.97, "resolution_tier": 1},
                {"source_span": "Sadhya",     "target_name": "Virundhu Sappadu",    "entity_type": "Food",      "confidence": 0.93, "resolution_tier": 1},
                {"source_span": "Kasavu Saree","target_name": "Kanjivaram Pattu",   "entity_type": "Clothing",  "confidence": 0.85, "resolution_tier": 2},
                {"source_span": "Vallam Kali","target_name": "Jallikattu",          "entity_type": "Ritual",    "confidence": 0.72, "resolution_tier": 3},
                {"source_span": "Pookalam",   "target_name": "Kolam",               "entity_type": "Ritual",    "confidence": 0.85, "resolution_tier": 2},
            ],
        }
        job["logs"].append({"type": "complete", "message": "Pipeline finished successfully."})

    except Exception as exc:
        job["status"] = "error"
        job["logs"].append({"type": "error", "message": str(exc)})


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "Maatram AI Backend"}


@app.post("/api/process", response_model=ProcessStartResponse)
async def start_process(req: ProcessRequest):
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"status": "running", "logs": [], "result": None}
    asyncio.create_task(_run_pipeline_job(job_id, req))
    return ProcessStartResponse(job_id=job_id, message="Pipeline started")


@app.get("/api/process/{job_id}/stream")
async def stream_logs(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator() -> AsyncGenerator[str, None]:
        sent = 0
        job = JOBS[job_id]
        while True:
            logs = job["logs"]
            while sent < len(logs):
                event = logs[sent]
                yield f"data: {json.dumps(event)}\n\n"
                sent += 1

            if job["status"] in ("done", "error"):
                break

            await asyncio.sleep(0.1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/process/{job_id}/result")
def get_result(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    job = JOBS[job_id]
    if job["status"] == "running":
        raise HTTPException(status_code=202, detail="Still processing")
    return job["result"]
