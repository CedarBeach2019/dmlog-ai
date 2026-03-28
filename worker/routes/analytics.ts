/**
 * Route analytics — show routing stats and optimization opportunities.
 * This is the "brain" dashboard that makes LOG.ai's moat visible.
 */
import { Hono } from 'hono';
import type { Env, Variables } from '../../src/types.js';

const analyticsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /v1/analytics/routes — routing statistics
analyticsRoutes.get('/routes', async (c) => {
  const userId = c.get('userId');

  // Route distribution: how many interactions per route action
  const { results: routeStats } = await c.env.DB.prepare(
    `SELECT route_action, COUNT(*) as count, 
            AVG(response_latency_ms) as avg_latency_ms,
            SUM(CASE WHEN feedback = 'up' THEN 1 ELSE 0 END) as thumbs_up,
            SUM(CASE WHEN feedback = 'down' THEN 1 ELSE 0 END) as thumbs_down
     FROM interactions WHERE user_id = ? GROUP BY route_action ORDER BY count DESC`,
  ).bind(userId).all<{
    route_action: string; count: number; avg_latency_ms: number; thumbs_up: number; thumbs_down: number;
  }>();

  // Model performance: per-model stats
  const { results: modelStats } = await c.env.DB.prepare(
    `SELECT target_model, COUNT(*) as count,
            AVG(response_latency_ms) as avg_latency_ms,
            SUM(CASE WHEN feedback = 'up' THEN 1 ELSE 0 END) as thumbs_up,
            SUM(CASE WHEN feedback = 'down' THEN 1 ELSE 0 END) as thumbs_down
     FROM interactions WHERE user_id = ? GROUP BY target_model ORDER BY count DESC`,
  ).bind(userId).all<{
    target_model: string; count: number; avg_latency_ms: number; thumbs_up: number; thumbs_down: number;
  }>();

  // Draft comparison results (winner tracking)
  const { results: draftWins } = await c.env.DB.prepare(
    `SELECT json_extract(response, '$.profile') as profile, COUNT(*) as wins
     FROM interactions WHERE user_id = ? AND route_action = 'compare' AND feedback = 'up'
     GROUP BY profile ORDER BY wins DESC`,
  ).bind(userId).all<{ profile: string; wins: number }>();

  // Daily activity (last 30 days)
  const { results: dailyActivity } = await c.env.DB.prepare(
    `SELECT date(created_at) as day, COUNT(*) as messages
     FROM interactions WHERE user_id = ? AND created_at > datetime('now', '-30 days')
     GROUP BY day ORDER BY day DESC LIMIT 30`,
  ).bind(userId).all<{ day: string; messages: number }>();

  // Recent feedback
  const { results: recentFeedback } = await c.env.DB.prepare(
    `SELECT route_action, target_model, feedback, created_at
     FROM interactions WHERE user_id = ? AND feedback IS NOT NULL
     ORDER BY created_at DESC LIMIT 20`,
  ).bind(userId).all<{
    route_action: string; target_model: string; feedback: string; created_at: string;
  }>();

  return c.json({
    routes: (routeStats || []).map(r => ({
      action: r.route_action,
      count: r.count,
      avgLatencyMs: Math.round(r.avg_latency_ms || 0),
      thumbsUp: r.thumbs_up || 0,
      thumbsDown: r.thumbs_down || 0,
      satisfaction: r.count > 0 ? Math.round((r.thumbs_up / r.count) * 100) : 0,
    })),
    models: (modelStats || []).map(m => ({
      model: m.target_model,
      count: m.count,
      avgLatencyMs: Math.round(m.avg_latency_ms || 0),
      thumbsUp: m.thumbs_up || 0,
      thumbsDown: m.thumbs_down || 0,
      satisfaction: m.count > 0 ? Math.round((m.thumbs_up / m.count) * 100) : 0,
    })),
    draftWins: (draftWins || []).map(d => ({
      profile: (d.profile || '').replace(/"/g, ''),
      wins: d.wins,
    })),
    dailyActivity: (dailyActivity || []).map(d => ({
      day: d.day,
      messages: d.messages,
    })),
    recentFeedback: (recentFeedback || []).map(f => ({
      action: f.route_action,
      model: f.target_model,
      feedback: f.feedback,
      time: f.created_at,
    })),
  });
});

// GET /v1/analytics/summary — quick stats for dashboard
analyticsRoutes.get('/summary', async (c) => {
  const userId = c.get('userId');

  const totals = await c.env.DB.prepare(
    `SELECT 
       COUNT(*) as total_interactions,
       COUNT(CASE WHEN feedback = 'up' THEN 1 END) as total_up,
       COUNT(CASE WHEN feedback = 'down' THEN 1 END) as total_down,
       COUNT(DISTINCT session_id) as total_sessions,
       AVG(response_latency_ms) as avg_latency_ms,
       MIN(created_at) as first_interaction,
       MAX(created_at) as last_interaction
     FROM interactions WHERE user_id = ?`,
  ).bind(userId).first<{
    total_interactions: number; total_up: number; total_down: number; total_sessions: number;
    avg_latency_ms: number; first_interaction: string; last_interaction: string;
  }>();

  const npcCount = await c.env.DB.prepare(
    'SELECT COUNT(DISTINCT entity_id) as count FROM pii_entities WHERE user_id = ? AND entity_type = \'person\'',
  ).bind(userId).first<{ count: number }>();

  return c.json({
    interactions: totals?.total_interactions || 0,
    sessions: totals?.total_sessions || 0,
    thumbsUp: totals?.total_up || 0,
    thumbsDown: totals?.total_down || 0,
    satisfaction: (totals?.total_interactions || 0) > 0
      ? Math.round(((totals?.total_up || 0) / totals!.total_interactions) * 100)
      : 0,
    avgLatencyMs: Math.round(totals?.avg_latency_ms || 0),
    npcsDiscovered: npcCount?.count || 0,
    firstInteraction: totals?.first_interaction || null,
    lastInteraction: totals?.last_interaction || null,
  });
});

export default analyticsRoutes;
