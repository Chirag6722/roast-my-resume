import { describe, expect, it } from 'vitest';
import { extractRequirements, resumeHas } from './keywords';

/**
 * The Job Match tab used to compare against ten hardcoded keywords, so it
 * reported gaps like "Redis" for postings that never mentioned Redis, and
 * editing the posting changed nothing.
 */
describe('extractRequirements', () => {
  const posting =
    'Backend Engineer. We need strong Python and SQL, experience with Docker and ' +
    'Kubernetes on AWS, building REST APIs with FastAPI, and PostgreSQL. React ' +
    'knowledge a plus. You will own services and report on latency metrics.';

  it('finds every technology the posting actually names', () => {
    const found = extractRequirements(posting);
    for (const expected of ['Python', 'SQL', 'React', 'FastAPI', 'REST APIs',
                            'AWS', 'Docker', 'Kubernetes', 'PostgreSQL']) {
      expect(found).toContain(expected);
    }
  });

  it('invents nothing the posting does not mention', () => {
    const found = extractRequirements(posting);
    for (const absent of ['Redis', 'CI/CD', 'Microservices', 'Java', 'Azure']) {
      expect(found).not.toContain(absent);
    }
  });

  it('matches a term followed by a full stop', () => {
    // "PostgreSQL." was missed while the boundary excluded trailing punctuation.
    expect(extractRequirements('We use PostgreSQL.')).toContain('PostgreSQL');
  });

  it('does not match SQL inside PostgreSQL', () => {
    expect(extractRequirements('We use PostgreSQL daily.')).not.toContain('SQL');
  });

  it('does not match Java inside JavaScript', () => {
    expect(extractRequirements('Strong JavaScript skills.')).not.toContain('Java');
  });

  it('does not read R&D as the R language', () => {
    expect(extractRequirements('Join our R&D team.')).not.toContain('R');
  });

  it('handles names containing dots, plus and hash', () => {
    expect(extractRequirements('Node.js required')).toContain('Node.js');
    expect(extractRequirements('C++ experience')).toContain('C++');
    expect(extractRequirements('C++ experience')).not.toContain('C#');
    expect(extractRequirements('Own our CI/CD pipelines')).toContain('CI/CD');
  });

  it('returns nothing for an empty or prose-only posting', () => {
    expect(extractRequirements('')).toHaveLength(0);
    expect(extractRequirements('   ')).toHaveLength(0);
    expect(extractRequirements('We want a passionate self-starter who loves people.')).toHaveLength(0);
  });
});

describe('resumeHas', () => {
  const detected = ['Git', 'HTML', 'Python'];

  it('matches a skill the resume lists', () => {
    expect(resumeHas('Python', detected)).toBe(true);
  });

  it('does not match a skill the resume lacks', () => {
    expect(resumeHas('Docker', detected)).toBe(false);
  });

  it('accepts an alias the candidate used', () => {
    expect(resumeHas('PostgreSQL', ['Postgres'])).toBe(true);
    expect(resumeHas('Kubernetes', ['k8s'])).toBe(true);
  });
});
