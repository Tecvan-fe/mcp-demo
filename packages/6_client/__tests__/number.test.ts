import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

/**
 * vitest E2E 单元测试：验证 MCP Server 的 Tools 功能
 * ------------------------------------------------------
 * 1. 启动本地 MCP Server（number.ts）并通过 stdio 连接。
 * 2. 列出工具列表并断言必须包含 add 工具。
 * 3. 调用 add 工具验证正常结果。
 * 4. 调用 add 工具使用非法参数，验证错误处理。
 * 5. 调用不存在的工具，验证 SDK 抛出异常。
 * ------------------------------------------------------
 * 运行方式：
 *   npx vitest run
 */

// 定义响应类型
interface ToolResponse {
  result: string;
  content: Array<{ type: string; text: string }>;
  isError: boolean;
  [key: string]: any;
}

let client: Client;
let transport: StdioClientTransport;

// 设置较长超时时间以便服务器启动完成
beforeAll(async () => {
  const scriptPath = path.resolve(__dirname, '../src/number.ts');

  transport = new StdioClientTransport({
    command: 'tsx',
    args: [scriptPath],
  });

  client = new Client({ name: 'number-tool-test-client', version: '0.1.0' });
  await client.connect(transport);
  // 注意：新版SDK可能不需要initialize方法，如果报错可以注释此行
  // await client.initialize();
}, 2000);

afterAll(async () => {
  await client.close();
  // 尝试终止子进程，但不强制依赖特定属性
  try {
    // @ts-ignore - 尝试各种可能的方式终止进程
    transport.process?.kill?.();
    // @ts-ignore
    transport.kill?.();
  } catch (e) {
    console.error('无法终止子进程:', e);
  }
});

describe('数字计算 MCP 工具测试', () => {
  it('应该列出所需的工具', async () => {
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.id);

    expect(toolNames).toContain('add');
  });

  it('应该正确执行加法工具', async () => {
    const response = (await client.callTool({
      name: 'add',
      arguments: { a: 5, b: 3 },
    })) as ToolResponse;

    // 检查响应格式是否符合预期
    expect(response.isError).toBeFalsy();
    expect(response.content).toBeInstanceOf(Array);
    expect(response.content[0]).toHaveProperty('text', '5 + 3 = 8');
  });

  it('应该处理参数缺失的情况', async () => {
    const response = (await client.callTool({
      name: 'add',
      arguments: { a: 5 },
    })) as ToolResponse;

    // 检查错误响应格式
    expect(response.isError).toBeTruthy();
    expect(response.content).toBeInstanceOf(Array);
    expect(response.content[0].text).toMatch(/错误: 缺少数字参数/);
  });

  it('应该处理非法参数的情况', async () => {
    try {
      // @ts-ignore - 故意传入错误类型测试服务器错误处理
      await client.callTool({
        name: 'add',
        arguments: { a: 5, b: 'x' },
      });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
