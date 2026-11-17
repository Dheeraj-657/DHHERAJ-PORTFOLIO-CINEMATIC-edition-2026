// ─────────────────────────────────────────────────────────────────────────────
// ALL PORTFOLIO CONTENT LIVES HERE. Edit this file; no component needs to change.
//
// Sources: Dheeraj's resume (public/Dheeraj_Ratakonda_Resume.pdf) and the actual
// contents of each GitHub repository as inspected on 2026-11-16.
// Rules kept while writing it:
//   • nothing is invented: unknown dates are `null` and render as "Date to be added"
//   • a link that is `null` is not rendered at all (no dead "#" buttons)
//   • skill `level` separates hands-on use from familiarity; adjust freely
// ─────────────────────────────────────────────────────────────────────────────

export type Level = 'practical' | 'familiar';

export interface Skill {
  name: string;
  level: Level;
}

export interface Project {
  id: string;
  title: string;
  category: string;
  /** one or two sentences shown on the card */
  summary: string;
  problem: string | null;
  solution: string | null;
  features: string[];
  stack: string[];
  /** artwork motif rendered by ProjectArt.tsx */
  art: 'graph' | 'wireframe' | 'digest' | 'keys' | 'links' | 'blueprint' | 'ledger' | 'memory';
  repo: string | null;
  demo: string | null;
  /** extra resource, e.g. a design document inside the repo */
  doc?: { label: string; url: string };
  year: string | null;
  status: string;
  /** honest note shown in the detail view when the public repo doesn't show the full story */
  note?: string;
}

export interface Milestone {
  id: string;
  /** null = date not supplied yet */
  date: string | null;
  kind: 'education' | 'certification' | 'project' | 'experience' | 'future';
  title: string;
  subtitle: string;
  body: string;
}

export interface Domain {
  id: string;
  name: string;
  short: string;
  description: string;
  skills: Skill[];
  projects: string[]; // project ids
}

export const profile = {
  firstName: 'Dheeraj',
  lastName: 'Ratakonda',
  roles: ['AI Engineer', 'Full-Stack Developer', 'Cloud & Software Engineering'],
  statement: 'I build intelligent systems.',
  availability: 'Open to internships, graduate roles and collaborations in AI engineering and full-stack development.',
  summary:
    'AI/ML undergraduate with hands-on experience building AI-powered applications, RAG pipelines, LLM-based systems and backend services, working mostly in Python and TypeScript with LangChain, LLM APIs and REST services. I care about practical problem solving and systems that scale.',
  location: 'Phagwara, Punjab, India',
  email: 'ratakondadheeraj@gmail.com',
  links: {
    github: 'https://github.com/Dheeraj-657',
    linkedin: 'https://www.linkedin.com/in/dheeraj-ratakonda-990691274/',
    bytexl: 'https://app.bytexl.ai/@ratakondadheeraj',
  },
  resume: '/Dheeraj_Ratakonda_Resume.pdf',
  education: {
    degree: 'B.Tech, Computer Science & Engineering',
    specialisation: 'General AI',
    school: 'Lovely Professional University',
    place: 'Phagwara, Punjab',
    graduation: 'Expected 2028',
    cgpa: '8.22 / 10',
    coursework: ['Data Structures & Algorithms', 'Operating Systems', 'DBMS', 'Computer Networks'],
    practice: '80+ problems on the Striver DSA sheet, 12+ on LeetCode',
  },
  certifications: [
    { code: 'AZ-900', name: 'Microsoft Azure Fundamentals', issuer: 'Microsoft' },
    { code: 'AI-900', name: 'Microsoft Azure AI Fundamentals', issuer: 'Microsoft' },
    { code: 'AI-102', name: 'Microsoft Azure AI Engineer Associate', issuer: 'Microsoft' },
    { code: 'DP-900', name: 'Microsoft Azure Data Fundamentals', issuer: 'Microsoft' },
    { code: 'OCI', name: 'Oracle Cloud AI / Data Fundamentals', issuer: 'Oracle' },
    { code: 'GCP', name: 'Google Cloud Foundations', issuer: 'Google Cloud' },
  ],
  experience: [
    {
      role: 'Open Source Contributor',
      where: 'Multiple public repositories',
      period: '2024 – Present',
      body: '22+ merged pull requests covering backend features, bug fixes and CI improvements.',
    },
  ],
  interests: [
    'Artificial Intelligence',
    'Generative AI',
    'Machine Learning',
    'Full-Stack Engineering',
    'Cloud Computing',
    'Software Architecture',
    'Intelligent Applications',
  ],
  // Written as a starting point. Rewrite in your own words.
  philosophy: [
    {
      title: 'Start from the problem',
      body: 'A model, a framework or a cloud service is only worth adding when it moves the real problem forward.',
    },
    {
      title: 'Make the output dependable',
      body: 'LLMs are probabilistic. Structured outputs, validation and clear contracts are what turn them into software.',
    },
    {
      title: 'Learn by shipping',
      body: 'Certifications give the map; projects are where the map meets the terrain. I keep doing both.',
    },
  ],
};

