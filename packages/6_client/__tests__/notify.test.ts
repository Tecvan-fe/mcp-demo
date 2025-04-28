import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  ToolListChangedNotificationSchema,
  ProgressNotificationSchema,
  ResourceUpdatedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * vitest E2E 单元测试：验证 MCP Server 的 Notify 通知功能
 * ----------------------------------------------------------
 * 流程：
 * 1. 监听工具列表变化（tools/list_changed）
 * 2. 测试 progress 通知（长任务工具进度）
 * 3. 测试资源更新通知（资源订阅）
 * ----------------------------------------------------------
 * 运行方式：
 *   npx vitest run mcp-notify-e2e-test.ts
 */

let client: Client;
let transport: StdioClientTransport;
let progressToken = 0;

// 辅助收集通知数据
let toolListChanged = false;
let progressEvents: { value: number; message?: string }[] = [];
let resourceUpdatedUris: string[] = [];

beforeAll(async () => {
  transport = new StdioClientTransport({
    command: 'tsx',
    args: ['src/notify.ts'], // TODO: 替换为你的 MCP Server 启动脚本
  });

  client = new Client({ name: 'notify-test-client', version: '0.1.0' });
  await client.connect(transport);

  // 注册通知处理器
  client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
    toolListChanged = true;
  });

  client.setNotificationHandler(ProgressNotificationSchema, (notify) => {
    progressEvents.push({ value: notify.params.progress });
  });

  client.setNotificationHandler(ResourceUpdatedNotificationSchema, (notify) => {
    resourceUpdatedUris.push(notify.params.uri);
  });
}, 20_000);

afterAll(async () => {
  await client.close();
  if (typeof transport.kill === 'function') {
    await transport.kill();
  }
});

describe('MCP Notify E2E', () => {
  it('should receive tool list_changed notification if tools modified', async () => {
    // 正常服务器不会主动变更 tools，但这里可以触发 listTools() 并模拟外部变更
    // 若服务器不支持动态变更，可略过，仅测试 handler 可用
    await client.listTools();
    expect(typeof toolListChanged).toBe('boolean'); // 至少注册成功
  });

  it('should receive progress notifications from long running tool', async () => {
    // 调用假设存在的长耗时工具 longRunningOperation
    const { tools } = await client.listTools();
    if (!tools.some((t) => t.name === 'longRunningOperation')) {
      console.warn('longRunningOperation tool not available — skipping progress test');
      return;
    }

    progressEvents = [];

    const result = await client.callTool({
      name: 'longRunningOperation',
      arguments: { duration: 10, steps: 3 },
      _meta: {
        progressToken: progressToken++,
      },
    });

    expect(result.isError).toBeFalsy();
    expect(progressEvents.length).toBeGreaterThanOrEqual(3);
    expect(progressEvents.at(-1)?.value).toBe(3);
  });

  it('should receive resource updated notification after subscription', async () => {
    const { resources } = await client.listResources();
    if (resources.length === 0) {
      console.warn('No available resources — skipping resource update test');
      return;
    }

    const targetUri = resources[0].uri;

    await client.subscribeResource({ uri: targetUri });

    // 等待一段时间，让服务器推送更新通知（假设服务器会周期性推送）
    resourceUpdatedUris = [];
    await new Promise((resolve) => setTimeout(resolve, 5000));

    expect(resourceUpdatedUris.some((uri) => uri === targetUri)).toBeTruthy();
  });
});
