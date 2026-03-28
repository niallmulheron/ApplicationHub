import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export const profileRoutes = Router();
profileRoutes.use(authenticate);

// GET /api/profile
profileRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.name, u.created_at,
        p.skills, p.experience_summary, p.target_roles, p.location_prefs
      FROM users u
      JOIN user_profiles p ON p.user_id = u.id
      WHERE u.id = $1`,
      [req.user!.userId],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Profile not found');
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profile
profileRoutes.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, skills, experience_summary, target_roles, location_prefs } = req.body;

    // Update user name if provided
    if (name) {
      await query('UPDATE users SET name = $1 WHERE id = $2', [name, req.user!.userId]);
    }

    // Update profile fields
    const result = await query(
      `UPDATE user_profiles
       SET skills = COALESCE($1, skills),
           experience_summary = COALESCE($2, experience_summary),
           target_roles = COALESCE($3, target_roles),
           location_prefs = COALESCE($4, location_prefs)
       WHERE user_id = $5
       RETURNING *`,
      [
        skills ? JSON.stringify(skills) : null,
        experience_summary,
        target_roles ? JSON.stringify(target_roles) : null,
        location_prefs ? JSON.stringify(location_prefs) : null,
        req.user!.userId,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});
