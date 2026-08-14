export interface TopCompany {
  name: string;
  domain: string;
  description: string;
  careerPageUrl: string;
}

export interface JobData {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  avgSalary: string;
  education: string[];
  skills: string[];
  dailyRoutine: string;
  workEnvironment: string;
  careerPath: string;
  weekOverview: string;
  quarterOverview: string;
  yearOverview: string;
  funFact: string;
  // Optional enrichment fields
  topCompanies?: TopCompany[];
  relevantForCompanies?: boolean;
}

export const JOB_TITLES: string[] = [
  "Software Engineer", "Neurosurgeon", "Criminal Lawyer", "Data Scientist", "Firefighter",
  "Architect", "Marine Biologist", "Investment Banker", "Kindergarten Teacher", "Pilot",
  "Forensic Analyst", "Pastry Chef", "Mechanical Engineer", "Psychologist", "Journalist",
  "Veterinarian", "Graphic Designer", "Pharmacist", "Civil Engineer", "Diplomat",
  "Film Director", "Anesthesiologist", "Archaeologist", "Stockbroker", "Paramedic",
  "Fashion Designer", "Aerospace Engineer", "Social Worker", "Bartender", "Radiologist",
  "Astronaut", "Music Producer", "Dentist", "Urban Planner", "Detective",
  "Oceanographer", "Tax Accountant", "Physical Therapist", "Wildlife Photographer", "Patent Attorney",
  "Sommelier", "Nuclear Physicist", "Midwife", "Game Developer", "Cartographer",
  "Epidemiologist", "Blacksmith", "Speech Therapist", "Air Traffic Controller", "Blockchain Developer",
  "Florist", "Biomedical Engineer", "Court Reporter", "Ethical Hacker", "Choreographer",
  "Geologist", "Optometrist", "Brewer", "Robotics Engineer", "Art Curator",
  "Actuary", "Firefighter Paramedic", "Translator", "Sound Engineer", "Dermatologist",
  "Botanist", "Cinematographer", "Sports Agent", "Nutritionist", "Carpenter",
  "Geneticist", "UX Designer", "Lobbyist", "Zoologist", "Tattoo Artist",
  "Meteorologist", "Prosthetist", "Stunt Coordinator", "Database Administrator", "Chaplain",
  "Toxicologist", "Interior Designer", "Coroner", "Watchmaker", "Volcanologist",
  "Occupational Therapist", "Brewmaster", "Archivist", "Podiatrist", "Locksmith",
  "Entomologist", "Perfumer", "Ship Captain", "Audiologist", "Glassblower",
  "Cryptographer", "Doula", "Falconer", "Hydrologist", "Puppeteer",
  "Radiographer", "Taxidermist", "Vintner", "Neurologist", "Beekeeper",
  "Product Manager", "DevOps Engineer", "Hedge Fund Manager", "ER Doctor", "Park Ranger",
  "Animator", "Petroleum Engineer", "Surgeon", "Chiropractor", "War Correspondent",
  "Costume Designer", "Structural Engineer", "Orthodontist", "DJ", "Forester",
  "Patent Examiner", "Auctioneer", "Biostatistician", "Elevator Mechanic", "Furrier",
  "Gemologist", "Histologist", "Immunologist", "Lithographer", "Mycologist",
  "Paleontologist", "Quilter", "Seismologist", "Upholsterer", "Winemaker",
  "Yacht Broker", "Zoographer", "Acupuncturist", "Bailiff", "Calligrapher",
  "Dispatcher", "Electrician", "Plumber", "Welder", "Machinist",
  "Librarian", "Museum Curator", "Economist", "Statistician", "Anthropologist",
  "Sociologist", "Political Scientist", "Philosopher", "Theologian", "Linguist",
  "Professor", "Research Scientist", "Lab Technician", "Nurse Practitioner", "Physician Assistant",
  "Respiratory Therapist", "Dental Hygienist", "EMT", "Surgical Technologist", "MRI Technologist",
  "Phlebotomist", "Dietitian", "Athletic Trainer", "Genetic Counselor", "Art Therapist",
  "Music Therapist", "Recreational Therapist", "Substance Abuse Counselor", "School Counselor", "Career Counselor",
  "Marriage Therapist", "Child Psychologist", "Forensic Psychologist", "Sports Psychologist", "Industrial Psychologist",
  "Venture Capitalist", "Private Equity Analyst", "Quantitative Analyst", "Risk Manager", "Compliance Officer",
  "Underwriter", "Claims Adjuster", "Financial Planner", "Mortgage Broker", "Real Estate Agent",
  "Property Manager", "Construction Manager", "Site Supervisor", "Crane Operator", "Surveyor",
  "Landscape Architect", "Environmental Engineer", "Water Treatment Specialist", "Solar Panel Installer", "Wind Turbine Technician",
  "Blockchain Architect", "Cloud Architect", "Machine Learning Engineer", "AI Research Scientist", "Cybersecurity Analyst",
  "Penetration Tester", "Systems Administrator", "Network Engineer", "Full Stack Developer", "Mobile Developer",
  "QA Engineer", "Technical Writer", "Scrum Master", "Solutions Architect", "CTO",
  "CEO", "COO", "CFO", "CMO", "VP of Engineering",
  "Head of Design", "Chief Data Officer", "Chief Security Officer", "Brand Strategist", "Content Creator",
  "Influencer Marketing Manager", "SEO Specialist", "Copywriter", "Publicist", "Event Planner",
  "Wedding Planner", "Travel Agent", "Tour Guide", "Hotel Manager", "Restaurant Manager",
  "Barista", "Butcher", "Baker", "Fishmonger", "Food Critic",
  "Chocolatier", "Food Scientist", "Agricultural Scientist", "Farmer", "Rancher",
  "Fisherman", "Arborist", "Horticulturist",
];

