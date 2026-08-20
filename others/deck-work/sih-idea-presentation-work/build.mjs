import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const OUT = '/Users/kamal/Desktop/My projects/Career Simulation/deliverables/CareerCase_SIH2026_Idea_Presentation.pptx';
const TMP = '/Users/kamal/Desktop/My projects/Career Simulation/.tmp-careercase-sih';
const W = 1280, H = 720;
const C = { paper: '#F9F8F6', ink: '#0A0A0A', soft: '#4A4A4A', faint: '#666662', red: '#E63946', yellow: '#FFD166', white: '#FFFFFF', gray: '#E7E5E1' };

async function blob(path, b) { await fs.writeFile(path, new Uint8Array(await b.arrayBuffer())); }
function box(slide, x, y, w, h, fill = 'none', line = 'none', name = '') {
  return slide.shapes.add({ geometry: 'rect', name, position: { left:x, top:y, width:w, height:h }, fill, line: { style:'solid', fill:line, width: line === 'none' ? 0 : 1.25 } });
}
function text(slide, value, x, y, w, h, size, opts = {}) {
  const s = slide.shapes.add({ geometry:'textbox', name:opts.name || '', position:{left:x,top:y,width:w,height:h}, fill:'none', line:{style:'solid',fill:'none',width:0} });
  s.text = value;
  s.text.style = { fontSize:size, color:opts.color || C.ink, bold:opts.bold ?? false, fontFamily:opts.font || 'Inter', alignment:opts.align || 'left', lineSpacing:opts.leading || 1.05 };
  return s;
}
function rule(slide, x, y, w, color=C.ink, weight=2) { return box(slide,x,y,w,weight,color,'none'); }
function brand(slide, no) {
  text(slide, 'CAREER', 72, 42, 115, 20, 14, { bold:true, font:'JetBrains Mono', color:C.ink, name:'brand-career' });
  text(slide, 'CASE', 188, 42, 80, 20, 14, { bold:true, font:'JetBrains Mono', color:C.faint, name:'brand-case' });
  box(slide, 268, 43, 10, 10, C.red, 'none');
  text(slide, `0${no}`, 1140, 42, 68, 20, 13, { bold:true, font:'JetBrains Mono', color:C.faint, align:'right' });
  rule(slide,72,74,1136,C.ink,1);
}
function tag(slide, value, x, y, w, color=C.red) { text(slide,value.toUpperCase(),x,y,w,20,12,{bold:true,font:'JetBrains Mono',color, name:'eyebrow'}); }
function hardCard(slide,x,y,w,h, opts={}) { box(slide,x+5,y+5,w,h,C.ink,'none'); return box(slide,x,y,w,h,opts.fill || C.white,C.ink,'card'); }
function dot(slide,x,y,r,color=C.red) { return slide.shapes.add({geometry:'ellipse',position:{left:x,top:y,width:r,height:r},fill:color,line:{style:'solid',fill:'none',width:0}}); }
function note(slide, sources) { slide.speakerNotes.textFrame.setText(`[Sources]\n${sources.join('\n')}`); slide.speakerNotes.setVisible(true); }

const deck = Presentation.create({slideSize:{width:W,height:H}});

