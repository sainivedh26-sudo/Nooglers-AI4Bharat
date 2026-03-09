package main

import (
	"fmt"
	"log"
	"time"
	"backend/processor/go_orchestrator" // Updated according to our new directory structure
)

func main() {
	jobID := "JOB_00X_DEMO"
	videoID := "VID_8819"

	fmt.Printf("--- Maatram AI Pipeline Start: %s ---\n", time.Now().Format(time.RFC3339))
	
	// Initialize the official Orchestrator
	engine := orchestrator.NewOrchestrator(jobID, videoID)

	// --- STEP 1: ASR & Chunking (S3 extraction) ---
	err := engine.ExecuteStage(orchestrator.StateASR, "Fetching Sarvam Saaras transcriptions...")
	if err != nil { log.Fatalf("Failed at ASR Extraction") }

	// --- STEP 2: Cultural Identification (Tavily/Wikitool logic) ---
	err = engine.ExecuteStage(orchestrator.StateCulturalMapping, "Resolving anchors via CrewAI Python Agents...")
	if err != nil { log.Fatalf("Failed at Cultural Mapping") }

	// --- STEP 3: Transcreation & Re-writing ---
	err = engine.ExecuteStage(orchestrator.StateTranscreation, "Mismatches resolved | Script optimization for lip-sync")
	if err != nil { log.Fatalf("Failed at Transcreation") }

	// --- STEP 4: Vocal Synthesis (TTS) ---
	err = engine.ExecuteStage(orchestrator.StateTTS, "Bulbul V2 processing | 24kHz audio generation")
	if err != nil { log.Fatalf("Failed at TTS Synthesis") }

	// --- STEP 5: Final Render (FFMPEG) ---
	err = engine.ExecuteStage(orchestrator.StateMuxing, "Combining adaptive bitrate stream layers...")
	if err != nil { log.Fatalf("Failed at FFMPEG Muxing") }

	fmt.Printf("\n--- Maatram AI Pipeline COMPLETED ---\n")
	fmt.Printf("Total Processing Runtime: %.2f seconds\n", engine.GetRuntime())
	fmt.Println("Result Ready For CloudFront Edge Delivery.")
}
