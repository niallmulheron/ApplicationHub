import Anthropic from '@anthropic-ai/sdk';
import type { Skill } from '../types/index.js';

// ─── Client ─────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedJD {
  company_name: string | null;
  role_title: string | null;
  requirements: string[];
  nice_to_haves: string[];
  responsibilities: string[];
  location: string | null;
  remote_type: 'onsite' | 'remote' | 'hybrid' | null;
  salary_min: number | null;
  salary_max: number | null;
}

export interface SkillMatchResult {
  score: number;                  // 0.00 – 1.00
  matched_skills: string[];       // skills the user has that match
  missing_skills: string[];       // required skills the user lacks
  partial_matches: string[];      // close but not exact matches
  summary: string;                // one-line human-readable explanation
}

// ─── Parse Job Description ──────────────────────────────────────────────────

export async function parseJobDescription(rawText: string): Promise<ParsedJD> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a job description parser. Extract structured data from the following job posting.

Return ONLY valid JSON with this exact schema (no markdown, no code fences):
{
  "company_name": "string or null",
  "role_title": "string or null",
  "requirements": ["required skills/qualifications as short phrases"],
  "nice_to_haves": ["preferred/bonus skills as short phrases"],
  "responsibilities": ["key responsibilities as short phrases"],
  "location": "string or null",
  "remote_type": "onsite" | "remote" | "hybrid" | null,
  "salary_min": number or null,
  "salary_max": number or null
}

Rules:
- requirements: hard requirements (must-have skills, years of experience, degrees)
- nice_to_haves: preferred/bonus qualifications
- responsibilities: what the person will actually do day-to-day
- Keep each array item to one concise phrase (not full sentences)
- salary should be annual figures as integers; if given monthly, convert to annual
- If a field cannot be determined from the text, use null or empty array

Job description:
${rawText}`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    // Strip any accidental markdown fences
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as ParsedJD;

    return {
      company_name: parsed.company_name ?? null,
      role_title: parsed.role_title ?? null,
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      nice_to_haves: Array.isArray(parsed.nice_to_haves) ? parsed.nice_to_haves : [],
      responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
      location: parsed.location ?? null,
      remote_type: parsed.remote_type ?? null,
      salary_min: parsed.salary_min ?? null,
      salary_max: parsed.salary_max ?? null,
    };
  } catch {
    throw new Error('Failed to parse AI response as JSON. The job description may be too short or unclear.');
  }
}

// ─── Skill Match Scoring ────────────────────────────────────────────────────

export async function scoreSkillMatch(
  userSkills: Skill[],
  userExperience: string,
  requirements: string[],
  niceToHaves: string[],
): Promise<SkillMatchResult> {
  if (requirements.length === 0 && niceToHaves.length === 0) {
    return {
      score: 0,
      matched_skills: [],
      missing_skills: [],
      partial_matches: [],
      summary: 'No requirements to match against.',
    };
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a skill-matching engine. Compare a candidate's profile against job requirements and produce a match score.

Return ONLY valid JSON with this exact schema (no markdown, no code fences):
{
  "score": 0.00 to 1.00,
  "matched_skills": ["skills the candidate clearly has that match requirements"],
  "missing_skills": ["required skills the candidate appears to lack"],
  "partial_matches": ["skills where there's a close but not exact match"],
  "summary": "one sentence explaining the match"
}

Scoring rules:
- 1.00 = meets all requirements and most nice-to-haves
- 0.75 = meets most requirements
- 0.50 = meets roughly half
- 0.25 = meets few requirements
- 0.00 = no relevant match
- Weight requirements ~3x more than nice-to-haves
- Consider skill levels: an "advanced" skill is a stronger match than "beginner"
- Consider experience summary for context — it may imply skills not listed explicitly

Candidate profile:
Skills: ${JSON.stringify(userSkills)}
Experience: ${userExperience || 'Not provided'}

Job requirements (must-have):
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Nice-to-haves:
${niceToHaves.map((n, i) => `${i + 1}. ${n}`).join('\n') || 'None listed'}`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleaned) as SkillMatchResult;

    return {
      score: Math.min(1, Math.max(0, Number(result.score) || 0)),
      matched_skills: Array.isArray(result.matched_skills) ? result.matched_skills : [],
      missing_skills: Array.isArray(result.missing_skills) ? result.missing_skills : [],
      partial_matches: Array.isArray(result.partial_matches) ? result.partial_matches : [],
      summary: result.summary || '',
    };
  } catch {
    throw new Error('Failed to parse skill match response.');
  }
}
