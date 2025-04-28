import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  CreateMessageResultSchema,
  CreateMessageRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { z } from 'zod';

/**
 * vitest E2E 单元测试：验证 MCP Server 的 Sampling 功能
 * -------------------------------------------------------
 * 流程：
 * 1. 启动本地 MCP Server（server.js）并通过 stdio 连接。
 * 2. 在客户端注册 sampling/complete 处理器，模拟 LLM 回复。
 * 3. 调用服务器侧提供的 "sampleLLM" 工具（假定存在），
 *    触发服务器向客户端发起 sampling 请求。
 * 4. 断言 sampleLLM 返回值为模拟回复（Echo 模式）。
 * 5. 测试采样拒绝场景：在处理器内对特定提示抛错，
 *    服务器应返回工具错误（isError）。
 * -------------------------------------------------------
 * 运行方式：
 *   npx vitest run mcp-sampling-e2e-test.ts
 */

let client: Client;
let transport: StdioClientTransport;

// 采样处理器辅助
let lastSamplePrompt: string | undefined;
const ECHO_PREFIX = 'Echo: ';

beforeAll(async () => {
  transport = new StdioClientTransport({
    command: 'tsx',
    args: [path.resolve(__dirname, '../src/sampling.ts')],
  });

  client = new Client(
    {
      name: 'sampling-test-client',
      version: '0.1.0',
    },
    {
      capabilities: {
        sampling: {},
      },
    }
  );
  // 设置初始 sampling 处理器（Echo 模式）
  client.setRequestHandler(CreateMessageRequestSchema, async (req) => {
    const userMsg = req.params.messages.find((m) => m.role === 'user');
    debugger;
    lastSamplePrompt = userMsg?.content.text;
    return {
      role: 'assistant',
      content: { type: 'text', text: `${ECHO_PREFIX}${lastSamplePrompt}` },
      model: 'gpt-4o',
    };
  });
  await client.connect(transport);
}, 20_000);

afterAll(async () => {
  await client.close();
  if (typeof transport.kill === 'function') {
    await transport.kill();
  }
});

describe('MCP Sampling E2E', () => {
  const PROMPT_TEXT = 'Hello, MCP!';

  it.only('should echo prompt via sampleLLM tool', async () => {
    // 检查服务器是否有 sampleLLM 工具，否则跳过
    const { tools } = await client.listTools();
    if (!tools.some((t) => t.name === 'sampleLLM')) {
      console.warn('sampleLLM tool not available — skipping test');
      return;
    }

    const res = await client.callTool({
      name: 'sampleLLM',
      arguments: { prompt: PROMPT_TEXT, maxTokens: 32 },
    });

    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toBe(`${ECHO_PREFIX}${PROMPT_TEXT}`);
    expect(lastSamplePrompt).toBe(PROMPT_TEXT);
  });

  it('should propagate error when sampling handler throws', async () => {
    // 动态替换 handler：当 prompt 包含 "denied" 抛错
    client.setRequestHandler(CreateMessageResultSchema, async (req) => {
      const userMsg = req.params.messages.find((m) => m.role === 'user');
      if (userMsg?.content.text.includes('denied')) {
        throw new Error('Sampling request was denied by client');
      }
      return {
        completion: {
          role: 'assistant',
          content: { type: 'text', text: 'ok' },
        },
      };
    });

    // 调用工具触发被拒绝的采样
    const res = await client.callTool({
      name: 'sampleLLM',
      arguments: { prompt: 'this will be denied', maxTokens: 16 },
    });

    expect(res.isError).toBeTruthy();
    expect(res.content[0].text).toMatch(/denied/i);
  });
});
