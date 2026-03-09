from crewai import Agent
from langchain_openai import ChatOpenAI
import os

# Using Qwen or similar via OpenAI-compatible endpoint if available, 
# or defaulting to a placeholder configuration
llm = ChatOpenAI(
    model="qwen-2.5-72b",
    base_url="https://api.together.xyz/v1", # Example provider
    api_key=os.getenv("_API_KEY", "your_key_here")
)

class MaatramAgents:
    def culture_analyst(self):
        return Agent(
            role='Regional Culture & Entity Analyst',
            goal='Identify culturally specific entities (food, festivals, locations) and find their precise equivalents in the target region.',
            backstory="""You are an expert in Indian cross-cultural nuances. You understand that 'Onam' in Kerala 
            has a specific emotional and social weight that might be best represented by 'Pongal' in Tamil Nadu 
            or 'Baisakhi' in Punjab to maintain the same impact.""",
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

    def transcreation_specialist(self):
        return Agent(
            role='Transcreation Specialist',
            goal='Rewrite the translated transcript to naturally integrate cultural substitutions while maintaining lip-sync feasibility.',
            backstory="""You are a linguist specialized in 'Transcreation' - the process of adapting a message 
            from one language to another while maintaining its intent, style, tone, and context. 
            You ensure the flow sounds native, not translated.""",
            llm=llm,
            verbose=True
        )

    def technical_validator(self):
        return Agent(
            role='Technical Consistency Auditor',
            goal='Verify that all entity replacements are factually consistent and that timestamps remain aligned for the TTS engine.',
            backstory="""You ensure that if a 2-second mention of 'Sadhya' is replaced, the new term fits 
            the timing constraints and that the Wikidata Q-IDs for entities are correctly mapped.""",
            llm=llm,
            verbose=True
        )
