import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

export const analyticsRoutes = Router();
analyticsRoutes.use(authenticate);

// GET /api/analytics/overview — summary stats
analyticsRoutes.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const [rates, funnel, resumePerf] = await Promise.all([
      query('SELECT * FROM v_response_rates WHERE user_id = $1', [userId]),
      query('SELECT * FROM v_pipeline_funnel WHERE user_id = $1', [userId]),
      query('SELECT * FROM v_resume_performance WHERE user_id = $1', [userId]),
    ]);

    res.json({
      response_rates: rates.rows[0] || null,
      pipeline_funnel: funnel.rows,
      resume_performance: resumePerf.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/response-times — days to first response
analyticsRoutes.get('/response-times', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'SELECT * FROM v_days_to_response WHERE user_id = $1 ORDER BY date_applied DESC',
      [req.user!.userId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/activity — application volume over time
analyticsRoutes.get('/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period = 'week' } = req.query;
    const trunc = period === 'month' ? 'month' : 'week';

    const result = await query(
      `SELECT
        DATE_TRUNC($1, date_applied) AS period_start,
        COUNT(*) AS applications
      FROM applications
      WHERE user_id = $2 AND date_applied IS NOT NULL
      GROUP BY period_start
      ORDER BY period_start DESC
      LIMIT 26`,
      [trunc, req.user!.userId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/follow-ups — contacts needing follow-up
analyticsRoutes.get('/follow-ups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT
        ct.id AS contact_id,
        ct.name AS contact_name,
        ct.role AS contact_role,
        c.name AS company_name,
        MAX(i.interaction_date) AS last_interaction,
        NOW()::date - MAX(i.interaction_date) AS days_since_contact
      FROM contacts ct
      JOIN companies c ON c.id = ct.company_id
      LEFT JOIN interactions i ON i.contact_id = ct.id
      WHERE c.user_id = $1
      GROUP BY ct.id, ct.name, ct.role, c.name
      HAVING MAX(i.interaction_date) < NOW()::date - INTERVAL '14 days'
         OR MAX(i.interaction_date) IS NULL
      ORDER BY last_interaction ASC NULLS FIRST`,
      [req.user!.userId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});
