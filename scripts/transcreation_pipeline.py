"""
transcreation_pipeline.py
=========================
Maatram AI — End-to-End Cultural Transcreation Pipeline

Takes a raw transcript, a source region, and a target region, then:

  Step 1  → AWS Bedrock (NER)       : Extract cultural entities from the transcript
  Step 2  → Knowledge Mapper        : Map each entity to its target-region equivalent
              └─ Tier 1: Local JSON cache
              └─ Tier 2: Wikidata SPARQL
              └─ Tier 3: Tavily web search + Bedrock LLM
  Step 3  → Wikipedia Enrichment    : Fetch context for every mapped entity
  Step 4  → AWS Bedrock (Rewriter)  : Rewrite the transcript using all mappings + wiki context

Output: a TranscreationResult with the adapted transcript and a full entity-mapping log.

Usage (CLI):
    python transcreation_pipeline.py \
        --source "Kerala" \
        --target "Tamil Nadu" \
        --transcript "As we prepare for Onam, we set up the Sadhya with Kasavu sarees..."

Author : Team Nooglers — Maatram AI
Date   : 2026-03-08
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

# ── Load .env from repo root ──────────────────────────────────────────────────
_REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_REPO_ROOT / ".env")

# ── Import knowledge mapper and bedrock model ─────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(_REPO_ROOT))   # repo root — where bedrock_model.py lives

from knowledgemapper import (
    EntityInput,
    KnowledgeMappingResult,
    map_cultural_entity,
)
from bedrock_model import invoke_qwen, MODEL_ID

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("maatram.pipeline")

# MODEL_ID and invoke_qwen are imported from bedrock_model.py (repo root)
# bedrock_model.py owns the Bedrock client, credentials, and timeout config


def _bedrock_converse(
    user_prompt   : str,
    system_prompt : str,
    max_tokens    : int   = 4096,
    temperature   : float = 0.3,
) -> str:
    """
    Thin wrapper around invoke_qwen from bedrock_model.py.
    Raises RuntimeError on failure (already handled in invoke_qwen).
    """
    logger.info("[Bedrock] Calling model: %s", MODEL_ID)
    result = invoke_qwen(
        prompt     = user_prompt,
        system     = system_prompt,
        max_tokens = max_tokens,
    )
    return result


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class DetectedEntity(BaseModel):
    """A single cultural entity spotted in the transcript."""
    name        : str
    entity_type : str = Field(description="Festival | Food | Clothing | Person | Place | Ritual | Other")
    span        : str = Field(description="Exact text span as it appears in the transcript")


class EntityMappingLog(BaseModel):
    """Full record of one entity's journey through the pipeline."""
    source_span     : str
    source_name     : str
    entity_type     : str
    target_name     : str
    wikipedia_context: str
    resolution_tier : int
    confidence      : float
    replaced        : bool


class TranscreationResult(BaseModel):
    """Final output of the end-to-end pipeline."""
    source_transcript  : str
    adapted_transcript : str
    source_region      : str
    target_region      : str
    entity_mappings    : list[EntityMappingLog]
    total_entities     : int
    replaced_count     : int
    pipeline_duration_s: float


# ── Step 1: Entity Extraction ─────────────────────────────────────────────────

EXTRACTION_SYSTEM = """You are an expert Indian cultural entity extractor.
Your task is to identify culturally significant entities in a transcript.
Cultural entities include: festivals, regional foods, traditional clothing,
local customs/rituals, regional music/dance forms, and place-based cultural references.

Return ONLY a valid JSON array. Each element must have exactly these fields:
  "name"        : canonical name of the entity (e.g. "Onam")
  "entity_type" : one of [Festival, Food, Clothing, Person, Ritual, Music, Dance, Place, Other]
  "span"        : the exact text span from the transcript

Do NOT include generic words. Only entities with clear cultural significance.
If no cultural entities are found, return an empty array: []"""


