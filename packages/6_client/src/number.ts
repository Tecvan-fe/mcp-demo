// 导入所需的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const printLog = (...args: any[]) => {
  console.error(...args);
};

// 定义加法工具的参数模式
const AddParamsSchema = z.object({
  a: z.number().describe('第一个数字'),
  b: z.number().describe('第二个数字'),
});

// 定义工具列表
const TOOLS = [
  {
    id: 'add',
    name: '加法计算',
    description: '计算两个数字的和',
    inputSchema: zodToJsonSchema(AddParamsSchema),
  },
];

// 定义工具参数接口
interface ToolArgs {
  [key: string]: any;
  a?: number;
  b?: number;
}

// 创建服务器实例
const server = new Server(
  {
    name: 'NumberToolServer',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {}, // 支持工具调用功能
    },
    instructions: '这是一个MCP服务器，支持数学计算工具',
  }
);

// 注册请求处理器 - 工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  printLog('收到工具列表请求');
  return {
    tools: TOOLS,
  };
});

// 注册请求处理器 - 工具调用处理器
server.setRequestHandler(CallToolRequestSchema, (request) => {
  const { name, arguments: rawArgs = {} } = request.params;
  const args = rawArgs as ToolArgs;

  printLog('收到工具调用请求:', name, args);

  // 根据工具ID处理请求
  switch (name) {
    case 'add': {
      // 确保参数存在
      const a = args.a;
      const b = args.b;

      if (a === undefined || b === undefined) {
        return {
          content: [{ type: 'text', text: '错误: 缺少数字参数' }],
          isError: true,
        };
      }

      // 计算加法
      const sum = a + b;

      return {
        content: [{ type: 'text', text: `${a} + ${b} = ${sum}` }],
      };
    }
    case 'default': {
      return {
        content: [{ type: 'text', text: '错误: 不支持的工具' }],
        isError: true,
      };
    }
  }
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

    printLog('数学计算 MCP 服务器已启动');
    printLog('支持的工具：加法计算(add)');
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
