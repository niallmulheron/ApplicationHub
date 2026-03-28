import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export const companyRoutes = Router();
companyRoutes.use(authenticate);

// GET /api/companies
companyRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT c.*,
        COUNT(a.id)::int AS application_count
      FROM companies c
      LEFT JOIN applications a ON a.company_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.name ASC`,
      [req.user!.userId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/companies
companyRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, industry, size, website, notes } = req.body;

    if (!name) {
      throw new AppError(400, 'Company name is required');
    }

    const result = await query(
      `INSERT INTO companies (user_id, name, industry, size, website, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user!.userId, name, industry, size, website, notes || ''],
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    // Handle unique constraint violation
    if (err.code === '23505') {
      return next(new AppError(409, `You already have a company named "${req.body.name}"`));
    }
    next(err);
  }
});

// PATCH /api/companies/:id
companyRoutes.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, industry, size, website, notes } = req.body;

    const result = await query(
      `UPDATE companies
       SET name = COALESCE($1, name),
           industry = COALESCE($2, industry),
           size = COALESCE($3, size),
           website = COALESCE($4, website),
           notes = COALESCE($5, notes)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, industry, size, website, notes, req.params.id, req.user!.userId],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Company not found');
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/companies/:id
companyRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'DELETE FROM companies WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user!.userId],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Company not found');
    }

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});
