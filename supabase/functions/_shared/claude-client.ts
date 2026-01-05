// Claude API Client with Advanced Tool Use Beta Headers
// Handles: Tool Search, Programmatic Tool Calling, Container Management

import type {
  CreateMessageRequest,
  MessageResponse,
  Message,
  ToolDefinition,
  ServerTool,
  ContentBlock,
  ToolUseBlock,
  ToolResultBlock,
} from './types.ts';

// =============================================================================
// Constants
// =============================================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const BETA_HEADER = 'advanced-tool-use-2025-11-20';

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_MAX_TOKENS = 4096;

// =============================================================================
// Client Configuration
// =============================================================================

export interface ClaudeClientConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  enableToolSearch?: boolean;
  enableCodeExecution?: boolean;
}

export interface SendMessageOptions {
  prompt: string;
  tools?: (ToolDefinition | ServerTool)[];
  messages?: Message[];
  containerId?: string;
  context?: Record<string, unknown>;
}

export interface AgenticLoopOptions extends SendMessageOptions {
  executeToolFn: (name: string, input: Record<string, unknown>) => Promise<string>;
  maxIterations?: number;
  onToolCall?: (name: string, input: Record<string, unknown>) => void;
  onToolResult?: (name: string, result: string) => void;
}

// =============================================================================
// Claude Client Class
// =============================================================================

export class ClaudeClient {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private systemPrompt: string;
  private enableToolSearch: boolean;
  private enableCodeExecution: boolean;

  constructor(config: ClaudeClientConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.systemPrompt = config.systemPrompt ?? '';
    this.enableToolSearch = config.enableToolSearch ?? true;
    this.enableCodeExecution = config.enableCodeExecution ?? true;
  }

