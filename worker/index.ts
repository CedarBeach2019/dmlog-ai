/**
 * Cloudflare Worker entry point (Hono app).
 * Serves API routes.
 * @see docs/api/API-DESIGN.md
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from '../src/types.js';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import draftRoutes from './routes/drafts.js';
import sessionRoutes from './routes/sessions.js';
import providerRoutes from './routes/providers.js';
import preferenceRoutes from './routes/preferences.js';
import healthRoutes from './routes/health.js';
import metricsRoutes from './routes/metrics.js';
import configRoutes from './routes/config.js';
import dmlogRoutes from './routes/dmlog.js';
import { getThemeCSS } from './dmlog-config.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { requestLogger } from '../src/middleware/request-logger.js';

const ALLOWED_ORIGINS = [
  /^https?:\/\/.*\.magnus-digennaro\.workers\.dev$/,
  /^https?:\/\/.*\.log\.ai$/,
  /^http?:\/\/localhost(:\d+)?$/,
];

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', requestLogger);
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => (ALLOWED_ORIGINS.some(r => r.test(origin)) ? origin : undefined),
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-LogOrigin-Mode'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

// Rate limiting
app.use('*', rateLimitMiddleware);

// Public routes
app.route('/v1/auth', authRoutes);
app.route('/v1/health', healthRoutes);

// Protected routes
const protectedApi = new Hono<{ Bindings: Env; Variables: Variables }>();
protectedApi.use('*', authMiddleware);
protectedApi.route('/chat', chatRoutes);
protectedApi.route('/drafts', draftRoutes);
protectedApi.route('/sessions', sessionRoutes);
protectedApi.route('/providers', providerRoutes);
protectedApi.route('/preferences', preferenceRoutes);
protectedApi.route('/metrics', metricsRoutes);
protectedApi.route('/config', configRoutes);
protectedApi.route('/dmlog', dmlogRoutes);
app.route('/v1', protectedApi);

app.get('/', (c) => c.json({ name: c.env.THEME === 'dmlog' ? 'dmlog-ai' : 'log-origin', version: '0.1.0' }));

// Serve custom theme CSS for DMlog
app.get('/theme.css', async (c) => {
  if (c.env.THEME !== 'dmlog') return c.notFound();
  const css = await getThemeCSS(c.env);
  if (!css) return c.notFound();
  return new Response(css, {
    headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
});

export default app;
