"""
AI Architect - Trading Decision System
Full Pipeline Implementation with Comprehensive Logging
"""

import uuid
import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Any

from fastapi import FastAPI, Request, BackgroundTasks, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import settings
from clients.llm_client import MainLLMClient
from clients.vector_store import VectorStore

# Configure logging with more detail
logging.basicConfig(
    level=logging.INFO, 
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("AI_ARCHITECT")


# =============================================================================
# SCHEMAS
# =============================================================================

class ChatMessage(BaseModel):
    message: str
    session_id: str | None = None


class DecisionRequest(BaseModel):
    symbol: str
    timeframe: str
    market_context: dict[str, Any]
    question: str = "Should I take this trade?"


class TradeClosedRequest(BaseModel):
    trade_id: str
    entry: float
    exit: float
    result: float
    context: dict[str, Any] = {}


# =============================================================================
# FULL DECISION PIPELINE WITH LOGGING
# =============================================================================

class DecisionPipeline:
    """Full 6-step decision pipeline with comprehensive logging."""
    
    def __init__(self, llm: MainLLMClient, vector_store: VectorStore):
        self.llm = llm
        self.vector_store = vector_store
        self.steps_executed = []
    
    async def execute(
        self,
        symbol: str,
        timeframe: str,
        market_context: dict[str, Any],
        question: str,
    ) -> dict[str, Any]:
        """Execute the full 6-step decision pipeline."""
        start_time = time.time()
        self.steps_executed = []
        
        logger.info("=" * 60)
        logger.info(f"🚀 DECISION PIPELINE STARTED for {symbol} {timeframe}")
        logger.info("=" * 60)
        
        # ---------------------------------------------------------------------
        # STEP 1: EMBED CONTEXT
        # ---------------------------------------------------------------------
        step1_start = time.time()
        logger.info("📊 STEP 1/6: Embedding market context...")
        
        context_text = self._format_context(symbol, timeframe, market_context)
        logger.info(f"   Context: {context_text[:100]}...")
        
        # Try to get embedding from LocalAI (or use mock if not available)
        try:
            embedding = await self._get_embedding(context_text)
            logger.info(f"   ✅ Generated embedding (dim={len(embedding)})")
        except Exception as e:
            logger.warning(f"   ⚠️ Embedding failed: {e}, using mock embedding")
            embedding = [0.1] * settings.EMBEDDING_DIMENSION
        
        step1_time = time.time() - step1_start
        self.steps_executed.append({"step": 1, "name": "Embed Context", "time": step1_time, "status": "✅"})
        logger.info(f"   Step 1 completed in {step1_time:.2f}s")
        
        # ---------------------------------------------------------------------
        # STEP 2: SEARCH MEMORY FOR SIMILAR TRADES
        # ---------------------------------------------------------------------
        step2_start = time.time()
        logger.info("🔍 STEP 2/6: Searching memory for similar trades...")
        
        try:
            similar_trades = await self.vector_store.search_similar_trades(
                embedding=embedding,
                symbol=symbol,
                limit=settings.MAX_SIMILAR_TRADES,
            )
            logger.info(f"   ✅ Found {len(similar_trades)} similar trades")
            for i, trade in enumerate(similar_trades[:3]):
                logger.info(f"      {i+1}. Score: {trade.get('score', 0):.2f} | {trade.get('summary', 'No summary')[:50]}")
        except Exception as e:
            logger.warning(f"   ⚠️ Memory search failed: {e}")
            similar_trades = []
        
        step2_time = time.time() - step2_start
        self.steps_executed.append({"step": 2, "name": "Search Memory", "time": step2_time, "status": "✅", "results": len(similar_trades)})
        logger.info(f"   Step 2 completed in {step2_time:.2f}s")
        
        # ---------------------------------------------------------------------
        # STEP 3: RETRIEVE TRADING RULES
        # ---------------------------------------------------------------------
        step3_start = time.time()
        logger.info("📜 STEP 3/6: Retrieving trading rules...")
        
        try:
            relevant_rules = await self.vector_store.search_relevant_rules(
                embedding=embedding,
                limit=settings.MAX_RULES_CONTEXT,
                min_score=settings.MIN_RULE_CONFIDENCE,
            )
            logger.info(f"   ✅ Found {len(relevant_rules)} relevant rules")
            for i, rule in enumerate(relevant_rules[:3]):
                logger.info(f"      {i+1}. Conf: {rule.get('confidence', 0):.2f} | {rule.get('rule_text', 'No text')[:50]}")
        except Exception as e:
            logger.warning(f"   ⚠️ Rules retrieval failed: {e}")
            relevant_rules = []
        
        step3_time = time.time() - step3_start
        self.steps_executed.append({"step": 3, "name": "Retrieve Rules", "time": step3_time, "status": "✅", "results": len(relevant_rules)})
        logger.info(f"   Step 3 completed in {step3_time:.2f}s")
        
        # ---------------------------------------------------------------------
        # STEP 4: BUILD DYNAMIC PROMPT
        # ---------------------------------------------------------------------
        step4_start = time.time()
        logger.info("🔧 STEP 4/6: Building dynamic prompt...")
        
        prompt = self._build_prompt(
            symbol=symbol,
            timeframe=timeframe,
            market_context=market_context,
            question=question,
            similar_trades=similar_trades,
            relevant_rules=relevant_rules,
        )
        
        logger.info(f"   ✅ Built prompt with {len(prompt)} messages")
        logger.info(f"   System prompt length: {len(prompt[0]['content'])} chars")
        
        step4_time = time.time() - step4_start
        self.steps_executed.append({"step": 4, "name": "Build Prompt", "time": step4_time, "status": "✅"})
        logger.info(f"   Step 4 completed in {step4_time:.2f}s")
        
        # ---------------------------------------------------------------------
        # STEP 5: CALL LLM
        # ---------------------------------------------------------------------
        step5_start = time.time()
        logger.info("🧠 STEP 5/6: Calling LLM for decision...")
        logger.info(f"   Model: {settings.LLM_MODEL}")
        logger.info(f"   URL: {settings.LLM_URL}")
        
        try:
            response_text = await self.llm.get_text_response(
                messages=prompt,
                temperature=0.3,
                max_tokens=1024,
            )
            logger.info(f"   ✅ LLM response received ({len(response_text)} chars)")
        except Exception as e:
            logger.error(f"   ❌ LLM call failed: {e}")
            raise
        
        step5_time = time.time() - step5_start
        self.steps_executed.append({"step": 5, "name": "Call LLM", "time": step5_time, "status": "✅"})
        logger.info(f"   Step 5 completed in {step5_time:.2f}s")
        
        # ---------------------------------------------------------------------
        # STEP 6: PARSE AND RETURN RESPONSE
        # ---------------------------------------------------------------------
        step6_start = time.time()
        logger.info("📤 STEP 6/6: Parsing response...")
        
        result = self._parse_response(response_text)
        
        logger.info(f"   Decision: {result['decision']}")
        logger.info(f"   Confidence: {result['confidence']:.0%}")
        logger.info(f"   Reason: {result['reason'][:100]}...")
        
        step6_time = time.time() - step6_start
        self.steps_executed.append({"step": 6, "name": "Return Response", "time": step6_time, "status": "✅"})
        
        # ---------------------------------------------------------------------
        # SUMMARY
        # ---------------------------------------------------------------------
        total_time = time.time() - start_time
        logger.info("=" * 60)
        logger.info(f"✅ PIPELINE COMPLETED in {total_time:.2f}s")
        logger.info(f"   Similar Trades Found: {len(similar_trades)}")
        logger.info(f"   Rules Applied: {len(relevant_rules)}")
        logger.info(f"   Decision: {result['decision']} ({result['confidence']:.0%})")
        logger.info("=" * 60)
        
        # Add pipeline metadata to result
        result["pipeline_metadata"] = {
            "total_time": total_time,
            "steps": self.steps_executed,
            "similar_trades_count": len(similar_trades),
            "rules_applied_count": len(relevant_rules),
        }
        
        return result
    
    async def _get_embedding(self, text: str) -> list[float]:
        """Get embedding from LocalAI embeddings endpoint."""
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.EMBEDDINGS_URL}/v1/embeddings",
                json={
                    "input": text,
                    "model": "text-embedding-ada-002"  # LocalAI will use available model
                }
            )
            response.raise_for_status()
            data = response.json()
            return data["data"][0]["embedding"]
    
    def _format_context(self, symbol: str, timeframe: str, market_context: dict) -> str:
        """Format market context for embedding."""
        parts = [f"Symbol: {symbol}", f"Timeframe: {timeframe}"]
        for key, value in market_context.items():
            if isinstance(value, (int, float, str)):
                parts.append(f"{key}: {value}")
        return " | ".join(parts)
    
    def _build_prompt(
        self, symbol: str, timeframe: str, market_context: dict,
        question: str, similar_trades: list, relevant_rules: list
    ) -> list[dict]:
        """Build dynamic prompt with memory and rules."""
        
        # Base system prompt
        system = f"""You are AI Architect, an expert trading decision system.

CURRENT CONTEXT:
- Symbol: {symbol}
- Timeframe: {timeframe}
- Market Data: {market_context}
"""
        
        # Add similar trades if found
        if similar_trades:
            system += "\n\nSIMILAR PAST TRADES (learn from these):\n"
            for i, trade in enumerate(similar_trades[:3], 1):
                system += f"{i}. {trade.get('summary', 'No summary')}\n"
        
        # Add rules if found
        if relevant_rules:
            system += "\n\nACTIVE TRADING RULES (follow these):\n"
            for i, rule in enumerate(relevant_rules[:5], 1):
                system += f"{i}. [{rule.get('confidence', 0):.0%}] {rule.get('rule_text', 'No text')}\n"
        
        system += """

RESPOND WITH:
1. Your decision: TAKE_TRADE or NO_TRADE
2. Confidence level: 0-100%
3. Clear reasoning

Be concise but thorough. Consider risk management."""
        
        return [
            {"role": "system", "content": system},
            {"role": "user", "content": question}
        ]
    
    def _parse_response(self, text: str) -> dict:
        """Parse LLM response into structured decision."""
        text_lower = text.lower()
        
        # Determine decision
        if "take_trade" in text_lower or "take trade" in text_lower:
            decision = "TAKE_TRADE"
        else:
            decision = "NO_TRADE"
        
        # Extract confidence
        import re
        conf_match = re.search(r'(\d+)\s*%', text)
        if conf_match:
            confidence = min(int(conf_match.group(1)) / 100, 1.0)
        else:
            confidence = 0.6 if decision == "TAKE_TRADE" else 0.4
        
        return {
            "decision": decision,
            "confidence": confidence,
            "reason": text[:1000]
        }