export function generateJobData(title: string): JobData {
  const id = title.toLowerCase().replace(/\s+/g, '-');
  const category = getCategory(title);

  return {
    id,
    title,
    category,
    shortDescription: generateShortDescription(title, category),
    fullDescription: generateFullDescription(title, category),
    avgSalary: generateSalary(category),
    education: generateEducation(title, category),
    skills: generateSkills(title, category),
    dailyRoutine: generateDailyRoutine(title),
    workEnvironment: generateWorkEnvironment(title, category),
    careerPath: generateCareerPath(title, category),
    weekOverview: generateWeekOverview(title),
    quarterOverview: generateQuarterOverview(title),
    yearOverview: generateYearOverview(title),
    funFact: generateFunFact(title),
  };
}

/** Normalize AI, cached, shared, or remotely persisted job data before UI use. */
export function normalizeJobData(title: string, value: Partial<JobData>): JobData {
  const fallback = generateJobData(title);
  const text = (candidate: unknown, defaultValue: string) => typeof candidate === 'string' && candidate.trim() ? candidate : defaultValue;
  return {
    ...fallback,
    ...value,
    id: text(value.id, fallback.id),
    title: text(value.title, title),
    category: text(value.category, fallback.category),
    shortDescription: text(value.shortDescription, fallback.shortDescription),
    fullDescription: text(value.fullDescription, fallback.fullDescription),
    avgSalary: text(value.avgSalary, fallback.avgSalary),
    education: Array.isArray(value.education) ? value.education.filter((item): item is string => typeof item === 'string') : fallback.education,
    skills: Array.isArray(value.skills) ? value.skills.filter((item): item is string => typeof item === 'string') : fallback.skills,
    dailyRoutine: text(value.dailyRoutine, fallback.dailyRoutine),
    workEnvironment: text(value.workEnvironment, fallback.workEnvironment),
    careerPath: text(value.careerPath, fallback.careerPath),
    weekOverview: text(value.weekOverview, fallback.weekOverview),
    quarterOverview: text(value.quarterOverview, fallback.quarterOverview),
    yearOverview: text(value.yearOverview, fallback.yearOverview),
    funFact: text(value.funFact, fallback.funFact),
    topCompanies: Array.isArray(value.topCompanies) ? value.topCompanies.filter(company => company && typeof company.name === 'string') : [],
    relevantForCompanies: Boolean(value.relevantForCompanies),
  };
}

