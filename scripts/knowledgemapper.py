"""
knowledgemapper.py
==================
Maatram AI — Cultural Knowledge Mapping & Enrichment Module

Receives a cultural entity (e.g., "Vishu" from Kerala) and maps it to the
culturally equivalent entity in a target region (e.g., "Puthandu" in Tamil Nadu),
then fetches Wikipedia context to feed into the downstream CrewAI rewriting pipeline.

Fallback Pipeline (3 Tiers):
  Tier 1 → Local JSON cache  (fastest, zero network cost)
  Tier 2 → Wikidata SPARQL   (structured knowledge graph)
  Tier 3 → Tavily + LiteLLM  (web search + LLM extraction)

After Tier 2/3 succeed, the result is automatically written back to the local cache
so every lookup improves future performance.

Author : Team Nooglers — Maatram AI
Date   : 2026-03-05
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Optional

import wikipediaapi
from pydantic import BaseModel, Field
from SPARQLWrapper import JSON as SPARQL_JSON
from SPARQLWrapper import SPARQLWrapper

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("maatram.knowledgemapper")

# ---------------------------------------------------------------------------
# Environment / API Keys
# ---------------------------------------------------------------------------
TAVILY_API_KEY: str = os.environ.get("TAVILY_API_KEY", "")
LITELLM_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")          # or any LiteLLM-supported key
LITELLM_MODEL: str   = os.environ.get("LITELLM_MODEL", "gpt-4o-mini") # cheap, fast default

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
CACHE_FILE        = Path(__file__).parent / "culturalentities.json"
WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql"
WIKIPEDIA_LANG    = "en"
WIKIPEDIA_UA      = "MaatramAI/1.0 (cultural-transcreation; team-nooglers@maatram.ai)"
SPARQL_TIMEOUT    = 15   # seconds
TAVILY_MAX_RESULTS = 5
WIKI_SENTENCES     = 3   # number of sentences to keep from Wikipedia summary

# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class EntityInput(BaseModel):
    """Input schema — mirrors the output of the Indic-BERT NER engine."""
    entity_name   : str = Field(..., description="Name of the source cultural entity, e.g. 'Vishu'")
    entity_type   : str = Field(..., description="Category: Festival | Food | Clothing | Person | Place | Ritual | Other")
    source_region : str = Field(..., description="Region/state of origin, e.g. 'Kerala'")
    target_region : str = Field(..., description="Target region for cultural adaptation, e.g. 'Tamil Nadu'")


class EntityRef(BaseModel):
    """Compact reference to a single cultural entity."""
    name   : str
    region : str
    type   : Optional[str] = None


class KnowledgeMappingResult(BaseModel):
    """
    Output schema consumed by the downstream CrewAI Dialogue Rewriter agent.
    Mirrors the specification exactly.
    """
    source_entity      : EntityRef
    target_entity      : EntityRef
    wikipedia_context  : str
    resolution_tier    : int   = Field(..., description="1=Cache, 2=Wikidata, 3=Tavily+LLM")
    confidence         : float = Field(..., ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Helper: Local Cache (Tier 1)
# ---------------------------------------------------------------------------

def _load_cache() -> dict:
    """Load the local cultural entity cache from disk."""
    if not CACHE_FILE.exists():
        logger.warning("Cache file not found at %s — starting with empty cache.", CACHE_FILE)
        return {"_metadata": {}, "mappings": {}}
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Failed to read cache file: %s", exc)
        return {"_metadata": {}, "mappings": {}}


def _save_cache(cache: dict) -> None:
    """Persist an updated cache back to disk."""
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
        logger.info("Cache updated and saved to %s", CACHE_FILE)
    except OSError as exc:
        logger.error("Failed to save cache file: %s", exc)


def _cache_key(entity_name: str, target_region: str) -> str:
    return f"{entity_name}::{target_region}"


def lookup_cache(entity_name: str, target_region: str) -> Optional[dict]:
    """
    Tier 1: Check local JSON cache for an existing mapping.
    Returns the mapping dict or None.
    """
    cache = _load_cache()
    key   = _cache_key(entity_name, target_region)
    result = cache.get("mappings", {}).get(key)
    if result:
        logger.info("[Tier 1] Cache HIT for key '%s'", key)
    else:
        logger.info("[Tier 1] Cache MISS for key '%s'", key)
    return result


def update_cache(
    entity_name    : str,
    source_region  : str,
    entity_type    : str,
    target_name    : str,
    target_region  : str,
    wikipedia_context: str,
) -> None:
    """
    Write a newly discovered mapping back to the local cache.
    Called automatically after successful Tier 2 or Tier 3 resolution.
    """
    cache = _load_cache()
    key   = _cache_key(entity_name, target_region)
    cache.setdefault("mappings", {})[key] = {
        "source_name"        : entity_name,
        "source_region"      : source_region,
        "entity_type"        : entity_type,
        "target_name"        : target_name,
        "target_region"      : target_region,
        "wikipedia_context"  : wikipedia_context,
    }
    _save_cache(cache)


# ---------------------------------------------------------------------------
# Helper: Wikipedia Context Enrichment
# ---------------------------------------------------------------------------

def fetch_wikipedia_context(entity_name: str, entity_type: str = "") -> str:
    """
    Fetch the first WIKI_SENTENCES sentences from the Wikipedia summary
    of `entity_name`. Falls back to appending `entity_type` on disambiguation.

    Returns an empty string if no page is found.
    """
    wiki = wikipediaapi.Wikipedia(user_agent=WIKIPEDIA_UA, language=WIKIPEDIA_LANG)

    def _get_summary(title: str) -> str:
        try:
            page = wiki.page(title)
            if not page.exists():
                return ""
            summary = page.summary
            # Split on ". " to get individual sentences, then rejoin first N
            sentences = summary.replace("\n", " ").split(". ")
            clipped   = ". ".join(sentences[:WIKI_SENTENCES])
            if not clipped.endswith("."):
                clipped += "."
            return clipped
        except Exception as exc:
            logger.warning("Wikipedia fetch error for '%s': %s", title, exc)
            return ""

    # First attempt: exact title
    context = _get_summary(entity_name)
    if context:
        logger.info("[Wikipedia] Found page for '%s'", entity_name)
        return context

    # Disambiguation fallback: append entity type
    if entity_type:
        fallback_title = f"{entity_name} {entity_type}"
        logger.info("[Wikipedia] Retrying with disambiguation title '%s'", fallback_title)
        context = _get_summary(fallback_title)
        if context:
            return context

    logger.warning("[Wikipedia] No page found for '%s' (type: %s)", entity_name, entity_type)
    return f"No Wikipedia context found for '{entity_name}'."


# ---------------------------------------------------------------------------
# Tier 2: Wikidata SPARQL Query
# ---------------------------------------------------------------------------

# Well-known Wikidata Q-IDs for Indian regions (used as fallback label hints)
REGION_QIDS = {
    "Kerala"       : "Q1186",
    "Tamil Nadu"   : "Q1445",
    "Karnataka"    : "Q1185",
    "Maharashtra"  : "Q1191",
    "West Bengal"  : "Q1356",
    "Andhra Pradesh": "Q1159",
    "Telangana"    : "Q677037",
    "Punjab"       : "Q22424",
    "Rajasthan"    : "Q987",
    "Gujarat"      : "Q1061",
    "Odisha"       : "Q22048",
    "Assam"        : "Q22063",
}


def _sparql_query(query: str) -> list[dict]:
    """Execute a SPARQL query against Wikidata and return bindings."""
    sparql = SPARQLWrapper(WIKIDATA_ENDPOINT)
    sparql.setQuery(query)
    sparql.setReturnFormat(SPARQL_JSON)
    sparql.setTimeout(SPARQL_TIMEOUT)
    sparql.addCustomHttpHeader("User-Agent", WIKIPEDIA_UA)
    try:
        results = sparql.query().convert()
        return results.get("results", {}).get("bindings", [])
    except Exception as exc:
        logger.warning("[Wikidata] SPARQL query failed: %s", exc)
        return []


def _get_entity_qid(entity_name: str) -> Optional[str]:
    """Resolve an entity name to its Wikidata Q-ID."""
    query = f"""
    SELECT ?item WHERE {{
      ?item rdfs:label "{entity_name}"@en .
    }}
    LIMIT 3
    """
    bindings = _sparql_query(query)
    if bindings:
        qid_url = bindings[0]["item"]["value"]          # e.g. http://www.wikidata.org/entity/Q183339
        qid     = qid_url.rsplit("/", 1)[-1]
        logger.info("[Wikidata] Resolved '%s' → %s", entity_name, qid)
        return qid
    return None


def _get_instance_of_parent(qid: str) -> Optional[str]:
    """Return the P31 (instance of) parent Q-ID for a given entity Q-ID."""
    query = f"""
    SELECT ?parent WHERE {{
      wd:{qid} wdt:P31 ?parent .
    }}
    LIMIT 3
    """
    bindings = _sparql_query(query)
    if bindings:
        parent = bindings[0]["parent"]["value"].rsplit("/", 1)[-1]
        logger.info("[Wikidata] Instance-of parent for %s → %s", qid, parent)
        return parent
    return None


def _find_regional_sibling(parent_qid: str, target_region: str) -> Optional[str]:
    """
    Find an entity that:
      - is an instance of `parent_qid`
      - is associated with `target_region` (via P17 country OR P131 located-in OR rdfs:label contains region)
    Returns the English label of the best match, or None.
    """
    region_qid = REGION_QIDS.get(target_region)

    # Strategy A: use known Q-ID for the region
    if region_qid:
        query = f"""
        SELECT ?item ?itemLabel WHERE {{
          ?item wdt:P31 wd:{parent_qid} .
          {{ ?item wdt:P17 wd:{region_qid} . }}
          UNION
          {{ ?item wdt:P131 wd:{region_qid} . }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" . }}
        }}
        LIMIT 5
        """
        bindings = _sparql_query(query)
        if bindings:
            label = bindings[0].get("itemLabel", {}).get("value", "")
            if label and not label.startswith("Q"):       # skip bare Q-IDs
                logger.info("[Wikidata] Sibling found for region '%s': '%s'", target_region, label)
                return label

    # Strategy B: fuzzy — filter by region name appearing in description
    query = f"""
    SELECT ?item ?itemLabel WHERE {{
      ?item wdt:P31 wd:{parent_qid} .
      ?item schema:description ?desc .
      FILTER(CONTAINS(LCASE(?desc), LCASE("{target_region}")))
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" . }}
    }}
    LIMIT 5
    """
    bindings = _sparql_query(query)
    if bindings:
        label = bindings[0].get("itemLabel", {}).get("value", "")
        if label and not label.startswith("Q"):
            logger.info("[Wikidata] Sibling (desc-match) for '%s': '%s'", target_region, label)
            return label

    return None


def wikidata_lookup(entity_input: EntityInput) -> Optional[str]:
    """
    Tier 2: Full Wikidata SPARQL pipeline.
    Returns the English label of the target-region cultural equivalent, or None.
    """
    logger.info(
        "[Tier 2] Wikidata lookup: '%s' (%s) → %s",
        entity_input.entity_name, entity_input.source_region, entity_input.target_region,
    )

    # Step 1: Resolve source entity to Q-ID
    qid = _get_entity_qid(entity_input.entity_name)
    if not qid:
        logger.warning("[Wikidata] Could not resolve Q-ID for '%s'", entity_input.entity_name)
        return None

    # Step 2: Get P31 (instance of) parent
    parent_qid = _get_instance_of_parent(qid)
    if not parent_qid:
        logger.warning("[Wikidata] No P31 parent found for %s", qid)
        return None

    # Step 3: Find sibling entity in target region
    sibling = _find_regional_sibling(parent_qid, entity_input.target_region)
    return sibling   # None if not found


# ---------------------------------------------------------------------------
# Tier 3: Tavily Web Search + LiteLLM Extraction
# ---------------------------------------------------------------------------

def tavily_search(entity_input: EntityInput) -> list[str]:
    """
    Use Tavily to search for the cultural equivalent in the target region.
    Returns a list of text snippets, or empty list on failure.
    """
    if not TAVILY_API_KEY:
        logger.warning("[Tavily] TAVILY_API_KEY not set — skipping web search.")
        return []

    try:
        from tavily import TavilyClient  # type: ignore
        client  = TavilyClient(api_key=TAVILY_API_KEY)
        query   = (
            f"What is the {entity_input.target_region} cultural equivalent of "
            f"{entity_input.source_region}'s {entity_input.entity_name} {entity_input.entity_type}? "
            f"Name only the most accurate equivalent festival/food/tradition in {entity_input.target_region}."
        )
        logger.info("[Tavily] Searching: %s", query)
        response = client.search(
            query       = query,
            max_results = TAVILY_MAX_RESULTS,
            search_depth= "advanced",
        )
        snippets = [
            r.get("content", "") or r.get("snippet", "")
            for r in response.get("results", [])
            if r.get("content") or r.get("snippet")
        ]
        logger.info("[Tavily] Got %d snippets.", len(snippets))
        return snippets
    except ImportError:
        logger.error("[Tavily] tavily-python not installed.")
        return []
    except Exception as exc:
        logger.error("[Tavily] Search failed: %s", exc)
        return []


def llm_extract_entity(snippets: list[str], entity_input: EntityInput) -> Optional[str]:
    """
    Pass Tavily snippets to a lightweight LLM via LiteLLM.
    Extracts *only* the target entity name, or returns 'NO_EQUIVALENT'.
    """
    if not snippets:
        return None

    if not LITELLM_API_KEY:
        logger.warning("[LLM] OPENAI_API_KEY not set — skipping LLM extraction.")
        return None

    try:
        import litellm  # type: ignore

        context_block = "\n\n".join(f"[Source {i+1}]\n{s}" for i, s in enumerate(snippets[:3]))
        system_prompt = (
            "You are a cultural knowledge extraction assistant for India. "
            "Your task is to identify the EXACT name of a cultural equivalent entity. "
            "Reply with ONLY the entity name — no explanation, no punctuation, no extra words. "
            "If there is genuinely no equivalent, reply with exactly: NO_EQUIVALENT"
        )
        user_prompt = (
            f"Based on the search results below, what is the single best cultural equivalent "
            f"of '{entity_input.entity_name}' (a {entity_input.entity_type} from {entity_input.source_region}) "
            f"for the {entity_input.target_region} region?\n\n"
            f"{context_block}\n\n"
            f"Reply with ONLY the entity name."
        )

        logger.info("[LLM] Calling %s for entity extraction...", LITELLM_MODEL)
        response = litellm.completion(
            model    = LITELLM_MODEL,
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            max_tokens  = 20,
            temperature = 0.0,
        )
        extracted = response.choices[0].message.content.strip()
        logger.info("[LLM] Extracted entity name: '%s'", extracted)

        if extracted.upper() == "NO_EQUIVALENT" or not extracted:
            return None
        return extracted

    except ImportError:
        logger.error("[LiteLLM] litellm not installed.")
        return None
    except Exception as exc:
        logger.error("[LLM] Extraction failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Core Orchestration Function
# ---------------------------------------------------------------------------

def map_cultural_entity(entity_input: EntityInput) -> KnowledgeMappingResult:
    """
    Main entry point for the Cultural Knowledge Mapping & Enrichment module.

    Executes the 3-tier fallback pipeline and returns a KnowledgeMappingResult
    ready for consumption by the CrewAI Dialogue Rewriter agent.

    Tier 1 → Local JSON cache  (fastest)
    Tier 2 → Wikidata SPARQL   (structured graph)
    Tier 3 → Tavily + LiteLLM  (web search + LLM)
    """
    start_time = time.perf_counter()
    logger.info(
        "=== Cultural Mapping Request: '%s' [%s, %s] → %s ===",
        entity_input.entity_name,
        entity_input.entity_type,
        entity_input.source_region,
        entity_input.target_region,
    )

    # ------------------------------------------------------------------
    # TIER 1 — Local Cache
    # ------------------------------------------------------------------
    cached = lookup_cache(entity_input.entity_name, entity_input.target_region)
    if cached:
        result = KnowledgeMappingResult(
            source_entity = EntityRef(
                name   = cached.get("source_name", entity_input.entity_name),
                region = cached.get("source_region", entity_input.source_region),
                type   = cached.get("entity_type", entity_input.entity_type),
            ),
            target_entity = EntityRef(
                name   = cached["target_name"],
                region = cached["target_region"],
            ),
            wikipedia_context = cached.get("wikipedia_context", ""),
            resolution_tier   = 1,
            confidence        = 1.0,
        )
        elapsed = time.perf_counter() - start_time
        logger.info("Resolved via Tier 1 (Cache) in %.3fs.", elapsed)
        return result

    # ------------------------------------------------------------------
    # TIER 2 — Wikidata SPARQL
    # ------------------------------------------------------------------
    target_name: Optional[str] = None
    resolution_tier = 0

    try:
        target_name = wikidata_lookup(entity_input)
    except Exception as exc:
        logger.error("[Tier 2] Wikidata lookup threw an exception: %s", exc)

    if target_name:
        resolution_tier = 2
        logger.info("[Tier 2] Wikidata resolved target entity: '%s'", target_name)

    # ------------------------------------------------------------------
    # TIER 3 — Tavily Web Search + LiteLLM
    # ------------------------------------------------------------------
    if not target_name:
        logger.info("[Tier 3] Falling back to Tavily + LLM...")
        try:
            snippets    = tavily_search(entity_input)
            target_name = llm_extract_entity(snippets, entity_input)
        except Exception as exc:
            logger.error("[Tier 3] Tavily/LLM pipeline threw an exception: %s", exc)

        if target_name:
            resolution_tier = 3
            logger.info("[Tier 3] LLM resolved target entity: '%s'", target_name)

    # ------------------------------------------------------------------
    # FALLBACK — No equivalent found across all tiers
    # ------------------------------------------------------------------
    if not target_name:
        logger.warning(
            "No cultural equivalent found for '%s' in %s across all tiers.",
            entity_input.entity_name, entity_input.target_region,
        )
        return KnowledgeMappingResult(
            source_entity = EntityRef(
                name   = entity_input.entity_name,
                region = entity_input.source_region,
                type   = entity_input.entity_type,
            ),
            target_entity = EntityRef(
                name   = "NO_EQUIVALENT",
                region = entity_input.target_region,
            ),
            wikipedia_context = (
                f"No culturally equivalent entity was found for "
                f"'{entity_input.entity_name}' in {entity_input.target_region}."
            ),
            resolution_tier = 0,
            confidence      = 0.0,
        )

    # ------------------------------------------------------------------
    # Wikipedia Context Enrichment
    # ------------------------------------------------------------------
    wiki_context = fetch_wikipedia_context(target_name, entity_input.entity_type)

    # ------------------------------------------------------------------
    # Auto-update cache (Tier 2 / Tier 3 new discoveries)
    # ------------------------------------------------------------------
    update_cache(
        entity_name       = entity_input.entity_name,
        source_region     = entity_input.source_region,
        entity_type       = entity_input.entity_type,
        target_name       = target_name,
        target_region     = entity_input.target_region,
        wikipedia_context = wiki_context,
    )

    confidence_map = {2: 0.85, 3: 0.65}
    result = KnowledgeMappingResult(
        source_entity = EntityRef(
            name   = entity_input.entity_name,
            region = entity_input.source_region,
            type   = entity_input.entity_type,
        ),
        target_entity = EntityRef(
            name   = target_name,
            region = entity_input.target_region,
        ),
        wikipedia_context = wiki_context,
        resolution_tier   = resolution_tier,
        confidence        = confidence_map.get(resolution_tier, 0.5),
    )

    elapsed = time.perf_counter() - start_time
    logger.info(
        "Resolved via Tier %d in %.3fs. Target entity: '%s'",
        resolution_tier, elapsed, target_name,
    )
    return result


# ---------------------------------------------------------------------------
# Convenience wrapper — accepts a plain dict (for CrewAI tool compatibility)
# ---------------------------------------------------------------------------

def map_entity_from_dict(data: dict) -> dict:
    """
    Thin wrapper around map_cultural_entity() that accepts and returns plain dicts.
    Useful when called from CrewAI tools or FastAPI endpoints.
    """
    entity_input = EntityInput(**data)
    result       = map_cultural_entity(entity_input)
    return result.model_dump()


# ---------------------------------------------------------------------------
# __main__ — Integration Test Block
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import pprint

    print("\n" + "=" * 70)
    print("  MAATRAM AI — Cultural Knowledge Mapper Integration Tests")
    print("=" * 70 + "\n")

    # ---------------------------------------------------------------
    # Test 1: Vishu (Kerala) → Puthandu (Tamil Nadu) — should hit cache
    # ---------------------------------------------------------------
    print("--- Test 1: Vishu [Festival, Kerala] → Tamil Nadu ---")
    input_1 = EntityInput(
        entity_name   = "Vishu",
        entity_type   = "Festival",
        source_region = "Kerala",
        target_region = "Tamil Nadu",
    )
    result_1 = map_cultural_entity(input_1)
    pprint.pprint(result_1.model_dump(), indent=2)
    print()

    # ---------------------------------------------------------------
    # Test 2: Sadhya (Kerala) → Tamil Nadu — should hit cache
    # ---------------------------------------------------------------
    print("--- Test 2: Sadhya [Food, Kerala] → Tamil Nadu ---")
    input_2 = EntityInput(
        entity_name   = "Sadhya",
        entity_type   = "Food",
        source_region = "Kerala",
        target_region = "Tamil Nadu",
    )
    result_2 = map_cultural_entity(input_2)
    pprint.pprint(result_2.model_dump(), indent=2)
    print()

    # ---------------------------------------------------------------
    # Test 3: Kasavu Saree (Kerala) → Karnataka — should hit cache
    # ---------------------------------------------------------------
    print("--- Test 3: Kasavu Saree [Clothing, Kerala] → Karnataka ---")
    input_3 = EntityInput(
        entity_name   = "Kasavu Saree",
        entity_type   = "Clothing",
        source_region = "Kerala",
        target_region = "Karnataka",
    )
    result_3 = map_cultural_entity(input_3)
    pprint.pprint(result_3.model_dump(), indent=2)
    print()

    # ---------------------------------------------------------------
    # Test 4: Wikidata path — entity NOT in cache (Pongal → West Bengal)
    # ---------------------------------------------------------------
    print("--- Test 4: Pongal [Festival, Tamil Nadu] → West Bengal (Wikidata path) ---")
    input_4 = EntityInput(
        entity_name   = "Pongal",
        entity_type   = "Festival",
        source_region = "Tamil Nadu",
        target_region = "West Bengal",
    )
    result_4 = map_cultural_entity(input_4)
    pprint.pprint(result_4.model_dump(), indent=2)
    print()

    # ---------------------------------------------------------------
    # Test 5: dict interface (for CrewAI / FastAPI compatibility)
    # ---------------------------------------------------------------
    print("--- Test 5: dict interface (Onam → Tamil Nadu) ---")
    raw_dict = {
        "entity_name"   : "Onam",
        "entity_type"   : "Festival",
        "source_region" : "Kerala",
        "target_region" : "Tamil Nadu",
    }
    result_5 = map_entity_from_dict(raw_dict)
    pprint.pprint(result_5, indent=2)
    print()

    print("=" * 70)
    print("  All tests complete.")
    print("=" * 70 + "\n")