export const stats = [
  { value: '8.22', label: 'CGPA / 10' },
  { value: '6', label: 'Cloud & AI certifications' },
  { value: '22+', label: 'Merged open-source PRs' },
  { value: '2028', label: 'Expected graduation' },
];

// ─── PROJECTS ────────────────────────────────────────────────────────────────
// Not listed on purpose: github.com/Dheeraj-657/pro-azure-sql-based-to-do — its
// README credits another author and the commits are by other accounts. Add it back
// here only if the work is yours.
export const projects: Project[] = [
  {
    id: 'trustgraph',
    title: 'TrustGraph / Sentinel',
    category: 'AI Security · Threat Intelligence',
    summary:
      'An integrated digital-risk-protection platform: AI threat intelligence, risk analysis, entity discovery, evidence management and an AI security analyst.',
    problem:
      'Brand and digital-risk signals are scattered across many sources, so analysts spend their time collecting evidence instead of judging it.',
    solution:
      'One platform that discovers digital entities, stores evidence, scores risk with an AI engine and lets an AI analyst reason over the resulting threat graph.',
    features: [
      'Brand Intelligence & Control module',
      'AI Risk Engine and AI Analyst',
      'Entity & Evidence API',
      'Threat-graph analysis',
      'Dashboard with an AI Security Analyst',
    ],
    stack: ['Python', 'FastAPI', 'SQLite', 'React', 'LLM integrations'],
    art: 'graph',
    repo: null, // add the repository URL when it is public
    demo: null,
    year: null,
    status: 'In development',
  },
  {
    id: 'visualizer',
    title: 'AI-Enhanced 3D Product Visualizer',
    category: 'AI · MERN · 3D Web',
    summary:
      'A full-stack app for inspecting products in interactive 3D, with AI-generated product descriptions and smart Buy Now redirection.',
    problem: 'Flat product photos make it hard to judge a product before buying it.',
    solution:
      'Load GLB/GLTF models into an interactive Three.js viewer, generate the product description with AI, and route the buyer to the right store.',
    features: [
      'GLB / GLTF product visualisation',
      'Interactive 3D inspection (orbit, zoom)',
      'AI-generated product descriptions',
      'Smart Buy Now redirection',
    ],
    stack: ['MongoDB', 'Express', 'React', 'Node.js', 'Three.js', 'AI integration'],
    art: 'wireframe',
    repo: null, // add the repository URL when it is public
    demo: null,
    year: null,
    status: 'Completed',
  },
  {
    id: 'summarizer',
    title: 'AI Article Summarizer',
    category: 'Generative AI · NLP',
    summary:
      'Paste a paragraph, get a generated headline and exactly three summary bullets, enforced as structured JSON through LangChain and Pydantic.',
    problem: 'Long articles bury the key points, and free-form LLM output is hard to rely on inside an app.',
    solution:
      "A Streamlit app that sends the text to Mistral AI through LangChain and uses PydanticOutputParser so the model must return a valid title plus three bullets.",
    features: [
      'Streamlit web UI with a paste-in text area',
      'Structured output: title + exactly 3 bullets via Pydantic',
      'Mistral AI (mistral-small) through LangChain',
      'Expandable raw-JSON inspector',
      'Experiments with chat and context-heading prompts in the same repo',
    ],
    stack: ['Python', 'LangChain', 'Mistral AI', 'Pydantic', 'Streamlit'],
    art: 'digest',
    repo: 'https://github.com/Dheeraj-657/Article-summarizer',
    demo: null,
    year: '2026',
    status: 'Completed',
  },
  {
    id: 'secure-key',
    title: 'Secure Key Code',
    category: 'Software Security',
    summary:
      'An admin console for SSH key-based authentication with TOTP two-factor enrolment: users, public keys, QR enrolment and backup codes.',
    problem: 'Managing who can SSH into a server, with which key and with what second factor, is error-prone by hand.',
    solution:
      'A typed React interface that walks an admin through adding a user, uploading an SSH public key and enrolling TOTP via QR code.',
    features: [
      'Dashboard for users, keys, TOTP adoption and auth attempts',
      'Add-user flow: SSH key paste/upload → TOTP QR enrolment → backup codes',
      'User search and management table',
      'Security settings: public-key / TOTP / password policy, session timeout',
    ],
    stack: ['TypeScript', 'React', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'Supabase'],
    art: 'keys',
    repo: 'https://github.com/Dheeraj-657/secure-key-code',
    demo: null,
    year: 'Nov 2025',
    status: 'Frontend prototype',
    note: 'The public repository is the interface layer; it runs on sample data and the Supabase backend is scaffolded but not yet wired.',
  },
  {
    id: 'url-system-design',
    title: 'URL Shortener: System Design',
    category: 'System Design',
    summary:
      'A scalable architecture for a URL-shortening service: ID generation, redirection, request flow and the backend components behind them.',
    problem: 'A shortener looks trivial until it has to resolve huge read traffic with low latency and no collisions.',
    solution:
      'A written system design covering service separation, short-code generation, the redirect path and how the components scale.',
    features: ['URL generation strategy', 'Redirection flow', 'Service separation', 'Scalability considerations'],
    stack: ['System Design', 'Backend Architecture', 'Scalability'],
    art: 'blueprint',
    repo: 'https://github.com/Dheeraj-657/URL-SHORTENER-systemdesign',
    demo: null,
    doc: {
      label: 'Read the design (PDF)',
      url: 'https://github.com/Dheeraj-657/URL-SHORTENER-systemdesign/blob/main/Dheeraj_System_Design.pdf',
    },
    year: 'Nov 2025',
    status: 'Design document',
  },
  {
    id: 'url-shortener',
    title: 'URL Shortener',
    category: 'Backend Development',
    summary: 'A web application that turns long URLs into compact links and resolves them through a redirection flow.',
    problem: null,
    solution: null,
    features: ['Long URL → short code encoding', 'Redirect resolution', 'Backend request handling'],
    stack: ['Backend', 'URL Encoding', 'Web'],
    art: 'links',
    repo: null, // https://github.com/Dheeraj-657/URL-SHORTENER — set this once the code is pushed (repo is empty today)
    demo: null,
    year: 'Nov 2025',
    status: 'Source not yet published',
  },
  {
    id: 'banking',
    title: 'Banking Backend',
    category: 'Backend · REST APIs',
    summary:
      'Backend logic for banking operations, with modular structure, data handling and reliable request processing for financial workflows.',
    problem: null,
    solution: null,
    features: ['Banking operation workflows', 'Modular backend architecture', 'REST request processing'],
    stack: ['Python', 'REST APIs'],
    art: 'ledger',
    repo: null, // https://github.com/Dheeraj-657/banking_backend — set this once the code is pushed (repo is empty today)
    demo: null,
    year: '2026',
    status: 'Source not yet published',
  },
  {
    id: 'memory',
    title: 'Memory Management System',
    category: 'Systems Programming',
    summary:
      'An exploration of core memory-management concepts: allocation, utilisation and resource handling.',
    problem: null,
    solution: null,
    features: ['Memory allocation', 'Utilisation tracking', 'Resource handling'],
    stack: ['Systems Programming', 'Operating Systems'],
    art: 'memory',
    repo: null, // https://github.com/Dheeraj-657/MEMORY-MANAGEMENT-SYSTEM — set this once the code is pushed (repo is empty today)
    demo: null,
    year: 'Nov 2025',
    status: 'Source not yet published',
  },
];

