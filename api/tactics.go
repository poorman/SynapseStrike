package api

import (
	"SynapseStrike/decision"
	"SynapseStrike/market"
	"SynapseStrike/mcp"
	"SynapseStrike/store"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// validateTacticConfig validates tactic configuration and returns warnings
func validateTacticConfig(config *store.TacticConfig) []string {
	var warnings []string

	// Validate quant data URL if enabled
	if config.Indicators.EnableQuantData && config.Indicators.QuantDataAPIURL != "" {
		if !strings.Contains(config.Indicators.QuantDataAPIURL, "{symbol}") {
			warnings = append(warnings, "Quant data URL does not contain {symbol} placeholder. The same data will be used for all coins, which may not be correct.")
		}
	}

	return warnings
}

// handleGetTactics Get tactic list
func (s *Server) handleGetTactics(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	tactics, err := s.store.Tactic().List(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get tactic list: " + err.Error()})
		return
	}

	// Convert to frontend format
	result := make([]gin.H, 0, len(tactics))
	for _, st := range tactics {
		var config store.TacticConfig
		json.Unmarshal([]byte(st.Config), &config)

		result = append(result, gin.H{
			"id":            st.ID,
			"name":          st.Name,
			"description":   st.Description,
			"strategy_type": st.StrategyType,
			"is_active":     st.IsActive,
			"is_default":    st.IsDefault,
			"config":        config,
			"created_at":    st.CreatedAt,
			"updated_at":    st.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"tactics": result,
	})
}

// handleGetTactic Get single tactic
func (s *Server) handleGetTactic(c *gin.Context) {
	userID := c.GetString("user_id")
	tacticID := c.Param("id")

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	tactic, err := s.store.Tactic().Get(userID, tacticID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tactic not found"})
		return
	}

	var config store.TacticConfig
	json.Unmarshal([]byte(tactic.Config), &config)

	c.JSON(http.StatusOK, gin.H{
		"id":          tactic.ID,
		"name":        tactic.Name,
		"description": tactic.Description,
		"is_active":   tactic.IsActive,
		"is_default":  tactic.IsDefault,
		"config":      config,
		"created_at":  tactic.CreatedAt,
		"updated_at":  tactic.UpdatedAt,
	})
}

// handleCreateTactic Create tactic
func (s *Server) handleCreateTactic(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Name         string             `json:"name" binding:"required"`
		Description  string             `json:"description"`
		StrategyType string             `json:"strategy_type"` // sonnet, opus, current, cursor
		Config       store.TacticConfig `json:"config" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters: " + err.Error()})
		return
	}

	// Serialize configuration
	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to serialize configuration"})
		return
	}

	// Default to 'sonnet' if not specified
	strategyType := req.StrategyType
	if strategyType == "" {
		strategyType = "sonnet"
	}

	tactic := &store.Tactic{
		ID:           uuid.New().String(),
		UserID:       userID,
		Name:         req.Name,
		Description:  req.Description,
		StrategyType: strategyType,
		IsActive:     false,
		IsDefault:    false,
		Config:       string(configJSON),
	}

	if err := s.store.Tactic().Create(tactic); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tactic: " + err.Error()})
		return
	}

	// Validate configuration and collect warnings
	warnings := validateTacticConfig(&req.Config)

	response := gin.H{
		"id":      tactic.ID,
		"message": "Tactic created successfully",
	}
	if len(warnings) > 0 {
		response["warnings"] = warnings
	}

	c.JSON(http.StatusOK, response)
}

// handleUpdateTactic Update tactic
func (s *Server) handleUpdateTactic(c *gin.Context) {
	userID := c.GetString("user_id")
	tacticID := c.Param("id")

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if it's a system default tactic
	existing, err := s.store.Tactic().Get(userID, tacticID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tactic not found"})
		return
	}
	if existing.IsDefault {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify system default tactic"})
		return
	}

	var req struct {
		Name        string             `json:"name"`
		Description string             `json:"description"`
		Config      store.TacticConfig `json:"config"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters: " + err.Error()})
		return
	}

	// Debug logging
	fmt.Printf("🔍 Tactic update - StaticStocks received: %v", req.Config.CoinSource.StaticStocks)
	fmt.Printf("🔍 Tactic update - StaticCoins received: %v", req.Config.CoinSource.StaticCoins)
	fmt.Printf("🔍 Tactic update - SourceType: %s", req.Config.CoinSource.SourceType)

	// Serialize configuration
	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to serialize configuration"})
		return
	}

	jsonLen := len(configJSON)
	if jsonLen > 500 {
		jsonLen = 500
	}
	fmt.Printf("🔍 Tactic update - Config JSON: %s", string(configJSON)[:jsonLen])

	tactic := &store.Tactic{
		ID:          tacticID,
		UserID:      userID,
		Name:        req.Name,
		Description: req.Description,
		Config:      string(configJSON),
	}

	if err := s.store.Tactic().Update(tactic); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tactic: " + err.Error()})
		return
	}

	// Validate configuration and collect warnings
	warnings := validateTacticConfig(&req.Config)

	response := gin.H{"message": "Tactic updated successfully"}
	if len(warnings) > 0 {
		response["warnings"] = warnings
	}

	c.JSON(http.StatusOK, response)
}

