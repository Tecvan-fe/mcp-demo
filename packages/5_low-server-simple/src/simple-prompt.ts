// 导入所需的模块
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  Implementation,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const printLog = (...args: any[]) => {
  console.error(...args);
};

// 提示类型定义
interface PromptTemplate extends Prompt {
  id: string;
  name: string;
  description: string;
  template: string;
  templateParameters: {
    [key: string]: {
      description: string;
      required: boolean;
      defaultValue?: string;
    };
  };
}

// 定义提示参数schema
const EmailPromptParamsSchema = z.object({
  recipient: z.string().describe('收件人名称'),
  topic: z.string().describe('邮件主题'),
  tone: z.enum(['正式', '友好', '专业']).describe('邮件语气'),
});

const SummaryPromptParamsSchema = z.object({
  text: z.string().describe('需要总结的文本'),
  length: z.enum(['简短', '中等', '详细']).describe('总结长度'),
});

const CustomerServicePromptParamsSchema = z.object({
  issue: z.string().describe('客户问题'),
  product: z.string().describe('产品名称'),
  tone: z.enum(['礼貌', '同情', '专业']).describe('回复语气'),
});

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
    id: 'summary-template',
    name: '文本总结',
    description: '将长文本总结为简洁的要点',
    template: `
请将以下文本总结为{{length}}的要点列表：

{{text}}

总结要求：
- 保留关键信息
- 使用清晰的语言
- 按重要性排序
`,
    templateParameters: {
      text: {
        description: '需要总结的文本',
        required: true,
      },
      length: {
        description: '总结长度',
        required: true,
        defaultValue: '中等',
      },
    },
  },
  {
    id: 'customer-service',
    name: '客户服务回复',
    description: '生成针对客户问题的专业回复',
    template: `
请为以下客户问题生成一个{{tone}}的回复：

客户问题：{{issue}}
产品名称：{{product}}

回复应包含：
- 问候语
- 对问题的理解
- 解决方案
- 后续支持
- 结束语
`,
    templateParameters: {
      issue: {
        description: '客户问题',
        required: true,
      },
      product: {
        description: '产品名称',
        required: true,
      },
      tone: {
        description: '回复语气',
        required: false,
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
      // 声明服务器支持提示功能
      prompts: {},
    },
    instructions: '这是一个MCP服务器示例，展示提示模板管理功能。',
  }
);

// 注册请求处理器 - 提示列表
server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
  const { filter } = request.params || {};
  printLog('收到提示列表请求', filter ? `过滤条件: ${filter}` : '');

  let prompts = [...promptTemplates];

  // 如果有过滤条件，进行过滤
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
  printLog('收到获取提示请求:', promptId);

  if (!promptId) {
    throw new Error('缺少提示ID');
  }

  const prompt = promptTemplates.find((p) => p.id === promptId);
  if (!prompt) {
    throw new Error(`提示 ${promptId} 不存在`);
  }

  return {
    prompt,
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

    printLog('STDIO MCP 提示服务器已启动');
    printLog('支持的提示模板:');
    printLog('- 电子邮件模板 (email-template)');
    printLog('- 文本总结 (summary-template)');
    printLog('- 客户服务回复 (customer-service)');
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
