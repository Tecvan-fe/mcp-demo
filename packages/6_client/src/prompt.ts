// 导入所需的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
  PromptMessage,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// 日志输出函数
const printLog = (...args: any[]) => {
  console.error(...args);
};

// 预定义的提示模板库
const promptTemplates = [
  {
    name: 'simple_prompt',
    description: '一个简单的提示模板示例',
    messages: [
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: '你是一个有用的AI助手，请简洁直接地回答用户问题。',
        },
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: '请问今天天气如何？',
        },
      },
    ],
  },
  {
    name: 'code_review',
    description: '代码审查提示模板',
    messages: [
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: '你是一个专业的代码审查专家。请对提供的代码进行全面审查，指出潜在问题和改进建议。',
        },
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: `请审查以下{{language}}代码:\n\n\`\`\`{{language}}\n{{code}}\n\`\`\`\n\n提供详细的改进建议和最佳实践。`,
        },
      },
    ],
    required_args: ['code', 'language'],
  },
];

// 创建服务器实例
const server = new Server(
  {
    name: 'PromptServer',
    version: '1.0.0',
  },
  {
    capabilities: {
      prompts: {},
    },
    instructions: '这是一个MCP提示服务器，提供各种提示模板。',
  }
);

// 注册请求处理器 - 提示列表
server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
  return {
    prompts: promptTemplates.map((template) => ({
      name: template.name,
      description: template.description || '',
    })),
  };
});

// 注册请求处理器 - 获取提示
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!name) {
    throw new Error('缺少提示名称');
  }

  const promptTemplate = promptTemplates.find((p) => p.name === name);
  if (!promptTemplate) {
    throw new Error(`提示 '${name}' 不存在`);
  }

  // 检查是否需要参数
  if (promptTemplate.required_args && promptTemplate.required_args.length > 0) {
    if (!args) {
      throw new Error(`提示 '${name}' 需要以下参数: ${promptTemplate.required_args.join(', ')}`);
    }

    // 检查是否提供了所有必需的参数
    for (const argName of promptTemplate.required_args) {
      if (!(argName in args)) {
        throw new Error(`缺少必需参数: ${argName}`);
      }
    }
  }

  // 处理消息模板，替换参数
  const processedMessages: PromptMessage[] = promptTemplate.messages.map((msg) => {
    const processedMsg = { ...msg };

    if (typeof msg.content === 'string') {
      processedMsg.content = replaceTemplateVars(msg.content, args || {});
    } else if (
      msg.content &&
      typeof msg.content === 'object' &&
      'text' in msg.content &&
      typeof msg.content.text === 'string'
    ) {
      processedMsg.content = {
        ...msg.content,
        text: replaceTemplateVars(msg.content.text, args || {}),
      };
    }

    return processedMsg as PromptMessage;
  });

  return {
    messages: processedMessages,
  };
});

// 替换模板变量的辅助函数
function replaceTemplateVars(text: string, vars: Record<string, any>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? String(vars[key]) : match;
  });
}

// 设置服务器事件处理器
server.oninitialized = () => {
  printLog('MCP Prompt 服务器已初始化');
};

// 创建并连接STDIO传输层
async function startServer(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    printLog('MCP Prompt 服务器已启动');
    printLog(`可用提示模板: ${promptTemplates.map((t) => t.name).join(', ')}`);

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
