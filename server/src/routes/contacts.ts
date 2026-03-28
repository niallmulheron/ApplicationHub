import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export const contactRoutes = Router();
contactRoutes.use(authenticate);

// GET /api/contacts?company_id=...
contactRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { company_id } = req.query;

    let sql = `
      SELECT ct.*,
        c.name AS company_name,
        MAX(i.interaction_date) AS last_interaction
      FROM contacts ct
      JOIN companies c ON c.id = ct.company_id
      LEFT JOIN interactions i ON i.contact_id = ct.id
      WHERE c.user_id = $1
    `;
    const params: any[] = [req.user!.userId];

    if (company_id) {
      sql += ' AND ct.company_id = $2';
      params.push(company_id);
    }

    sql += ' GROUP BY ct.id, c.name ORDER BY ct.name ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/contacts
contactRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { company_id, name, role, email, linkedin_url, notes } = req.body;

    if (!company_id || !name) {
      throw new AppError(400, 'Company and contact name are required');
    }

    const result = await query(
      `INSERT INTO contacts (company_id, name, role, email, linkedin_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [company_id, name, role, email, linkedin_url, notes || ''],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/contacts/:id/interactions — log an interaction
contactRoutes.post('/:id/interactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { interaction_type, notes, interaction_date } = req.body;

    if (!interaction_type || !interaction_date) {
      throw new AppError(400, 'Interaction type and date are required');
    }

    const result = await query(
      `INSERT INTO interactions (contact_id, interaction_type, notes, interaction_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, interaction_type, notes || '', interaction_date],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/contacts/:id/interactions — interaction history
contactRoutes.get('/:id/interactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'SELECT * FROM interactions WHERE contact_id = $1 ORDER BY interaction_date DESC',
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});