// handleDeleteTactic Delete tactic
func (s *Server) handleDeleteTactic(c *gin.Context) {
	userID := c.GetString("user_id")
	tacticID := c.Param("id")

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := s.store.Tactic().Delete(userID, tacticID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete tactic: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tactic deleted successfully"})
}

// handleActivateTactic Activate tactic
func (s *Server) handleActivateTactic(c *gin.Context) {
	userID := c.GetString("user_id")
	tacticID := c.Param("id")

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := s.store.Tactic().SetActive(userID, tacticID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate tactic: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tactic activated successfully"})
}

// handleDeactivateTactic Deactivate tactic
func (s *Server) handleDeactivateTactic(c *gin.Context) {
	userID := c.GetString("user_id")
	tacticID := c.Param("id")

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := s.store.Tactic().Deactivate(userID, tacticID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deactivate tactic: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tactic deactivated successfully"})
}

// handleDuplicateTactic Duplicate tactic
func (s *Server) handleDuplicateTactic(c *gin.Context) {
	userID := c.GetString("user_id")
	sourceID := c.Param("id")

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters: " + err.Error()})
		return
	}

	newID := uuid.New().String()
	if err := s.store.Tactic().Duplicate(userID, sourceID, newID, req.Name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to duplicate tactic: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":      newID,
		"message": "Tactic duplicated successfully",
	})
}

// handleGetActiveTactic Get currently active tactic
func (s *Server) handleGetActiveTactic(c *gin.Context) {
	userID := c.GetString("user_id")

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	tactic, err := s.store.Tactic().GetActive(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active tactic"})
		return
	}

	var config store.TacticConfig
	json.Unmarshal([]byte(tactic.Config), &config)

	c.JSON(http.StatusOK, gin.H{
		"id":          tactic.ID,
		"name":        tactic.Name,
		"description": tactic.Description,
		"is_active":   tactic.IsActive,
		"is_default":  tactic.IsDefault,
		"config":      config,
		"created_at":  tactic.CreatedAt,
		"updated_at":  tactic.UpdatedAt,
	})
}

// handleGetDefaultTacticConfig Get default tactic configuration template
func (s *Server) handleGetDefaultTacticConfig(c *gin.Context) {
	// Get language from query parameter, default to "en"
	lang := c.Query("lang")
	if lang != "zh" {
		lang = "en"
	}

	// Return default configuration with i18n support
	defaultConfig := store.GetDefaultTacticConfig(lang)
	c.JSON(http.StatusOK, defaultConfig)
}

// handleTacticPreviewPrompt Preview prompt generated by tactic
func (s *Server) handleTacticPreviewPrompt(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Config        store.TacticConfig `json:"config" binding:"required"`
		AccountEquity float64            `json:"account_equity"`
		PromptVariant string             `json:"prompt_variant"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters: " + err.Error()})
		return
	}

	// Use default values
	if req.AccountEquity <= 0 {
		req.AccountEquity = 1000.0 // Default simulated account equity
	}
	if req.PromptVariant == "" {
		req.PromptVariant = "balanced"
	}

	// Create tactic engine to build prompt
	engine := decision.NewTacticEngine(&req.Config)

	// Build system prompt (using built-in method from tactic engine)
	systemPrompt := engine.BuildSystemPrompt(
		req.AccountEquity,
		req.PromptVariant,
	)

	c.JSON(http.StatusOK, gin.H{
		"system_prompt":  systemPrompt,
		"prompt_variant": req.PromptVariant,
		"config_summary": gin.H{
			"stock source":       req.Config.CoinSource.SourceType,
			"primary_tf":         req.Config.Indicators.Klines.PrimaryTimeframe,
			"large_cap_leverage": req.Config.RiskControl.LargeCapMaxMargin,
			"small_cap_leverage": req.Config.RiskControl.SmallCapMaxMargin,
			"max_positions":      req.Config.RiskControl.MaxPositions,
		},
	})
}

// handleTacticTestRun AI test run (does not execute trades, only returns AI analysis results)
func (s *Server) handleTacticTestRun(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Load Alpaca credentials from user's brokerage connections
	if err := s.loadAlpacaCredentialsForBacktest(userID); err != nil {
		fmt.Printf("⚠️ Warning: Could not load Alpaca credentials: %v\n", err)
		// Continue anyway - credentials might be in environment
	}

	var req struct {
		Config        store.TacticConfig `json:"config" binding:"required"`
		PromptVariant string             `json:"prompt_variant"`
		AIModelID     string             `json:"ai_model_id"`
		RunRealAI     bool               `json:"run_real_ai"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters: " + err.Error()})
		return
	}

	if req.PromptVariant == "" {
		req.PromptVariant = "balanced"
	}

	// Debug: Log incoming config to trace stock source
	fmt.Printf("🔍 [Test Run] StockSource config: Type=%s, StaticStocks=%v, StaticCoins=%v, UseStockPool=%v, UseCoinPool=%v\n",
		req.Config.CoinSource.SourceType,
		req.Config.CoinSource.StaticStocks,
		req.Config.CoinSource.StaticCoins,
		req.Config.CoinSource.UseStockPool,
		req.Config.CoinSource.UseCoinPool)

	// Create tactic engine to build prompt
	engine := decision.NewTacticEngine(&req.Config)

	// Get candidate stocks
	candidates, err := engine.GetCandidateStocks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":       "Failed to get candidate stocks: " + err.Error(),
			"ai_response": "",
		})
		return
	}

	// Get timeframe configuration
	timeframes := req.Config.Indicators.Klines.SelectedTimeframes
	primaryTimeframe := req.Config.Indicators.Klines.PrimaryTimeframe
	klineCount := req.Config.Indicators.Klines.PrimaryCount

	// If no timeframes selected, use default values
	if len(timeframes) == 0 {
		// Backward compatibility: use primary and longer timeframes
		if primaryTimeframe != "" {
			timeframes = append(timeframes, primaryTimeframe)
		} else {
			timeframes = append(timeframes, "3m")
		}
		if req.Config.Indicators.Klines.LongerTimeframe != "" {
			timeframes = append(timeframes, req.Config.Indicators.Klines.LongerTimeframe)
		}
	}
	if primaryTimeframe == "" {
		primaryTimeframe = timeframes[0]
	}
	if klineCount <= 0 {
		klineCount = 30
	}

	// Merge confluence timeframes if enabled
	if req.Config.Indicators.EnableConfluence && len(req.Config.Indicators.ConfluenceTimeframes) > 0 {
		existingTfs := make(map[string]bool)
		for _, tf := range timeframes {
			existingTfs[tf] = true
		}
		for _, tf := range req.Config.Indicators.ConfluenceTimeframes {
			if !existingTfs[tf] {
				timeframes = append(timeframes, tf)
				existingTfs[tf] = true
			}
		}
	}

	fmt.Printf("📊 Using timeframes: %v, primary: %s, kline count: %d\n", timeframes, primaryTimeframe, klineCount)

	// Get real market data (using multiple timeframes)
	marketDataMap := make(map[string]*market.Data)
	for _, coin := range candidates {
		data, err := market.GetWithTimeframes(coin.Symbol, timeframes, primaryTimeframe, klineCount)
		if err != nil {
			// If getting data for a coin fails, log but continue
			fmt.Printf("⚠️  Failed to get market data for %s: %v\n", coin.Symbol, err)
			continue
		}
		marketDataMap[coin.Symbol] = data
	}

	// Fetch quantitative data for each candidate coin
	symbols := make([]string, 0, len(candidates))
	for _, c := range candidates {
		symbols = append(symbols, c.Symbol)
	}
	quantDataMap := engine.FetchQuantDataBatch(symbols)

	// Fetch OI ranking data (market-wide position changes)
	oiRankingData := engine.FetchOIRankingData()

	// Build real context (for generating User Prompt)
	testContext := &decision.Context{
		CurrentTime:    time.Now().UTC().Format("2006-01-02 15:04:05 UTC"),
		RuntimeMinutes: 0,
		CallCount:      1,
		Account: decision.AccountInfo{
			TotalEquity:      1000.0,
			AvailableBalance: 1000.0,
			UnrealizedPnL:    0,
			TotalPnL:         0,
			TotalPnLPct:      0,
			MarginUsed:       0,
			MarginUsedPct:    0,
			PositionCount:    0,
		},
		Positions:       []decision.PositionInfo{},
		CandidateStocks: candidates,
		PromptVariant:   req.PromptVariant,
		MarketDataMap:   marketDataMap,
		QuantDataMap:    quantDataMap,
		OIRankingData:   oiRankingData,
	}

	// Build System Prompt
	systemPrompt := engine.BuildSystemPrompt(1000.0, req.PromptVariant)

	// Build User Prompt (using real market data)
	userPrompt := engine.BuildUserPrompt(testContext)

	// If requesting real AI call
	if req.RunRealAI && req.AIModelID != "" {
		aiResponse, aiErr := s.runTacticAITest(userID, req.AIModelID, systemPrompt, userPrompt)
		if aiErr != nil {
			c.JSON(http.StatusOK, gin.H{
				"system_prompt":   systemPrompt,
				"user_prompt":     userPrompt,
				"candidate_count": len(candidates),
				"candidates":      candidates,
				"prompt_variant":  req.PromptVariant,
				"ai_response":     fmt.Sprintf("❌ AI call failed: %s", aiErr.Error()),
				"ai_error":        aiErr.Error(),
				"note":            "AI call error",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"system_prompt":   systemPrompt,
			"user_prompt":     userPrompt,
			"candidate_count": len(candidates),
			"candidates":      candidates,
			"prompt_variant":  req.PromptVariant,
			"ai_response":     aiResponse,
			"note":            "✅ Real AI test run successful",
		})
		return
	}

	// Return result (without actually calling AI, only return built prompt)
	c.JSON(http.StatusOK, gin.H{
		"system_prompt":   systemPrompt,
		"user_prompt":     userPrompt,
		"candidate_count": len(candidates),
		"candidates":      candidates,
		"prompt_variant":  req.PromptVariant,
		"ai_response":     "Please select an AI model and click 'Run Test' to perform real AI analysis.",
		"note":            "AI model not selected or real AI call not enabled",
	})
}