def extract_entities(transcript: str, source_region: str) -> list[DetectedEntity]:
    """
    Step 1: Use Bedrock (Qwen3) to extract cultural entities from the transcript.
    Returns a list of DetectedEntity objects.
    """
    logger.info("[Step 1] Extracting cultural entities from transcript...")

    user_prompt = (
        f"Transcript from {source_region}:\n\n"
        f"\"\"\"\n{transcript}\n\"\"\"\n\n"
        f"Extract all culturally significant entities from {source_region}. "
        f"Return a JSON array only — no markdown fences, no explanation."
    )

    raw = ""
    try:
        raw = _bedrock_converse(
            user_prompt   = user_prompt,
            system_prompt = EXTRACTION_SYSTEM,
            max_tokens    = 1024,
            temperature   = 0.0,
        )

        # Strip markdown code fences if model adds them anyway
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        # Some models wrap with <json>...</json> tags
        if raw.startswith("<json>"):
            raw = raw[6:]
        if raw.endswith("</json>"):
            raw = raw[:-7]
        raw = raw.strip()

        # Find the JSON array even if surrounded by stray text
        start_idx = raw.find("[")
        end_idx   = raw.rfind("]")
        if start_idx != -1 and end_idx != -1:
            raw = raw[start_idx : end_idx + 1]

        entities_raw = json.loads(raw)
        entities = [
            DetectedEntity(
                name        = e["name"],
                entity_type = e.get("entity_type", "Other"),
                span        = e.get("span", e["name"]),
            )
            for e in entities_raw
        ]
        logger.info("[Step 1] Detected %d cultural entities: %s",
                    len(entities), [e.name for e in entities])
        return entities

    except (json.JSONDecodeError, KeyError) as exc:
        logger.error("[Step 1] Failed to parse entity JSON: %s", exc)
        logger.error("[Step 1] Raw output was: %s", repr(raw))
        return []
    except Exception as exc:
        logger.error("[Step 1] Entity extraction failed: %s", exc)
        return []


# ── Step 2 + 3: Map entities through 3-tier pipeline ─────────────────────────

def map_entities(
    entities      : list[DetectedEntity],
    source_region : str,
    target_region : str,
) -> list[tuple[DetectedEntity, KnowledgeMappingResult]]:
    """
    Step 2+3: Run each detected entity through the 3-tier knowledge mapper.
    Returns pairs of (original entity, mapping result).
    """
    logger.info("[Step 2+3] Mapping %d entities: %s → %s",
                len(entities), source_region, target_region)
    pairs = []
    for entity in entities:
        logger.info("[Step 2+3] Mapping '%s' [%s]...", entity.name, entity.entity_type)
        try:
            entity_input = EntityInput(
                entity_name   = entity.name,
                entity_type   = entity.entity_type,
                source_region = source_region,
                target_region = target_region,
            )
            result = map_cultural_entity(entity_input)
            pairs.append((entity, result))
        except Exception as exc:
            logger.error("[Step 2+3] Mapping failed for '%s': %s", entity.name, exc)
    return pairs


# ── Step 4: Transcript Rewriting ──────────────────────────────────────────────

REWRITER_SYSTEM = """You are an expert Indian cultural content adaptor working on Maatram AI.
Your task is to rewrite a transcript by replacing culturally specific references from one Indian
region with their culturally equivalent counterparts from another region.

Rules:
1. Replace ONLY the cultural entity spans listed in the mapping table — nothing else.
2. Keep the sentence structure, tone, and emotional context identical.
3. Naturally integrate the replacement so the sentence still reads fluently.
4. If a mapping says NO_EQUIVALENT, keep the original span unchanged.
5. Do NOT add explanations, footnotes, or translator notes.
6. Return ONLY the rewritten transcript text — no JSON, no headers."""


