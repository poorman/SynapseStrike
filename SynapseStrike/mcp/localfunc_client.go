package mcp

import "net/http"

const (
	ProviderLocalFunc     = "localfunc"
	DefaultLocalFuncModel = "model_1"
)

// LocalFuncClient is a minimal AIClient for the Local Function provider.
// It never makes HTTP calls — the decision flow is intercepted in decision/engine.go
// before CallWithMessages is ever invoked.
type LocalFuncClient struct {
	*Client
}

// NewLocalFuncClient creates a Local Function client
func NewLocalFuncClient() AIClient {
	return NewLocalFuncClientWithOptions()
}

// NewLocalFuncClientWithOptions creates a Local Function client (supports options pattern)
func NewLocalFuncClientWithOptions(opts ...ClientOption) AIClient {
	localfuncOpts := []ClientOption{
		WithProvider(ProviderLocalFunc),
		WithModel(DefaultLocalFuncModel),
		WithBaseURL(""),               // No URL needed
		WithAPIKey("local-function"),  // Dummy key to satisfy validation
	}

	allOpts := append(localfuncOpts, opts...)
	baseClient := NewClient(allOpts...).(*Client)

	localfuncClient := &LocalFuncClient{
		Client: baseClient,
	}

	baseClient.hooks = localfuncClient
	return localfuncClient
}

func (c *LocalFuncClient) SetAPIKey(apiKey string, customURL string, customModel string) {
	c.APIKey = "local-function" // Always set a dummy key
	if customModel != "" {
		c.Model = customModel
		c.logger.Infof("🔧 [MCP] Local Function using model: %s", customModel)
	} else {
		c.logger.Infof("🔧 [MCP] Local Function using default model: %s", c.Model)
	}
}

// setAuthHeader delegates to base (never actually called since decision flow is intercepted)
func (c *LocalFuncClient) setAuthHeader(reqHeaders http.Header) {
	c.Client.setAuthHeader(reqHeaders)
}
