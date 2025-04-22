// 导入所需的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
  CreateMessageRequestSchema,
  JSONRPCMessage,
  Implementation,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const printLog = (...args: any[]) => {
  console.error(...args);
};

// 预定义的提示模板库
const promptTemplates: Prompt[] = [
  {
    id: 'email-template',
    name: '电子邮件模板',
    description: '生成一封专业的电子邮件',
    template: `
请为我写一封发给{{recipient}}的电子邮件，主题是{{topic}}。
请使用{{tone}}的语气。
邮件应该包含：
- 开场白
- 主要内容
- 结束语
- 签名
`,
    templateParameters: {
      recipient: {
        description: '收件人名称',
        required: true,
      },
      topic: {
        description: '邮件主题',
        required: true,
      },
      tone: {
        description: '邮件语气',
        required: true,
        defaultValue: '专业',
      },
    },
  },
  {
    id: 'code-review',
    name: '代码审查',
    description: '生成详细的代码审查反馈',
    template: `
请对以下{{language}}代码进行审查：

{{code}}

请提供以下方面的反馈：
- 代码质量
- 潜在问题
- 优化建议
- 最佳实践
`,
    templateParameters: {
      language: {
        description: '编程语言',
        required: true,
      },
      code: {
        description: '需要审查的代码',
        required: true,
      },
    },
  },
  {
    id: 'custom-prompt',
    name: '自定义提示模板',
    description: '根据场景和目标生成个性化提示',
    template: `
请为我生成一个针对{{scenario}}场景的提示模板，目标是{{goal}}。
额外要求: {{requirements}}
`,
    templateParameters: {
      scenario: {
        description: '应用场景',
        required: true,
      },
      goal: {
        description: '提示目标',
        required: true,
      },
      requirements: {
        description: '额外要求',
        required: false,
        defaultValue: '无特殊要求',
      },
    },
  },
];

// 使用MCP采样能力调用LLM，需要外部LLM服务
async function callExternalLLM(prompt: string): Promise<string> {
  printLog('准备调用外部LLM - 输入:', prompt);

  try {
    // 这里需要设置代理服务器或其他方式来访问外部的LLM服务
    // 例如可以启动一个单独的MCP服务器作为LLM服务提供者

    // 创建新的标准输入/输出通信通道发送请求到外部LLM服务
    const externalRequest = {
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: 'sampling/createMessage',
      params: {
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
        temperature: 0.7,
        maxTokens: 1000,
      },
    };

    // 在真实实现中，这里应该通过某种方式发送请求到外部LLM服务
    // 简化起见，这里返回一个模拟响应
    printLog('由于缺少外部LLM连接，返回模拟响应');
    return `这是对"${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"的模拟响应。
    
在实际应用中，这里应该连接到真实的LLM服务来获取回复。您可以:
1. 使用MCP客户端调用外部LLM服务
2. 使用API调用第三方LLM服务
3. 设置本地LLM服务并连接到它

这需要在实现中完成真实的连接逻辑，而不是这个模拟响应。`;
  } catch (error: any) {
    printLog('调用外部LLM失败:', error);
    return `无法获取LLM响应。请检查您的请求并重试。
    
错误信息: ${error?.message || '未知错误'}`;
  }
}

// 创建服务器实例
const server = new Server(
  {
    name: 'RealAdvancedPromptServer',
    version: '1.0.0',
  },
  {
    capabilities: {
      prompts: {}, // 对外提供提示模板服务
      sampling: {}, // 声明sampling能力，但实际实现会转发到外部LLM
    },
    instructions: '这是一个高级MCP服务器示例，结合提示模板管理和LLM采样能力。',
  }
);

// 注册请求处理器 - 提示列表
server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
  const { filter } = request.params || {};

  let prompts = [...promptTemplates];

  if (filter && typeof filter === 'string') {
    const lowerFilter = filter.toLowerCase();
    prompts = prompts.filter(
      (prompt) =>
        prompt.name.toLowerCase().includes(lowerFilter) ||
        (prompt.description && prompt.description.toLowerCase().includes(lowerFilter))
    );
  }

  return {
    prompts: prompts.map(({ id, name, description }) => ({
      id,
      name,
      description: description || '',
    })),
  };
});

// 注册请求处理器 - 获取提示
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { promptId } = request.params;

  if (!promptId) {
    throw new Error('缺少提示ID');
  }

  const prompt = promptTemplates.find((p) => p.id === promptId);
  if (!prompt) {
    throw new Error(`提示 ${promptId} 不存在`);
  }

  // 使用LLM来增强提示模板的说明
  try {
    const enhancerPrompt = `请为"${prompt.name}"提示模板提供一个详细的使用说明，描述什么场景下使用最合适，以及如何有效地使用这个模板。原始描述: ${prompt.description}`;

    const enhancedDescription = await callExternalLLM(enhancerPrompt);

    // 返回带有增强描述的提示模板
    return {
      prompt: {
        ...prompt,
        // 添加增强的说明，但保留原始模板
        enhancedDescription: enhancedDescription,
      },
    };
  } catch (error) {
    printLog('增强提示描述时出错:', error);
    // 如果增强失败，返回原始提示
    return { prompt };
  }
});

// 注册 CreateMessageRequest 处理器 - 支持直接采样
server.setRequestHandler(CreateMessageRequestSchema, async (request, extra) => {
  // 检查是否被取消
  if (extra.signal.aborted) {
    throw new Error('请求已取消');
  }

  printLog('收到采样请求:', JSON.stringify(request.params, null, 2));

  const { messages } = request.params;

  // 获取最后一条用户消息
  const lastMessage = messages[messages.length - 1] as any;
  let userContent = '';

  // 解析消息内容
  if (typeof lastMessage.content === 'string') {
    userContent = lastMessage.content;
  } else if (Array.isArray(lastMessage.content)) {
    // 如果内容是数组，尝试提取文本部分
    for (const part of lastMessage.content) {
      if (part.type === 'text' && part.text) {
        userContent += part.text;
      }
    }
  }

  // 对于某些特定请求，我们添加额外的增强信息
  let enhancedPrompt = userContent;

  if (userContent.toLowerCase().includes('邮件') || userContent.toLowerCase().includes('email')) {
    enhancedPrompt = `${userContent}\n\n请确保邮件格式专业，包含适当的开场白、正文、结束语和签名。`;
  } else if (
    userContent.toLowerCase().includes('代码') ||
    userContent.toLowerCase().includes('code')
  ) {
    enhancedPrompt = `${userContent}\n\n请提供详细的代码解释和使用示例。`;
  }

  // 调用外部LLM获取响应
  try {
    const response = await callExternalLLM(enhancedPrompt);

    // 返回生成的消息
    return {
      message: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      },
    };
  } catch (error) {
    printLog('处理请求时出错:', error);
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

    printLog('高级MCP提示+采样服务器已启动');
    printLog('支持的提示模板: email-template, code-review, custom-prompt');
    printLog('采样请求会通过外部LLM服务处理（当前为模拟响应）');

    process.on('SIGINT', async () => {
      printLog('正在关闭服务器...');
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    printLog('服务器启动失败:', error);
  }
}

startServer().catch((error) => printLog('启动错误:', error));