# =============================================================================
# APPLICATION SETUP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    logger.info("🏛️ Starting AI Architect Trading System...")
    
    # Initialize LLM client
    app.state.llm = MainLLMClient()
    logger.info(f"   LLM: {settings.LLM_URL}")
    
    # Initialize Vector Store
    app.state.vector_store = VectorStore()
    try:
        await app.state.vector_store.initialize_collections()
        logger.info(f"   Qdrant: {settings.QDRANT_URL} ✅")
    except Exception as e:
        logger.warning(f"   Qdrant: {e} (will retry on first use)")
    
    # Initialize Decision Pipeline
    app.state.decision_pipeline = DecisionPipeline(
        llm=app.state.llm,
        vector_store=app.state.vector_store
    )
    
    # Chat sessions
    app.state.sessions = {}
    
    logger.info("🏛️ AI Architect Ready!")
    yield
    logger.info("🏛️ Shutting down...")


app = FastAPI(
    title="AI Architect - Trading Decision System",
    description="Local, offline-capable AI trading decision system with full pipeline",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# =============================================================================
# WEB UI ROUTES
# =============================================================================

@app.get("/", response_class=HTMLResponse)
async def chat_page(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request, "session_id": str(uuid.uuid4())})


@app.get("/info", response_class=HTMLResponse)
async def info_page(request: Request):
    return templates.TemplateResponse("info.html", {"request": request})


