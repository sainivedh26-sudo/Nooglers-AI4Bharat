# Design

## Overview
The system performs cultural transcreation using a grounded pipeline. It first extracts culture specific items from the transcript, links them to Wikidata QIDs, enriches them with graph facts, then generates ranked target culture equivalents and produces localized text outputs. This is inspired by knowledge grounded cross cultural translation approaches that use retrieval from multilingual knowledge graphs. [arxiv](https://arxiv.org/abs/2410.14057)

## High Level Architecture
1 Ingestion Service  
- Handles video upload and job creation.
- Stores raw video in object storage.

2 Transcription Service  
- Extracts audio and produces time aligned transcript.
- Uses Indic models where applicable. [github](https://github.com/AI4Bharat/IndicBERT)

3 Chunking and CSI Extraction Service  
- Splits transcript into chunks.
- Runs NER and cultural span detection.
- Outputs a list of mentions with chunk_id and timestamps.

4 Entity Linking Service  
- Resolves each mention to a Wikidata QID.
- Maintains an entity cache mapping mention string to QID and aliases. [en.wikipedia](https://en.wikipedia.org/wiki/Wikidata)

5 Graph Enrichment Service  
- Runs batched WDQS SPARQL queries using VALUES lists of QIDs.
- Pulls labels in target language plus key properties.
- Caches results per QID with TTL.

6 Candidate Retrieval and Ranking Service  
- For each cultural item, forms a query context using surrounding text.
- Retrieves top k candidates from a target pool filtered by region signals.
- Ranks and returns top 3 suggestions plus reason strings.

7 Rewrite and Export Service  
- Applies accepted substitutions to captions and metadata.
- Exports VTT or SRT plus JSON audit trail.

## Data Model

### TranscriptChunk
- chunk_id
- start_time
- end_time
- text

### Mention
- mention_id
- chunk_id
- span_text
- start_time
- end_time
- mention_type person place festival phrase

### Entity
- qid
- labels by language
- aliases by language
- facts map

### Suggestion
- mention_id
- source_qid
- target_qid
- target_label
- confidence
- evidence list of facts and snippets

## Wikidata Usage

### Why QIDs
QIDs provide canonical identity across languages and aliases, enabling consistent retrieval and rendering in the target language. [wikidata](https://www.wikidata.org/wiki/Q43649390)

### WDQS Limits Handling
WDQS enforces a 60 second query deadline and per client processing budget, so we batch queries and cache responses. [mediawiki](https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual)

### Query Patterns
Pattern A resolve mention to QID  
- Use EntitySearch via mwapi for initial candidates and then filter using graph constraints such as human and occupation.

Pattern B batch enrich QIDs  
- Use VALUES { wd:Q... } to fetch labels, occupations, locations, and other facts.

Pattern C target candidate pool  
- Query for people or entities in the target region by combining occupation and location constraints.

## Batching Strategy for Long Videos
- Extract mentions per chunk.
- Deduplicate mentions globally.
- Perform QID resolution once per unique string.
- Enrich all QIDs with 1 to 3 SPARQL calls per video.
- Run candidate retrieval only for the top N high impact mentions, based on frequency and salience.

## Ranking Strategy
We combine multiple signals:
- Context similarity between chunk text and candidate description embedding.
- Graph compatibility such as same occupation class and region constraints.
- Popularity proxy like sitelink count to avoid obscure substitutions.

If top scores are close or low, the system returns “no safe substitution” and asks for human choice.

## Output Strategy
Primary output is text layer localization:
- Captions VTT or SRT with replaced culture specific references.
- Localized title and description suggestions.
- Tags and keywords for distribution.

All outputs contain an audit record of
- source mention
- source QID
- target QID
- evidence facts used

## Deployment Notes
- Backend FastAPI services.
- Redis for caching QID lookups and WDQS results.
- PostgreSQL for jobs and user edits.
- Worker queue for transcription and enrichment.

