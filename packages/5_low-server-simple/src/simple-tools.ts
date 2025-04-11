// 导入所需的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CreateMessageRequestSchema,
  CreateMessageResultSchema,
  Implementation,
  JSONRPCMessage,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const printLog = (...args: any[]) => {
  console.error(...args);
};

const WeatherParamsSchema = z.object({
  city: z.string().describe('城市名称，如"北京"、"上海"等'),
});

// 定义工具列表
const TOOLS = [
  {
    id: 'weather',
    name: '天气查询',
    description: '获取指定城市的天气信息',
    inputSchema: zodToJsonSchema(WeatherParamsSchema),
  },
];

// 定义天气数据类型
interface WeatherData {
  [city: string]: string;
}

// 定义工具参数接口
interface ToolArgs {
  [key: string]: any;
  expression?: string;
  city?: string;
}

// 2. 创建服务器实例
const server = new Server(
  {
    name: 'SimpleToolServer',
    version: '1.0.0',
  },
  {
    capabilities: {
      // 声明服务器支持的基本能力
      tools: {}, // 支持工具调用功能
    },
    instructions: '这是一个MCP服务器示例，支持消息回显和工具调用功能。',
  }
);

// 3. 注册请求处理器 - 工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  printLog('收到工具列表请求');
  return {
    tools: TOOLS,
  };
});

// 4. 注册请求处理器 - 工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { toolId, arguments: rawArgs = {} } = request.params;
  const args = rawArgs as ToolArgs;

  printLog('收到工具调用请求:', toolId, args);

  // 根据工具ID处理请求
  switch (toolId) {
    case 'weather': {
      // 确保city参数存在
      const city = args.city;
      if (!city) {
        return {
          result: '错误: 缺少城市参数',
        };
      }

      // 模拟天气信息查询
      const weatherData: WeatherData = {
        北京: '晴朗，25°C',
        上海: '多云，28°C',
        广州: '小雨，30°C',
        深圳: '阴天，29°C',
      };

      const weather = weatherData[city] || '未找到该城市的天气信息';

      return {
        result: `${city}的天气: ${weather}`,
      };
    }
    default:
      return {
        result: `未找到ID为"${toolId}"的工具`,
      };
  }
});

// 6. 设置服务器事件处理器
server.oninitialized = () => {
  printLog('服务器已完成初始化，准备处理请求');
};

server.onclose = () => {
  printLog('服务器连接已关闭');
};

server.onerror = (error: Error) => {
  printLog('服务器错误:', error);
};

// 7. 创建并连接STDIO传输层
async function startServer(): Promise<void> {
  try {
    // 创建STDIO传输层
    const transport = new StdioServerTransport();

    // 连接传输层
    await server.connect(transport);

    printLog('STDIO MCP 服务器已启动');
    printLog('支持的工具：计算器(calculator)、天气查询(weather)');
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
