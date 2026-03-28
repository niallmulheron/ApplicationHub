import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { parseJobDescription, scoreSkillMatch } from '../services/ai.js';
import type { Skill } from '../types/index.js';

export const aiRoutes = Router();
aiRoutes.use(authenticate);

// POST /api/ai/parse-jd
// Body: { text: string }
// Returns: parsed job description + skill match score (if user has a profile)
aiRoutes.post('/parse-jd', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      throw new AppError(400, 'Please provide the job description text (at least 20 characters).');
    }

    // 1. Parse the job description
    const parsed = await parseJobDescription(text.trim());

    // 2. Fetch the user's profile for skill matching
    const profileResult = await query(
      'SELECT skills, experience_summary FROM user_profiles WHERE user_id = $1',
      [userId],
    );

    let skillMatch = null;

    if (profileResult.rows.length > 0) {
      const profile = profileResult.rows[0];
      const skills: Skill[] = profile.skills || [];
      const experience: string = profile.experience_summary || '';

      // Only score if the user has at least one skill or some experience text
      if (skills.length > 0 || experience.length > 10) {
        skillMatch = await scoreSkillMatch(
          skills,
          experience,
          parsed.requirements,
          parsed.nice_to_haves,
        );
      }
    }

    res.json({
      parsed_jd: {
        requirements: parsed.requirements,
        nice_to_haves: parsed.nice_to_haves,
        responsibilities: parsed.responsibilities,
        raw_text: text.trim(),
      },
      extracted: {
        company_name: parsed.company_name,
        role_title: parsed.role_title,
        location: parsed.location,
        remote_type: parsed.remote_type,
        salary_min: parsed.salary_min,
        salary_max: parsed.salary_max,
      },
      skill_match: skillMatch,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/score-match
// Body: { application_id: string }
// Re-score an existing application against the user's current profile
aiRoutes.post('/score-match', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { application_id } = req.body;

    if (!application_id) {
      throw new AppError(400, 'application_id is required');
    }

    // Fetch the application's parsed JD
    const appResult = await query(
      'SELECT parsed_jd FROM applications WHERE id = $1 AND user_id = $2',
      [application_id, userId],
    );

    if (appResult.rows.length === 0) {
      throw new AppError(404, 'Application not found');
    }

    const parsedJd = appResult.rows[0].parsed_jd || {};
    const requirements: string[] = parsedJd.requirements || [];
    const niceToHaves: string[] = parsedJd.nice_to_haves || [];

    if (requirements.length === 0 && niceToHaves.length === 0) {
      throw new AppError(400, 'This application has no parsed requirements. Parse the job description first.');
    }

    // Fetch user profile
    const profileResult = await query(
      'SELECT skills, experience_summary FROM user_profiles WHERE user_id = $1',
      [userId],
    );

    if (profileResult.rows.length === 0) {
      throw new AppError(400, 'Please fill in your profile with skills before scoring.');
    }

    const profile = profileResult.rows[0];
    const skillMatch = await scoreSkillMatch(
      profile.skills || [],
      profile.experience_summary || '',
      requirements,
      niceToHaves,
    );

    // Update the application's skill_match_score
    await query(
      'UPDATE applications SET skill_match_score = $1 WHERE id = $2 AND user_id = $3',
      [skillMatch.score, application_id, userId],
    );

    // Store the full analysis as an AI output
    await query(
      `INSERT INTO ai_outputs (application_id, output_type, content, metadata)
       VALUES ($1, 'skill_match', $2, $3)`,
      [
        application_id,
        skillMatch.summary,
        JSON.stringify({
          score: skillMatch.score,
          matched_skills: skillMatch.matched_skills,
          missing_skills: skillMatch.missing_skills,
          partial_matches: skillMatch.partial_matches,
        }),
      ],
    );

    res.json(skillMatch);
  } catch (err) {
    next(err);
  }
});
