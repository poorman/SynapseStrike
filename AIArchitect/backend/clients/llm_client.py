"""LLM Client - OpenAI compatible"""
import json
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from config import settings


class MainLLMClient:
    def __init__(self):
        self.base_url = settings.LLM_URL.rstrip("/")
        self.model_name = settings.LLM_MODEL
        self.client = httpx.AsyncClient(timeout=120.0)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def chat_completion(self, messages: list, temperature: float = 0.7, max_tokens: int = 2048):
        url = f"{self.base_url}/v1/chat/completions"
        payload = {"model": self.model_name, "messages": messages, "temperature": temperature, "max_tokens": max_tokens}
        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        return response.json()
    
    async def get_text_response(self, messages: list, temperature: float = 0.7, max_tokens: int = 2048) -> str:
        result = await self.chat_completion(messages, temperature, max_tokens)
        return result["choices"][0]["message"]["content"]
    
    async def get_json_response(self, messages: list, temperature: float = 0.3, max_tokens: int = 2048) -> dict:
        result = await self.chat_completion(messages, temperature, max_tokens)
        content = result["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            import re
            match = re.search(r'\{[\s\S]*\}', content)
            if match:
                return json.loads(match.group())
            raise ValueError(f"Failed to parse JSON: {content}")