// ─── THE ENGINEERING UNIVERSE ────────────────────────────────────────────────
// practical = used in a listed project or on the resume's skills list
// familiar  = studied / used lightly; promote when there is a project to show it
export const domains: Domain[] = [
  {
    id: 'ai',
    name: 'Artificial Intelligence',
    short: 'AI',
    description: 'Systems that reason over data: security analysis, risk scoring and assistant-style analysts.',
    skills: [
      { name: 'Python', level: 'practical' },
      { name: 'OpenAI API', level: 'practical' },
      { name: 'Azure AI (AI-102)', level: 'practical' },
      { name: 'Ollama', level: 'practical' },
    ],
    projects: ['trustgraph', 'summarizer'],
  },
  {
    id: 'ml',
    name: 'Machine Learning',
    short: 'ML',
    description: 'The foundations under the models: data handling, NLP pipelines and evaluating what a model returns.',
    skills: [
      { name: 'Python', level: 'practical' },
      { name: 'Hugging Face', level: 'familiar' },
      { name: 'Transformers', level: 'familiar' },
    ],
    projects: ['summarizer'],
  },
  {
    id: 'genai',
    name: 'Generative AI',
    short: 'GenAI',
    description: 'LLM applications with RAG pipelines and structured, validated outputs instead of free text.',
    skills: [
      { name: 'LangChain', level: 'practical' },
      { name: 'RAG', level: 'practical' },
      { name: 'Mistral AI', level: 'practical' },
      { name: 'Pydantic structured output', level: 'practical' },
    ],
    projects: ['summarizer', 'visualizer', 'trustgraph'],
  },
  {
    id: 'fullstack',
    name: 'Full-Stack Development',
    short: 'Full-Stack',
    description: 'From REST APIs to interactive interfaces, including 3D on the web.',
    skills: [
      { name: 'TypeScript', level: 'practical' },
      { name: 'JavaScript', level: 'practical' },
      { name: 'React', level: 'practical' },
      { name: 'Node.js', level: 'practical' },
      { name: 'FastAPI', level: 'practical' },
      { name: 'Flask', level: 'practical' },
      { name: 'Express', level: 'practical' },
      { name: 'Tailwind CSS', level: 'practical' },
      { name: 'Three.js', level: 'familiar' },
      { name: 'MongoDB', level: 'familiar' },
    ],
    projects: ['visualizer', 'secure-key', 'trustgraph', 'url-shortener'],
  },
  {
    id: 'cloud',
    name: 'Cloud Computing',
    short: 'Cloud',
    description: 'Microsoft Azure first, with Oracle and Google Cloud foundations, plus containers and CI/CD.',
    skills: [
      { name: 'Microsoft Azure', level: 'practical' },
      { name: 'Docker', level: 'practical' },
      { name: 'GitHub Actions / CI/CD', level: 'practical' },
      { name: 'Kubernetes', level: 'familiar' },
      { name: 'Oracle Cloud', level: 'familiar' },
      { name: 'Google Cloud', level: 'familiar' },
    ],
    projects: ['url-system-design'],
  },
  {
    id: 'swe',
    name: 'Software Engineering',
    short: 'Software Eng.',
    description: 'Data structures, operating systems, databases and system design: the parts that hold everything up.',
    skills: [
      { name: 'C', level: 'practical' },
      { name: 'C++', level: 'practical' },
      { name: 'PostgreSQL', level: 'practical' },
      { name: 'MySQL', level: 'practical' },
      { name: 'Supabase', level: 'practical' },
      { name: 'Git & GitHub', level: 'practical' },
      { name: 'Java', level: 'familiar' },
    ],
    projects: ['url-system-design', 'memory', 'banking', 'url-shortener'],
  },
];

