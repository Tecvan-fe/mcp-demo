import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import express from 'express';
import morgan from 'morgan';

const main = async () => {
  // Create an MCP server
  const server = new McpServer({
    name: 'Demo',
    version: '1.0.0',
  });

  // Add an addition tool
  server.tool('add', { a: z.number(), b: z.number() }, async ({ a, b }) => ({
    content: [{ type: 'text', text: String(a + b) }],
  }));

  // Create Express application
  const app = express();
  app.use(morgan('tiny'));

  // Store transports for each connection
  let transport: SSEServerTransport;

  // SSE endpoint
  app.get('/sse', async (req, res) => {
    // Create a unique ID for each connection
    console.log('New connection');

    transport = new SSEServerTransport('/messages', res);
    await server.connect(transport);
  });

  // Message processing endpoint
  app.post('/messages', async (req, res) => {
    console.log('New message: ' + req.query.sessionId);

    await transport.handlePostMessage(req, res);
  });

  // Start the server
  const port = process.env.PORT || 3003;
  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
};

main().catch(console.error);
