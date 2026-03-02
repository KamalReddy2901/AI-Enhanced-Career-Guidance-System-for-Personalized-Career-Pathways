export interface SimulationScenario {
  id: string;
  time: string;
  title: string;
  description: string;
  stickFigurePose: 'waking' | 'walking' | 'sitting' | 'presenting' | 'thinking' | 'working' | 'talking' | 'eating' | 'celebrating' | 'tired' | 'running' | 'reading';
  choices: SimulationChoice[];
  correctChoiceIndex: number;
  explanation: string;
}

export interface SimulationChoice {
  text: string;
  isCorrect: boolean;
}

export function generateSimulation(jobTitle: string): SimulationScenario[] {
  const category = getSimCategory(jobTitle);
  const templates = SIMULATION_TEMPLATES[category] || SIMULATION_TEMPLATES['default'];

  return templates.map((template, i) => ({
    ...template,
    id: `scenario-${i}`,
    title: template.title.replace(/{job}/g, jobTitle),
    description: template.description.replace(/{job}/g, jobTitle),
    explanation: template.explanation.replace(/{job}/g, jobTitle),
    choices: template.choices.map(c => ({
      ...c,
      text: c.text.replace(/{job}/g, jobTitle),
    })),
  }));
}

function getSimCategory(title: string): string {
  const t = title.toLowerCase();
  if (['surgeon', 'doctor', 'nurse', 'dentist', 'therapist', 'physician', 'paramedic', 'emt'].some(k => t.includes(k))) return 'healthcare';
  if (['engineer', 'developer', 'scientist', 'devops', 'qa', 'designer'].some(k => t.includes(k))) return 'tech';
  if (['lawyer', 'attorney', 'judge'].some(k => t.includes(k))) return 'law';
  if (['chef', 'baker', 'barista', 'bartender', 'cook'].some(k => t.includes(k))) return 'culinary';
  if (['teacher', 'professor', 'tutor'].some(k => t.includes(k))) return 'education';
  if (['ceo', 'cto', 'cfo', 'manager', 'director', 'vp'].some(k => t.includes(k))) return 'executive';
  return 'default';
}