def rewrite_transcript(
    transcript    : str,
    source_region : str,
    target_region : str,
    mappings      : list[tuple[DetectedEntity, KnowledgeMappingResult]],
) -> str:
    """
    Step 4: Use Bedrock (Qwen3) to rewrite the transcript applying all cultural mappings.
    """
    logger.info("[Step 4] Rewriting transcript with %d entity mappings...", len(mappings))

    mapping_lines = []
    for entity, result in mappings:
        target = result.target_entity.name
        if target == "NO_EQUIVALENT":
            mapping_lines.append(f'  • KEEP unchanged: "{entity.span}"')
        else:
            mapping_lines.append(
                f'  • Replace "{entity.span}" → "{target}"'
                f' (Context: {result.wikipedia_context[:120]}...)'
            )
    mapping_table = "\n".join(mapping_lines) if mapping_lines else "  (no mappings to apply)"

    user_prompt = (
        f"Adapt this transcript from {source_region} culture to {target_region} culture.\n\n"
        f"ORIGINAL TRANSCRIPT:\n\"\"\"\n{transcript}\n\"\"\"\n\n"
        f"CULTURAL MAPPING TABLE:\n{mapping_table}\n\n"
        f"Rewrite the transcript applying every replacement in the mapping table. "
        f"Return ONLY the rewritten transcript."
    )

    try:
        rewritten = _bedrock_converse(
            user_prompt   = user_prompt,
            system_prompt = REWRITER_SYSTEM,
            max_tokens    = max(1024, len(transcript) * 3),
            temperature   = 0.3,
        )
        logger.info("[Step 4] Transcript rewritten successfully.")
        return rewritten
    except Exception as exc:
        logger.error("[Step 4] Rewriting failed: %s — falling back to string substitution.", exc)
        result_text = transcript
        for entity, mapping in mappings:
            if mapping.target_entity.name != "NO_EQUIVALENT":
                result_text = result_text.replace(entity.span, mapping.target_entity.name)
        return result_text


# ── Main Orchestrator ─────────────────────────────────────────────────────────

def run_pipeline(
    transcript    : str,
    source_region : str,
    target_region : str,
) -> TranscreationResult:
    """
    Full end-to-end cultural transcreation pipeline.

    Args:
        transcript    : Raw input transcript text.
        source_region : Culture/region of the source content (e.g. "Kerala").
        target_region : Target culture/region for adaptation (e.g. "Tamil Nadu").

    Returns:
        TranscreationResult with the adapted transcript and full mapping log.
    """
    start = time.perf_counter()

    logger.info("=" * 60)
    logger.info("MAATRAM AI — Transcreation Pipeline")
    logger.info("Source: %s  →  Target: %s", source_region, target_region)
    logger.info("Model : %s", MODEL_ID)
    logger.info("=" * 60)

    # ── Step 1: Extract cultural entities via Qwen3 on Bedrock ───────
    entities = extract_entities(transcript, source_region)

    if not entities:
        logger.warning("[Pipeline] No cultural entities detected. Returning original transcript.")
        return TranscreationResult(
            source_transcript   = transcript,
            adapted_transcript  = transcript,
            source_region       = source_region,
            target_region       = target_region,
            entity_mappings     = [],
            total_entities      = 0,
            replaced_count      = 0,
            pipeline_duration_s = round(time.perf_counter() - start, 3),
        )

    # ── Step 2 + 3: Map entities through 3-tier knowledge mapper ─────
    mapping_pairs = map_entities(entities, source_region, target_region)

    # ── Step 4: Rewrite transcript via Qwen3 on Bedrock ──────────────
    adapted = rewrite_transcript(transcript, source_region, target_region, mapping_pairs)

    # ── Build entity mapping log ──────────────────────────────────────
    logs = []
    replaced_count = 0
    for entity, result in mapping_pairs:
        replaced = result.target_entity.name != "NO_EQUIVALENT"
        if replaced:
            replaced_count += 1
        logs.append(EntityMappingLog(
            source_span      = entity.span,
            source_name      = entity.name,
            entity_type      = entity.entity_type,
            target_name      = result.target_entity.name,
            wikipedia_context= result.wikipedia_context,
            resolution_tier  = result.resolution_tier,
            confidence       = result.confidence,
            replaced         = replaced,
        ))

    duration = round(time.perf_counter() - start, 3)
    logger.info("[Pipeline] Done in %.2fs. Entities: %d detected, %d replaced.",
                duration, len(entities), replaced_count)

    return TranscreationResult(
        source_transcript   = transcript,
        adapted_transcript  = adapted,
        source_region       = source_region,
        target_region       = target_region,
        entity_mappings     = logs,
        total_entities      = len(entities),
        replaced_count      = replaced_count,
        pipeline_duration_s = duration,
    )


