// 导入所需的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const printLog = (...args: any[]) => {
  console.error(...args);
};

// 静态资源
const STATIC_RESOURCES = [
  {
    uri: 'example://document/1',
    name: '示例文档1',
    description: '这是一个简单的文本文档示例',
  },
  {
    uri: 'example://image/1',
    name: '示例图片1',
    description: '这是一个图片示例',
  },
  {
    uri: 'example://code/1',
    name: '示例代码1',
    description: '这是一个代码示例',
  },
];

// 资源模板
const RESOURCE_TEMPLATES = [
  {
    name: 'greeting',
    description: '个性化问候语模板',
    uriTemplate: 'greeting://{name}',
    parameters: [
      {
        name: 'name',
        description: '要问候的人名',
        type: 'string',
      },
    ],
  },
];

// 资源内容 - 修改为符合MCP协议的格式，每个内容包含uri字段
const RESOURCE_CONTENTS: Record<string, any[]> = {
  'example://document/1': [
    {
      uri: 'example://document/1#text',
      text: '这是一个示例文档，用于展示 MCP 资源功能。\n\n资源可以包含纯文本内容，也可以包含二进制数据。',
    },
  ],
  'example://image/1': [
    {
      uri: 'example://image/1#description',
      text: '这是一个图片描述。下面是一个base64编码的小型图片示例 (1x1像素)',
    },
    {
      uri: 'example://image/1#image',
      blob: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    },
  ],
  'example://code/1': [
    {
      uri: 'example://code/1#code',
      text: '```javascript\nfunction greeting(name) {\n  return `你好，${name}！`;\n}\n```',
    },
  ],
};

// 创建服务器实例
const server = new Server(
  {
    name: 'ResourcesServer',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {}, // 支持资源功能
    },
    instructions: '这是一个MCP服务器，提供各种类型的资源访问',
  }
);

// 注册请求处理器 - 资源列表处理器
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  printLog('收到资源列表请求');
  return {
    resources: STATIC_RESOURCES,
    resourceTemplates: RESOURCE_TEMPLATES,
  };
});

// 注册请求处理器 - 读取资源处理器
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  printLog('收到读取资源请求:', uri);

  // 处理模板资源 (greeting://{name})
  if (uri.startsWith('greeting://')) {
    const name = uri.replace('greeting://', '');
    return {
      contents: [
        {
          uri: `greeting://${name}#content`,
          text: `你好，${name}！欢迎使用MCP资源服务。`,
        },
      ],
    };
  }

  // 处理静态资源
  const contents = RESOURCE_CONTENTS[uri];
  if (!contents) {
    // 如果找不到资源，抛出异常
    throw new Error(`找不到资源: ${uri}`);
  }

  return {
    contents,
  };
});

// 设置服务器事件处理器
server.oninitialized = () => {
  printLog('服务器已完成初始化，准备处理请求');
};

server.onclose = () => {
  printLog('服务器连接已关闭');
};

server.onerror = (error: Error) => {
  printLog('服务器错误:', error);
};

// 创建并连接STDIO传输层
async function startServer(): Promise<void> {
  try {
    // 创建STDIO传输层
    const transport = new StdioServerTransport();

    // 连接传输层
    await server.connect(transport);

    printLog('资源服务器已启动');
    printLog('支持的资源类型：静态资源、模板资源');
    printLog('可以通过标准输入发送JSON-RPC消息，标准输出接收响应');

    // 优雅关闭的处理
    process.on('SIGINT', async () => {
      printLog('正在关闭服务器...');
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    printLog('服务器启动失败:', error);
  }
}

// 启动服务器
startServer().catch((error) => printLog('启动失败:', error));
