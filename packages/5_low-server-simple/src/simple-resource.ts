// 导入所需的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ReadResourceRequestSchema,
  ListResourcesRequestSchema,
  Resource,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const printLog = async (...args: any[]) => {
  await server.sendLoggingMessage({
    level: 'info',
    message: args.map((r) => JSON.stringify(r)),
    timestamp: new Date().toISOString(),
  });
};

// 定义资源类型
interface FileResource extends Resource {
  type: 'file';
  contents: TextContent;
}

interface DirectoryResource extends Resource {
  type: 'directory';
}

// 模拟的文件系统结构
const fileSystem: Record<string, FileResource | DirectoryResource> = {
  'root-docs': {
    id: 'root-docs',
    name: '文档',
    type: 'directory',
    parent: null,
    uri: 'mcp://root-docs',
  },
  'doc-1': {
    id: 'doc-1',
    name: 'README.md',
    type: 'file',
    parent: 'root-docs',
    uri: 'mcp://root-docs/README.md',
    contents: {
      type: 'text',
      uri: 'mcp://root-docs/README.md',
      text: '# 示例文档\n\n这是一个示例Markdown文档，用于演示MCP资源管理功能。',
      contentType: 'text/markdown',
    },
  },
};

// 创建服务器实例
const server = new Server(
  {
    name: 'SimpleResourceServer',
    version: '1.0.0',
  },
  {
    capabilities: {
      // 声明服务器支持资源管理能力
      resources: {},
      roots: {},
      logging: {},
    },
    instructions: '这是一个MCP服务器示例，展示资源管理功能，包括动态创建、更新和删除资源。',
  }
);

// 注册请求处理器 - 读取资源
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  if (uri !== 'mcp://root-docs/README.md') {
    throw new Error(`资源 ${uri} 不存在`);
  }

  return {
    contents: [
      {
        type: 'text',
        uri: 'mcp://root-docs/README.md',
        text: '# 示例文档\n\n这是一个示例Markdown文档，用于演示MCP资源管理功能。',
        contentType: 'text/markdown',
      },
    ],
  };
});

// 注册请求处理器 - 列出目录内容
server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
  return {
    resources: [
      {
        name: 'readme.md',
        type: 'file',
        uri: 'mcp://root-docs/README.md',
        description: 'readme',
      },
    ],
  };
});

// 创建并连接STDIO传输层
async function startServer(): Promise<void> {
  // 创建STDIO传输层
  const transport = new StdioServerTransport();

  // 连接传输层
  await server.connect(transport);
  printLog('server started');
  let count = 0;
  setInterval(() => {
    printLog(`tick: ${++count}`);
  }, 1000);

  // 优雅关闭的处理
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}

// 启动服务器
startServer().catch(async (error) => await printLog('启动失败:', error));