// runTacticAITest Execute real AI test call
func (s *Server) runTacticAITest(userID, modelID, systemPrompt, userPrompt string) (string, error) {
	// Get AI model configuration
	model, err := s.store.AIModel().Get(userID, modelID)
	if err != nil {
		return "", fmt.Errorf("failed to get AI model: %w", err)
	}

	if !model.Enabled {
		return "", fmt.Errorf("AI model %s is not enabled", model.Name)
	}

	if model.APIKey == "" {
		return "", fmt.Errorf("AI model %s is missing API Key", model.Name)
	}

	// Create AI client
	var aiClient mcp.AIClient
	provider := model.Provider

	switch provider {
	case "qwen":
		aiClient = mcp.NewQwenClient()
		aiClient.SetAPIKey(model.APIKey, model.CustomAPIURL, model.CustomModelName)
	case "deepseek":
		aiClient = mcp.NewDeepSeekClient()
		aiClient.SetAPIKey(model.APIKey, model.CustomAPIURL, model.CustomModelName)
	case "claude":
		aiClient = mcp.NewClaudeClient()
		aiClient.SetAPIKey(model.APIKey, model.CustomAPIURL, model.CustomModelName)
	case "kimi":
		aiClient = mcp.NewKimiClient()
		aiClient.SetAPIKey(model.APIKey, model.CustomAPIURL, model.CustomModelName)
	case "gemini":
		aiClient = mcp.NewGeminiClient()
		aiClient.SetAPIKey(model.APIKey, model.CustomAPIURL, model.CustomModelName)
	case "grok":
		aiClient = mcp.NewGrokClient()
		aiClient.SetAPIKey(model.APIKey, model.CustomAPIURL, model.CustomModelName)
	case "openai":
		aiClient = mcp.NewOpenAIClient()
		aiClient.SetAPIKey(model.APIKey, model.CustomAPIURL, model.CustomModelName)
	case "localai":
		aiClient = mcp.NewLocalAIClient()
		aiClient.SetAPIKey(model.APIKey, model.CustomAPIURL, model.CustomModelName)
	default:
		// Use generic client
		aiClient = mcp.NewClient()
		aiClient.SetAPIKey(model.APIKey, model.CustomAPIURL, model.CustomModelName)
	}

	// Call AI API
	response, err := aiClient.CallWithMessages(systemPrompt, userPrompt)
	if err != nil {
		return "", fmt.Errorf("AI API call failed: %w", err)
	}

	return response, nil
}