  /**
   * Build request headers with beta flag
   */
  private buildHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-beta': BETA_HEADER,
    };
  }

  /**
   * Build the full system prompt with context
   */
  private buildSystemPrompt(context?: Record<string, unknown>): string {
    const parts: string[] = [];

    if (this.systemPrompt) {
      parts.push(this.systemPrompt);
    }

    if (context && Object.keys(context).length > 0) {
      parts.push(`\n\nCurrent context:\n${JSON.stringify(context, null, 2)}`);
    }

    return parts.join('\n') || 'You are a helpful assistant.';
  }

  /**
   * Send a single message to Claude
   */
  async sendMessage(options: SendMessageOptions): Promise<MessageResponse> {
    const { prompt, tools, messages, containerId, context } = options;

    // Build messages array
    const messageArray: Message[] = messages ?? [{ role: 'user', content: prompt }];

    // If we have a prompt and existing messages, append user message
    if (prompt && messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== 'user') {
        messageArray.push({ role: 'user', content: prompt });
      }
    }

    const requestBody: CreateMessageRequest = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: messageArray,
      system: this.buildSystemPrompt(context),
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
    }

    // Add container for session continuity
    if (containerId) {
      requestBody.container = containerId;
    }

    console.log('[ClaudeClient] Sending request:', {
      model: requestBody.model,
      messageCount: messageArray.length,
      toolCount: tools?.length ?? 0,
      hasContainer: !!containerId,
    });

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ClaudeClient] API Error:', response.status, errorText);
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const result: MessageResponse = await response.json();

    console.log('[ClaudeClient] Response received:', {
      stopReason: result.stop_reason,
      contentBlocks: result.content.length,
      hasContainer: !!result.container,
      usage: result.usage,
    });

    return result;
  }

  /**
   * Run an agentic loop that handles tool calls automatically
   */
  async runAgenticLoop(options: AgenticLoopOptions): Promise<{
    response: string;
    toolCalls: Array<{ name: string; input: Record<string, unknown>; result: string }>;
    usage: { input_tokens: number; output_tokens: number };
    containerId?: string;
  }> {
    const {
      prompt,
      tools,
      messages: initialMessages,
      containerId: initialContainerId,
      context,
      executeToolFn,
      maxIterations = 10,
      onToolCall,
      onToolResult,
    } = options;

    const messages: Message[] = initialMessages ?? [];
    const toolCalls: Array<{ name: string; input: Record<string, unknown>; result: string }> = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let currentContainerId = initialContainerId;
    let iterations = 0;

    // Add initial user message if prompt provided and not already in messages
    if (prompt && (messages.length === 0 || messages[messages.length - 1].role !== 'user')) {
      messages.push({ role: 'user', content: prompt });
    }

    while (iterations < maxIterations) {
      iterations++;
      console.log(`[ClaudeClient] Agentic loop iteration ${iterations}/${maxIterations}`);

      // Send message
      const result = await this.sendMessage({
        prompt: '',
        tools,
        messages,
        containerId: currentContainerId,
        context: iterations === 1 ? context : undefined, // Only include context on first iteration
      });

      // Track usage
      totalInputTokens += result.usage.input_tokens;
      totalOutputTokens += result.usage.output_tokens;

      // Update container ID if returned
      if (result.container) {
        currentContainerId = result.container.id;
      }

      // Add assistant response to messages
      messages.push({ role: 'assistant', content: result.content });

      // Check if we're done
      if (result.stop_reason === 'end_turn' || result.stop_reason === 'max_tokens') {
        // Extract final text response
        const textBlocks = result.content.filter((b): b is { type: 'text'; text: string } => b.type === 'text');
        const finalResponse = textBlocks.map((b) => b.text).join('\n');

        return {
          response: finalResponse,
          toolCalls,
          usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
          containerId: currentContainerId,
        };
      }

      // Handle tool calls
      if (result.stop_reason === 'tool_use') {
        const toolUseBlocks = result.content.filter(
          (b): b is ToolUseBlock => b.type === 'tool_use'
        );

        if (toolUseBlocks.length === 0) {
          console.warn('[ClaudeClient] stop_reason=tool_use but no tool_use blocks found');
          break;
        }

        // Execute each tool call
        const toolResults: ToolResultBlock[] = [];

        for (const toolUse of toolUseBlocks) {
          console.log(`[ClaudeClient] Executing tool: ${toolUse.name}`, toolUse.input);

          if (onToolCall) {
            onToolCall(toolUse.name, toolUse.input);
          }

          try {
            const result = await executeToolFn(toolUse.name, toolUse.input);

            if (onToolResult) {
              onToolResult(toolUse.name, result);
            }

            toolCalls.push({
              name: toolUse.name,
              input: toolUse.input,
              result,
            });

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[ClaudeClient] Tool execution error for ${toolUse.name}:`, errorMessage);

            toolCalls.push({
              name: toolUse.name,
              input: toolUse.input,
              result: JSON.stringify({ error: errorMessage }),
            });

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: errorMessage }),
              is_error: true,
            });
          }
        }

        // Add tool results as user message
        messages.push({
          role: 'user',
          content: toolResults as unknown as ContentBlock[],
        });
      }
    }

    // Max iterations reached
    console.warn(`[ClaudeClient] Max iterations (${maxIterations}) reached`);

    // Extract any text we have
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
    let finalResponse = '';

    if (lastAssistantMessage && Array.isArray(lastAssistantMessage.content)) {
      const textBlocks = (lastAssistantMessage.content as ContentBlock[]).filter(
        (b): b is { type: 'text'; text: string } => b.type === 'text'
      );
      finalResponse = textBlocks.map((b) => b.text).join('\n');
    }

    return {
      response: finalResponse || 'Max iterations reached without completing.',
      toolCalls,
      usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
      containerId: currentContainerId,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a Claude client configured for InSight
 */
export function createClaudeClient(apiKey: string, customSystemPrompt?: string): ClaudeClient {
  const defaultSystemPrompt = `You are Insight, an intelligent life-tracking assistant. You help users:

- Track activities, tasks, habits, and events through voice input
- Log wellness metrics like mood, energy, stress using #tracker(value) syntax
- Manage goals and projects with progress tracking
- Analyze patterns and provide insights

Guidelines:
- Parse voice transcripts to extract structured data
- Use get_current_context first to understand what the user is working on
- Create entries with appropriate facets (task, event, habit, note)
- Log tracker values when #tracker(N) patterns are mentioned
- Link activities to goals when relevant
- Be concise and action-oriented in responses`;

  return new ClaudeClient({
    apiKey,
    model: DEFAULT_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
    systemPrompt: customSystemPrompt ?? defaultSystemPrompt,
    enableToolSearch: true,
    enableCodeExecution: true,
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract text content from a message response
 */
export function extractTextFromResponse(response: MessageResponse): string {
  return response.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

/**
 * Extract tool use blocks from a message response
 */
export function extractToolUsesFromResponse(response: MessageResponse): ToolUseBlock[] {
  return response.content.filter((b): b is ToolUseBlock => b.type === 'tool_use');
}

/**
 * Check if response requires tool execution
 */
export function requiresToolExecution(response: MessageResponse): boolean {
  return response.stop_reason === 'tool_use';
}

/**
 * Check if this is a programmatic tool call (from code execution)
 */
export function isProgrammaticToolCall(toolUse: ToolUseBlock): boolean {
  return toolUse.caller?.type === 'code_execution_20250825';
}