const SIMULATION_TEMPLATES: Record<string, SimulationScenario[]> = {
  healthcare: [
    {
      id: '', time: '5:30 AM', title: 'The Early Rise',
      description: 'Your alarm goes off. It\'s still dark outside. As a {job}, your shift starts at 6:30 AM. The hospital is a 20-minute drive away.',
      stickFigurePose: 'waking',
      choices: [
        { text: 'Hit snooze and get 15 more minutes of sleep', isCorrect: false },
        { text: 'Get up immediately, shower, review today\'s patient schedule over coffee', isCorrect: true },
        { text: 'Call in and say you\'ll be late', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'As a {job}, punctuality is non-negotiable. Patients and colleagues depend on you being present and prepared. Most healthcare professionals develop a strict morning routine — reviewing the day\'s cases before arriving ensures you hit the ground running.',
    },
    {
      id: '', time: '6:45 AM', title: 'Morning Handoff',
      description: 'You arrive at the hospital. The night shift team is waiting to hand off patients. There are 12 patients on your service today, and one critical case from overnight.',
      stickFigurePose: 'talking',
      choices: [
        { text: 'Skip the handoff and go straight to the critical patient', isCorrect: false },
        { text: 'Listen carefully to each handoff, take notes, ask clarifying questions', isCorrect: true },
        { text: 'Quickly skim the charts yourself instead', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Handoffs are a critical safety moment. Studies show that poor handoffs are responsible for up to 80% of serious medical errors. A {job} listens attentively, takes structured notes, and asks questions to ensure continuity of care.',
    },
    {
      id: '', time: '8:00 AM', title: 'The Critical Decision',
      description: 'A patient\'s condition has deteriorated. Lab results are abnormal, and the nurse is concerned. You need to act quickly but thoughtfully.',
      stickFigurePose: 'thinking',
      choices: [
        { text: 'Order every possible test to cover all bases', isCorrect: false },
        { text: 'Examine the patient, correlate symptoms with labs, form a differential diagnosis, then order targeted tests', isCorrect: true },
        { text: 'Wait and see if the patient improves on their own', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Medicine is about clinical reasoning, not shotgun approaches. A {job} examines the patient first, correlates findings, and makes targeted decisions. This is both better medicine and better resource management.',
    },
    {
      id: '', time: '10:30 AM', title: 'The Difficult Conversation',
      description: 'You need to inform a family that their loved one\'s prognosis is poor. They\'re waiting anxiously in the family room.',
      stickFigurePose: 'sitting',
      choices: [
        { text: 'Deliver the news quickly and factually, then move on', isCorrect: false },
        { text: 'Sit down at eye level, speak with empathy, allow silence, answer questions, and ensure they have support', isCorrect: true },
        { text: 'Have a nurse deliver the news instead', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Breaking bad news is one of the hardest parts of being a {job}. The SPIKES protocol teaches sitting down, showing empathy, giving information in small pieces, and allowing emotional response. It\'s never easy, but it\'s always your responsibility.',
    },
    {
      id: '', time: '12:00 PM', title: 'The Working Lunch',
      description: 'It\'s noon and you haven\'t eaten. There\'s a teaching conference in the cafeteria, but you also have charts to complete.',
      stickFigurePose: 'eating',
      choices: [
        { text: 'Skip both and keep working on patients', isCorrect: false },
        { text: 'Grab food, attend the conference — learning and self-care are both essential', isCorrect: true },
        { text: 'Take a long lunch break off-campus', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'A {job} who doesn\'t eat, doesn\'t learn, and doesn\'t rest eventually burns out. The best professionals build sustainable habits — eating regularly, attending educational sessions, and maintaining their own health to better serve patients.',
    },
    {
      id: '', time: '2:00 PM', title: 'The Unexpected Emergency',
      description: 'A code blue is called overhead. A patient on another floor has gone into cardiac arrest. You\'re the closest responding physician.',
      stickFigurePose: 'running',
      choices: [
        { text: 'Ignore it — it\'s not your patient or your floor', isCorrect: false },
        { text: 'Respond immediately, lead the code team through ACLS protocols', isCorrect: true },
        { text: 'Walk there calmly since running causes panic', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'In a code blue, every second counts. A {job} responds immediately and takes charge. ACLS (Advanced Cardiac Life Support) protocols give structure to chaos. You move with urgency but act with calm precision — that\'s what training is for.',
    },
    {
      id: '', time: '4:00 PM', title: 'Documentation Time',
      description: 'You have 8 patient notes to complete before your shift ends. Each requires detailed documentation for legal and medical continuity.',
      stickFigurePose: 'working',
      choices: [
        { text: 'Write minimal notes to save time', isCorrect: false },
        { text: 'Complete thorough, accurate documentation for each patient — it\'s a legal document and a communication tool', isCorrect: true },
        { text: 'Leave the notes for tomorrow', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Documentation is medicine. If it wasn\'t documented, it didn\'t happen. A {job}\'s notes serve as legal records, communication tools for the next provider, and a reflection of clinical thinking. Thorough documentation protects both patients and providers.',
    },
    {
      id: '', time: '5:30 PM', title: 'The Handoff (Again)',
      description: 'Your shift is ending. The evening team is arriving. You need to hand off your 12 patients clearly and completely.',
      stickFigurePose: 'talking',
      choices: [
        { text: 'Rush through the handoff so you can leave on time', isCorrect: false },
        { text: 'Give a structured, thorough handoff using SBAR format, highlighting critical patients and pending tasks', isCorrect: true },
        { text: 'Send an email summary and leave', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Just as you received a careful handoff this morning, you owe the same to the next team. SBAR (Situation, Background, Assessment, Recommendation) ensures nothing falls through the cracks. A {job}\'s responsibility doesn\'t end at shift change — it ends at complete handoff.',
    },
    {
      id: '', time: '6:30 PM', title: 'After Hours',
      description: 'You\'re finally home. Your phone buzzes — a colleague has a question about a patient you saw today. You\'re also exhausted and need to decompress.',
      stickFigurePose: 'tired',
      choices: [
        { text: 'Ignore the call — you\'re off duty', isCorrect: false },
        { text: 'Answer briefly to help with patient continuity, then set boundaries and focus on self-care for the evening', isCorrect: true },
        { text: 'Go back to the hospital', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Being a {job} means caring about patient outcomes even after your shift. But it also means knowing your limits. A brief, helpful response maintains patient safety while protecting your well-being. Sustainable practice requires boundaries.',
    },
    {
      id: '', time: '9:00 PM', title: 'Reflection',
      description: 'Before bed, you think about the day. The critical patient, the difficult conversation, the code blue. Tomorrow will bring new challenges.',
      stickFigurePose: 'reading',
      choices: [
        { text: 'Replay every mistake obsessively', isCorrect: false },
        { text: 'Briefly reflect on what went well and what to improve, then rest — tomorrow needs you at your best', isCorrect: true },
        { text: 'Avoid thinking about work entirely', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Reflective practice is how a {job} grows. Brief, balanced reflection — acknowledging both successes and areas for growth — builds expertise without burnout. The best clinicians learn from every day while maintaining the emotional resilience to show up fully tomorrow.',
    },
  ],

  tech: [
    {
      id: '', time: '8:00 AM', title: 'Morning Bootup',
      description: 'You start your day as a {job}. Slack has 47 unread messages, 3 PR reviews waiting, and a Jira notification about a production bug from overnight.',
      stickFigurePose: 'waking',
      choices: [
        { text: 'Ignore Slack and start coding on your own task', isCorrect: false },
        { text: 'Triage: check the production bug severity first, then scan messages for blockers, plan your day', isCorrect: true },
        { text: 'Reply to every Slack message before doing anything else', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'As a {job}, production issues take priority. But you don\'t need to read every message. Triage is key — assess severity, identify blockers, and then protect focused time for deep work. This is how experienced engineers manage their attention.',
    },
    {
      id: '', time: '9:00 AM', title: 'The Standup',
      description: 'Daily standup meeting. Your team of 6 gathers (some remote). You need to share your progress, blockers, and plans.',
      stickFigurePose: 'talking',
      choices: [
        { text: 'Give a vague "still working on the same thing" update', isCorrect: false },
        { text: 'Be specific: what you completed, what\'s blocking you, what you\'ll tackle today — keep it under 2 minutes', isCorrect: true },
        { text: 'Use the standup to start a 20-minute technical debate', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Standups are synchronization points, not discussion forums. A good {job} communicates clearly and concisely. Specific updates help the team identify collaboration opportunities and blockers quickly. Save deep dives for dedicated meetings.',
    },
    {
      id: '', time: '9:30 AM', title: 'Deep Work Block',
      description: 'You have a complex feature to implement. It requires redesigning a data model and updating three services. Your flow state beckons.',
      stickFigurePose: 'working',
      choices: [
        { text: 'Start coding immediately without a plan', isCorrect: false },
        { text: 'Spend 20 minutes sketching the architecture, identifying edge cases, then code with focus — headphones on, notifications off', isCorrect: true },
        { text: 'Ask someone else to do it because it seems hard', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'The best {job}s think before they code. 20 minutes of planning saves hours of refactoring. Architecture sketches, even rough ones, reveal edge cases early. Then, protecting your focus time is essential — context switching is the enemy of quality code.',
    },
    {
      id: '', time: '11:00 AM', title: 'The Code Review',
      description: 'A teammate has submitted a PR with 400 lines of changes. You\'re tagged as reviewer. The code works but has some design concerns.',
      stickFigurePose: 'reading',
      choices: [
        { text: 'Approve it quickly with a "LGTM" — it works, that\'s enough', isCorrect: false },
        { text: 'Review thoughtfully: acknowledge what\'s good, explain concerns with suggestions, distinguish between blockers and nits', isCorrect: true },
        { text: 'Leave 30 critical comments without any positive feedback', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Code review is a collaborative learning tool, not a gatekeeping exercise. A good {job} balances thoroughness with empathy — explaining *why* something could be better, not just that it should be. The best reviews teach both the author and the reviewer.',
    },
    {
      id: '', time: '12:30 PM', title: 'Lunch & Learn',
      description: 'A colleague is presenting a new technology the team is considering adopting. Lunch is provided. You also have code to write.',
      stickFigurePose: 'eating',
      choices: [
        { text: 'Skip it — you have "real work" to do', isCorrect: false },
        { text: 'Attend, engage with questions, evaluate how it applies to your work — staying current is part of the job', isCorrect: true },
        { text: 'Attend but zone out and check your phone', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Technology evolves rapidly. A {job} who stops learning becomes obsolete. Lunch & learns, tech talks, and knowledge sharing are investments in your career. Engaging with new ideas keeps your problem-solving toolkit sharp.',
    },
    {
      id: '', time: '2:00 PM', title: 'The Production Incident',
      description: 'Alarms fire. A service is returning 500 errors. Users are affected. The on-call engineer has escalated to your team.',
      stickFigurePose: 'running',
      choices: [
        { text: 'Panic and start making changes to production without understanding the issue', isCorrect: false },
        { text: 'Join the incident channel, check logs and metrics, form a hypothesis, communicate status, fix methodically', isCorrect: true },
        { text: 'Say "not my code, not my problem"', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Incidents reveal character. A {job} stays calm under pressure, follows incident response procedures, and communicates clearly. Logs before guesses. Hypothesis before fixes. And "not my code" isn\'t in a good engineer\'s vocabulary when users are impacted.',
    },
    {
      id: '', time: '3:30 PM', title: 'The Design Discussion',
      description: 'Your team is debating two architectural approaches for a new system. Both have tradeoffs. The discussion is getting heated.',
      stickFigurePose: 'thinking',
      choices: [
        { text: 'Stay quiet and let others decide', isCorrect: false },
        { text: 'Frame tradeoffs objectively, propose a decision framework, suggest a proof of concept if needed — disagree and commit once decided', isCorrect: true },
        { text: 'Insist your approach is the only right one', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Engineering is about tradeoffs, not absolutes. A strong {job} can articulate pros and cons without ego, suggest decision criteria, and commit to the team\'s choice even if it wasn\'t their preference. This is how great systems get built.',
    },
    {
      id: '', time: '4:30 PM', title: 'Mentoring Moment',
      description: 'A junior developer is stuck on a problem you solved months ago. They\'ve been struggling for hours.',
      stickFigurePose: 'presenting',
      choices: [
        { text: 'Fix it for them quickly — you have your own work to do', isCorrect: false },
        { text: 'Guide them through your thinking process, let them drive the keyboard, help them learn to solve similar problems independently', isCorrect: true },
        { text: 'Tell them to "just Google it"', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Mentoring multiplies your impact. A {job} who teaches creates more capable teammates. Guiding someone through the *process* of problem-solving is more valuable than handing them a solution. Today\'s mentoring investment pays compounding returns.',
    },
    {
      id: '', time: '5:30 PM', title: 'End of Day',
      description: 'Your feature isn\'t finished. You\'re at a natural stopping point but could push through for another hour or two.',
      stickFigurePose: 'tired',
      choices: [
        { text: 'Push through — sleep is for the weak', isCorrect: false },
        { text: 'Commit your work-in-progress, leave clear notes for tomorrow-you, and log off — sustainable pace prevents burnout', isCorrect: true },
        { text: 'Delete your branch and start over tomorrow with "fresh eyes"', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'The software industry has learned (painfully) that crunch doesn\'t work. A {job} who maintains sustainable pace produces better code, makes fewer mistakes, and stays in the profession longer. WIP commits and clear notes make tomorrow productive.',
    },
    {
      id: '', time: '8:00 PM', title: 'Personal Growth',
      description: 'You\'re home. You see tweets about a hot new framework. Your side project calls. So does your couch.',
      stickFigurePose: 'reading',
      choices: [
        { text: 'Spend 4 hours learning the new framework because FOMO', isCorrect: false },
        { text: 'Balance: some evenings for learning, some for rest. Stay curious but protect your energy — career is a marathon, not a sprint', isCorrect: true },
        { text: 'Never think about code outside of work hours', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'The best {job}s are lifelong learners, but they also have lives. Not every evening needs to be a coding session. Read broadly, go deep when inspired, but protect your recovery time. The engineers who last decades in this field are the ones who pace themselves.',
    },
  ],

  law: [
    {
      id: '', time: '6:00 AM', title: 'The Early Briefing',
      description: 'You wake to a notification: opposing counsel filed a motion late last night. Your client\'s hearing is at 10 AM today.',
      stickFigurePose: 'waking',
      choices: [
        { text: 'Ignore it until you get to the office', isCorrect: false },
        { text: 'Read the motion immediately, identify key arguments, begin preparing your response over coffee', isCorrect: true },
        { text: 'Call opposing counsel to complain about the late filing', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'As a {job}, you must always be prepared. Late filings are common tactics. The best lawyers use every available minute to understand the opponent\'s arguments and prepare counterpoints. Morning preparation often makes the difference in court.',
    },
    {
      id: '', time: '8:00 AM', title: 'Client Check-in',
      description: 'Your client is anxious about today\'s hearing. They\'ve sent three emails overnight asking about possible outcomes.',
      stickFigurePose: 'talking',
      choices: [
        { text: 'Ignore the emails — you\'ll see them in court', isCorrect: false },
        { text: 'Call the client, provide a calm and honest assessment, manage expectations, and outline your strategy', isCorrect: true },
        { text: 'Promise them everything will go perfectly', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Client management is half the job. A {job} provides honest assessments without false promises. Managing expectations while maintaining confidence is an art — your client needs to trust your judgment, and that trust is built through transparency.',
    },
    {
      id: '', time: '9:00 AM', title: 'Final Preparation',
      description: 'You have one hour before the hearing. Your notes are ready, but you want to review case law one more time.',
      stickFigurePose: 'reading',
      choices: [
        { text: 'Wing it — you know the material well enough', isCorrect: false },
        { text: 'Review key precedents, anticipate the judge\'s questions, practice your opening statement one more time', isCorrect: true },
        { text: 'Rewrite your entire argument from scratch', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Preparation is the foundation of legal excellence. A {job} reviews not just their own arguments but anticipates the opposition\'s strategy and the judge\'s likely concerns. The last hour of prep is about sharpening, not reinventing.',
    },
    {
      id: '', time: '10:00 AM', title: 'In the Courtroom',
      description: 'The hearing begins. The judge asks you a pointed question that challenges a key assumption in your argument.',
      stickFigurePose: 'presenting',
      choices: [
        { text: 'Deflect the question and redirect to your strongest point', isCorrect: false },
        { text: 'Address the question directly with case law, acknowledge the complexity, and explain why your position holds despite the challenge', isCorrect: true },
        { text: 'Admit your argument has a flaw and give up that point', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Judges respect candor and competence. A {job} who addresses tough questions directly earns credibility. Deflection is transparent and backfires. Prepared lawyers welcome hard questions because they\'ve already thought through the answers.',
    },
    {
      id: '', time: '12:00 PM', title: 'Post-Hearing Analysis',
      description: 'The hearing is over. The judge reserved decision. Your associate asks how it went.',
      stickFigurePose: 'thinking',
      choices: [
        { text: '"We crushed it" — overconfidence after a hearing', isCorrect: false },
        { text: 'Provide a balanced analysis: what arguments landed, what concerns the judge raised, what to prepare for either outcome', isCorrect: true },
        { text: '"We\'re doomed" — assume the worst', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Post-hearing analysis is where a {job} truly develops. Honest assessment of performance — what worked, what didn\'t, what the judge signaled — is essential for preparation and growth. Neither overconfidence nor despair serves the client.',
    },
    {
      id: '', time: '1:00 PM', title: 'New Case Intake',
      description: 'A potential client walks in with a complex case. Initial consultation reveals both strong and weak elements.',
      stickFigurePose: 'sitting',
      choices: [
        { text: 'Take the case immediately — any revenue is good revenue', isCorrect: false },
        { text: 'Evaluate the merits honestly, discuss fee structure transparently, and set realistic expectations about outcomes', isCorrect: true },
        { text: 'Turn them away because it\'s complicated', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Ethical practice begins at intake. A {job} evaluates whether they can genuinely help a client, is transparent about costs and odds, and never takes a case they can\'t competently handle. This protects both the client and your reputation.',
    },
    {
      id: '', time: '3:00 PM', title: 'Research Deep Dive',
      description: 'A novel legal question has emerged in one of your cases. There\'s limited precedent, and the area of law is evolving.',
      stickFigurePose: 'working',
      choices: [
        { text: 'Use AI to generate the answer and cite it directly', isCorrect: false },
        { text: 'Conduct thorough research across jurisdictions, analyze analogous cases, and develop a well-reasoned legal theory', isCorrect: true },
        { text: 'Ask a more experienced colleague to handle it', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Legal research is the backbone of lawyering. A {job} doesn\'t rely on shortcuts for novel questions. Cross-jurisdictional analysis, statutory interpretation, and analogous reasoning are the tools that build winning arguments. Verify everything you cite.',
    },
    {
      id: '', time: '5:00 PM', title: 'Billing & Administration',
      description: 'It\'s the end of the day, and you need to record your billable hours. You also have invoices to review and trust account reconciliation.',
      stickFigurePose: 'working',
      choices: [
        { text: 'Estimate your hours roughly — close enough', isCorrect: false },
        { text: 'Record accurate time entries contemporaneously, review trust accounts carefully — sloppy billing is an ethics violation', isCorrect: true },
        { text: 'Skip billing and do it all at the end of the month', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Lawyers have strict ethical obligations around billing and trust accounts. A {job} maintains meticulous records because inaccurate billing can result in bar complaints, malpractice claims, and loss of license. It\'s not glamorous, but it\'s essential.',
    },
    {
      id: '', time: '7:00 PM', title: 'Continuing Education',
      description: 'There\'s a bar association CLE seminar this evening on recent changes to evidence rules. You\'re tired but need CLE credits.',
      stickFigurePose: 'reading',
      choices: [
        { text: 'Skip it — you\'ll get credits later', isCorrect: false },
        { text: 'Attend and engage — CLE keeps you current on changes that directly affect your clients\' cases', isCorrect: true },
        { text: 'Log in remotely and mute it while doing other work', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'The law evolves constantly. A {job} who doesn\'t keep current risks providing outdated advice. CLE isn\'t just a bar requirement — it\'s how practitioners stay competent. The best lawyers view continuing education as an investment, not a chore.',
    },
    {
      id: '', time: '9:00 PM', title: 'The Evening Wind-Down',
      description: 'You\'re finally home. A client texts asking a "quick question" about their case. Your family is waiting for dinner.',
      stickFigurePose: 'tired',
      choices: [
        { text: 'Respond immediately with a detailed answer', isCorrect: false },
        { text: 'Acknowledge receipt, let them know you\'ll address it properly tomorrow, then be present with your family', isCorrect: true },
        { text: 'Ignore it completely', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Boundaries matter. A {job} acknowledges the client (so they don\'t panic) but doesn\'t provide hasty legal advice. Rushed responses lead to mistakes. Being present outside of work isn\'t selfish — it\'s how you sustain a decades-long career.',
    },
  ],

  culinary: [
    {
      id: '', time: '6:00 AM', title: 'Market Run',
      description: 'As a {job}, your day starts at the market. The seafood delivery just arrived, and you need to inspect the quality before accepting it.',
      stickFigurePose: 'walking',
      choices: [
        { text: 'Accept everything without checking — the supplier is usually reliable', isCorrect: false },
        { text: 'Inspect each item: check eyes, gills, smell, and firmness of fish; verify temperatures; reject anything substandard', isCorrect: true },
        { text: 'Send a kitchen assistant to handle it', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Quality starts at sourcing. A {job} personally inspects ingredients because the final dish is only as good as its components. Knowing how to evaluate freshness, reject substandard products, and build supplier relationships is fundamental.',
    },
    {
      id: '', time: '8:00 AM', title: 'Mise en Place',
      description: 'Before service begins, everything must be prepared. Your station needs to be organized, sauces prepped, proteins portioned.',
      stickFigurePose: 'working',
      choices: [
        { text: 'Start cooking immediately — you work better under pressure', isCorrect: false },
        { text: 'Methodically prep everything: mise en place is the foundation of professional cooking', isCorrect: true },
        { text: 'Delegate all prep work and focus on the "creative" parts', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: '"Mise en place" (everything in its place) isn\'t just a technique — it\'s a philosophy. A {job} knows that organized preparation is what allows you to execute flawlessly during the chaos of service. Every great chef respects the prep.',
    },
    {
      id: '', time: '10:00 AM', title: 'Menu Development',
      description: 'The season is changing and the menu needs updating. You have beautiful spring produce arriving next week.',
      stickFigurePose: 'thinking',
      choices: [
        { text: 'Keep the same menu — guests like consistency', isCorrect: false },
        { text: 'Design new dishes around seasonal ingredients, test recipes, balance the menu for variety and profitability', isCorrect: true },
        { text: 'Copy trending dishes from social media', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Seasonal cooking honors ingredients at their peak. A {job} balances creativity with practicality — considering food cost, kitchen capability, and guest expectations. Menu development is where culinary art meets business acumen.',
    },
    {
      id: '', time: '11:30 AM', title: 'Pre-Service Meeting',
      description: 'The team gathers before lunch service. You need to communicate today\'s specials, 86\'d items, and VIP reservations.',
      stickFigurePose: 'presenting',
      choices: [
        { text: 'Skip the meeting — everyone knows what to do', isCorrect: false },
        { text: 'Brief the team clearly: specials with tasting notes, allergen alerts, VIP details, and team encouragement', isCorrect: true },
        { text: 'Yell at the team to motivate them', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Pre-service meetings align the team. A {job} ensures every team member — from kitchen to front of house — understands the day\'s priorities. Clear communication prevents mistakes during service. Modern kitchens lead with respect, not intimidation.',
    },
    {
      id: '', time: '12:00 PM', title: 'The Rush',
      description: 'Lunch service hits full stride. Tickets are pouring in. The grill station falls behind. Tension rises.',
      stickFigurePose: 'running',
      choices: [
        { text: 'Start yelling and throwing things', isCorrect: false },
        { text: 'Jump in to help the struggling station, maintain calm communication, keep the line moving with clear calls', isCorrect: true },
        { text: 'Slow down the ticket printer', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Service is a team sport. A {job} leads by example during the rush — jumping in where needed, communicating calmly, and keeping the rhythm going. The best kitchens run on clear communication and mutual support, not fear.',
    },
    {
      id: '', time: '2:30 PM', title: 'Post-Service Review',
      description: 'Lunch service is over. Two dishes were sent back, and one table waited 25 minutes for their main course.',
      stickFigurePose: 'sitting',
      choices: [
        { text: 'Blame the server for the returns', isCorrect: false },
        { text: 'Review what went wrong objectively, identify process improvements, brief the team constructively', isCorrect: true },
        { text: 'Pretend it didn\'t happen — focus on dinner', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Every service teaches something. A {job} conducts honest post-mortems without blame. Understanding *why* dishes were returned or delayed leads to systemic improvements. The goal is continuous improvement, not perfection.',
    },
    {
      id: '', time: '4:00 PM', title: 'Training the Team',
      description: 'A new cook is learning your signature sauce. They\'re struggling with the emulsification technique.',
      stickFigurePose: 'presenting',
      choices: [
        { text: 'Do it yourself — it\'s faster', isCorrect: false },
        { text: 'Demonstrate slowly, explain the science, let them practice, taste together, provide constructive feedback', isCorrect: true },
        { text: 'Tell them to watch a YouTube video', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Teaching is how culinary traditions survive. A {job} who invests in training builds a stronger team and preserves their culinary vision. Explaining the "why" behind techniques — the science of emulsification, for example — creates cooks who can adapt, not just follow recipes.',
    },
    {
      id: '', time: '5:30 PM', title: 'Dinner Prep',
      description: 'Dinner service starts in 90 minutes. The evening menu is more complex. A key ingredient delivery is delayed.',
      stickFigurePose: 'thinking',
      choices: [
        { text: 'Cancel the dish that needs the ingredient', isCorrect: false },
        { text: 'Adapt: create a substitute preparation, inform front of house, adjust the menu card, brief the team on changes', isCorrect: true },
        { text: 'Send someone to three stores to find the exact ingredient', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Adaptability is a chef\'s superpower. A {job} who can pivot creatively when plans change demonstrates true mastery. Some of the greatest dishes in culinary history were born from improvisation when ingredients weren\'t available.',
    },
    {
      id: '', time: '9:30 PM', title: 'Last Call',
      description: 'Dinner service is winding down. The kitchen is a mess. Your team is exhausted. One more table just sat down.',
      stickFigurePose: 'tired',
      choices: [
        { text: 'Rush their food so you can close', isCorrect: false },
        { text: 'Give the last table the same quality as the first, then lead the team through cleanup and close-down procedures', isCorrect: true },
        { text: 'Tell front of house to stop seating', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'The last plate must be as good as the first. A {job} maintains standards until the last guest is served. Then, proper close-down — cleaning, organizing, prepping for tomorrow — sets the stage for another great service.',
    },
    {
      id: '', time: '11:00 PM', title: 'After Service',
      description: 'You\'re finally done. Fifteen hours on your feet. Your body aches but there\'s a quiet satisfaction.',
      stickFigurePose: 'celebrating',
      choices: [
        { text: 'Complain about the long hours', isCorrect: false },
        { text: 'Decompress with the team briefly, review tomorrow\'s prep list, then go home knowing you fed people well today', isCorrect: true },
        { text: 'Stay and work on tomorrow\'s prep', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'The {job} life is demanding but deeply fulfilling. Those quiet moments after service — when the kitchen is clean and the day is done — are where the love for the craft lives. Rest tonight, because tomorrow starts again early.',
    },
  ],

  education: [
    {
      id: '', time: '6:30 AM', title: 'Morning Preparation',
      description: 'You arrive at school early as a {job}. Today you have a challenging lesson planned on a topic students historically struggle with.',
      stickFigurePose: 'waking',
      choices: [
        { text: 'Use last year\'s lesson plan without changes', isCorrect: false },
        { text: 'Review and adapt your lesson plan, set up materials, create backup activities in case the approach isn\'t landing', isCorrect: true },
        { text: 'Wing it — you know the material', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Great teaching requires preparation AND flexibility. A {job} adapts lessons based on what they\'ve learned about their students. Having backup approaches shows professional maturity — not every lesson lands as planned, and that\'s okay.',
    },
    {
      id: '', time: '8:00 AM', title: 'First Period',
      description: 'Class begins. One student is disruptive, two are disengaged, but most are ready to learn. Your lesson is on a difficult concept.',
      stickFigurePose: 'presenting',
      choices: [
        { text: 'Send the disruptive student out immediately', isCorrect: false },
        { text: 'Use a proximity strategy for the disruptive student, engage the disengaged with a question, and launch into an interactive hook for the whole class', isCorrect: true },
        { text: 'Lecture for 50 straight minutes from your notes', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Classroom management is an art. A {job} uses multiple strategies simultaneously — proximity, engagement techniques, varied instruction — to reach every student. Removing students should be a last resort; inclusion and redirection build better learning environments.',
    },
    {
      id: '', time: '10:00 AM', title: 'The Struggling Student',
      description: 'During office hours, a student comes to you in tears. They\'re failing your class and their parents are putting intense pressure on them.',
      stickFigurePose: 'sitting',
      choices: [
        { text: 'Tell them to study harder', isCorrect: false },
        { text: 'Listen empathetically, help identify specific struggles, create an action plan together, and connect them with support resources', isCorrect: true },
        { text: 'Lower your standards to pass them', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Behind every grade is a human being. A {job} recognizes that academic struggles often have deeper roots — learning differences, home stress, self-confidence issues. Identifying the real problem and building a supportive plan is more effective than either sympathy or tough love alone.',
    },
    {
      id: '', time: '11:30 AM', title: 'Curriculum Meeting',
      description: 'Department meeting to discuss standardized test preparation. Some colleagues want to "teach to the test." You have concerns.',
      stickFigurePose: 'talking',
      choices: [
        { text: 'Stay quiet and go along with whatever is decided', isCorrect: false },
        { text: 'Share your perspective on balancing test prep with deeper learning, propose specific strategies that accomplish both goals', isCorrect: true },
        { text: 'Refuse to do any test prep in your classroom', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Education is full of tensions between testing and teaching. A {job} advocates for students by finding middle ground — strategies that build genuine understanding while also preparing students for assessments. Constructive dialogue with colleagues strengthens the whole department.',
    },
    {
      id: '', time: '12:30 PM', title: 'Lunch Duty',
      description: 'It\'s your day for lunch supervision. The cafeteria is loud, students are socializing, and you notice a student sitting alone.',
      stickFigurePose: 'walking',
      choices: [
        { text: 'Stand by the door and check your phone', isCorrect: false },
        { text: 'Walk around engaging with students, check in with the isolated student casually, stay alert for any issues', isCorrect: true },
        { text: 'Use the time to grade papers at a table', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'A {job} is always teaching, even during lunch duty. Casual interactions build relationships that make classroom teaching more effective. And noticing the student who\'s alone — that awareness has literally saved lives. Every interaction matters.',
    },
    {
      id: '', time: '1:30 PM', title: 'The Lesson That Flopped',
      description: 'Your afternoon lesson didn\'t work. Students were confused, your activity fell flat, and you can feel the energy draining from the room.',
      stickFigurePose: 'thinking',
      choices: [
        { text: 'Power through the plan regardless', isCorrect: false },
        { text: 'Pause, acknowledge it\'s not working, pivot to a different approach — ask students what they need to understand the concept', isCorrect: true },
        { text: 'Give up and show a video', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'The ability to pivot mid-lesson is what separates good {job}s from great ones. Acknowledging that something isn\'t working shows students that adaptability is a strength, not a weakness. Student feedback in the moment is valuable data.',
    },
    {
      id: '', time: '3:00 PM', title: 'After School',
      description: 'The bell rings. You have a stack of assignments to grade, parent emails to return, and a student who wants extra help.',
      stickFigurePose: 'working',
      choices: [
        { text: 'Leave immediately — your contract hours are over', isCorrect: false },
        { text: 'Help the student first (they took initiative to ask), then tackle the most urgent emails, and plan your grading strategy', isCorrect: true },
        { text: 'Try to do everything at once', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Teaching extends beyond the bell. A {job} prioritizes the student seeking help (rewarding initiative), manages communications professionally, and develops sustainable strategies for the never-ending grading pile. Prioritization is survival.',
    },
    {
      id: '', time: '5:00 PM', title: 'Parent Communication',
      description: 'A parent emails you, upset about their child\'s grade. The tone is accusatory: "You\'re not teaching my child properly."',
      stickFigurePose: 'reading',
      choices: [
        { text: 'Respond defensively — you\'re doing your best', isCorrect: false },
        { text: 'Respond professionally and empathetically, share specific data about their child\'s progress, suggest a meeting to collaborate on strategies', isCorrect: true },
        { text: 'Ignore the email', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Angry parent emails are really expressions of concern for their child. A {job} depersonalizes the tone, responds with data and empathy, and positions themselves as an ally. "We both want the best for your child" is always the starting point.',
    },
    {
      id: '', time: '7:00 PM', title: 'Evening Grading',
      description: 'You\'re home with 60 essays to grade. Each one deserves meaningful feedback, but that takes 10 minutes per essay.',
      stickFigurePose: 'working',
      choices: [
        { text: 'Grade them all tonight even if it takes until midnight', isCorrect: false },
        { text: 'Set a reasonable batch (15-20 tonight), provide quality feedback using a rubric, and spread the rest across the week', isCorrect: true },
        { text: 'Give everyone a B and call it done', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Meaningful feedback is one of the most impactful things a {job} provides. But quality requires sustainable pacing. A rubric ensures consistency, batching prevents burnout, and students benefit more from thoughtful comments than from rushed grades.',
    },
    {
      id: '', time: '9:00 PM', title: 'Tomorrow\'s Promise',
      description: 'Before bed, you review tomorrow\'s plans. A difficult student said something interesting today that showed a spark of engagement.',
      stickFigurePose: 'celebrating',
      choices: [
        { text: 'Focus on how exhausting today was', isCorrect: false },
        { text: 'Hold onto that spark — plan a way to build on that student\'s interest tomorrow. Those moments are why you teach.', isCorrect: true },
        { text: 'Stop caring — it\'s just a job', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Teaching lives in those small moments of breakthrough. A {job} who notices and nurtures those sparks can change the trajectory of a student\'s life. It\'s exhausting work, but when a disconnected student suddenly engages — that\'s the magic that keeps educators going.',
    },
  ],

  executive: [
    {
      id: '', time: '5:30 AM', title: 'The Strategic Morning',
      description: 'Your day starts before the organization wakes up. As a {job}, the quiet morning hours are your time for strategic thinking.',
      stickFigurePose: 'waking',
      choices: [
        { text: 'Check social media and news for an hour', isCorrect: false },
        { text: 'Review key metrics, scan industry news, and spend 30 minutes on strategic thinking before the day\'s meetings consume you', isCorrect: true },
        { text: 'Sleep in — leadership is about delegation', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'As a {job}, your most important work is often thinking, not doing. Early morning strategic time — before the inbox and meeting requests flood in — is when vision becomes strategy. The best leaders protect this thinking time religiously.',
    },
    {
      id: '', time: '7:30 AM', title: 'The Executive Team Sync',
      description: 'Weekly leadership meeting. Your team leads are presenting quarterly progress. One department is significantly behind targets.',
      stickFigurePose: 'sitting',
      choices: [
        { text: 'Call out the underperforming leader publicly', isCorrect: false },
        { text: 'Note the gap, ask clarifying questions about root causes, schedule a private follow-up, and keep the meeting focused on solutions', isCorrect: true },
        { text: 'Move on without addressing it', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Public criticism destroys trust. A {job} addresses performance issues directly but privately. In team settings, the focus should be on understanding and solving, not blaming. Your team takes cues from how you handle adversity.',
    },
    {
      id: '', time: '9:00 AM', title: 'The Hard Decision',
      description: 'Market conditions have shifted. You need to decide whether to invest heavily in a new initiative or conserve resources. Both paths carry significant risk.',
      stickFigurePose: 'thinking',
      choices: [
        { text: 'Go with your gut — that\'s what leaders do', isCorrect: false },
        { text: 'Gather data, consult advisors, weigh scenarios, make a decision with conviction, and communicate the reasoning clearly to the organization', isCorrect: true },
        { text: 'Postpone the decision indefinitely until more data is available', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Leadership is about making decisions with incomplete information. A {job} balances data-driven analysis with decisive action. Delaying indefinitely is itself a decision — usually a bad one. Once decided, clear communication of the "why" aligns the organization.',
    },
    {
      id: '', time: '10:30 AM', title: 'Stakeholder Management',
      description: 'A board member calls with concerns about the company\'s direction. They\'ve heard rumors and want reassurance.',
      stickFigurePose: 'talking',
      choices: [
        { text: 'Dismiss their concerns — you\'re running the company', isCorrect: false },
        { text: 'Listen actively, address concerns with data, share your vision and strategy, and agree on regular update cadence', isCorrect: true },
        { text: 'Panic and change strategy based on their input', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Board relationships require trust and transparency. A {job} doesn\'t dismiss concerns or overreact to them. Regular, proactive communication prevents rumors from becoming crises. Governance is a partnership, not an adversarial relationship.',
    },
    {
      id: '', time: '12:00 PM', title: 'The Culture Question',
      description: 'An employee survey reveals that morale has dropped 15% in the last quarter. HR presents the data with proposed actions.',
      stickFigurePose: 'reading',
      choices: [
        { text: 'Dismiss it — surveys are always negative', isCorrect: false },
        { text: 'Take it seriously: understand the drivers, own your contribution to the issue, commit to visible action, and follow up', isCorrect: true },
        { text: 'Mandate a company fun day to boost morale', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Culture is a leading indicator. A {job} who ignores morale data will face retention and performance problems later. The best leaders own their role in culture issues, take targeted action (not superficial fixes), and follow through visibly.',
    },
    {
      id: '', time: '2:00 PM', title: 'The Talent Call',
      description: 'A key executive is leaving for a competitor. They\'re a top performer who leads a critical team.',
      stickFigurePose: 'talking',
      choices: [
        { text: 'Let them go without conversation — you don\'t counteroffer on principle', isCorrect: false },
        { text: 'Have an honest conversation: understand their reasons, evaluate whether to counteroffer thoughtfully, and immediately plan for succession either way', isCorrect: true },
        { text: 'Offer double their salary in a panic', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Losing top talent is one of the most costly events for any organization. A {job} has honest exit conversations to understand systemic issues, makes thoughtful retention decisions, and always plans for succession. The conversation itself often reveals important organizational insights.',
    },
    {
      id: '', time: '4:00 PM', title: 'Innovation vs. Execution',
      description: 'Your innovation team has a breakthrough idea that could disrupt your own core product. It\'s risky but potentially transformative.',
      stickFigurePose: 'thinking',
      choices: [
        { text: 'Shut it down — don\'t cannibalize your core business', isCorrect: false },
        { text: 'Evaluate the opportunity: if you don\'t disrupt yourself, someone else will. Create a protected space to explore while maintaining core execution', isCorrect: true },
        { text: 'Pivot the entire company to the new idea immediately', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'The innovator\'s dilemma is real. A {job} who protects the status quo at all costs eventually gets disrupted by someone else. But reckless pivots destroy value. The art is creating space for innovation while maintaining the core — ambidextrous leadership.',
    },
    {
      id: '', time: '5:30 PM', title: 'The Public Moment',
      description: 'A journalist calls about a controversial decision your company made. The story is going to run regardless of whether you comment.',
      stickFigurePose: 'presenting',
      choices: [
        { text: '"No comment" — never talk to the press', isCorrect: false },
        { text: 'Coordinate with your communications team, prepare a clear and honest statement, and engage thoughtfully — your silence will be filled by others\' narratives', isCorrect: true },
        { text: 'Go off-script and speak emotionally', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: '"No comment" is itself a comment — and it\'s never flattering. A {job} engages with media strategically, prepared and on-message. In the age of social media, your narrative must be proactive. Authenticity and preparation aren\'t contradictions.',
    },
    {
      id: '', time: '7:00 PM', title: 'The Working Dinner',
      description: 'Dinner with a potential strategic partner. The conversation could lead to a transformative deal or fizzle into nothing.',
      stickFigurePose: 'eating',
      choices: [
        { text: 'Pitch aggressively throughout dinner', isCorrect: false },
        { text: 'Build genuine rapport, listen to understand their needs, find natural alignment, and plant seeds for future collaboration', isCorrect: true },
        { text: 'Keep it purely social — no business talk', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'The best deals are born from relationships, not pitches. A {job} uses dinners to build genuine connections, understand the other party\'s world, and find natural win-wins. Trust built over a meal is worth more than the slickest presentation deck.',
    },
    {
      id: '', time: '10:00 PM', title: 'The Weight of Leadership',
      description: 'Alone at home, you think about the people whose livelihoods depend on your decisions. The weight is real. Tomorrow brings more hard calls.',
      stickFigurePose: 'tired',
      choices: [
        { text: 'Let the anxiety keep you up all night', isCorrect: false },
        { text: 'Acknowledge the weight, practice your stress management routine, trust your preparation, and rest — tomorrow needs your best thinking', isCorrect: true },
        { text: 'Convince yourself it doesn\'t matter', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'The loneliness of leadership is rarely discussed but universally felt. A {job} who pretends the weight doesn\'t exist either burns out or becomes callous. The best leaders acknowledge the responsibility, develop coping strategies, and find trusted confidants. Self-care isn\'t optional at the top.',
    },
  ],

  default: [
    {
      id: '', time: '6:30 AM', title: 'The Morning Routine',
      description: 'Your alarm goes off. As a {job}, your workday starts in about an hour. You have emails from yesterday and a full schedule ahead.',
      stickFigurePose: 'waking',
      choices: [
        { text: 'Stay in bed scrolling through social media', isCorrect: false },
        { text: 'Get up, follow your morning routine, and mentally preview the day\'s priorities while getting ready', isCorrect: true },
        { text: 'Call in sick — you don\'t feel like working today', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'As a {job}, starting the day with intention sets the tone. Most successful professionals have a consistent morning routine that includes mental preparation. Previewing your priorities helps you hit the ground running instead of being reactive.',
    },
    {
      id: '', time: '8:00 AM', title: 'Arrival & Prioritization',
      description: 'You arrive at work. Your inbox has 23 unread messages, your colleague needs help with something urgent, and you have a deadline at 3 PM.',
      stickFigurePose: 'working',
      choices: [
        { text: 'Start with the emails — clear the inbox first', isCorrect: false },
        { text: 'Assess urgency: help your colleague if it\'s truly urgent, then block focused time for your deadline, and batch emails for later', isCorrect: true },
        { text: 'Tell your colleague you\'re busy and close your door', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'A {job} who reacts to every input becomes everyone else\'s priority manager. Effective prioritization means distinguishing between truly urgent requests and everything else. Helping colleagues matters, but so does protecting time for your own critical work.',
    },
    {
      id: '', time: '9:30 AM', title: 'The Team Meeting',
      description: 'Weekly team meeting. Your manager asks for updates. A colleague takes credit for work you contributed to significantly.',
      stickFigurePose: 'talking',
      choices: [
        { text: 'Call them out in front of everyone', isCorrect: false },
        { text: 'Share your specific contributions naturally when it\'s your turn, and address the credit issue privately afterward', isCorrect: true },
        { text: 'Say nothing and seethe quietly', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Workplace credit issues are common. A {job} handles them with professionalism — making their contributions visible without creating conflict, and addressing concerns directly and privately. Building a reputation for both competence and maturity serves you long-term.',
    },
    {
      id: '', time: '10:30 AM', title: 'The Complex Problem',
      description: 'You encounter a problem in your work that you\'ve never faced before. Your usual approaches aren\'t working.',
      stickFigurePose: 'thinking',
      choices: [
        { text: 'Keep trying the same approach harder', isCorrect: false },
        { text: 'Step back, research the problem, consult an experienced colleague, and approach it from a different angle', isCorrect: true },
        { text: 'Pass it to someone else', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Every {job} faces novel challenges. The ability to recognize when you\'re stuck, seek knowledge, and adapt your approach is what distinguishes growing professionals from stagnant ones. Asking for help isn\'t weakness — it\'s resourcefulness.',
    },
    {
      id: '', time: '12:00 PM', title: 'The Lunch Decision',
      description: 'Lunchtime. A group of colleagues invites you to join them. You also have work you could catch up on.',
      stickFigurePose: 'eating',
      choices: [
        { text: 'Always eat alone at your desk — maximize productivity', isCorrect: false },
        { text: 'Join your colleagues — relationships and informal networking are investments in your career, and breaks improve afternoon productivity', isCorrect: true },
        { text: 'Take a 2-hour lunch break by yourself', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Research shows that taking proper breaks improves afternoon performance. For a {job}, the relationships built during informal moments often become the professional network that opens doors. The "too busy to eat" culture is counterproductive.',
    },
    {
      id: '', time: '1:30 PM', title: 'The Client/Stakeholder Challenge',
      description: 'A client or stakeholder is unhappy with a deliverable. Their feedback is partly valid and partly unreasonable.',
      stickFigurePose: 'talking',
      choices: [
        { text: 'Defend your work aggressively — they\'re wrong', isCorrect: false },
        { text: 'Listen fully, acknowledge the valid points, push back professionally on unreasonable asks with data, and propose a path forward', isCorrect: true },
        { text: 'Agree to everything they want even if it\'s impossible', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Client management requires both humility and backbone. A {job} who can acknowledge legitimate criticism while professionally pushing back on unreasonable demands earns respect. "Yes to everything" leads to burnout and broken promises. "No to everything" loses relationships.',
    },
    {
      id: '', time: '3:00 PM', title: 'The Deadline',
      description: 'Your 3 PM deadline is here. The work is 90% done but not perfect. Your manager is waiting for it.',
      stickFigurePose: 'running',
      choices: [
        { text: 'Submit it incomplete without explanation', isCorrect: false },
        { text: 'Submit the strong 90%, clearly flag what\'s pending, provide a timeline for completion, and communicate proactively', isCorrect: true },
        { text: 'Ask for a deadline extension at the last minute', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Perfect is the enemy of done, but incomplete without communication erodes trust. A {job} who delivers strong work with transparent communication about gaps is far more valued than one who either misses deadlines silently or submits substandard work on time.',
    },
    {
      id: '', time: '4:00 PM', title: 'The Learning Opportunity',
      description: 'A workshop or training session is offered in a skill adjacent to your role. It\'s during work hours and you have tasks to complete.',
      stickFigurePose: 'reading',
      choices: [
        { text: 'Skip it — you have "real work" to do', isCorrect: false },
        { text: 'Attend if possible — professional development expands your capabilities and career options. Manage your task list accordingly.', isCorrect: true },
        { text: 'Sign up but don\'t actually go', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'A {job} who only does today\'s work never grows into tomorrow\'s opportunities. Professional development isn\'t extra — it\'s part of the job. The most successful professionals invest consistently in learning, even when it means adjusting their immediate task list.',
    },
    {
      id: '', time: '5:30 PM', title: 'End of Day',
      description: 'The workday is officially over. You have unfinished tasks, but nothing is on fire. Tomorrow is another day.',
      stickFigurePose: 'walking',
      choices: [
        { text: 'Stay until everything is done, however long it takes', isCorrect: false },
        { text: 'Wrap up, document where you left off, set tomorrow\'s priorities, and leave — sustainable pace is a professional skill', isCorrect: true },
        { text: 'Leave abruptly without wrapping anything up', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Knowing when to stop is as important as knowing how to start. A {job} who works sustainably produces better results over time than one who burns the candle at both ends. Documenting your state makes tomorrow\'s start smoother.',
    },
    {
      id: '', time: '8:00 PM', title: 'The Evening Balance',
      description: 'You\'re home. Work thoughts linger — that unresolved problem, tomorrow\'s meeting, the career question that keeps nagging you.',
      stickFigurePose: 'tired',
      choices: [
        { text: 'Open your laptop and work until midnight', isCorrect: false },
        { text: 'Jot down any important thoughts for tomorrow, then engage in something restorative — the problem will still be there, and a rested mind solves it better', isCorrect: true },
        { text: 'Completely suppress all thoughts about work', isCorrect: false },
      ],
      correctChoiceIndex: 1,
      explanation: 'Work-life integration (not balance — the word "balance" implies they\'re opposed) is about being present where you are. A {job} captures important thoughts so they don\'t nag, then invests in recovery. Research consistently shows that rest and hobbies improve professional performance.',
    },
  ],
};