@app.get("/execute", response_class=HTMLResponse)
async def execute_page(request: Request):
    return templates.TemplateResponse("execute.html", {"request": request})


# =============================================================================
# CHAT ENDPOINT (uses simplified pipeline for chat)
# =============================================================================

@app.post("/api/chat")
async def chat(message: ChatMessage):
    llm: MainLLMClient = app.state.llm
    session_id = message.session_id or str(uuid.uuid4())
    
    if session_id not in app.state.sessions:
        app.state.sessions[session_id] = []
    
    history = app.state.sessions[session_id]
    
    system_prompt = """You are AI Architect, an expert trading assistant. You help traders analyze markets, make trading decisions, and learn from past trades. Be concise but thorough. Always consider risk management."""
    
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history[-10:])
    messages.append({"role": "user", "content": message.message})
    
    logger.info(f"💬 Chat request: {message.message[:50]}...")
    
    try:
        response = await llm.get_text_response(messages=messages, temperature=0.7, max_tokens=1024)
        history.append({"role": "user", "content": message.message})
        history.append({"role": "assistant", "content": response})
        return {"response": response, "session_id": session_id}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": f"Error: {str(e)}", "session_id": session_id}


# =============================================================================
# DECISION ENDPOINT (FULL PIPELINE)
# =============================================================================

