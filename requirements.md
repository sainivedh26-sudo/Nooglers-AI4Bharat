# Requirements

## Problem
Regional creators struggle to scale their videos across Indian states because direct translation keeps the words but loses cultural meaning, which reduces engagement and trust.

## Goal
Build a platform that converts a regional video into culturally localized versions for other Indian audiences by adapting culture specific references, not just translating text.

## In Scope
- Upload a video and choose target audience language or region.
- Generate transcript from audio.
- Detect culture specific items in the transcript such as people, places, festivals, slang, events.
- Link detected items to canonical IDs using Wikidata so aliases and spellings do not break the system. [en.wikipedia](https://en.wikipedia.org/wiki/Wikidata)
- Retrieve facts and candidate equivalents using Wikidata Query Service and Wikipedia graph signals.
- Suggest culturally relevant replacements with confidence and explain why.
- Produce localized outputs focused on text layers
  - Updated captions or subtitle text
  - Localized title and description
  - Localized tags and metadata

## Users
- Creator: uploads video, selects target audience, reviews suggestions, exports outputs.
- Viewer: consumes localized content (indirect benefit).
- Moderator or Reviewer: optional role to approve changes for sensitive content.

## Functional Requirements
FR1 Video upload and target selection  
- System accepts a video file and target language or region.

FR2 Transcription  
- System generates a time aligned transcript.  
- Must support Indic languages using Indic models when possible. [github](https://github.com/AI4Bharat/IndicBERT)

FR3 Chunking for long videos  
- Transcript is split into semantic chunks to avoid sentence level processing.

FR4 Culture specific item extraction  
- For each chunk, extract candidate entities and cultural phrases.
- Output must include timestamps and surface text spans.

FR5 Entity linking to Wikidata IDs  
- For each extracted entity, resolve to a Wikidata QID and store aliases. [en.wikipedia](https://en.wikipedia.org/wiki/Wikidata)

FR6 Graph enrichment  
- For all QIDs in the video, fetch facts in batch using SPARQL.
- Facts include occupation, location relations, language labels, known for, and other relevant properties.

FR7 Candidate discovery for target culture  
- Using the chunk context, retrieve a shortlist of culturally similar target entities.

FR8 Ranking and recommendation  
- Rank candidates and provide top 3 suggestions per cultural item.
- Provide a confidence score and short reason grounded in retrieved facts.

FR9 Human in the loop editing  
- Creator can accept or reject each substitution.
- Creator can lock certain entities to never change.

FR10 Output generation  
- Produce localized captions text.
- Produce localized title, description, and tags.

FR11 Export  
- Download localized text outputs as files
  - SRT or VTT for captions
  - JSON for all edits and reasoning
  - Markdown summary for the creator

## Non Functional Requirements
NFR1 Low latency for suggestions  
- Must feel interactive for creators on a 15 to 20 minute video by batching and caching.

NFR2 Reliability and safety  
- System must prefer refusal over wrong substitution when confidence is low.

NFR3 Cost awareness  
- Use caching and batch queries to avoid heavy external calls.

NFR4 WDQS compliance  
- Respect Wikidata Query Service limits and use caching and backoff. [mediawiki](https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual)

NFR5 Reproducibility  
- Average time to process a 15 minute video to first suggestions.

## Assumptions
- Video audio is reasonably clear.
- Wikidata contains enough basic facts for many popular entities.
- Human approval is allowed in the product loop.
- All outputs must include the QID and the evidence facts used.

## Success Metrics
- Top 1 and Top 3 suggestion accuracy on a small labeled set.
- Refusal rate for ambiguous items.
- Average time to process a 15 minute video to first suggestions.

## Assumptions
- Video audio is reasonably clear.
- Wikidata contains enough basic facts for many popular entities.
- Human approval is allowed in the product loop.
