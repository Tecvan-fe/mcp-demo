/**
 * MCP工具定义与调用指南
 * 本文件提炼了MCP工具定义和处理的关键内容，并添加了详细说明
 */

// 导入必要的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  Implementation,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * 用于日志打印的工具函数
 * 使用console.error确保日志不会干扰标准输出的JSON-RPC通信
 * @param args 要打印的参数列表
 */
const printLog = (...args: any[]) => {
  console.error(...args);
};

/**
 * 使用Zod定义工具的参数结构
 * 这样可以同时获得TypeScript的类型检查和JSON Schema的生成
 */
const WeatherParamsSchema = z.object({
  // 定义参数名、类型和说明
  city: z.string().describe('城市名称，如"北京"、"上海"等'),
});

/**
 * 计算器参数结构
 */
const CalculatorParamsSchema = z.object({
  expression: z.string().describe('要计算的数学表达式，如"1 + 2 * 3"'),
});

/**
 * 工具列表定义
 * 每个工具包含:
 * - id: 唯一标识符
 * - name: 工具名称
 * - description: 工具说明
 * - inputSchema: 参数结构的JSON Schema
 */
const TOOLS = [
  {
    id: 'calculator',
    name: '计算器',
    description: '执行基本的数学计算',
    inputSchema: zodToJsonSchema(CalculatorParamsSchema),
  },
  {
    id: 'weather',
    name: '天气查询',
    description: '获取指定城市的天气信息',
    inputSchema: zodToJsonSchema(WeatherParamsSchema),
  },
];

/**
 * 定义工具参数接口
 * 扩展允许任意键值对，同时为特定工具添加已知参数
 */
interface ToolArgs {
  [key: string]: any;
  expression?: string;
  city?: string;
}

/**
 * 创建MCP Server实例
 * @param name 服务器名称
 * @param version 服务器版本
 * @param capabilities 服务器能力声明
 */
const server = new Server(
  {
    name: 'SimpleToolServer', // 服务器名称
    version: '1.0.0', // 服务器版本
  },
  {
    capabilities: {
      // 声明服务器支持的能力
      tools: {}, // 支持工具调用功能
    },
    instructions: '这是一个MCP服务器示例，支持工具调用功能。',
  }
);

/**
 * 注册工具列表处理器
 * 当客户端请求可用工具列表时调用
 * @returns {Promise<{tools: Array}>} 返回工具列表
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  printLog('收到工具列表请求');
  return {
    tools: TOOLS, // 返回预定义的工具列表
  };
});

/**
 * 注册工具调用处理器
 * 当客户端请求调用工具时执行
 * @param request 包含工具ID和参数的请求对象
 * @returns {Promise<{result: string}>} 返回工具执行结果
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // 解构获取工具ID和参数，并设置默认值避免undefined
  const { toolId, arguments: rawArgs = {} } = request.params;
  const args = rawArgs as ToolArgs;

  printLog('收到工具调用请求:', toolId, args);

  // 根据工具ID处理请求
  switch (toolId) {
    case 'calculator': {
      try {
        // 参数检查
        const expression = args.expression;
        if (!expression) {
          return {
            result: '错误: 缺少表达式参数',
          };
        }

        // 安全计算表达式
        const result = Function('"use strict"; return (' + expression + ')')();
        return {
          result: `计算结果: ${result}`,
        };
      } catch (error) {
        return {
          result: `计算错误: ${(error as Error).message}`,
        };
      }
    }
    case 'weather': {
      // 参数检查
      const city = args.city;
      if (!city) {
        return {
          result: '错误: 缺少城市参数',
        };
      }

      // 模拟天气数据存储
      const weatherData: Record<string, string> = {
        北京: '晴朗，25°C',
        上海: '多云，28°C',
        广州: '小雨，30°C',
        深圳: '阴天，29°C',
      };

      // 查询天气并返回结果
      const weather = weatherData[city] || '未找到该城市的天气信息';
      return {
        result: `${city}的天气: ${weather}`,
      };
    }
    default:
      // 处理未知工具ID
      return {
        result: `未找到ID为"${toolId}"的工具`,
      };
  }
});

/**
 * 设置服务器初始化完成的回调
 */
server.oninitialized = () => {
  printLog('服务器已完成初始化，准备处理请求');
};

/**
 * 设置服务器关闭的回调
 */
server.onclose = () => {
  printLog('服务器连接已关闭');
};

/**
 * 设置服务器错误的回调
 * @param error 错误对象
 */
server.onerror = (error: Error) => {
  printLog('服务器错误:', error);
};

/**
 * 创建并启动服务器
 * 初始化传输层并处理关闭信号
 */
async function startServer(): Promise<void> {
  try {
    // 创建STDIO传输层
    const transport = new StdioServerTransport();

    // 连接传输层到服务器
    await server.connect(transport);

    printLog('STDIO MCP 工具服务器已启动');
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

/**
 * 工具定义和调用的关键点总结:
 *
 * 1. 工具定义:
 *    - 使用Zod定义参数结构，提供类型安全
 *    - 通过zodToJsonSchema转换成JSON Schema
 *    - 每个工具需要id、name、description和inputSchema
 *
 * 2. 服务器设置:
 *    - 在capabilities中声明tools能力
 *    - 实现ListToolsRequestSchema处理器提供工具列表
 *    - 实现CallToolRequestSchema处理器处理工具调用
 *
 * 3. 工具实现:
 *    - 通过switch根据toolId分发处理逻辑
 *    - 验证必要参数是否存在
 *    - 实现具体功能并返回结果
 *
 * 4. 错误处理:
 *    - 检查参数完整性
 *    - 捕获并处理执行错误
 *    - 返回友好的错误信息
 */
