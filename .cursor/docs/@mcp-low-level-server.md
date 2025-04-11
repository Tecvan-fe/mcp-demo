# ModelContextProtocol SDK Guide for LLMs

> Package: @modelcontextprotocol/sdk  
> Version: 1.8.0

## 1. Basic Implementation Flow

1. **Create Server instance**
2. **Register request handlers**
3. **Register notification handlers**
4. **Connect to transport layer**
5. **Handle initialization (automatic)**

## 2. Quick Implementation Example

```typescript
import { Server } from '@modelcontextprotocol/sdk/server';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';
import { CreateMessageRequestSchema } from '@modelcontextprotocol/sdk/types';

// Create server
const server = new Server(
  {
    name: 'MyMCPServer',
    version: '1.0.0',
  },
  {
    capabilities: {
      sampling: {},
      resources: {},
      logging: {},
    },
  }
);

// Register request handler
server.setRequestHandler(CreateMessageRequestSchema, async (request) => {
  const { messages } = request.params;
  const result = await yourLLMImplementation(messages);
  return {
    message: {
      role: 'assistant',
      content: result,
    },
  };
});

// Set initialization callback
server.oninitialized = () => console.log('Server initialized');

// Connect to transport
async function startServer() {
  const transport = new SSEServerTransport({ port: 3000 });
  await server.connect(transport);
}

startServer().catch(console.error);
```

## 3. Server Initialization

```typescript
// Server creation
const server = new Server(
  // Server info
  {
    name: string,
    version: string
  },
  // Options
  {
    capabilities: {
      sampling?: {},
      resources?: {},
      logging?: {},
      prompts?: {},
      tools?: {},
      roots?: {},
      experimental?: {}
    },
    instructions?: string
  }
);

// Register capabilities later (before connecting)
server.registerCapabilities({
  newFeature: {}
});

// Event handlers
server.oninitialized = () => {};
server.onclose = () => {};
server.onerror = (error) => {};
```

## 4. Transport Layers

```typescript
// SSE Transport
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';
const sseTransport = new SSEServerTransport({
  port: 3000,
});

// STDIO Transport
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
const stdioTransport = new StdioServerTransport();

// Connect
await server.connect(transport);
```

## 5. Request Handling

Register handlers for client requests:

```typescript
// Register request handler
server.setRequestHandler(RequestSchema, async (request, extra) => {
  // Check if request was cancelled
  if (extra.signal.aborted) {
    throw new Error('Request cancelled');
  }

  // Process request
  const result = doSomething(request.params);

  // Return result
  return resultObject;
});
```

## 6. Notification Handling

```typescript
// Register notification handler
server.setNotificationHandler(NotificationSchema, async (notification) => {
  // Process notification
  handleNotification(notification.params);
});
```

## 7. Tool Definition with Zod

```typescript
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Define tool input schema
const CalculatorSchema = z.object({
  expression: z.string().describe('Math expression to evaluate'),
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'calculator',
        description: 'Perform calculation',
        inputSchema: zodToJsonSchema(CalculatorSchema),
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'calculator') {
    const args = CalculatorSchema.parse(request.params.arguments);
    const result = eval(args.expression);
    return {
      content: [
        {
          type: 'text',
          text: `Result: ${result}`,
        },
      ],
    };
  }
});
```

## 8. Sending Requests

```typescript
// Ping
const pingResult = await server.ping();

// Create message (LLM sampling)
const messageResult = await server.createMessage({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
  temperature: 0.7,
});

// List roots
const rootsResult = await server.listRoots();
```

## 9. Sending Notifications

```typescript
// Send logging message
await server.sendLoggingMessage({
  level: 'info',
  message: 'Server ready',
  timestamp: new Date().toISOString(),
});

// Send resource updated notification
await server.sendResourceUpdated({
  resourceId: 'resource1',
  resource: {
    /* resource data */
  },
});

// Other notifications
await server.sendResourceListChanged();
await server.sendToolListChanged();
await server.sendPromptListChanged();
```

## 10. Protocol Message Types

### 10.1 Request Types

| Category       | Type                         | Direction     | Method                   | Purpose                 |
| -------------- | ---------------------------- | ------------- | ------------------------ | ----------------------- |
| **Basic**      | PingRequest                  | Both          | ping                     | Check connection        |
|                | InitializeRequest            | Client→Server | initialize               | Initialize connection   |
| **Sampling**   | CreateMessageRequest         | Server→Client | sampling/createMessage   | Request LLM generation  |
|                | CompleteRequest              | Client→Server | complete                 | Request text completion |
| **Resources**  | ListResourcesRequest         | Client→Server | resources/list           | Get resource list       |
|                | ReadResourceRequest          | Client→Server | resources/read           | Read resource content   |
|                | ListResourceTemplatesRequest | Client→Server | resources/templates/list | Get resource templates  |
| **Tools**      | ListToolsRequest             | Client→Server | tools/list               | List available tools    |
|                | CallToolRequest              | Client→Server | tools/call               | Call a tool             |
| **Prompts**    | ListPromptsRequest           | Client→Server | prompts/list             | List prompts            |
|                | GetPromptRequest             | Client→Server | prompts/get              | Get prompt details      |
| **Filesystem** | ListRootsRequest             | Server→Client | roots/list               | Get accessible roots    |
| **Logging**    | SetLevelRequest              | Client→Server | logging/setLevel         | Set log level           |
| **Events**     | SubscribeRequest             | Client→Server | subscribe                | Subscribe to events     |
|                | UnsubscribeRequest           | Client→Server | unsubscribe              | Unsubscribe from events |

### 10.2 Notification Types

| Type                            | Direction     | Method                               | Purpose                  |
| ------------------------------- | ------------- | ------------------------------------ | ------------------------ |
| InitializedNotification         | Client→Server | initialized                          | Initialization completed |
| ResourceListChangedNotification | Server→Client | notifications/resources/list_changed | Resource list changed    |
| ResourceUpdatedNotification     | Server→Client | notifications/resources/updated      | Resource updated         |
| PromptListChangedNotification   | Server→Client | notifications/prompts/list_changed   | Prompt list changed      |
| ToolListChangedNotification     | Server→Client | notifications/tools/list_changed     | Tool list changed        |
| RootsListChangedNotification    | Client→Server | notifications/roots/list_changed     | Roots list changed       |
| CancelledNotification           | Both          | notifications/cancelled              | Cancel a request         |
| ProgressNotification            | Both          | notifications/progress               | Report progress          |
| LoggingMessageNotification      | Both          | notifications/message                | Log message              |

## 11. Common Patterns

1. **Request-Response**:

   - Send request with unique ID
   - Receive response with same ID
   - Use `_meta.progressToken` for progress updates

2. **Notifications**:

   - One-way messages
   - No response expected

3. **Error Handling**:

   - Use `McpError` with appropriate `ErrorCode`
   - Include descriptive message

4. **Cancellation**:
   - Check `extra.signal.aborted` in handlers
   - Send `notifications/cancelled` to cancel requests
