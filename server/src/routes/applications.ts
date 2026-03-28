import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export const applicationRoutes = Router();

// All application routes require auth
applicationRoutes.use(authenticate);

// GET /api/applications — list all applications for the user
applicationRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { status, search, sort = 'date_applied', order = 'desc' } = req.query;

    let sql = `
      SELECT
        a.*,
        c.name AS company_name,
        c.industry AS company_industry,
        rv.label AS resume_label
      FROM applications a
      JOIN companies c ON c.id = a.company_id
      LEFT JOIN resume_versions rv ON rv.id = a.resume_version_id
      WHERE a.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (a.role_title ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Whitelist sortable columns
    const sortableColumns: Record<string, string> = {
      date_applied: 'a.date_applied',
      created_at: 'a.created_at',
      company: 'c.name',
      role: 'a.role_title',
      status: 'a.status',
      skill_match: 'a.skill_match_score',
    };

    const sortCol = sortableColumns[sort as string] || 'a.date_applied';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortCol} ${sortOrder} NULLS LAST`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/applications/:id — single application with full details
applicationRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      `SELECT
        a.*,
        c.name AS company_name,
        c.industry AS company_industry,
        c.size AS company_size,
        c.website AS company_website,
        rv.label AS resume_label
      FROM applications a
      JOIN companies c ON c.id = a.company_id
      LEFT JOIN resume_versions rv ON rv.id = a.resume_version_id
      WHERE a.id = $1 AND a.user_id = $2`,
      [req.params.id, userId],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Application not found');
    }

    // Fetch related data in parallel
    const [statusHistory, documents, aiOutputs] = await Promise.all([
      query(
        'SELECT * FROM status_history WHERE application_id = $1 ORDER BY changed_at DESC',
        [req.params.id],
      ),
      query(
        'SELECT * FROM documents WHERE application_id = $1 ORDER BY uploaded_at DESC',
        [req.params.id],
      ),
      query(
        'SELECT * FROM ai_outputs WHERE application_id = $1 ORDER BY created_at DESC',
        [req.params.id],
      ),
    ]);

    res.json({
      ...result.rows[0],
      status_history: statusHistory.rows,
      documents: documents.rows,
      ai_outputs: aiOutputs.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/applications — create a new application
applicationRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const {
      company_id,
      role_title,
      url,
      status = 'bookmarked',
      date_applied,
      salary_min,
      salary_max,
      location,
      remote_type,
      resume_version_id,
      notes,
      parsed_jd,
      skill_match_score,
    } = req.body;

    if (!company_id || !role_title) {
      throw new AppError(400, 'Company and role title are required');
    }

    const result = await query(
      `INSERT INTO applications (
        user_id, company_id, role_title, url, status, date_applied,
        salary_min, salary_max, location, remote_type,
        resume_version_id, notes, parsed_jd, skill_match_score
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        userId, company_id, role_title, url, status, date_applied,
        salary_min, salary_max, location, remote_type,
        resume_version_id, notes || '', parsed_jd || '{}', skill_match_score,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/applications/:id — update an application (including status changes)
applicationRoutes.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const fields = req.body;

    // Build dynamic SET clause from provided fields
    const allowedFields = [
      'role_title', 'url', 'status', 'date_applied',
      'salary_min', 'salary_max', 'location', 'remote_type',
      'resume_version_id', 'notes', 'parsed_jd', 'skill_match_score',
      'company_id',
    ];

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(fields[field]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      throw new AppError(400, 'No valid fields to update');
    }

    values.push(req.params.id, userId);

    const result = await query(
      `UPDATE applications
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Application not found');
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/applications/:id
applicationRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      'DELETE FROM applications WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, userId],
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Application not found');
    }

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});
