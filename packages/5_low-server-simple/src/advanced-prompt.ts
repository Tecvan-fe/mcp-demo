// 导入所需的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const printLog = (...args: any[]) => {
  console.error(JSON.stringify(args[0], null, 2));
};

// 预定义的提示模板库
const promptTemplates: Prompt[] = [
  {
    name: '电子邮件模板',
    description: '生成一封专业的电子邮件，当prompt 以 /email 开头时，使用该模板',
    template: `
请为我写一封发给{{recipient}}的电子邮件，主题是{{topic}}。
请使用{{tone}}的语气。
邮件应该包含：
- 开场白
- 主要内容
- 结束语
- 签名
- 我的名字：范文杰
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
];

// 创建服务器实例
const server = new Server(
  {
    name: 'SimplePromptServer',
    version: '1.0.0',
  },
  {
    capabilities: {
      prompts: {},
    },
    instructions: '这是一个MCP服务器示例，展示提示模板管理功能。',
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
    prompts: prompts.map(({ name, description }) => ({
      name,
      description: description || '',
    })),
  };
});

// 注册请求处理器 - 获取提示
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  if (!name) {
    throw new Error('缺少提示ID');
  }

  const prompt = promptTemplates.find((p) => p.name === name);
  if (!prompt) {
    throw new Error(`提示 ${name} 不存在`);
  }

  // server.sendLoggingMessage({
  //   level: 'info',
  //   message: ['找到prompt'],
  // });

  return {
    prompt,
  };
});

// 设置服务器事件处理器
server.oninitialized = () => {
  printLog('服务器已初始化');
};

// 创建并连接STDIO传输层
async function startServer(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    printLog('STDIO MCP 提示服务器已启动');
    printLog('支持的提示模板: email-template');

    process.on('SIGINT', async () => {
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    printLog('服务器启动失败:', error);
  }
}

startServer();