function getCategory(title: string): string {
  const t = title.toLowerCase();
  if (['surgeon', 'doctor', 'nurse', 'dentist', 'therapist', 'physician', 'radiologist', 'anesthesiologist', 'dermatologist', 'neurologist', 'orthodontist', 'optometrist', 'podiatrist', 'chiropractor', 'midwife', 'emt', 'paramedic', 'pharmacist', 'veterinarian'].some(k => t.includes(k))) return 'Healthcare';
  if (['engineer', 'developer', 'scientist', 'architect', 'devops', 'qa', 'cybersecurity', 'blockchain', 'machine learning', 'ai ', 'data', 'cloud', 'network', 'systems', 'full stack', 'mobile'].some(k => t.includes(k))) return 'Technology & Engineering';
  if (['lawyer', 'attorney', 'judge', 'paralegal', 'bailiff', 'detective', 'forensic', 'coroner', 'compliance'].some(k => t.includes(k))) return 'Law & Justice';
  if (['banker', 'broker', 'analyst', 'accountant', 'actuary', 'underwriter', 'financial', 'venture', 'hedge', 'equity', 'risk'].some(k => t.includes(k))) return 'Finance';
  if (['teacher', 'professor', 'counselor', 'librarian', 'tutor'].some(k => t.includes(k))) return 'Education';
  if (['designer', 'artist', 'director', 'producer', 'animator', 'photographer', 'cinematographer', 'choreographer', 'curator', 'dj', 'musician'].some(k => t.includes(k))) return 'Creative Arts';
  if (['chef', 'baker', 'barista', 'bartender', 'sommelier', 'brewer', 'butcher', 'chocolatier', 'food'].some(k => t.includes(k))) return 'Food & Hospitality';
  if (['pilot', 'captain', 'astronaut', 'air traffic'].some(k => t.includes(k))) return 'Aviation & Space';
  if (['farmer', 'rancher', 'fisherman', 'beekeeper', 'forester', 'ranger', 'botanist', 'zoologist', 'marine', 'wildlife', 'oceanographer'].some(k => t.includes(k))) return 'Nature & Environment';
  if (['ceo', 'cto', 'coo', 'cfo', 'cmo', 'vp ', 'head of', 'chief', 'manager', 'scrum', 'product'].some(k => t.includes(k))) return 'Leadership & Management';
  if (['plumber', 'electrician', 'welder', 'carpenter', 'machinist', 'locksmith', 'mechanic', 'crane', 'surveyor', 'construction'].some(k => t.includes(k))) return 'Skilled Trades';
  if (['psychologist', 'social worker', 'therapist', 'counselor'].some(k => t.includes(k))) return 'Social Services';
  return 'Professional Services';
}

function generateShortDescription(title: string, category: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    'Healthcare': {
      default: `A ${title} is a healthcare professional dedicated to diagnosing, treating, and caring for patients. This role combines deep medical knowledge with compassion and precision, requiring years of specialized training and a commitment to lifelong learning.`
    },
    'Technology & Engineering': {
      default: `A ${title} designs, builds, and maintains complex systems and solutions. This role demands analytical thinking, technical expertise, and the ability to solve problems creatively while keeping up with rapidly evolving technologies.`
    },
    'Law & Justice': {
      default: `A ${title} works within the legal system to uphold justice, protect rights, and ensure the rule of law. This role requires sharp analytical skills, deep knowledge of legal frameworks, and the ability to argue persuasively.`
    },
    'Finance': {
      default: `A ${title} manages, analyzes, and advises on financial matters. This role involves working with complex financial instruments, assessing risk, and making decisions that can impact individuals, companies, or entire markets.`
    },
    'Education': {
      default: `A ${title} shapes minds and builds futures. This role involves developing curricula, engaging students, assessing progress, and adapting teaching methods to meet diverse learning needs.`
    },
    'Creative Arts': {
      default: `A ${title} brings ideas to life through creative expression. This role blends artistic vision with technical skill, requiring both innate talent and learned craft to produce work that resonates with audiences.`
    },
    'Food & Hospitality': {
      default: `A ${title} creates memorable culinary experiences. This role combines creativity with precision, requiring deep knowledge of ingredients, techniques, and the art of bringing people together through food and drink.`
    },
    'Aviation & Space': {
      default: `A ${title} operates in one of the most demanding and exhilarating fields. This role requires extraordinary precision, extensive training, and the ability to make split-second decisions under pressure.`
    },
    'Nature & Environment': {
      default: `A ${title} works closely with the natural world. This role combines scientific knowledge with fieldwork, requiring patience, observation skills, and a deep respect for ecological systems.`
    },
    'Leadership & Management': {
      default: `A ${title} drives organizational success by setting vision, building teams, and making strategic decisions. This role requires strong communication, decisive leadership, and the ability to navigate complex business landscapes.`
    },
    'Skilled Trades': {
      default: `A ${title} applies specialized manual skills and technical knowledge to build, repair, and maintain essential infrastructure. This role demands precision, problem-solving ability, and hands-on expertise developed through years of practice.`
    },
    'Social Services': {
      default: `A ${title} helps individuals and communities overcome challenges and improve their well-being. This role requires empathy, strong communication skills, and knowledge of human behavior and social systems.`
    },
    'Professional Services': {
      default: `A ${title} provides specialized expertise to clients and organizations. This role combines deep domain knowledge with professional skills, requiring continuous learning and adaptability.`
    }
  };

  return descriptions[category]?.default || descriptions['Professional Services'].default;
}

