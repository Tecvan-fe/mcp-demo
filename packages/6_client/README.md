# MCP 客户端与服务器示例

这个包包含一个简单的 MCP (Model Context Protocol) 服务器示例，实现了一个加法计算工具。

## 功能

- 提供了一个可以计算两数相加的 MCP 服务器
- 包含完整的 E2E 测试

## 文件结构

- `server/` - MCP 服务器实现
  - `number.ts` - 提供数字加法运算的服务器
- `__tests__/` - 测试文件
  - `number.test.ts` - 服务器 E2E 测试

## 运行服务器

要启动 MCP 服务器，运行：

```bash
pnpm start:server
```

## 运行测试

运行单元测试：

```bash
pnpm test
```

运行测试并查看覆盖率：

```bash
pnpm test:coverage
```

监视模式下运行测试（开发中使用）：

```bash
pnpm test:watch
```

## 技术栈

- TypeScript
- MCP SDK (@modelcontextprotocol/sdk)
- Vitest (测试框架)
- Zod (类型验证)
