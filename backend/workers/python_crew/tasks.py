from crewai import Task
from datetime import datetime

class MaatramTasks:
    def identify_and_map_entities(self, agent, transcript_chunks, target_region):
        return Task(
            description=f"""Analyze the following transcript chunks and identify cultural anchors.
            Map these anchors to the {target_region} context using Tavily/Wikipedia logic.
            
            TRANSCRIPT:
            {transcript_chunks}
            """,
            expected_output="A JSON mapping of Source Entity -> Target Entity with a brief cultural reasoning.",
            agent=agent
        )

    def rewrite_for_natural_flow(self, agent, original_transcript, entity_map, target_language):
        return Task(
            description=f"""Using the entity map, rewrite the transcript into {target_language}.
            Ensure the tone is preserved and the sentence length matches the original for better dubbing sync.
            
            ORIGINAL: {original_transcript}
            MAPPING: {entity_map}
            """,
            expected_output="A transcreated transcript in the target language with cultural anchors seamlessly integrated.",
            agent=agent
        )

    def validate_sync_and_metadata(self, agent, final_script):
        return Task(
            description=f"""Audit the final transcreated script. Check for:
            1. Pacing and duration consistency.
            2. Correctness of cultural nuances.
            3. Preparation of metadata for Bulbul V2 TTS engine.
            
            SCRIPT: {final_script}
            """,
            expected_output="Validated final script ready for TTS synthesis, or flags for corrections.",
            agent=agent
        )