function generateFullDescription(title: string, category: string): string {
  return `The role of a ${title} is multifaceted and deeply impactful. Operating within the ${category} sector, this profession demands a unique combination of technical knowledge, practical skills, and personal qualities.\n\nOn a day-to-day basis, a ${title} navigates complex challenges that require both expertise and adaptability. The work environment varies from structured office settings to dynamic field conditions, depending on the specific demands of each project or case.\n\nWhat makes this career particularly rewarding is the tangible impact on people's lives and society. Whether through innovation, service, or creative output, the contributions of a ${title} shape the world in meaningful ways.\n\nThe profession has evolved significantly over the past decade, with technology and globalization creating new opportunities and challenges. Today's ${title} must be comfortable with digital tools, collaborative workflows, and continuous professional development.`;
}

function getCurrency(): 'INR' | 'USD' {
  try {
    const prefs = JSON.parse(localStorage.getItem('careersim_preferences') || '{}');
    return prefs.currency || 'INR';
  } catch {
    return 'INR';
  }
}

function generateSalary(category: string): string {
  if (getCurrency() === 'INR') {
    const ranges: Record<string, string> = {
      'Healthcare': '₹8,00,000 - ₹40,00,000+ per annum',
      'Technology & Engineering': '₹6,00,000 - ₹35,00,000+ per annum',
      'Law & Justice': '₹5,00,000 - ₹25,00,000+ per annum',
      'Finance': '₹8,00,000 - ₹50,00,000+ per annum',
      'Education': '₹3,00,000 - ₹12,00,000 per annum',
      'Creative Arts': '₹3,00,000 - ₹20,00,000+ per annum',
      'Food & Hospitality': '₹2,40,000 - ₹10,00,000+ per annum',
      'Aviation & Space': '₹8,00,000 - ₹40,00,000+ per annum',
      'Nature & Environment': '₹3,00,000 - ₹12,00,000 per annum',
      'Leadership & Management': '₹15,00,000 - ₹1,00,00,000+ per annum',
      'Skilled Trades': '₹3,00,000 - ₹10,00,000+ per annum',
      'Social Services': '₹2,40,000 - ₹8,00,000 per annum',
      'Professional Services': '₹4,00,000 - ₹18,00,000+ per annum',
    };
    return ranges[category] || '₹3,60,000 - ₹12,00,000 per annum';
  }

  const ranges: Record<string, string> = {
    'Healthcare': '$85,000 - $350,000+',
    'Technology & Engineering': '$75,000 - $250,000+',
    'Law & Justice': '$60,000 - $200,000+',
    'Finance': '$65,000 - $500,000+',
    'Education': '$40,000 - $120,000',
    'Creative Arts': '$35,000 - $150,000+',
    'Food & Hospitality': '$30,000 - $90,000+',
    'Aviation & Space': '$70,000 - $300,000+',
    'Nature & Environment': '$35,000 - $100,000',
    'Leadership & Management': '$100,000 - $1,000,000+',
    'Skilled Trades': '$40,000 - $100,000+',
    'Social Services': '$35,000 - $90,000',
    'Professional Services': '$45,000 - $150,000+'
  };
  return ranges[category] || '$40,000 - $120,000';
}

