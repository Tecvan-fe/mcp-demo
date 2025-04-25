import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

/**
 * vitest E2E 单元测试：验证 MCP Server 的资源功能
 * ------------------------------------------------------
 * 1. 启动本地 MCP Server (resources.ts) 并通过 stdio 连接。
 * 2. 列出静态资源和资源模板。
 * 3. 读取静态资源内容。
 * 4. 读取模板资源并验证参数替换。
 * 5. 验证读取不存在的资源会抛出异常。
 * ------------------------------------------------------
 * 运行方式：
 *   npx vitest run
 */

// 定义资源响应类型
interface ResourceItem {
  uri: string;
  name: string;
  description?: string;
}

interface ResourceTemplate {
  name: string;
  uriTemplate: string;
  description?: string;
  parameters?: Array<{ name: string; type: string; description?: string }>;
}

interface ResourceContent {
  type: 'text' | 'blob';
  text?: string;
  blob?: string;
  [key: string]: any;
}

interface ListResourcesResponse {
  resources: ResourceItem[];
  resourceTemplates: ResourceTemplate[];
}

interface ReadResourceResponse {
  contents: ResourceContent[];
}

let client: Client;
let transport: StdioClientTransport;

// 设置较长超时时间以便服务器启动完成
beforeAll(async () => {
  const scriptPath = path.resolve(__dirname, '../src/resources.ts');

  transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', scriptPath],
  });

  client = new Client({ name: 'resource-test-client', version: '0.1.0' });
  await client.connect(transport);
  // await client.initialize(); // 新版SDK不需要此方法
}, 20_000);

afterAll(async () => {
  await client.close();
  // 尝试终止子进程
  try {
    // @ts-ignore - 尝试各种可能的方式终止进程
    transport.process?.kill?.();
  } catch (e) {
    console.error('无法终止子进程:', e);
  }
});

describe('MCP Resources E2E', () => {
  let firstResourceUri: string | undefined;
  let greetingTemplateUri: string | undefined;

  it('should list resources and templates', async () => {
    const response = (await client.listResources()) as any;

    expect(response.resources.length).toBeGreaterThan(0);
    firstResourceUri = response.resources[0].uri;

    // 验证静态资源 URI 格式正常
    expect(firstResourceUri).toMatch(/^[a-zA-Z]+:\/\//);

    // （可选）检查是否有 greeting 模板
    greetingTemplateUri = response.resourceTemplates?.find(
      (t: any) => t.name === 'greeting'
    )?.uriTemplate;
  });

  it('should read first static resource', async () => {
    if (!firstResourceUri) throw new Error('No resource URI available');

    const result = (await client.readResource({ uri: firstResourceUri })) as any;

    // 至少有一块内容
    expect(result.contents.length).toBeGreaterThan(0);

    const firstChunk = result.contents[0];
    // 检查每个内容块都有uri字段
    expect(firstChunk.uri).toBeDefined();
    expect(firstChunk.uri).toMatch(/^[a-zA-Z]+:\/\//);

    if (firstChunk.text) {
      expect(typeof firstChunk.text).toBe('string');
      expect(firstChunk.text.trim().length).toBeGreaterThan(0);
    } else if (firstChunk.blob) {
      expect(typeof firstChunk.blob).toBe('string');
      // Blob 内容至少应有 10个字符的 Base64
      expect(firstChunk.blob.length).toBeGreaterThan(10);
    } else {
      throw new Error('Unsupported content type');
    }
  });

  it('should read template resource with parameter if available', async () => {
    if (!greetingTemplateUri) {
      console.warn('No greeting://{name} template detected — skipping param resource test');
      return;
    }

    // 将 {name} 替换为 Alice
    const uri = greetingTemplateUri.replace('{name}', 'Alice');
    const result = (await client.readResource({ uri })) as any;

    // 检查返回的内容
    expect(result.contents.length).toBeGreaterThan(0);
    expect(result.contents[0].uri).toBeDefined();
    expect(result.contents[0].text).toContain('Alice');
  });

  it('should throw for nonexistent resource', async () => {
    await expect(client.readResource({ uri: 'test://nonexistent/resource' })).rejects.toThrow();
  });
});
