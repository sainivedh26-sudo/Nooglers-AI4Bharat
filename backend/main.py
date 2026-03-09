from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json
import httpx
import os

app = FastAPI(title="Maatram AI Core API")

app.add_middleware( CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],)

# --- CONFIGURATION ---
GO_GATEWAY_URL = "http://localhost:8080"
PYTHON_WORKER_URL = "http://localhost:8001"

# In-memory job store
jobs = {}

@app.post("/api/process/{video_id}")
async def start_processing(video_id: str, target_lang: str, background_tasks: BackgroundTasks):
    job_id = f"job_{video_id}_{int(asyncio.get_event_loop().time())}"
    jobs[job_id] = {"status": "starting", "logs": []}
    
    return {"job_id": job_id, "status": "queued"}

@app.get("/api/logs/{job_id}")
async def stream_logs(job_id: str):
    async def event_generator():
       
        steps = [
            ("transcript", "Initializing ASR via Sarvam Saaras..."),
            ("ner", "Identifying cultural anchors via CrewAI..."),
            ("transcreation", "Rewriting script for regional nuances..."),
            ("vocal", "Synthesizing audio via Bulbul V2..."),
            ("export", "Muxing final stream via FFmpeg...")
        ]
        
        for step_id, msg in steps:
            
            yield f"data: {json.dumps({'type': 'status', 'step_id': step_id, 'status': 'active', 'message': f'[INFO] {msg}'})}\n\n"
            await asyncio.sleep(2)
            
            yield f"data: {json.dumps({'type': 'status', 'step_id': step_id, 'status': 'completed', 'message': f'[SUCCESS] {step_id.capitalize()} finished.'})}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/results/{video_id}")
async def get_results(video_id: str):
    """
    Retrieves the actual transcreation mapping from the database/worker.
    """
    return {
        "videoId": video_id,
        "adjustments": [
            {""}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