// 1 — Title
{
 const s=deck.slides.add(); s.background.fill=C.paper;
 box(s,0,0,22,H,C.red,'none');
 text(s,'CAREER',72,70,220,30,20,{bold:true,font:'JetBrains Mono'}); text(s,'CASE',225,70,120,30,20,{bold:true,font:'JetBrains Mono',color:C.faint}); dot(s,343,77,13,C.red);
 tag(s,'Smart India Hackathon 2026 · Smart Education · Software',72,145,700);
 text(s,'A career decision\nshould come with\na case.',72,185,760,230,67,{bold:true,font:'Playfair Display',leading:.91,name:'title'});
 rule(s,72,443,550,C.ink,2);
 text(s,'CareerCase turns aptitude, aspirations, abilities and experience into explainable, India-grounded career pathways.',72,470,630,82,23,{color:C.soft,leading:1.22});
 hardCard(s,875,183,270,250,{fill:C.yellow});
 text(s,'AI-ENHANCED\nCAREER GUIDANCE',905,220,210,55,17,{bold:true,font:'JetBrains Mono',leading:1.05});
 text(s,'PS ID',905,307,100,18,12,{bold:true,font:'JetBrains Mono',color:C.faint});
 text(s,'SIH260480',905,330,190,35,29,{bold:true});
 text(s,'TEAM CAREERCASE',72,636,300,20,13,{bold:true,font:'JetBrains Mono'});
 text(s,'Ministry of Skill Development & Entrepreneurship',765,636,443,20,13,{font:'JetBrains Mono',color:C.faint,align:'right'});
 note(s,['User-provided: The Problem Statement.md (SIH260480).','Internal: PROJECT_BRIEF.md.']);
}

// 2 — Proposed solution
{
 const s=deck.slides.add(); s.background.fill=C.paper; brand(s,2);
 tag(s,'Proposed solution',72,108,250);
 text(s,'Not a chatbot.\nA career case file.',72,140,560,125,52,{bold:true,font:'Playfair Display',leading:.92});
 text(s,'CareerCase builds a living Career Passport, ranks viable occupations transparently, then maps the next steps to get there.',72,286,560,70,21,{color:C.soft,leading:1.25});
 // pathway line first
 rule(s,156,461,745,C.ink,2); rule(s,901,461,55,C.red,4);
 const stages=[['01','PROFILE','Aptitude · interests\nvalues · experience'],['02','MATCH','Explainable fit\nacross 11 dimensions'],['03','MOVE','Skill gaps · routes\nprogress tracking']];
 stages.forEach((a,i)=>{const x=107+i*283; dot(s,x+25,437,48,i===1?C.red:C.ink); text(s,a[0],x+25,451,48,18,11,{bold:true,color:C.white,align:'center',font:'JetBrains Mono'}); text(s,a[1],x,510,145,20,15,{bold:true,font:'JetBrains Mono'}); text(s,a[2],x,541,195,50,16,{color:C.soft,leading:1.2});});
 hardCard(s,856,140,280,200,{fill:C.ink});
 text(s,'THE OUTPUT',885,171,180,18,12,{bold:true,font:'JetBrains Mono',color:C.yellow});
 text(s,'Every match\ncomes with\na reason.',885,208,210,85,28,{bold:true,font:'Playfair Display',color:C.white,leading:.94});
 text(s,'Students · professionals',885,315,205,20,13,{font:'JetBrains Mono',color:'#D7D7D2'});
 note(s,['User-provided: The Problem Statement.md.','Internal: PROJECT_BRIEF.md — Career Passport, matching engine, pathway engine.']);
}

