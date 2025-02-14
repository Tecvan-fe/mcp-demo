import { createMcp } from './create-mcp';
import express from 'express';
import morgan from 'morgan';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

const main = async (port: number) => {
  const mcp = await createMcp();
  const app = express();
  app.use(morgan('dev'));

  let transport: SSEServerTransport;
  app.get('/sse', async (req, res) => {
    transport = new SSEServerTransport('/messages', res);
    await mcp.connect(transport);
  });

  app.post('/messages', async (req, res) => {
    console.log('New message: ' + req.query.sessionId);

    await transport.handlePostMessage(req, res);
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

main(Number(process.env.PORT) || 3003);
