import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import path from 'path';
// 引入 MCP 客户端和 Stdio 传输模块
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('MCP Server Prompts 模块端到端测试', () => {
  // MCP 客户端实例和传输
  let client: Client;
  let transport: StdioClientTransport;

  // 在所有测试之前启动 MCP Server，并建立 Stdio 连接
  beforeAll(async () => {
    // 假设 server.js 可执行文件位于项目根目录或指定路径
    const serverPath = path.resolve(__dirname, '../src/prompt.ts');
    // 使用 StdioClientTransport 启动 MCP Server
    transport = new StdioClientTransport({
      command: 'tsx',
      args: [serverPath],
    });
    // 创建 MCP 客户端并连接到启动的服务器
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(transport);
  }, 10000); // 给服务器一些启动时间，最多等待10秒

  // 在所有测试完成后关闭 MCP Server 连接
  afterAll(async () => {
    // 断开连接并停止 MCP Server 进程
    await client.close();
  });

  it('测试 listPrompts()，应返回至少一个 prompt（例如 simple_prompt）', async () => {
    // 调用 listPrompts() 获取可用的 prompt 列表
    const result = await client.listPrompts();
    // 提取 prompts 数组（listPrompts 返回对象可能包含 prompts 属性）
    const prompts = Array.isArray(result) ? result : result.prompts;
    // 列表应至少包含一个 prompt
    expect(prompts.length).toBeGreaterThan(0);
    // 验证列表中包含特定的 prompt 名称，如 simple_prompt
    const promptNames = prompts.map((p) => (typeof p === 'string' ? p : p.name));
    expect(promptNames).toContain('simple_prompt');
  });

  it('测试 getPrompt() 获取 simple_prompt，返回的 messages 内容非空且格式正确', async () => {
    // 获取名为 simple_prompt 的 Prompt 内容
    const promptResult = await client.getPrompt({ name: 'simple_prompt' });
    // 提取消息列表
    const messages = promptResult.messages;
    // messages 列表应存在且至少包含一条消息
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    // 检查第一条消息的格式和内容
    const firstMsg = messages[0];
    // 应包含角色(role)和内容(content)字段
    expect(firstMsg).toHaveProperty('role');
    expect(firstMsg).toHaveProperty('content');
    // role 应为非空字符串
    expect(typeof firstMsg.role).toBe('string');
    expect(firstMsg.role.length).toBeGreaterThan(0);
    // content 可以是字符串或对象，确保其文本内容非空
    if (typeof firstMsg.content === 'string') {
      expect(firstMsg.content.length).toBeGreaterThan(0);
    } else if (firstMsg.content && typeof firstMsg.content === 'object') {
      // 如果 content 为对象，则应包含 text 字段
      expect(firstMsg.content).toHaveProperty('text');
      if (typeof firstMsg.content.text === 'string') {
        expect(firstMsg.content.text.length).toBeGreaterThan(0);
      } else {
        // 若 content.text 不是字符串，也至少应存在 truthy 值
        expect(firstMsg.content.text).toBeTruthy();
      }
    }
  });

  it('测试带参数的 Prompt（如 code_review），提供参数后验证消息正确注入', async () => {
    // 准备代码片段作为参数
    const codeSample = 'function add(a, b) { return a + b; }';
    // 获取名为 code_review 的 Prompt，提供必要的参数（如代码和语言）
    const promptResult = await client.getPrompt({
      name: 'code_review',
      arguments: {
        code: codeSample,
        language: 'javascript',
      },
    });
    const messages = promptResult.messages;
    // 将所有消息内容拼接为字符串，便于检查参数注入
    const allContent = messages
      .map((msg) => {
        // 提取每条消息的文本内容
        if (typeof msg.content === 'string') {
          return msg.content;
        } else if (
          msg.content &&
          typeof msg.content === 'object' &&
          'text' in msg.content &&
          typeof msg.content.text === 'string'
        ) {
          return msg.content.text;
        }
        return '';
      })
      .join(' ');
    // 验证提供的代码片段已经出现在 Prompt 消息内容中
    expect(allContent).toContain(codeSample);
  });

  it('测试缺少参数调用 getPrompt 应抛出错误', async () => {
    // 调用 code_review Prompt 时不提供必要参数，应当抛出错误
    await expect(client.getPrompt({ name: 'code_review' })).rejects.toThrow();
  });

  it('测试请求不存在的 Prompt 应抛出错误', async () => {
    // 请求一个不存在的 prompt 名称，应该抛出错误
    await expect(client.getPrompt({ name: 'nonexistent_prompt' })).rejects.toThrow();
  });
});
