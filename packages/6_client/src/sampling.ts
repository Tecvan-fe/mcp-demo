// 导入所需的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const printLog = (...args: any[]) => {
  console.error(...args);
};

// 定义 sampleLLM 工具的参数模式
const SampleLLMParamsSchema = z.object({
  prompt: z.string().describe('提示文本'),
  maxTokens: z.number().optional().describe('生成的最大token数量'),
  temperature: z.number().optional().describe('采样温度'),
});

// 定义工具列表
const TOOLS = [
  {
    id: 'sampleLLM',
    name: 'sampleLLM',
    description: '发送提示到LLM进行采样',
    inputSchema: zodToJsonSchema(SampleLLMParamsSchema),
  },
];

// 创建服务器实例
const server = new Server(
  {
    name: 'SamplingServer',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {}, // 支持工具功能
      sampling: {}, // 支持采样功能
    },
    instructions: '这是一个MCP服务器，支持采样功能和工具调用',
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
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  printLog('收到工具调用请求:', name, args);

  if (name === 'sampleLLM') {
    const {
      prompt,
      maxTokens = 100,
      temperature = 1.0,
    } = args as {
      prompt: string;
      maxTokens?: number;
      temperature?: number;
    };

    try {
      // 发送采样请求到客户端
      const samplingResult = await server.createMessage({
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: prompt },
          },
        ],
        maxTokens,
        temperature,
      });

      // 获取采样结果
      const responseText = samplingResult.content.text;
      printLog('采样响应:', responseText);

      // 返回采样结果
      return {
        isError: false,
        content: [{ type: 'text', text: responseText }],
      };
    } catch (error) {
      // 捕获采样过程中的错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      printLog('采样错误:', errorMessage);

      return {
        isError: true,
        content: [{ type: 'text', text: `采样错误: ${errorMessage}` }],
      };
    }
  } else {
    // 处理未知工具
    return {
      isError: true,
      content: [{ type: 'text', text: `未知工具: ${name}` }],
    };
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

    printLog('采样服务器已启动');
    printLog('支持的工具：LLM采样 (sampleLLM)');
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