// ─── LOGO KEYCAPS (scene 02) ─────────────────────────────────────────────────
// Each floats as a 3D keycap. `icon` is a Simple Icons slug (null = typographic keycap:
// Azure and OpenAI marks are not redistributable, so their names are set in type).
// `domain` links the keycap to a domain above; `level` follows the same rule as skills.
export interface Tech {
  id: string;
  label: string;
  icon: string | null;
  level: Level;
  domain: Domain['id'];
  /** names used in project stacks, for the "used in" list */
  matches: string[];
}

export const techs: Tech[] = [
  { id: 'python', label: 'Python', icon: 'python', level: 'practical', domain: 'ai', matches: ['Python'] },
  { id: 'claude', label: 'Claude', icon: 'claude', level: 'practical', domain: 'genai', matches: ['Claude'] },
  { id: 'langchain', label: 'LangChain', icon: 'langchain', level: 'practical', domain: 'genai', matches: ['LangChain'] },
  { id: 'react', label: 'React', icon: 'react', level: 'practical', domain: 'fullstack', matches: ['React'] },
  { id: 'typescript', label: 'TypeScript', icon: 'typescript', level: 'practical', domain: 'fullstack', matches: ['TypeScript'] },
  { id: 'azure', label: 'Azure', icon: null, level: 'practical', domain: 'cloud', matches: ['Azure', 'Microsoft Azure'] },
  { id: 'docker', label: 'Docker', icon: 'docker', level: 'practical', domain: 'cloud', matches: ['Docker'] },
  { id: 'fastapi', label: 'FastAPI', icon: 'fastapi', level: 'practical', domain: 'fullstack', matches: ['FastAPI'] },
  { id: 'node', label: 'Node.js', icon: 'nodedotjs', level: 'practical', domain: 'fullstack', matches: ['Node.js'] },
  { id: 'postgres', label: 'PostgreSQL', icon: 'postgresql', level: 'practical', domain: 'swe', matches: ['PostgreSQL'] },
  { id: 'mistral', label: 'Mistral AI', icon: 'mistralai', level: 'practical', domain: 'genai', matches: ['Mistral AI'] },
  { id: 'kubernetes', label: 'Kubernetes', icon: 'kubernetes', level: 'familiar', domain: 'cloud', matches: ['Kubernetes'] },
  { id: 'supabase', label: 'Supabase', icon: 'supabase', level: 'practical', domain: 'swe', matches: ['Supabase'] },
  { id: 'openai', label: 'OpenAI API', icon: null, level: 'practical', domain: 'ai', matches: ['OpenAI', 'LLM integrations', 'AI integration'] },
];

