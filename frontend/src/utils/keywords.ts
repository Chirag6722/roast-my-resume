/**
 * Vocabulary used to pull real requirements out of a pasted job description.
 * Each entry is the label we display, plus the spellings that count as a match.
 */
const VOCAB: Array<{ label: string; aliases: string[] }> = [
  // Languages
  { label: 'Python', aliases: ['python'] },
  { label: 'TypeScript', aliases: ['typescript'] },
  { label: 'JavaScript', aliases: ['javascript'] },
  { label: 'Java', aliases: ['java'] },
  { label: 'C#', aliases: ['c#', 'csharp', '.net'] },
  { label: 'C++', aliases: ['c++'] },
  { label: 'Go', aliases: ['golang'] },
  { label: 'Rust', aliases: ['rust'] },
  { label: 'Ruby', aliases: ['ruby'] },
  { label: 'PHP', aliases: ['php'] },
  { label: 'Swift', aliases: ['swift'] },
  { label: 'Kotlin', aliases: ['kotlin'] },
  { label: 'Scala', aliases: ['scala'] },
  { label: 'SQL', aliases: ['sql'] },
  { label: 'HTML', aliases: ['html'] },
  { label: 'CSS', aliases: ['css'] },
  { label: 'Bash', aliases: ['bash', 'shell scripting'] },
  // Frameworks & libraries
  { label: 'React', aliases: ['react', 'react.js', 'reactjs'] },
  { label: 'Next.js', aliases: ['next.js', 'nextjs'] },
  { label: 'Vue', aliases: ['vue', 'vue.js', 'vuejs'] },
  { label: 'Angular', aliases: ['angular'] },
  { label: 'Node.js', aliases: ['node.js', 'nodejs', 'node'] },
  { label: 'Express', aliases: ['express', 'express.js'] },
  { label: 'FastAPI', aliases: ['fastapi'] },
  { label: 'Django', aliases: ['django'] },
  { label: 'Flask', aliases: ['flask'] },
  { label: 'Spring', aliases: ['spring', 'spring boot'] },
  { label: 'Rails', aliases: ['rails', 'ruby on rails'] },
  { label: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss'] },
  { label: 'GraphQL', aliases: ['graphql'] },
  { label: 'REST APIs', aliases: ['rest', 'rest api', 'rest apis', 'restful'] },
  { label: 'pandas', aliases: ['pandas'] },
  { label: 'NumPy', aliases: ['numpy'] },
  { label: 'PyTorch', aliases: ['pytorch'] },
  { label: 'TensorFlow', aliases: ['tensorflow'] },
  // Cloud & DevOps
  { label: 'AWS', aliases: ['aws', 'amazon web services'] },
  { label: 'GCP', aliases: ['gcp', 'google cloud'] },
  { label: 'Azure', aliases: ['azure'] },
  { label: 'Docker', aliases: ['docker'] },
  { label: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { label: 'Terraform', aliases: ['terraform'] },
  { label: 'CI/CD', aliases: ['ci/cd', 'cicd', 'continuous integration', 'continuous delivery'] },
  { label: 'GitHub Actions', aliases: ['github actions'] },
  { label: 'Jenkins', aliases: ['jenkins'] },
  { label: 'Linux', aliases: ['linux', 'unix'] },
  { label: 'Microservices', aliases: ['microservice', 'microservices'] },
  { label: 'Serverless', aliases: ['serverless', 'lambda'] },
  // Data & tools
  { label: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { label: 'MySQL', aliases: ['mysql'] },
  { label: 'MongoDB', aliases: ['mongodb', 'mongo'] },
  { label: 'Redis', aliases: ['redis'] },
  { label: 'Elasticsearch', aliases: ['elasticsearch'] },
  { label: 'Kafka', aliases: ['kafka'] },
  { label: 'Spark', aliases: ['spark'] },
  { label: 'Airflow', aliases: ['airflow'] },
  { label: 'Git', aliases: ['git'] },
  { label: 'Excel', aliases: ['excel'] },
  { label: 'Tableau', aliases: ['tableau'] },
  { label: 'Power BI', aliases: ['power bi', 'powerbi'] },
  { label: 'Jira', aliases: ['jira'] },
  { label: 'Figma', aliases: ['figma'] },
  // Practices
  { label: 'Agile', aliases: ['agile', 'scrum'] },
  { label: 'Unit Testing', aliases: ['unit test', 'unit testing', 'pytest', 'jest'] },
  { label: 'Machine Learning', aliases: ['machine learning'] },
  { label: 'Data Analysis', aliases: ['data analysis', 'data analytics'] },
  { label: 'System Design', aliases: ['system design', 'distributed systems'] },
  { label: 'Mentoring', aliases: ['mentor', 'mentoring', 'mentorship'] },
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whole-word search that still handles terms containing . # + /
 * The boundaries exclude letters, digits, + and # so that "sql" does not match
 * inside "postgresql" and "c" does not match inside "c++", while trailing
 * punctuation such as "PostgreSQL." or "Node.js" still counts.
 */
const mentions = (haystack: string, alias: string): boolean =>
  new RegExp(`(?<![a-z0-9+#])${escapeRegExp(alias)}(?![a-z0-9+#])`, 'i').test(haystack);

/** Requirements named in a job description, in the order the vocabulary lists them. */
export const extractRequirements = (jobText: string): string[] => {
  if (!jobText.trim()) return [];
  return VOCAB.filter(({ aliases }) => aliases.some(a => mentions(jobText, a))).map(v => v.label);
};

/** True when the resume's detected keywords cover this requirement. */
export const resumeHas = (requirement: string, detectedKeywords: string[]): boolean => {
  const entry = VOCAB.find(v => v.label === requirement);
  const aliases = entry ? entry.aliases : [requirement.toLowerCase()];
  const haystack = detectedKeywords.join(' , ');
  return aliases.some(a => mentions(haystack, a)) || mentions(haystack, requirement.toLowerCase());
};