# ── Pretty print helper ───────────────────────────────────────────────────────

def print_result(result: TranscreationResult) -> None:
    """Print a formatted summary of the transcreation result to stdout."""
    sep = "=" * 70

    print(f"\n{sep}")
    print(f"  MAATRAM AI — Transcreation Result")
    print(f"  {result.source_region}  →  {result.target_region}")
    print(sep)

    print(f"\n📝 ORIGINAL TRANSCRIPT ({result.source_region}):")
    print(f"   {result.source_transcript}")

    print(f"\n🎯 ADAPTED TRANSCRIPT ({result.target_region}):")
    print(f"   {result.adapted_transcript}")

    print(f"\n🗺️  ENTITY MAPPING LOG  ({result.replaced_count}/{result.total_entities} replaced):")
    if result.entity_mappings:
        for i, m in enumerate(result.entity_mappings, 1):
            tier_label = {1: "Cache", 2: "Wikidata", 3: "Tavily+Bedrock", 0: "No match"}.get(m.resolution_tier, "?")
            status = "✅ replaced" if m.replaced else "⏭️  kept"
            print(f"\n   [{i}] {status} | Tier {m.resolution_tier} ({tier_label}) | conf={m.confidence:.0%}")
            print(f"       Source : \"{m.source_span}\" ({m.entity_type})")
            print(f"       Target : \"{m.target_name}\"")
            print(f"       Wiki   : {m.wikipedia_context[:100]}...")
    else:
        print("   (no cultural entities found)")

    print(f"\n⏱️  Pipeline duration: {result.pipeline_duration_s}s")
    print(sep + "\n")


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Maatram AI — Cultural Transcreation Pipeline",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "--source", "-s",
        required=True,
        help="Source cultural region (e.g. 'Kerala')",
    )
    parser.add_argument(
        "--target", "-t",
        required=True,
        help="Target cultural region (e.g. 'Tamil Nadu')",
    )
    parser.add_argument(
        "--transcript", "-T",
        default=None,
        help="Raw transcript text (wrap in quotes). If omitted, uses built-in demo.",
    )
    parser.add_argument(
        "--output-json", "-o",
        default=None,
        help="Optional path to write the full JSON result (e.g. result.json)",
    )
    args = parser.parse_args()

    # ── Demo transcript if none provided ─────────────────────────────
    DEMO_TRANSCRIPT = (
        "Welcome everyone! Today we are celebrating Onam, the biggest festival of Kerala. "
        "We have prepared a grand Sadhya on banana leaves with all the traditional dishes. "
        "Everyone in the family is dressed in beautiful Kasavu sarees and mundu. "
        "After the feast, we will watch the Vallam Kali boat race at the river. "
        "My grandmother has also made delicious Payasam for dessert. "
        "The Pookalam flower arrangement in our courtyard looks absolutely stunning this year. "
        "This is the spirit of Kerala — togetherness, tradition, and joy."
    )

    transcript_text = args.transcript if args.transcript else DEMO_TRANSCRIPT

    if not args.transcript:
        print("\n[Demo mode] No --transcript provided. Using built-in Onam demo.\n")

    # ── Run pipeline ──────────────────────────────────────────────────
    result = run_pipeline(
        transcript    = transcript_text,
        source_region = args.source,
        target_region = args.target,
    )

    # ── Print formatted output ────────────────────────────────────────
    print_result(result)

    # ── Optionally write JSON ─────────────────────────────────────────
    if args.output_json:
        out_path = Path(args.output_json)
        out_path.write_text(result.model_dump_json(indent=2), encoding="utf-8")
        print(f"📄 Full JSON result written to: {out_path.resolve()}")
