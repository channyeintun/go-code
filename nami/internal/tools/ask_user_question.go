package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
)

type AskUserQuestionOption struct {
	Label       string `json:"label"`
	Value       string `json:"value"`
	Description string `json:"description,omitempty"`
	Recommended bool   `json:"recommended,omitempty"`
}

type AskUserQuestionPrompt struct {
	Header            string                  `json:"header"`
	Question          string                  `json:"question"`
	MultiSelect       bool                    `json:"multiSelect,omitempty"`
	AllowFreeform     bool                    `json:"allowFreeform,omitempty"`
	Options           []AskUserQuestionOption `json:"options,omitempty"`
	NormalizedOptions map[string]struct{}     `json:"-"`
}

type AskUserQuestionAnswer struct {
	Header         string   `json:"header"`
	Question       string   `json:"question"`
	SelectedValues []string `json:"selectedValues,omitempty"`
	FreeformText   string   `json:"freeformText,omitempty"`
	RawAnswer      string   `json:"rawAnswer,omitempty"`
}

type AskUserQuestionRequest struct {
	Questions []AskUserQuestionPrompt `json:"questions"`
}

type AskUserQuestionResult struct {
	Status  string                  `json:"status"`
	Answers []AskUserQuestionAnswer `json:"answers"`
}

type AskUserQuestionRuntime interface {
	Ask(ctx context.Context, request AskUserQuestionRequest) (AskUserQuestionResult, error)
}

type askUserQuestionRuntimeState struct {
	mu      sync.RWMutex
	runtime AskUserQuestionRuntime
}

var globalAskUserQuestionRuntime askUserQuestionRuntimeState

func SetAskUserQuestionRuntime(runtime AskUserQuestionRuntime) {
	globalAskUserQuestionRuntime.mu.Lock()
	defer globalAskUserQuestionRuntime.mu.Unlock()
	globalAskUserQuestionRuntime.runtime = runtime
}

func getAskUserQuestionRuntime() (AskUserQuestionRuntime, error) {
	globalAskUserQuestionRuntime.mu.RLock()
	defer globalAskUserQuestionRuntime.mu.RUnlock()
	if globalAskUserQuestionRuntime.runtime == nil {
		return nil, fmt.Errorf("ask_user_question runtime is unavailable")
	}
	return globalAskUserQuestionRuntime.runtime, nil
}

type AskUserQuestionTool struct{}

func NewAskUserQuestionTool() *AskUserQuestionTool {
	return &AskUserQuestionTool{}
}

func (t *AskUserQuestionTool) Name() string {
	return "ask_user_question"
}

func (t *AskUserQuestionTool) Description() string {
	return "Ask the user 1 to 4 structured clarification questions and receive deterministic answers. Use this only when a concrete decision is needed before proceeding."
}

func (t *AskUserQuestionTool) InputSchema() any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"questions": map[string]any{
				"type":     "array",
				"minItems": 1,
				"maxItems": 4,
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"header": map[string]any{
							"type":        "string",
							"description": "Short unique identifier for this question.",
						},
						"question": map[string]any{
							"type":        "string",
							"description": "User-facing question text.",
						},
						"multiSelect": map[string]any{
							"type":        "boolean",
							"description": "Allow multiple selected options.",
						},
						"allowFreeform": map[string]any{
							"type":        "boolean",
							"description": "Allow the user to provide a custom text answer.",
						},
						"options": map[string]any{
							"type": "array",
							"items": map[string]any{
								"type": "object",
								"properties": map[string]any{
									"label":       map[string]any{"type": "string"},
									"value":       map[string]any{"type": "string"},
									"description": map[string]any{"type": "string"},
									"recommended": map[string]any{"type": "boolean"},
								},
								"required": []string{"label", "value"},
							},
						},
					},
					"required": []string{"header", "question"},
				},
			},
		},
		"required": []string{"questions"},
	}
}

func (t *AskUserQuestionTool) Permission() PermissionLevel {
	return PermissionReadOnly
}

func (t *AskUserQuestionTool) Concurrency(input ToolInput) ConcurrencyDecision {
	return ConcurrencySerial
}