// ─── MY JOURNEY ──────────────────────────────────────────────────────────────
export const milestones: Milestone[] = [
  {
    id: 'btech',
    date: null, // enrolment year
    kind: 'education',
    title: 'B.Tech CSE (General AI)',
    subtitle: 'Lovely Professional University',
    body: 'Started Computer Science & Engineering with a focus on AI: DSA, operating systems, DBMS and computer networks.',
  },
  {
    id: 'oss',
    date: '2024',
    kind: 'experience',
    title: 'Open Source Contributor',
    subtitle: '2024 – Present',
    body: '22+ merged pull requests across public repositories: backend features, bug fixes and CI improvements.',
  },
  {
    id: 'microsoft',
    date: null,
    kind: 'certification',
    title: 'Microsoft Azure certifications',
    subtitle: 'AZ-900 · AI-900 · DP-900 · AI-102',
    body: 'Azure fundamentals, AI fundamentals, data fundamentals, and then the AI Engineer Associate.',
  },
  {
    id: 'multicloud',
    date: null,
    kind: 'certification',
    title: 'Oracle & Google Cloud',
    subtitle: 'OCI AI/Data Fundamentals · Google Cloud Foundations',
    body: 'Broadened the cloud foundation beyond Azure.',
  },
  {
    id: 'nov25',
    date: 'Nov 2025',
    kind: 'project',
    title: 'Systems & security sprint',
    subtitle: 'Secure Key Code · URL Shortener · Memory Management',
    body: 'A month of building: an SSH/TOTP admin console, a URL shortener with its full system design, and memory-management fundamentals.',
  },
  {
    id: 'y2026',
    date: '2026',
    kind: 'project',
    title: 'Generative AI & backends',
    subtitle: 'AI Article Summarizer · Banking Backend',
    body: 'Structured LLM output with LangChain and Mistral, and modular backend design for financial workflows.',
  },
  {
    id: 'grad',
    date: '2028',
    kind: 'education',
    title: 'Graduation',
    subtitle: 'Expected · CGPA 8.22 / 10',
    body: 'Completing the B.Tech in Computer Science & Engineering.',
  },
  {
    id: 'next',
    date: 'Next',
    kind: 'future',
    title: 'Production AI systems',
    subtitle: 'The road ahead',
    body: 'Building AI products that are reliable in production: grounded retrieval, evaluation, and cloud-native deployment.',
  },
];

export const sections = [
  { id: 'intro', label: 'Intro' },
  { id: 'universe', label: 'Universe' },
  { id: 'journey', label: 'Journey' },
  { id: 'projects', label: 'Projects' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
] as const;
