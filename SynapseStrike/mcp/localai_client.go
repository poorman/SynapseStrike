package mcp

import (
	"net/http"
)

const (
	ProviderLocalAI       = "localai"
	DefaultLocalAIBaseURL = "http://localhost:8080/v1"
	DefaultLocalAIModel   = "gpt-oss-20b"
)

type LocalAIClient struct {
	*Client
}

// NewLocalAIClient creates LocalAI client (OpenAI-compatible)
func NewLocalAIClient() AIClient {
	return NewLocalAIClientWithOptions()
}

// NewLocalAIClientWithOptions creates LocalAI client (supports options pattern)
func NewLocalAIClientWithOptions(opts ...ClientOption) AIClient {
	// 1. Create LocalAI preset options (OpenAI-compatible API)
	localaiOpts := []ClientOption{
		WithProvider(ProviderLocalAI),
		WithModel(DefaultLocalAIModel),
		WithBaseURL(DefaultLocalAIBaseURL),
	}

	// 2. Merge user options (user options have higher priority)
	allOpts := append(localaiOpts, opts...)

	// 3. Create base client
	baseClient := NewClient(allOpts...).(*Client)

	// 4. Create LocalAI client
	localaiClient := &LocalAIClient{
		Client: baseClient,
	}

	// 5. Set hooks to point to LocalAIClient (implement dynamic dispatch)
	baseClient.hooks = localaiClient

	return localaiClient
}

func (c *LocalAIClient) SetAPIKey(apiKey string, customURL string, customModel string) {
	c.APIKey = apiKey

	if len(apiKey) > 8 {
		c.logger.Infof("🔧 [MCP] LocalAI API Key: %s...%s", apiKey[:4], apiKey[len(apiKey)-4:])
	} else if apiKey != "" {
		c.logger.Infof("🔧 [MCP] LocalAI API Key set")
	}
	if customURL != "" {
		c.BaseURL = customURL
		c.logger.Infof("🔧 [MCP] LocalAI using custom BaseURL: %s", customURL)
	} else {
		c.logger.Infof("🔧 [MCP] LocalAI using default BaseURL: %s", c.BaseURL)
	}
	if customModel != "" {
		c.Model = customModel
		c.logger.Infof("🔧 [MCP] LocalAI using custom Model: %s", customModel)
	} else {
		c.logger.Infof("🔧 [MCP] LocalAI using default Model: %s", c.Model)
	}
}

// LocalAI uses standard Bearer auth (same as OpenAI)
func (c *LocalAIClient) setAuthHeader(reqHeaders http.Header) {
	c.Client.setAuthHeader(reqHeaders)
}
