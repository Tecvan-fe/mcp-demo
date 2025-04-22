# MCP 服务器示例

这个项目展示了如何使用 MCP (Model Context Protocol) SDK 创建服务器，支持工具调用、资源管理和提示模板功能。

## 可用示例

### 1. 工具调用服务器 (simple-tools.ts)

展示了如何创建一个支持工具调用能力的 MCP 服务器。提供了以下示例工具：

- 天气查询：获取指定城市的天气信息

### 2. 资源管理服务器 (simple-resource.ts)

展示了如何创建一个支持资源管理能力的 MCP 服务器。支持以下功能：

- 支持虚拟文件系统
- 支持多级目录结构
- 支持列出根目录
- 支持读取资源内容
- 支持列出目录内容
- 支持创建、更新和删除资源

### 3. 提示模板服务器 (simple-prompt.ts)

展示了如何创建一个支持提示模板能力的 MCP 服务器。提供以下示例提示模板：

- 电子邮件模板：生成一封专业的电子邮件
- 文本总结：将长文本总结为简洁的要点
- 客户服务回复：生成针对客户问题的专业回复

## 高级提示+采样服务

结合了提示模板和LLM采样功能的服务器示例，它能够：

1. 提供多种提示模板供选择：

   - 电子邮件模板：生成专业电子邮件
   - 代码审查模板：生成代码审查反馈
   - 自定义提示模板：根据场景和目标生成个性化提示

2. 通过内部LLM采样来增强提示模板：
   - 为提示模板生成更详细的使用说明
   - 根据用户输入生成个性化回复

### 启动高级服务器

```bash
node start.js advanced
```

### 使用示例

#### 获取提示模板列表

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "prompts/list"
}
```

#### 获取特定提示模板（会通过LLM增强）

```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "prompts/get",
  "params": {
    "promptId": "email-template"
  }
}
```

#### 直接向LLM发送请求

```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "sampling/createMessage",
  "params": {
    "model": "gpt-4",
    "messages": [{ "role": "user", "content": "为我生成一个写技术博客的提示模板" }]
  }
}
```

## 高级提示+真实LLM集成服务

这个版本的服务器展示了如何将MCP提示服务与真实的LLM采样服务集成：

1. 对外提供与前一个示例相同的提示模板功能：

   - 电子邮件模板
   - 代码审查模板
   - 自定义提示模板

2. 关键区别：

   - 使用真实的外部LLM服务而非模拟响应
   - 演示了如何通过MCP协议进行服务间通信
   - 提供了LLM服务集成的架构参考

3. 实现特点：
   - 提示增强：获取模板时自动调用LLM服务获取更详细的使用说明
   - 请求增强：根据请求内容类型自动优化提示
   - 错误处理：优雅处理连接失败和无效响应的情况

### 启动真实LLM集成服务器

```bash
node start.js real
```

### 真实集成需要

本示例仅提供架构参考，实际使用时需要：

1. 实现外部LLM连接机制（通过MCP客户端或API）
2. 配置适当的凭证和访问控制
3. 处理流式响应和更复杂的交互

## 安装与运行

### 安装依赖

```bash
npm install
```

### 构建项目

```bash
npm run build
```

### 运行工具调用服务器

```bash
npm start
# 或使用开发模式
npm run dev
```

### 运行资源管理服务器

```bash
npm run start:resource
# 或使用开发模式
npm run dev:resource
```

### 运行提示模板服务器

```bash
npm run start:prompt
# 或使用开发模式
npm run dev:prompt
```

## 服务器能力

### 工具调用服务器

- 支持获取可用工具列表
- 支持调用指定工具并获取结果

### 资源管理服务器

- 支持列出根目录
- 支持读取资源内容
- 支持列出目录内容
- 支持创建文件和目录
- 支持更新资源名称和内容
- 支持删除资源

### 提示模板服务器

- 支持获取可用提示模板列表
- 支持根据ID获取特定提示模板的详细信息
- 每个提示模板包含模板文本和参数定义

## 传输层

所有示例都使用 STDIO 传输层，通过标准输入/输出进行通信，适合与命令行工具或其他程序集成。

## 使用方式

这些示例服务器可以与支持 MCP 协议的客户端进行交互，例如与大型语言模型工具一起使用，以提供工具调用、资源管理或提示模板功能。

## 项目结构

```
src/
  ├── index.ts           # 工具调用服务器示例
  └── simple-resource.ts # 资源管理服务器示例
```

## 安装

```bash
# 安装依赖
npm install
```

## 构建和运行

```bash
# 构建项目（生产环境使用）
npm run build

# 启动默认服务器（工具调用示例）
npm start

# 启动资源管理服务器
node dist/simple-resource.js

# 开发模式启动（使用tsx直接运行TypeScript代码，无需编译）
# 默认示例
npm run dev
# 或资源示例
npx tsx src/simple-resource.ts

# 清理构建产物
npm run clean
```

## 资源管理服务器

### 功能特点

- 提供虚拟文件系统，支持文件和目录的浏览
- 实现文件内容读取功能
- 支持多层目录结构

### 支持的请求

1. **获取根目录列表**

   - 调用 `resources/listRoots` 方法获取可用根目录

2. **读取资源内容**

   - 使用 `resources/read` 方法读取文件内容
   - 需指定资源ID

3. **列出目录内容**
   - 使用 `resources/list` 方法列出目录中的文件和子目录
   - 需指定目录ID

### 可用资源

- **根目录**:

  - `root-docs`: 文档目录
  - `root-code`: 代码示例目录

- **文档目录**包含Markdown文件
- **代码目录**包含JavaScript示例和工具子目录

## HTTP版本MCP服务器

这个实现基于Express框架，提供HTTP和JSON-RPC接口，允许通过网络访问MCP服务。

### 特点

- 支持标准MCP JSON-RPC接口
- 提供RESTful API简化调用
- 包含HTML界面和API文档
- 提供与原始MCP相同的功能，但使用HTTP而非STDIO

### 启动Express服务器

```bash
# 使用node直接启动
npm run start:express

# 或使用tsx在开发模式启动（支持热重载）
npm run dev:express
```

启动后，服务器将在 http://localhost:3000 上运行。

### 可用API端点

- `GET /` - HTML文档页面
- `GET /health` - 健康检查
- `POST /api/jsonrpc` - 标准MCP JSON-RPC接口
- `GET /api/prompts` - 获取所有提示模板
- `GET /api/prompts/:id` - 获取特定提示模板
- `POST /api/generate` - 直接生成内容

### 使用测试客户端

提供了一个简单的命令行测试客户端，用于演示如何调用HTTP版MCP服务器：

```bash
# 查看帮助
node src/express-test-client.js help

# 获取提示模板列表
node src/express-test-client.js list

# 获取特定模板详情
node src/express-test-client.js get email-template

# 生成内容
node src/express-test-client.js generate "写一首关于AI的诗"

# 生成电子邮件
node src/express-test-client.js email "张总" "项目进展汇报"
```