function generateEducation(title: string, category: string): string[] {
  const base = ["Relevant bachelor's degree or equivalent experience"];
  const categoryEd: Record<string, string[]> = {
    'Healthcare': ["Medical degree (MD/DO) or relevant clinical degree", "Residency and/or fellowship training", "Board certification in specialty", "State medical license", "Continuing medical education credits"],
    'Technology & Engineering': ["Bachelor's in Computer Science, Engineering, or related field", "Industry certifications (AWS, Google, etc.)", "Portfolio of projects or open-source contributions", "Master's degree for specialized roles (optional)", "Continuous self-learning through online platforms"],
    'Law & Justice': ["Juris Doctor (JD) from accredited law school", "Bar admission in practicing jurisdiction", "Undergraduate degree (any field)", "Continuing legal education", "Specialized certifications for niche practice areas"],
    'Finance': ["Bachelor's in Finance, Economics, or Accounting", "CFA, CPA, or other professional certifications", "MBA for senior positions", "Series 7 and 63 licenses for trading roles", "Strong quantitative background"],
    'Education': ["Bachelor's in Education or subject area", "State teaching certification/license", "Master's in Education (for advancement)", "Student teaching experience", "Continuing education credits"],
    'Creative Arts': ["Bachelor's in Fine Arts, Design, or related field", "Strong portfolio demonstrating skill and vision", "Apprenticeships or mentorships", "Industry-specific software proficiency", "Networking within creative communities"],
    'Aviation & Space': ["FAA commercial pilot license or equivalent", "Extensive flight hours (1,500+ for airlines)", "Aviation medical certificate", "Bachelor's degree (preferred by airlines)", "Recurrent training and certification"],
  };
  return categoryEd[category] || base;
}

function generateSkills(title: string, category: string): string[] {
  const universal = ["Communication", "Problem-solving", "Time management", "Adaptability"];
  const categorySkills: Record<string, string[]> = {
    'Healthcare': ["Clinical diagnosis", "Patient communication", "Medical procedures", "EMR systems", "Team coordination", "Stress management", "Attention to detail", "Empathy"],
    'Technology & Engineering': ["Programming languages", "System design", "Data structures & algorithms", "Version control (Git)", "Agile methodology", "Technical documentation", "Debugging", "Cloud platforms"],
    'Law & Justice': ["Legal research", "Case analysis", "Negotiation", "Public speaking", "Legal writing", "Client management", "Critical thinking", "Attention to precedent"],
    'Finance': ["Financial modeling", "Risk assessment", "Market analysis", "Excel & financial software", "Regulatory knowledge", "Portfolio management", "Data analysis", "Strategic thinking"],
    'Education': ["Curriculum development", "Classroom management", "Assessment design", "Student engagement", "Differentiated instruction", "Educational technology", "Patience", "Cultural sensitivity"],
    'Creative Arts': ["Visual composition", "Color theory", "Industry-standard software", "Creative direction", "Client presentation", "Storytelling", "Trend awareness", "Iterative design"],
    'Skilled Trades': ["Blueprint reading", "Hand and power tools", "Safety protocols", "Code compliance", "Material knowledge", "Physical stamina", "Precision measurement", "Troubleshooting"],
  };
  return [...(categorySkills[category] || universal), ...universal];
}

function generateDailyRoutine(title: string): string {
  return `A typical day as a ${title} begins early, often before most people are awake. The morning starts with reviewing priorities, checking communications, and planning the day's critical tasks. Mid-morning is typically the most productive period, dedicated to core responsibilities. Lunch often doubles as networking or continued work. The afternoon brings meetings, collaborations, and follow-ups. The day winds down with documentation, preparation for tomorrow, and professional development.`;
}

