// Advanced Tool Use Types for InSight Claude Agent
// Based on: https://www.anthropic.com/engineering/advanced-tool-use

// =============================================================================
// JSON Schema Types
// =============================================================================

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

// =============================================================================
// Tool Definition Types (Advanced Tool Use)
// =============================================================================

export type ToolCaller = 'direct' | 'code_execution_20250825';

export interface ToolInputExample {
  description: string;
  input: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: JSONSchema;

  // Advanced Tool Use features
  defer_loading?: boolean;
  allowed_callers?: ToolCaller[];
  input_examples?: ToolInputExample[];
}

// =============================================================================
// Server Tool Types
// =============================================================================

export interface ToolSearchTool {
  type: 'tool_search_tool_regex_20251119' | 'tool_search_tool_bm25_20251119';
  name: string;
}

export interface CodeExecutionTool {
  type: 'code_execution_20250825';
  name: string;
}

export type ServerTool = ToolSearchTool | CodeExecutionTool;

// =============================================================================
// Message Content Blocks
// =============================================================================

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
  caller?: {
    type: 'direct';
  } | {
    type: 'code_execution_20250825';
    tool_id: string;
  };
}

export interface ServerToolUseBlock {
  type: 'server_tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface ToolSearchResultBlock {
  type: 'tool_search_tool_result';
  tool_use_id: string;
  content: {
    type: 'tool_search_tool_search_result';
    tool_references: Array<{
      type: 'tool_reference';
      tool_name: string;
    }>;
  };
}

export interface CodeExecutionResultBlock {
  type: 'code_execution_tool_result';
  tool_use_id: string;
  content: {
    type: 'code_execution_result';
    stdout: string;
    stderr: string;
    return_code: number;
    content: unknown[];
  };
}

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ServerToolUseBlock
  | ToolResultBlock
  | ToolSearchResultBlock
  | CodeExecutionResultBlock;

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ContainerInfo {
  id: string;
  expires_at: string;
}

export interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
  server_tool_use?: {
    tool_search_requests?: number;
    code_execution_requests?: number;
  };
}

export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';

export interface MessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  model: string;
  stop_reason: StopReason;
  stop_sequence?: string;
  container?: ContainerInfo;
  usage: UsageInfo;
}

export interface CreateMessageRequest {
  model: string;
  max_tokens: number;
  messages: Message[];
  system?: string;
  tools?: (ToolDefinition | ServerTool)[];
  tool_choice?: {
    type: 'auto' | 'any' | 'tool';
    name?: string;
  };
  container?: string;
  stream?: boolean;
}

// =============================================================================
// InSight-Specific Types
// =============================================================================

export type EntryFacet = 'task' | 'event' | 'habit' | 'tracker' | 'note';
export type EntryStatus = 'open' | 'in_progress' | 'done' | 'canceled';
export type WorkoutType = 'strength' | 'cardio' | 'mobility' | 'custom';
export type TrackerValueType = 'number' | 'scale' | 'boolean' | 'text' | 'duration';

export interface DateRange {
  start?: string;
  end?: string;
}

export interface TrackerLog {
  tracker_key: string;
  value: number | string | boolean;
  occurred_at?: string;
  entry_id?: string;
}

export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  weight_unit?: 'lb' | 'kg';
  duration_seconds?: number;
  distance?: number;
  distance_unit?: 'mi' | 'km' | 'm';
}

export interface AgentContext {
  active_entry_id?: string;
  active_goal_ids?: string[];
  active_project_ids?: string[];
  recent_entries?: unknown[];
  active_timers?: unknown[];
  user_timezone?: string;
}

export interface AgentRequest {
  prompt: string;
  context?: AgentContext;
  stream?: boolean;
}

export interface AgentResponse {
  response: string;
  tool_calls?: Array<{
    name: string;
    input: Record<string, unknown>;
    result: unknown;
  }>;
  usage: UsageInfo;
  container_id?: string;
}

// =============================================================================
// Tool Executor Types
// =============================================================================

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  code?: string;
}

export type ToolExecutor = (
  input: Record<string, unknown>,
  userId: string,
  supabase: unknown
) => Promise<ToolExecutionResult>;

export interface RegisteredTool extends ToolDefinition {
  category: ToolCategory;
  executor?: ToolExecutor;
}

export type ToolCategory =
  | 'context'
  | 'entries'
  | 'trackers'
  | 'workouts'
  | 'nutrition'
  | 'goals'
  | 'projects'
  | 'calendar'
  | 'search'
  | 'analytics';