@app.post("/api/decision")
async def make_decision(request: DecisionRequest):
    """
    Make a trading decision using the FULL 6-step pipeline.
    
    Steps:
    1. Embed Context - Convert market data to vector
    2. Search Memory - Query Qdrant for similar trades
    3. Retrieve Rules - Get high-confidence trading rules
    4. Build Prompt - Create dynamic prompt with context
    5. Call LLM - Get decision from AI
    6. Return Response - Structured decision with confidence
    """
    pipeline: DecisionPipeline = app.state.decision_pipeline
    
    try:
        result = await pipeline.execute(
            symbol=request.symbol,
            timeframe=request.timeframe,
            market_context=request.market_context,
            question=request.question,
        )
        return result
    except Exception as e:
        logger.error(f"Decision pipeline error: {e}")
        return {"decision": "NO_TRADE", "confidence": 0.5, "reason": f"Pipeline error: {e}"}


# =============================================================================
# TRADE CLOSED ENDPOINT (LEARNING)
# =============================================================================

@app.post("/api/trade/closed")
async def trade_closed(request: TradeClosedRequest, background_tasks: BackgroundTasks):
    """Submit a completed trade for learning (async)."""
    logger.info(f"📚 Trade closed: {request.trade_id}")
    logger.info(f"   Entry: {request.entry} → Exit: {request.exit} = {request.result:+.2f}")
    
    # TODO: Add full learning pipeline here
    # For now, just log and acknowledge
    
    return {"status": "learning_queued", "trade_id": request.trade_id}


# =============================================================================
# HEALTH & UTILITY ENDPOINTS
# =============================================================================

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "llm_url": settings.LLM_URL,
        "qdrant_url": settings.QDRANT_URL,
        "pipeline": "full"
    }


# =============================================================================
# OPENAI-COMPATIBLE CHAT COMPLETIONS ENDPOINT
# =============================================================================

class OpenAIChatMessage(BaseModel):
    role: str
    content: str

class OpenAIChatRequest(BaseModel):
    model: str = "ai-architect"
    messages: list[OpenAIChatMessage]
    temperature: float = 0.7
    max_tokens: int = 1024
    stream: bool = False

@app.post("/v1/chat/completions")
async def openai_chat_completions(request: OpenAIChatRequest):
    """
    OpenAI-compatible chat completions endpoint.
    Routes to full pipeline for trading decisions or simple chat.
    """
    llm: MainLLMClient = app.state.llm
    
    # Extract the last user message
    user_message = ""
    for msg in reversed(request.messages):
        if msg.role == "user":
            user_message = msg.content
            break
    
    logger.info(f"🔌 OpenAI-compatible request: {user_message[:50]}...")
    
    # Check if this looks like a trading decision request
    trading_keywords = ["trade", "buy", "sell", "position", "entry", "exit", "should i", "take trade"]
    is_trading_request = any(kw in user_message.lower() for kw in trading_keywords)
    
    try:
        if is_trading_request:
            # Use full pipeline for trading decisions
            logger.info("   → Routing to FULL PIPELINE")
            pipeline: DecisionPipeline = app.state.decision_pipeline
            
            # Try to extract symbol from message
            import re
            symbol_match = re.search(r'\b([A-Z]{2,5})\b', user_message)
            symbol = symbol_match.group(1) if symbol_match else "UNKNOWN"
            
            result = await pipeline.execute(
                symbol=symbol,
                timeframe="1H",
                market_context={"source": "openai_api", "message": user_message},
                question=user_message,
            )
            response_text = f"**Decision: {result['decision']}** (Confidence: {result['confidence']:.0%})\n\n{result['reason']}"
        else:
            # Simple chat response
            logger.info("   → Routing to simple chat")
            messages = [{"role": m.role, "content": m.content} for m in request.messages]
            response_text = await llm.get_text_response(
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )
        
        # Return in OpenAI format
        return {
            "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": len(user_message.split()),
                "completion_tokens": len(response_text.split()),
                "total_tokens": len(user_message.split()) + len(response_text.split())
            }
        }
    except Exception as e:
        logger.error(f"OpenAI endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/models")
async def list_models():
    """OpenAI-compatible models list endpoint."""
    return {
        "object": "list",
        "data": [
            {
                "id": "ai-architect",
                "object": "model",
                "created": 1700000000,
                "owned_by": "local",
                "permission": [],
                "root": "ai-architect",
                "parent": None
            },
            {
                "id": "Qwen/Qwen2.5-32B-Instruct-AWQ",
                "object": "model",
                "created": 1700000000,
                "owned_by": "local"
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8065)
