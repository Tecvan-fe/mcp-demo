// 导入所需的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// 日志输出函数
const printLog = (...args: any[]) => {
  console.error(...args);
};

// 预定义工具列表
const TOOLS = [
  {
    name: 'calculator',
    description: '一个简单的计算器工具',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '要计算的数学表达式，如 1 + 2 * 3',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'longRunningOperation',
    description: '一个模拟长时间运行的操作，会发送进度通知',
    inputSchema: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          description: '操作持续时间（秒）',
        },
        steps: {
          type: 'number',
          description: '操作的步骤数',
        },
      },
      required: ['duration', 'steps'],
    },
  },
];

// 预定义资源列表
const RESOURCES = [
  {
    uri: 'resource://test-resource',
    name: '测试资源',
    mimeType: 'text/plain',
  },
  {
    uri: 'resource://live-data',
    name: '实时数据',
    mimeType: 'application/json',
  },
];

// 资源内容
const resourceContents: Record<string, any> = {
  'resource://test-resource': '这是一个测试资源内容',
  'resource://live-data': JSON.stringify({ timestamp: Date.now(), value: Math.random() * 100 }),
};

// 资源订阅者表
const resourceSubscriptions: Record<string, boolean> = {};

// 创建服务器实例
const server = new Server(
  {
    name: 'NotifyServer',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      subscription: {},
    },
    instructions: '这是一个MCP通知服务器示例，展示各种通知功能。',
  }
);

// 注册请求处理器 - 工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  printLog('收到工具列表请求');
  return {
    tools: TOOLS,
  };
});

// 注册请求处理器 - 调用工具
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  printLog(`收到工具调用请求: ${name}`);

  // 提取进度令牌 (如果存在)
  const metadata = request.params._meta;
  const progressToken = metadata?.progressToken;

  // 工具: 计算器
  if (name === 'calculator') {
    if (!args || !args.expression) {
      throw new Error('缺少表达式参数');
    }

    try {
      // 警告：仅用于演示，实际应用中应该进行安全处理
      const result = eval(String(args.expression));
      return {
        content: [
          {
            type: 'text',
            text: `计算结果: ${result}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`计算错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 工具: 长时间运行操作
  if (name === 'longRunningOperation') {
    if (!args || typeof args.duration !== 'number' || typeof args.steps !== 'number') {
      throw new Error('缺少必要参数');
    }

    const { duration, steps } = args;
    for (let i = 1; i <= steps; i++) {
      const percent = Math.round((i / steps) * 100);
      printLog(`模拟进度通知: 步骤 ${i}/${steps}, 进度 ${percent}%`);
      await new Promise((resolve) => setTimeout(resolve, (duration * 100) / steps));
      await server.notification({
        method: 'notifications/progress',
        params: {
          progress: i,
          total: steps,
          progressToken,
        },
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: `操作已完成，共${steps}个步骤，耗时${duration}秒`,
        },
      ],
    };
  }

  throw new Error(`未知工具: ${name}`);
});

// 注册请求处理器 - 资源列表
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  printLog('收到资源列表请求');
  return {
    resources: RESOURCES,
  };
});

// 注册请求处理器 - 读取资源
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  printLog(`收到读取资源请求: ${uri}`);

  if (!resourceContents[uri]) {
    throw new Error(`资源不存在: ${uri}`);
  }

  const content = resourceContents[uri];

  return {
    contents: [
      {
        uri,
        text: content,
      },
    ],
  };
});

// 注册请求处理器 - 订阅资源
server.setRequestHandler(SubscribeRequestSchema, async (request) => {
  const { uri } = request.params;
  printLog(`收到资源订阅请求: ${uri}`);

  if (!resourceContents[uri]) {
    throw new Error(`资源不存在: ${uri}`);
  }

  resourceSubscriptions[uri] = true;

  return {};
});

// 设置服务器事件处理器
server.oninitialized = () => {
  printLog('MCP Notify 服务器已初始化');

  // 模拟服务器初始化时的工具列表变更通知
  printLog('模拟工具列表变更通知 (notifications/tools/list_changed)');

  // 资源自动更新
  setInterval(() => {
    // 更新实时数据
    resourceContents['resource://live-data'] = JSON.stringify({
      timestamp: Date.now(),
      value: Math.random() * 100,
    });

    // 模拟资源更新通知 - 在测试中只打印通知信息，不实际发送
    Object.keys(resourceSubscriptions).forEach((uri) => {
      if (resourceSubscriptions[uri]) {
        printLog(`模拟资源更新通知: ${uri} (notifications/resources/updated)`);
        // 实际发送资源更新通知
        server.notification({
          method: 'notifications/resources/updated',
          params: { uri },
        });
      }
    });
  }, 2000);
};

// 创建并连接STDIO传输层
async function startServer(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    printLog('MCP Notify 服务器已启动');
    printLog(`可用工具: ${TOOLS.map((t) => t.name).join(', ')}`);
    printLog(`可用资源: ${RESOURCES.map((r) => r.uri).join(', ')}`);

    process.on('SIGINT', async () => {
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    printLog('服务器启动失败:', error);
  }
}

// 启动服务器
startServer();
