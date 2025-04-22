// 导入所需的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CreateMessageRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const printLog = (...args: any[]) => {
  console.error(...args);
};

// 创建服务器实例
const server = new Server(
  {
    name: 'SimpleSamplingServer',
    version: '1.0.0',
  },
  {
    capabilities: {
      // 声明支持 sampling 能力
      sampling: {},
    },
    instructions: '这是一个MCP服务器示例，展示基本的采样生成功能。',
  }
);

// 注册 CreateMessageRequest 处理器
server.setRequestHandler(CreateMessageRequestSchema, async (request, extra) => {
  // 检查请求是否被取消
  if (extra.signal.aborted) {
    throw new Error('请求已取消');
  }

  try {
    printLog('收到 sampling 请求:', JSON.stringify(request.params, null, 2));
    printLog('请求参数结构:', JSON.stringify(CreateMessageRequestSchema.shape.params, null, 2));

    // 兼容性处理：声明参数类型
    let messages = request.params.messages || [];
    const model = request.params.model || '';
    const temperature = request.params.temperature || 0.7;
    const maxTokens = request.params.maxTokens || 1000; // 添加必要的maxTokens参数

    // 获取最后一条用户消息
    const lastMessage = messages[messages.length - 1] as any;
    let userMessageContent = '';

    // 解析消息内容
    if (typeof lastMessage.content === 'string') {
      userMessageContent = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
      // 如果内容是数组，尝试提取文本部分
      for (const part of lastMessage.content) {
        if (part.type === 'text' && part.text) {
          userMessageContent += part.text;
        }
      }
    }

    // 简单的响应生成逻辑
    let response = `您好，这是对"${userMessageContent}"的回复。\n\n`;

    // 根据不同的消息内容生成不同的回复
    if (userMessageContent.includes('项目')) {
      response += '关于项目的信息如下：\n';
      response += '1. 项目名称：MCP示例应用\n';
      response += '2. 项目状态：开发中\n';
      response += '3. 完成度：75%\n';
      response += '4. 预计完成时间：下个月底\n';
    } else if (userMessageContent.includes('介绍') || userMessageContent.includes('自己')) {
      response += '我是一个基于MCP协议的简单采样服务器示例。\n';
      response += '我可以响应用户的消息并生成回复。\n';
      response += '我支持基本的对话功能，但功能相对有限。\n';
    } else if (userMessageContent.includes('帮助') || userMessageContent.includes('help')) {
      response += '以下是我可以提供的帮助：\n';
      response += '- 回答关于MCP协议的基本问题\n';
      response += '- 提供简单的项目信息\n';
      response += '- 生成基础对话回复\n';
    } else {
      response += '我是一个简单的MCP采样服务器演示。\n';
      response += "您可以尝试询问我关于'项目'的信息，或者要求我'介绍自己'。\n";
      response += '我的功能有限，主要用于展示MCP的采样功能。\n';
    }

    // 根据温度参数调整响应的创造性
    if (temperature > 0.8) {
      response += '\n另外，由于您设置的温度参数较高(> 0.8)，我的回复会更加多样化和创意性。';
    } else if (temperature < 0.3) {
      response += '\n另外，由于您设置的温度参数较低(< 0.3)，我的回复会更加确定性和保守。';
    }

    // 模拟处理时间
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 发送进度通知（如果支持）
    try {
      const progressToken = (request.params as any)._meta?.progressToken;
      if (progressToken) {
        // 尝试发送进度通知，但这取决于Server实现是否支持此方法
        // 如果不支持，将优雅地跳过而不是抛出错误
        if ('sendProgressNotification' in server) {
          server
            .sendProgressNotification({
              progressToken,
              progress: {
                status: 'processing',
                message: '正在生成回复...',
                percentage: 50,
              },
            })
            .catch((err: any) => {
              printLog('发送进度通知失败', err);
            });
        }
      }
    } catch (error) {
      printLog('进度通知处理错误', error);
      // 继续处理，不中断主流程
    }

    // 再等待一段时间
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 返回生成的消息
    return {
      message: {
        role: 'assistant',
        content: response,
      },
    };
  } catch (error) {
    printLog('处理请求时发生错误:', error);
    throw error;
  }
});

// 设置服务器事件处理器
server.oninitialized = () => {
  printLog('服务器已初始化');
};

server.onclose = () => {
  printLog('服务器连接已关闭');
};

server.onerror = (error) => {
  printLog('服务器错误:', error);
};

// 创建并连接STDIO传输层
async function startServer(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    printLog('STDIO MCP Sampling 服务器已启动');
    printLog('可通过 sampling/createMessage 方法请求生成内容');
    printLog('支持的参数: messages(必需), model, temperature');

    // 优雅退出
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
startServer().catch((error) => printLog('启动错误:', error));
