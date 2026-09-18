import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Populate process.env for API handlers running within Vite dev server
  for (const [key, value] of Object.entries(env)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [
      react(),
      {
        name: 'dev-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url?.split('?')[0];
            if (url === '/api/listing-media') {
              try {
                const mod = await server.ssrLoadModule('./api/listing-media.ts');
                await mod.default(req, res);
              } catch (error) {
                console.error('Error executing /api/listing-media:', error);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' }));
                }
              }
              return;
            }

            if (url === '/api/chat-media') {
              try {
                const mod = await server.ssrLoadModule('./api/chat-media.ts');
                await mod.default(req, res);
              } catch (error) {
                console.error('Error executing /api/chat-media:', error);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' }));
                }
              }
              return;
            }

            if (url === '/api/ai-chat') {
              try {
                const mod = await server.ssrLoadModule('./api/ai-chat.ts');
                await mod.default(req, res);
              } catch (error) {
                console.error('Error executing /api/ai-chat:', error);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' }));
                }
              }
              return;
            }

            if (url === '/api/profile-avatar') {
              try {
                const mod = await server.ssrLoadModule('./api/profile-avatar.ts');
                await mod.default(req, res);
              } catch (error) {
                console.error('Error executing /api/profile-avatar:', error);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' }));
                }
              }
              return;
            }

            next();
          });
        },
      },
    ],
  };
});