// 3 — Technical approach
{
 const s=deck.slides.add(); s.background.fill=C.paper; brand(s,3);
 tag(s,'Technical approach',72,108,260);
 text(s,'Evidence in.\nAction explained.',72,140,565,112,51,{bold:true,font:'Playfair Display',leading:.92});
 text(s,'A hybrid architecture keeps high-stakes decisions deterministic—and uses AI where language and live context add value.',72,275,590,58,20,{color:C.soft,leading:1.24});
 // connectors then columns
 rule(s,364,448,83,C.ink,2); rule(s,759,448,83,C.ink,2); text(s,'→',430,426,30,31,24,{bold:true}); text(s,'→',825,426,30,31,24,{bold:true});
 hardCard(s,72,374,292,190,{fill:C.white}); hardCard(s,447,374,312,190,{fill:C.ink}); hardCard(s,842,374,294,190,{fill:C.white});
 text(s,'CAREER PASSPORT',96,404,210,20,14,{bold:true,font:'JetBrains Mono'}); text(s,'Assessments, resume,\nskills, aspirations,\nconstraints',96,442,210,76,21,{bold:true,font:'Playfair Display',leading:1.03});
 text(s,'DETERMINISTIC CORE',471,404,220,20,14,{bold:true,font:'JetBrains Mono',color:C.yellow}); text(s,'11-dimension fit\n+ pathway engine',471,442,252,57,23,{bold:true,font:'Playfair Display',color:C.white,leading:1.0}); text(s,'NCO-2015 · NSQF · skill taxonomy',471,520,252,18,13,{font:'JetBrains Mono',color:'#D7D7D2'});
 text(s,'GUIDANCE LAYER',866,404,180,20,14,{bold:true,font:'JetBrains Mono'}); text(s,'Dossiers, market\nsignals & counselor\nconversation',866,442,220,76,21,{bold:true,font:'Playfair Display',leading:1.03});
 text(s,'React + TypeScript  /  Supabase + PostgreSQL  /  Cloudflare Worker  /  AI assistance for narrative—not scoring',72,638,1064,20,13,{font:'JetBrains Mono',color:C.faint});
 note(s,['Internal: PROJECT_BRIEF.md — architecture and technology stack.','National Career Service NCO-2015: https://www.ncs.gov.in/Documents/National%20Classification%20of%20Occupations%20_Vol%20I-%202015.pdf','National Qualifications Register: https://www.nqr.gov.in']);
}

// 4 — Feasibility and viability
{
 const s=deck.slides.add(); s.background.fill=C.paper; brand(s,4);
 tag(s,'Feasibility & viability',72,108,300);
 text(s,'Built for trust\nwhen choices matter.',72,140,590,112,51,{bold:true,font:'Playfair Display',leading:.92});
 text(s,'CareerCase is a software-first system with a deployable stack and a deliberate answer to the risks of AI-led guidance.',72,274,610,58,20,{color:C.soft,leading:1.24});
 const rows=[['BLACK-BOX ADVICE','Deterministic scoring + “Why this?” evidence'],['STALE MARKET SIGNALS','Cached, dated intelligence with a visible source trail'],['UNEQUAL ACCESS','Mobile-first, simple language, multilingual-ready UX'],['SENSITIVE CAREER DATA','Consent-led profile; minimal data; secure persistence']];
 rows.forEach((r,i)=>{const y=366+i*61; box(s,72,y,1064,1,C.ink,'none'); text(s,r[0],92,y+17,260,20,13,{bold:true,font:'JetBrains Mono',color:i===0?C.red:C.ink}); text(s,r[1],402,y+15,675,26,19,{color:C.soft});});
 hardCard(s,858,132,278,162,{fill:C.yellow}); text(s,'VIABLE NOW',883,159,170,18,12,{bold:true,font:'JetBrains Mono'}); text(s,'Software-first\nprototype.\nReal product logic.',883,191,220,76,27,{bold:true,font:'Playfair Display',leading:.94});
 note(s,['Internal: PROJECT_BRIEF.md — deterministic core, product architecture, privacy approach.']);
}

// 5 — Impact
{
 const s=deck.slides.add(); s.background.fill=C.paper; brand(s,5);
 tag(s,'Impact & benefits',72,108,260);
 text(s,'A next move\nwith a reason.',72,140,500,112,51,{bold:true,font:'Playfair Display',leading:.92});
 text(s,'CareerCase moves guidance from one-time advice to a living, evidence-backed plan.',72,274,520,55,20,{color:C.soft,leading:1.24});
 hardCard(s,72,370,300,190,{fill:C.ink}); hardCard(s,438,370,300,190,{fill:C.white}); hardCard(s,804,370,332,190,{fill:C.white});
 text(s,'FOR LEARNERS',98,401,190,18,12,{bold:true,font:'JetBrains Mono',color:C.yellow}); text(s,'Clarity before\ntime & money\nare spent.',98,434,220,73,30,{bold:true,font:'Playfair Display',color:C.white,leading:.94});
 text(s,'FOR COUNSELLORS',464,401,200,18,12,{bold:true,font:'JetBrains Mono',color:C.red}); text(s,'A shared case file\nfor better\nconversations.',464,434,234,82,27,{bold:true,font:'Playfair Display',leading:.94});
 text(s,'FOR THE ECOSYSTEM',830,401,240,18,12,{bold:true,font:'JetBrains Mono',color:C.red}); text(s,'A bridge between\npeople, skills &\nprogression paths.',830,434,260,82,27,{bold:true,font:'Playfair Display',leading:.94});
 text(s,'Scales across school, college, job search, career transitions and professional advancement.',72,634,1064,20,14,{font:'JetBrains Mono',color:C.faint});
 note(s,['User-provided: The Problem Statement.md — expected outcomes.','Internal: PROJECT_BRIEF.md — supported user segments and user journey.']);
}