func (t *AskUserQuestionTool) Validate(input ToolInput) error {
	request, err := parseAskUserQuestionRequest(input.Params)
	if err != nil {
		return err
	}
	_, err = normalizeAskUserQuestionRequest(request)
	return err
}

func (t *AskUserQuestionTool) Execute(ctx context.Context, input ToolInput) (ToolOutput, error) {
	runtime, err := getAskUserQuestionRuntime()
	if err != nil {
		return ToolOutput{}, err
	}
	request, err := parseAskUserQuestionRequest(input.Params)
	if err != nil {
		return ToolOutput{}, err
	}
	request, err = normalizeAskUserQuestionRequest(request)
	if err != nil {
		return ToolOutput{}, err
	}
	result, err := runtime.Ask(ctx, request)
	if err != nil {
		return ToolOutput{}, err
	}
	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return ToolOutput{}, fmt.Errorf("marshal ask_user_question result: %w", err)
	}
	return ToolOutput{Output: string(data)}, nil
}

func parseAskUserQuestionRequest(params map[string]any) (AskUserQuestionRequest, error) {
	questionsValue, ok := params["questions"]
	if !ok {
		return AskUserQuestionRequest{}, fmt.Errorf("ask_user_question requires questions")
	}
	data, err := json.Marshal(map[string]any{"questions": questionsValue})
	if err != nil {
		return AskUserQuestionRequest{}, fmt.Errorf("encode ask_user_question input: %w", err)
	}
	var request AskUserQuestionRequest
	if err := json.Unmarshal(data, &request); err != nil {
		return AskUserQuestionRequest{}, fmt.Errorf("decode ask_user_question input: %w", err)
	}
	return request, nil
}

func normalizeAskUserQuestionRequest(request AskUserQuestionRequest) (AskUserQuestionRequest, error) {
	if len(request.Questions) == 0 {
		return AskUserQuestionRequest{}, fmt.Errorf("ask_user_question requires at least one question")
	}
	if len(request.Questions) > 4 {
		return AskUserQuestionRequest{}, fmt.Errorf("ask_user_question supports at most 4 questions")
	}
	seenHeaders := make(map[string]struct{}, len(request.Questions))
	for index := range request.Questions {
		question := &request.Questions[index]
		question.Header = strings.TrimSpace(question.Header)
		question.Question = strings.TrimSpace(question.Question)
		if question.Header == "" {
			return AskUserQuestionRequest{}, fmt.Errorf("ask_user_question questions[%d].header is required", index)
		}
		if _, exists := seenHeaders[question.Header]; exists {
			return AskUserQuestionRequest{}, fmt.Errorf("ask_user_question header %q must be unique", question.Header)
		}
		seenHeaders[question.Header] = struct{}{}
		if question.Question == "" {
			return AskUserQuestionRequest{}, fmt.Errorf("ask_user_question questions[%d].question is required", index)
		}
		if len(question.Options) == 0 && !question.AllowFreeform {
			return AskUserQuestionRequest{}, fmt.Errorf("ask_user_question question %q requires options unless allowFreeform is true", question.Header)
		}
		if question.MultiSelect && len(question.Options) == 0 {
			return AskUserQuestionRequest{}, fmt.Errorf("ask_user_question question %q requires options when multiSelect is true", question.Header)
		}
		normalizedOptions := make(map[string]struct{}, len(question.Options))
		for optionIndex := range question.Options {
			option := &question.Options[optionIndex]
			option.Label = strings.TrimSpace(option.Label)
			option.Value = strings.TrimSpace(option.Value)
			option.Description = strings.TrimSpace(option.Description)
			if option.Label == "" || option.Value == "" {
				return AskUserQuestionRequest{}, fmt.Errorf("ask_user_question question %q has an option with empty label or value", question.Header)
			}
			if _, exists := normalizedOptions[option.Value]; exists {
				return AskUserQuestionRequest{}, fmt.Errorf("ask_user_question question %q has duplicate option value %q", question.Header, option.Value)
			}
			normalizedOptions[option.Value] = struct{}{}
		}
		question.NormalizedOptions = normalizedOptions
	}
	return request, nil
}