function generateWorkEnvironment(title: string, category: string): string {
  const environments: Record<string, string> = {
    'Healthcare': 'Hospital, clinic, or medical facility with strict hygiene protocols. Shift work is common, including nights and weekends. High-pressure environment requiring constant alertness.',
    'Technology & Engineering': 'Modern office or remote setup with multiple monitors. Collaborative spaces for team work. Flexible hours with occasional on-call duties. Fast-paced with frequent iteration cycles.',
    'Law & Justice': 'Law firm, courthouse, or government office. Formal professional environment. Long hours during active cases. Significant reading and research time.',
    'Finance': 'Trading floor, bank office, or corporate finance department. Fast-paced, numbers-driven environment. Market hours dictate schedule. High-stress with significant stakes.',
    'Education': 'Classroom, lecture hall, or educational institution. Structured schedule following academic calendar. Summers may offer reduced workload. Community-oriented environment.',
    'Creative Arts': 'Studio, agency, or freelance workspace. Flexible and often unconventional hours. Deadline-driven with creative bursts. Collaborative yet individually focused.',
    'Skilled Trades': 'Construction sites, workshops, or client locations. Physical work in varying conditions. Safety gear required. Project-based scheduling.',
  };
  return environments[category] || `Professional office or field setting. A ${title} works in a dynamic environment that balances independent work with team collaboration.`;
}

function generateCareerPath(title: string, category: string): string {
  return `Entry-level positions typically involve assisting senior ${title}s and learning the fundamentals. After 2-3 years, professionals take on independent responsibilities. Mid-career (5-10 years) brings specialization opportunities and team leadership. Senior professionals (10+ years) often move into mentorship, consulting, or executive roles. Some choose to start their own practice or venture.`;
}

function generateWeekOverview(title: string): string {
  return `**Monday:** Planning and priority-setting for the week. Team standup or department meeting. Tackle the most challenging task first.\n\n**Tuesday-Wednesday:** Deep work on core responsibilities. Client meetings or stakeholder updates. Collaborative sessions with colleagues.\n\n**Thursday:** Mid-week review and adjustment. Professional development or training. Cross-functional coordination.\n\n**Friday:** Wrap up deliverables. Documentation and reporting. Reflect on the week's achievements and plan ahead.\n\n**Weekend:** Rest and recharge, though some ${title}s find themselves thinking about work challenges even during downtime.`;
}

function generateQuarterOverview(title: string): string {
  return `**Month 1:** Set quarterly goals and KPIs. Begin major projects or initiatives. Establish rhythm with team and stakeholders.\n\n**Month 2:** Execute on plans. Navigate mid-quarter adjustments. Attend industry events or conferences. Conduct performance check-ins.\n\n**Month 3:** Push toward quarterly targets. Prepare reports and presentations. Reflect on lessons learned. Begin planning for the next quarter.\n\nThroughout the quarter, a ${title} balances reactive demands with proactive strategic work, building relationships and deepening expertise.`;
}

function generateYearOverview(title: string): string {
  return `**Q1 (Jan-Mar):** New year planning and goal-setting. Fresh initiatives and renewed energy. Industry trend analysis.\n\n**Q2 (Apr-Jun):** Hitting stride on annual objectives. Mid-year reviews approaching. Conference season for many industries.\n\n**Q3 (Jul-Sep):** Mid-year recalibration. Summer scheduling adjustments. Major project milestones.\n\n**Q4 (Oct-Dec):** Year-end push. Budget planning for next year. Performance reviews. Holiday adjustments.\n\nOver the course of a year, a ${title} experiences seasonal rhythms, professional growth milestones, and the satisfaction of seeing long-term projects come to fruition.`;
}

function generateFunFact(title: string): string {
  return `The title “${title}” can cover several specialisms, so CareerCase compares concrete skills and evidence instead of relying on the title alone.`;
}

export function findClosestJob(query: string): string {
  const q = query.toLowerCase().trim();
  const exact = JOB_TITLES.find(j => j.toLowerCase() === q);
  if (exact) return exact;

  const startsWith = JOB_TITLES.find(j => j.toLowerCase().startsWith(q));
  if (startsWith) return startsWith;

  const includes = JOB_TITLES.find(j => j.toLowerCase().includes(q));
  if (includes) return includes;

  // Word match
  const words = q.split(/\s+/);
  const wordMatch = JOB_TITLES.find(j => words.some(w => j.toLowerCase().includes(w)));
  if (wordMatch) return wordMatch;

  return query; // Return as-is if no match
}
