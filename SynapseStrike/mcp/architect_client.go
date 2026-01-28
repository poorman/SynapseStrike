package mcp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

const (
	ProviderArchitect       = "architect"
	DefaultArchitectBaseURL = "http://10.0.0.247:8065/api"
	DefaultArchitectModel   = "architect-ai"
)

type ArchitectClient struct {
	*Client
}

// NewArchitectClient creates Architect AI client (backward compatible)
func NewArchitectClient() AIClient {
	return NewArchitectClientWithOptions()
}

// NewArchitectClientWithOptions creates Architect AI client (supports options pattern)
func NewArchitectClientWithOptions(opts ...ClientOption) AIClient {
	// 1. Create Architect preset options
	architectOpts := []ClientOption{
		WithProvider(ProviderArchitect),
		WithModel(DefaultArchitectModel),
		WithBaseURL(DefaultArchitectBaseURL),
	}

	// 2. Merge user options (user options have higher priority)
	allOpts := append(architectOpts, opts...)

	// 3. Create base client
	baseClient := NewClient(allOpts...).(*Client)

	// 4. Create Architect client
	architectClient := &ArchitectClient{
		Client: baseClient,
	}

	// 5. Set hooks to point to ArchitectClient (implement dynamic dispatch)
	baseClient.hooks = architectClient

	return architectClient
}

func (c *ArchitectClient) SetAPIKey(apiKey string, customURL string, customModel string) {
	c.APIKey = apiKey

	if len(apiKey) > 8 {
		c.logger.Infof("🔧 [MCP] Architect AI API Key: %s...%s", apiKey[:4], apiKey[len(apiKey)-4:])
	}
	if customURL != "" {
		c.BaseURL = customURL
		c.logger.Infof("🔧 [MCP] Architect AI using custom BaseURL: %s", customURL)
	} else {
		c.logger.Infof("🔧 [MCP] Architect AI using default BaseURL: %s", c.BaseURL)
	}
	if customModel != "" {
		c.Model = customModel
		c.logger.Infof("🔧 [MCP] Architect AI using custom Model: %s", customModel)
	} else {
		c.logger.Infof("🔧 [MCP] Architect AI using default Model: %s", c.Model)
	}
}

// Architect AI uses OpenAI-compatible API with standard Bearer auth
func (c *ArchitectClient) setAuthHeader(reqHeaders http.Header) {
	c.Client.setAuthHeader(reqHeaders)
}

func (c *ArchitectClient) buildUrl() string {
	// If hitting AIArchitect backend (port 8065), use the decision API
	if strings.Contains(c.BaseURL, ":8065") {
		return fmt.Sprintf("%s/decision", c.BaseURL)
	}
	return c.Client.buildUrl()
}

func (c *ArchitectClient) buildMCPRequestBody(systemPrompt, userPrompt string) map[string]any {
	// If hitting AIArchitect backend (port 8065), use the DecisionRequest schema
	if strings.Contains(c.BaseURL, ":8065") {
		return map[string]any{
			"symbol":         "UNKNOWN",
			"timeframe":      "1m",
			"market_context": map[string]any{"system_prompt": systemPrompt, "user_prompt": userPrompt},
			"question":       userPrompt,
		}
	}
	return c.Client.buildMCPRequestBody(systemPrompt, userPrompt)
}

func (c *ArchitectClient) buildRequestBodyFromRequest(req *Request) map[string]any {
	// If hitting AIArchitect backend (port 8065), prioritize metadata for DecisionRequest
	if strings.Contains(c.BaseURL, ":8065") {
		body := map[string]any{
			"symbol":    "UNKNOWN",
			"timeframe": "1m",
			"question":  "Should I take this trade?",
		}

		if req.Metadata != nil {
			if symbol, ok := req.Metadata["symbol"].(string); ok {
				body["symbol"] = symbol
			}
			if timeframe, ok := req.Metadata["timeframe"].(string); ok {
				body["timeframe"] = timeframe
			}
			if marketCtx, ok := req.Metadata["market_context"]; ok {
				body["market_context"] = marketCtx
			}
			if question, ok := req.Metadata["question"].(string); ok {
				body["question"] = question
			}
		}

		// Fallback for question if not in metadata but exists in messages
		if body["question"] == "Should I take this trade?" && len(req.Messages) > 0 {
			body["question"] = req.Messages[len(req.Messages)-1].Content
		}

		return body
	}
	return c.Client.buildRequestBodyFromRequest(req)
}

func (c *ArchitectClient) parseMCPResponse(body []byte) (string, error) {
	// If hitting AIArchitect backend (port 8065), parse DecisionResponse
	if strings.Contains(c.BaseURL, ":8065") {
		var result struct {
			Decision   string  `json:"decision"`
			Confidence float64 `json:"confidence"`
			Reason     string  `json:"reason"`
		}
		if err := json.Unmarshal(body, &result); err != nil {
			// Try parsing as standard OpenAI response as fallback
			return c.Client.parseMCPResponse(body)
		}

		// Map AIArchitect decision to SynapseStrike action
		action := "wait"
		if result.Decision == "TAKE_TRADE" {
			action = "open_long" // Default to long for Architect AI decisions
		}

		// Create a structured decision for SynapseStrike's engine
		// The symbol will be inferred by the engine if it matches correctly
		decision := map[string]any{
			"symbol":     "UNKNOWN",
			"action":     action,
			"confidence": int(result.Confidence * 100),
			"reasoning":  result.Reason,
		}

		decisionBytes, _ := json.Marshal([]any{decision})

		// Return formatted reasoning and decision tags
		return fmt.Sprintf("<reasoning>\n%s\n</reasoning>\n<decision>\n%s\n</decision>",
			result.Reason, string(decisionBytes)), nil
	}
	return c.Client.parseMCPResponse(body)
}
