// Claude Agent - Main Edge Function
// Implements Anthropic Advanced Tool Use: Tool Search, Programmatic Calling, Examples
// Beta header: advanced-tool-use-2025-11-20

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { createClaudeClient, extractTextFromResponse } from '../_shared/claude-client.ts';
import { getAllTools, getAlwaysLoadedToolNames, getDeferredToolNames } from '../_shared/tool-registry.ts';
import { executeTool } from '../_shared/tool-executor.ts';
import type { AgentContext, AgentResponse } from '../_shared/types.ts';

// =============================================================================
// Configuration
// =============================================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const BETA_HEADER = 'advanced-tool-use-2025-11-20';
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_MAX_TOKENS = 4096;
const MAX_AGENTIC_ITERATIONS = 10;

// =============================================================================
// Response Helpers
// =============================================================================

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // ==========================================================================
    // Auth & Setup
    // ==========================================================================

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[ClaudeAgent] Missing Supabase credentials');
      return json({ error: 'Missing Supabase credentials' }, 500);
    }

    if (!anthropicKey) {
      console.error('[ClaudeAgent] Missing ANTHROPIC_API_KEY');
      return json({ error: 'Missing ANTHROPIC_API_KEY' }, 500);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    // Create Supabase client with user's auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Validate user
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      console.error('[ClaudeAgent] Auth error:', authError?.message ?? 'No user');
      return json({ error: 'Unauthorized', detail: authError?.message }, 401);
    }

    const userId = authData.user.id;
    console.log('[ClaudeAgent] User authenticated:', userId);

    // ==========================================================================
    // Parse Request
    // ==========================================================================

    const body = await req.json();
    const { prompt, context, stream = false } = body as {
      prompt: string;
      context?: AgentContext;
      stream?: boolean;
    };

    if (!prompt || typeof prompt !== 'string') {
      return json({ error: 'prompt is required and must be a string' }, 400);
    }

    console.log('[ClaudeAgent] Request received:', {
      promptLength: prompt.length,
      hasContext: !!context,
      stream,
    });

    // ==========================================================================
    // Build System Prompt
    // ==========================================================================

    const systemPrompt = buildSystemPrompt(context);

    // ==========================================================================
    // Build Tools Array
    // ==========================================================================

    const tools = getAllTools();

    console.log('[ClaudeAgent] Tools configured:', {
      total: tools.length,
      alwaysLoaded: getAlwaysLoadedToolNames(),
      deferred: getDeferredToolNames().length,
    });

    // ==========================================================================
    // Agentic Loop
    // ==========================================================================

    const messages: Array<{ role: string; content: unknown }> = [
      { role: 'user', content: prompt },
    ];

    const toolCalls: Array<{ name: string; input: Record<string, unknown>; result: unknown }> = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let currentContainerId: string | undefined;
    let iterations = 0;
    let finalResponse = '';

    while (iterations < MAX_AGENTIC_ITERATIONS) {
      iterations++;
      console.log(`[ClaudeAgent] Iteration ${iterations}/${MAX_AGENTIC_ITERATIONS}`);

      // Build request
      const requestBody = {
        model: DEFAULT_MODEL,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: systemPrompt,
        tools,
        messages,
        ...(currentContainerId && { container: currentContainerId }),
      };

      // Make API call
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'anthropic-beta': BETA_HEADER,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ClaudeAgent] API Error:', response.status, errorText);
        return json(
          { error: `Anthropic API error (${response.status})`, detail: errorText },
          500
        );
      }

      const result = await response.json();

      console.log('[ClaudeAgent] Response:', {
        stopReason: result.stop_reason,
        contentBlocks: result.content?.length,
        hasContainer: !!result.container,
        usage: result.usage,
      });

      // Track usage
      totalInputTokens += result.usage?.input_tokens ?? 0;
      totalOutputTokens += result.usage?.output_tokens ?? 0;

      // Update container
      if (result.container) {
        currentContainerId = result.container.id;
      }

      // Add assistant response to messages
      messages.push({ role: 'assistant', content: result.content });

      // Check if done
      if (result.stop_reason === 'end_turn' || result.stop_reason === 'max_tokens') {
        // Extract text response
        const textBlocks = (result.content ?? []).filter(
          (b: { type: string }) => b.type === 'text'
        );
        finalResponse = textBlocks.map((b: { text: string }) => b.text).join('\n');
        break;
      }

      // Handle tool calls
      if (result.stop_reason === 'tool_use') {
        const toolUseBlocks = (result.content ?? []).filter(
          (b: { type: string }) => b.type === 'tool_use'
        );

        if (toolUseBlocks.length === 0) {
          console.warn('[ClaudeAgent] stop_reason=tool_use but no tool_use blocks');
          break;
        }

        // Execute tools
        const toolResults: Array<{
          type: 'tool_result';
          tool_use_id: string;
          content: string;
          is_error?: boolean;
        }> = [];

        for (const toolUse of toolUseBlocks) {
          const { id, name, input } = toolUse as {
            id: string;
            name: string;
            input: Record<string, unknown>;
          };

          console.log(`[ClaudeAgent] Executing tool: ${name}`, input);

          try {
            const result = await executeTool(supabase, userId, name, input);

            toolCalls.push({ name, input, result: JSON.parse(result) });
            toolResults.push({
              type: 'tool_result',
              tool_use_id: id,
              content: result,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[ClaudeAgent] Tool error (${name}):`, errorMessage);

            toolCalls.push({ name, input, result: { error: errorMessage } });
            toolResults.push({
              type: 'tool_result',
              tool_use_id: id,
              content: JSON.stringify({ error: errorMessage }),
              is_error: true,
            });
          }
        }

        // Add tool results
        messages.push({ role: 'user', content: toolResults });
      }
    }

    // ==========================================================================
    // Return Response
    // ==========================================================================

    if (iterations >= MAX_AGENTIC_ITERATIONS) {
      console.warn('[ClaudeAgent] Max iterations reached');
    }

    const agentResponse: AgentResponse = {
      response: finalResponse,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
      },
      container_id: currentContainerId,
    };

    console.log('[ClaudeAgent] Complete:', {
      responseLength: finalResponse.length,
      toolCallCount: toolCalls.length,
      iterations,
      usage: agentResponse.usage,
    });

    return new Response(JSON.stringify(agentResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('[ClaudeAgent] Unexpected error:', errorMessage);
    console.error('[ClaudeAgent] Stack:', errorStack);

    return json(
      { error: 'Internal server error', detail: errorMessage },
      500
    );
  }
});

// =============================================================================
// Helpers
// =============================================================================

function buildSystemPrompt(context?: AgentContext): string {
  const basePrompt = `You are Insight, an intelligent life-tracking assistant. You help users:

- Track activities, tasks, habits, and events through voice input
- Log wellness metrics like mood, energy, stress using #tracker(value) syntax
- Manage goals and projects with progress tracking
- Analyze patterns and provide insights

## Tool Usage Guidelines

1. **Always start with context**: Use get_current_context first to understand the user's current state before taking action.

2. **Voice input parsing**: When parsing voice transcripts:
   - Extract #tracker(value) tokens (e.g., #mood(7), #energy(8))
   - Identify tasks from patterns like "I need to...", "remember to..."
   - Create appropriate entries with correct facets

3. **Entry creation**:
   - Use appropriate facets: task, event, habit, note
   - Link to goals when the activity is related
   - Set difficulty (1-10) and importance (1-10) when provided

4. **Batch operations**: For multiple trackers in one voice input, use batch_log_trackers for efficiency.

5. **Search**: Use semantic_search for natural language queries, search_by_tags for specific categories.

## Response Style

- Be concise and action-oriented
- Confirm what actions were taken
- Summarize data when querying
- Ask for clarification only when truly ambiguous`;

  if (context) {
    const contextParts: string[] = [];

    if (context.active_entry_id) {
      contextParts.push(`Active entry: ${context.active_entry_id}`);
    }

    if (context.active_goal_ids?.length) {
      contextParts.push(`Active goals: ${context.active_goal_ids.join(', ')}`);
    }

    if (context.active_project_ids?.length) {
      contextParts.push(`Active projects: ${context.active_project_ids.join(', ')}`);
    }

    if (context.user_timezone) {
      contextParts.push(`Timezone: ${context.user_timezone}`);
    }

    if (context.recent_entries?.length) {
      contextParts.push(`Recent entries: ${JSON.stringify(context.recent_entries)}`);
    }

    if (contextParts.length > 0) {
      return `${basePrompt}\n\n## Current Context\n\n${contextParts.join('\n')}`;
    }
  }

  return basePrompt;
}