// 6 — Research & close
{
 const s=deck.slides.add(); s.background.fill=C.ink;
 text(s,'CAREER',72,42,115,20,14,{bold:true,font:'JetBrains Mono',color:C.white}); text(s,'CASE',188,42,80,20,14,{bold:true,font:'JetBrains Mono',color:'#8E8E8B'}); box(s,268,43,10,10,C.red,'none'); text(s,'06',1140,42,68,20,13,{bold:true,font:'JetBrains Mono',color:'#AFAFAA',align:'right'}); rule(s,72,74,1136,C.white,1);
 tag(s,'Research & references',72,108,260,C.yellow);
 text(s,'The guidance must be\npersonal. The case\nmust be credible.',72,140,690,160,52,{bold:true,font:'Playfair Display',color:C.white,leading:.92});
 text(s,'CareerCase combines a user-owned profile with structured occupation and qualification references—so recommendations can be checked, explained and acted on.',72,335,640,65,21,{color:'#D7D7D2',leading:1.23});
 rule(s,72,453,1064,C.white,1);
 const refs=[['01','SIH260480 problem statement','AI-Enhanced Career Guidance System for Personalized Career Pathways'],['02','NCO-2015 · National Career Service','ncs.gov.in/Documents/National Classification of Occupations'],['03','National Qualifications Register','nqr.gov.in · NSQF-aligned qualifications'],['04','MSDE / NCVET','msde.gov.in · vocational education & skilling ecosystem']];
 refs.forEach((r,i)=>{const x=72+(i%2)*548,y=482+Math.floor(i/2)*76;text(s,r[0],x,y,34,18,12,{bold:true,font:'JetBrains Mono',color:C.yellow});text(s,r[1],x+49,y,350,20,15,{bold:true,color:C.white});text(s,r[2],x+49,y+25,415,24,13,{font:'JetBrains Mono',color:'#B5B5B0'});});
 text(s,'TEAM CAREERCASE  ·  SMART INDIA HACKATHON 2026',72,666,620,16,12,{bold:true,font:'JetBrains Mono',color:C.yellow});
 note(s,['User-provided: The Problem Statement.md.','National Career Service (NCO-2015): https://www.ncs.gov.in/Documents/National%20Classification%20of%20Occupations%20_Vol%20I-%202015.pdf','National Qualifications Register: https://www.nqr.gov.in','MSDE / NCVET: https://www.msde.gov.in/ministry/our-organisation/details/national-council-for-vocational-education-and-training-ncvet-YTM1ATMtQWa']);
}

await fs.mkdir(TMP, {recursive:true});
for (const [i, slide] of deck.slides.items.entries()) {
  await blob(`${TMP}/slide-${i+1}.png`, await deck.export({slide,format:'png',scale:2}));
  await fs.writeFile(`${TMP}/slide-${i+1}.layout.json`, await (await slide.export({format:'layout'})).text());
}
await blob(`${TMP}/montage.webp`, await deck.export({format:'webp',montage:true,scale:1}));
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(OUT);
console.log(OUT);
