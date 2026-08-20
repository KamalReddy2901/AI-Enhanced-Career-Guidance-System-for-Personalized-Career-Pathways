import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const OUT = '/Users/kamal/Desktop/My projects/Career Simulation/deliverables/CareerCase_SIH2026_Eternals_Final.pptx';
const ASSETS = '/Users/kamal/Desktop/My projects/Career Simulation/.tmp-careercase-sih-final/assets';
const RENDER = '/Users/kamal/Desktop/My projects/Career Simulation/.tmp-careercase-sih-final/render';

const C = { paper:'#F9F8F6', ink:'#0A0A0A', red:'#E63946', yellow:'#FFD166', warm:'#E8E0D2', grey:'#6B6B67', pale:'#F0ECE4', white:'#FFFFFF', line:'#1E1E1C' };
const F = { serif:'Playfair Display', sans:'Inter', mono:'JetBrains Mono' };
const P = { x:56, y:44, w:1168, h:632 };

async function bytes(file) { const b = await fs.readFile(file); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }
async function saveBlob(file, blob) { await fs.writeFile(file, new Uint8Array(await blob.arrayBuffer())); }
function box(slide, x,y,w,h, fill='none', line='none', radius='none') {
  return slide.shapes.add({ geometry: radius==='round'?'roundRect':'rect', position:{left:x,top:y,width:w,height:h}, fill, line:{style:'solid',fill:line,width:line==='none'?0:1}, ...(radius==='round'?{borderRadius:'rounded-lg'}:{}) });
}
function text(slide, value, x,y,w,h, style={}) {
  const s=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{style:'solid',fill:'none',width:0}});
  s.text=value; s.text.style={fontFace:F.sans,fontSize:18,color:C.ink,margin:0,breakLine:false,...style}; return s;
}
function rule(slide,x,y,w,h=2,fill=C.ink){ box(slide,x,y,w,h,fill,fill); }
function dot(slide,x,y,r,fill=C.red){ box(slide,x-r,y-r,r*2,r*2,fill,fill,'round'); }
function header(slide, kicker, title, page) {
  text(slide,kicker.toUpperCase(),P.x,P.y,520,20,{fontFace:F.mono,fontSize:12,bold:true,color:C.red,letterSpacing:1.5});
  text(slide,title,P.x,P.y+28,1120,78,{fontFace:F.serif,fontSize:36,bold:true,color:C.ink});
  rule(slide,P.x,P.y+108,1168,1,C.ink);
  text(slide,`SMART INDIA HACKATHON 2026  /  ETERNALS  /  ${String(page).padStart(2,'0')}`,P.x,676,600,16,{fontFace:F.mono,fontSize:9,bold:true,color:C.grey,letterSpacing:0.6});
  text(slide,'CAREERCASE',1090,676,134,16,{fontFace:F.mono,fontSize:10,bold:true,color:C.ink,alignment:'right',letterSpacing:1.1});
}
function note(slide, lines){ slide.speakerNotes.textFrame.setText(`[Sources]\n${lines.join('\n')}`); slide.speakerNotes.setVisible(true); }
async function image(slide, file, x,y,w,h,fit='cover') { slide.images.add({blob:await bytes(file),contentType:'image/png',alt:'CareerCase editorial illustration',fit,position:{left:x,top:y,width:w,height:h},geometry:'rect'}); }
function label(slide, value,x,y,w,fill=C.ink,color=C.white){ box(slide,x,y,w,25,fill,fill,'round'); text(slide,value,x+10,y+5,w-20,15,{fontFace:F.mono,fontSize:9,bold:true,color,letterSpacing:0.6,alignment:'center'}); }
function step(slide,n,head,body,x,y,w){
  box(slide,x,y,w,130,C.white,C.ink,'round');
  box(slide,x+14,y+14,29,29,C.red,C.red,'round'); text(slide,String(n),x+14,y+19,29,18,{fontFace:F.mono,fontSize:11,bold:true,color:C.white,alignment:'center'});
  text(slide,head,x+54,y+14,w-66,26,{fontFace:F.serif,fontSize:22,bold:true});
  text(slide,body,x+16,y+56,w-32,58,{fontSize:14,color:C.grey,breakLine:true});
}
function status(slide, value,x,y,w,fill){ box(slide,x,y,w,20,fill,fill,'round'); text(slide,value,x+6,y+4,w-12,13,{fontFace:F.mono,fontSize:8,bold:true,color:C.ink,alignment:'center'}); }

async function main(){
  await fs.mkdir(RENDER,{recursive:true});
  const deck=Presentation.create({slideSize:{width:1280,height:720}});

  // 1 — Title
  { const s=deck.slides.add(); s.background.fill=C.paper;
    await image(s,`${ASSETS}/hero-casefile.png`,0,0,1280,720,'cover');
    box(s,0,0,630,720,C.paper,C.paper); box(s,0,0,630,720,{color:C.paper,transparency:4},'none');
    rule(s,56,44,78,8,C.ink); text(s,'SMART INDIA HACKATHON 2026',56,66,330,18,{fontFace:F.mono,fontSize:12,bold:true,color:C.red,letterSpacing:1.4});
    text(s,'CareerCase',56,126,500,70,{fontFace:F.serif,fontSize:64,bold:true,color:C.ink});
    text(s,'A career decision\nshould show its work.',56,202,540,110,{fontFace:F.serif,fontSize:43,bold:true,color:C.ink,breakLine:true});
    rule(s,56,329,156,5,C.red);
    text(s,'Turn aptitude, aspirations, abilities and experience into an explainable career pathway.',56,355,490,57,{fontSize:20,color:C.ink,breakLine:true});
    label(s,'SIH260480',56,454,122,C.red,C.white); label(s,'SMART EDUCATION',188,454,170,C.ink,C.white); label(s,'SOFTWARE',368,454,110,C.yellow,C.ink);
    rule(s,56,518,490,1,C.ink); text(s,'Problem Statement',56,535,170,15,{fontFace:F.mono,fontSize:10,bold:true,color:C.grey}); text(s,'AI-Enhanced Career Guidance System for Personalized Career Pathways',56,555,510,42,{fontFace:F.serif,fontSize:19,bold:true,breakLine:true});
    text(s,'TEAM ETERNALS',56,638,170,14,{fontFace:F.mono,fontSize:10,bold:true,color:C.ink,letterSpacing:1}); text(s,'TEAM ID — NOT ALLOTTED',270,638,230,14,{fontFace:F.mono,fontSize:10,bold:true,color:C.grey,letterSpacing:0.7});
    note(s,['Official SIH 2026 Problem Statement: SIH260480 — AI-Enhanced Career Guidance System for Personalized Career Pathways.','SIH2026 IDEA Presentation Format (slides 1–6).']);
  }

  // 2 — Proposed solution
  { const s=deck.slides.add(); s.background.fill=C.paper; header(s,'02 / proposed solution','One profile becomes a career decision you can defend.',2);
    text(s,'Generic guidance overlooks the whole person. CareerCase turns four signals into a living, explainable case file.',56,165,880,30,{fontSize:18,color:C.grey});
    const xs=[56,282,508,734,960]; const steps=[['Discover','Aptitude, interests\n& values'],['Build','Skills, experience\n& aspirations'],['Match','13 diversified\ncareer options'],['Explain','Why this fits —\nand what changes it'],['Advance','Close gaps; track\nprogression']];
    for(let i=0;i<5;i++){ step(s,i+1,steps[i][0],steps[i][1],xs[i],222,204); if(i<4){ rule(s,xs[i]+204,286,19,2,C.ink); box(s,xs[i]+219,281,8,12,C.red,C.red); } }
    text(s,'THE CAREERCASE LOOP',56,410,240,16,{fontFace:F.mono,fontSize:10,bold:true,color:C.red,letterSpacing:1});
    rule(s,56,435,1168,1,C.ink);
    const differentiators=[['WHOLE-PERSON PROFILE','Interests, aptitude, skills, experience and constraints in one case file.'],['AI, NOT A BLACK BOX','AI extracts and explains evidence; the core career score remains deterministic.'],['MULTIPLE, ACTIONABLE ROUTES','Focused, lower-risk and credential-led paths—not a single opaque answer.']];
    differentiators.forEach((d,i)=>{ const x=56+i*390; dot(s,x+12,485,7,i===1?C.red:C.yellow); text(s,d[0],x+32,469,335,17,{fontFace:F.mono,fontSize:10,bold:true,color:C.ink,letterSpacing:0.7}); text(s,d[1],x+32,493,335,48,{fontSize:15,color:C.grey,breakLine:true}); });
    label(s,'DISCOVER → BUILD → MATCH → EXPLAIN → ADVANCE',56,603,410,C.ink,C.white);
    note(s,['The Problem Statement.md — scope requirements: aptitude, aspirations, abilities/experience, progression and skill gaps.','PROJECT_BRIEF.md — CareerCase user journey and deterministic/AI boundary.','Designing a Six-Slide Smart India Hackathon Presentation… — consistent journey vocabulary.']);
  }

  // 3 — Technical approach
  { const s=deck.slides.add(); s.background.fill=C.paper; header(s,'03 / technical approach','The same journey runs through one traceable system.',3);
    text(s,'Every recommendation has a visible input, a reproducible decision layer and a route the learner can act on.',56,165,840,30,{fontSize:18,color:C.grey});
    const cols=[{h:'U1 / CAPTURE',b:'Assessments\nAspirations\nSkills + experience',c:C.yellow},{h:'U2 / STRUCTURE',b:'Career Passport\nEvidence provenance\nConsent + constraints',c:C.warm},{h:'U3 / MATCH',b:'11-factor deterministic engine\n13 diversified recommendations\nConfidence + counterfactual',c:C.red},{h:'U4 / PLAN',b:'Skill Gap Index\n3 core routes per role\nLearning actions',c:C.yellow},{h:'U5 / REFRESH',b:'Completed actions\nMomentum signal\nUpdated explanation',c:C.warm}];
    cols.forEach((a,i)=>{const x=56+i*233; box(s,x,221,205,210,C.white,C.ink,'round'); box(s,x,221,205,9,a.c,a.c); text(s,a.h,x+16,245,172,18,{fontFace:F.mono,fontSize:10,bold:true,color:C.ink,letterSpacing:0.5}); text(s,a.b,x+16,280,170,105,{fontSize:i===2?14:15,bold:i===2,breakLine:true,color:i===2?C.ink:C.grey}); if(i<4){rule(s,x+205,323,28,2,C.ink);box(s,x+227,318,8,12,C.red,C.red);} });
    text(s,'AI ASSIST LAYER',56,476,190,16,{fontFace:F.mono,fontSize:10,bold:true,color:C.red,letterSpacing:1}); rule(s,56,499,1168,1,C.ink);
    text(s,'Resume / aspiration extraction',72,526,215,20,{fontSize:15,bold:true}); text(s,'Skill discovery',330,526,150,20,{fontSize:15,bold:true}); text(s,'Grounded counsellor + dossiers',525,526,225,20,{fontSize:15,bold:true}); text(s,'Trajectory / interview practice',805,526,230,20,{fontSize:15,bold:true});
    text(s,'AI clarifies the case; it never assigns the final match score.',56,572,700,26,{fontFace:F.serif,fontSize:19,bold:true,color:C.ink});
    label(s,'REACT + TYPESCRIPT  •  SUPABASE  •  CLOUDFLARE WORKER  •  VERSIONED KNOWLEDGE BASE',56,620,730,C.ink,C.white);
    note(s,['PROJECT_BRIEF.md — architecture, 11-factor matching, AI boundary, technology stack and route engine.','CareerCase source audit — deterministic engine, evidence provenance and applied AI surfaces.']);
  }

  // 4 — Feasibility
  { const s=deck.slides.add(); s.background.fill=C.paper; header(s,'04 / feasibility & viability','Built for trust where choices matter.',4);
    await image(s,`${ASSETS}/trust-editorial.png`,750,135,474,492,'cover');
    text(s,'A functional prototype for demo and controlled pilots — with risks surfaced, not hidden.',56,165,660,30,{fontSize:18,color:C.grey});
    const rows=[['BLACK-BOX ADVICE','Deterministic 11-factor matching; “Why this?” reveals inputs, weights and gaps.','IMPLEMENTED',C.yellow],['ASSESSMENT BIAS','Exploratory screeners; preserved baseline; capped, disclosed AI evidence adjustment.','PROTOTYPE',C.warm],['STALE / LOCAL CONTEXT','Versioned NCO / NSQF-grounded knowledge base; source and freshness disclosures.','IMPLEMENTED',C.yellow],['DATA + ACCESS','Consent, export/delete controls, local continuity and EN / HI / TE core guidance.','IMPLEMENTED',C.yellow]];
    text(s,'RISK',56,220,150,15,{fontFace:F.mono,fontSize:10,bold:true,color:C.red,letterSpacing:0.7}); text(s,'HOW WE REDUCE IT',220,220,470,15,{fontFace:F.mono,fontSize:10,bold:true,color:C.red,letterSpacing:0.7});
    rows.forEach((r,i)=>{const y=247+i*85; rule(s,56,y,650,1,C.ink); text(s,r[0],56,y+14,145,40,{fontFace:F.mono,fontSize:10,bold:true,color:C.ink,breakLine:true}); text(s,r[1],220,y+12,430,48,{fontSize:14,color:C.grey,breakLine:true}); status(s,r[2],566,y+56,120,r[3]);});
    rule(s,56,587,650,1,C.ink); text(s,'BOUNDARY FOR JUDGES',56,605,150,16,{fontFace:F.mono,fontSize:10,bold:true,color:C.red,letterSpacing:0.7}); text(s,'Not a validated psychometric or government-certified production system yet.',220,599,470,25,{fontFace:F.serif,fontSize:18,bold:true});
    note(s,['PROJECT_BRIEF.md — product constraints and non-overclaim boundaries.','CareerCase source audit — consent, local continuity, multilingual scope, assessment and knowledge-base limitations.']);
  }

  // 5 — Impact
  { const s=deck.slides.add(); s.background.fill=C.paper; header(s,'05 / impact & benefits','Career clarity becomes measurable progression.',5);
    text(s,'CareerCase makes the next move visible for learners—and measurable for the people supporting them.',56,165,860,30,{fontSize:18,color:C.grey});
    // before/after baseline
    text(s,'BEFORE',56,216,190,18,{fontFace:F.mono,fontSize:11,bold:true,color:C.red,letterSpacing:1}); text(s,'WITH CAREERCASE',542,216,250,18,{fontFace:F.mono,fontSize:11,bold:true,color:C.red,letterSpacing:1});
    const impacts=[['Learners','Scattered advice\nand unclear next steps','An explainable fit, a route\nand a skill-gap action'],['Professionals','Transferable skills\nstay invisible','Viable transition routes\nwith trade-offs'],['Counsellors + institutions','Fragmented, one-size-\nfits-all guidance','A structured case file\nand follow-through signal']];
    impacts.forEach((r,i)=>{const y=254+i*104; box(s,56,y,420,78,C.pale,'none','round'); box(s,542,y,420,78,C.white,C.ink,'round'); text(s,r[0],56,y+12,160,20,{fontFace:F.serif,fontSize:18,bold:true}); text(s,r[1],225,y+12,235,46,{fontSize:14,color:C.grey,breakLine:true}); rule(s,489,y+38,32,2,C.ink); box(s,516,y+33,8,12,C.red,C.red); text(s,r[2],558,y+12,385,46,{fontSize:15,bold:true,color:C.ink,breakLine:true}); });
    box(s,1004,216,220,396,C.ink,C.ink,'round'); text(s,'PILOT SCORECARD',1026,240,172,18,{fontFace:F.mono,fontSize:10,bold:true,color:C.yellow,letterSpacing:0.8}); rule(s,1026,271,172,1,C.white);
    const kpis=[['1','Decision clarity'],['2','Routes started'],['3','Skill evidence gained'],['4','Recommendation stability'],['5','Pathway completion']]; kpis.forEach((k,i)=>{const y=293+i*54; dot(s,1040,y+13,10,i===0?C.red:C.yellow); text(s,k[0],1031,y+7,18,14,{fontFace:F.mono,fontSize:9,bold:true,color:C.ink,alignment:'center'}); text(s,k[1],1062,y+4,130,25,{fontSize:14,bold:true,color:C.white,breakLine:true});});
    text(s,'Validation plan — outcomes are not claimed as achieved.',1026,574,170,28,{fontSize:11,color:C.warm,breakLine:true});
    label(s,'5 USER SEGMENTS  •  3 CORE GUIDANCE LANGUAGES  •  3 ROUTES PER OCCUPATION',56,626,688,C.ink,C.white);
    note(s,['The Problem Statement.md — target range from students to mid-career professionals, scalability/adaptability and expected outcomes.','PROJECT_BRIEF.md — five learner segments, three core routes and multilingual core guidance.','Deep Research Report… — label pilot KPIs as validation plan, not achieved impact.']);
  }

  // 6 — References/demo bridge
  { const s=deck.slides.add(); s.background.fill=C.paper; header(s,'06 / research & references','Every recommendation carries its evidence forward.',6);
    text(s,'Our proof is a case file: the problem is traceable, the decision is inspectable, and the demo follows the same path.',56,165,860,31,{fontSize:18,color:C.grey});
    await image(s,`${ASSETS}/homepage.png`,722,206,502,282,'cover'); box(s,722,206,502,282,'none',C.ink,'round'); label(s,'LIVE PROTOTYPE / CAREERCASE',742,458,210,C.ink,C.white);
    const refs=[['PROBLEM BASIS','MSDE / SIH 2026\nSIH260480 problem statement'],['CAREER KNOWLEDGE','NCO-2015 roles\nNQR / NSQF levels'],['PRODUCT PROOF','100 roles · 178 skills\n105 qualifications · 300 transitions'],['QUALITY + LIMITS','Deterministic checks\nPrototype; pilot next']];
    refs.forEach((r,i)=>{const x=56+(i%2)*312, y=223+Math.floor(i/2)*142; box(s,x,y,282,112,i===2?C.ink:C.white,C.ink,'round'); text(s,r[0],x+16,y+16,245,16,{fontFace:F.mono,fontSize:10,bold:true,color:i===2?C.yellow:C.red,letterSpacing:0.7}); text(s,r[1],x+16,y+43,245,48,{fontSize:15,bold:true,color:i===2?C.white:C.ink,breakLine:true}); });
    text(s,'Demo sequence',56,524,140,16,{fontFace:F.mono,fontSize:10,bold:true,color:C.red,letterSpacing:0.7}); text(s,'Discover  →  Build  →  Match  →  Explain  →  Advance',56,549,630,28,{fontFace:F.serif,fontSize:20,bold:true,color:C.ink});
    rule(s,56,594,610,1,C.ink); text(s,'Repository: github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways',56,608,610,22,{fontFace:F.mono,fontSize:8,color:C.grey,breakLine:true});
    text(s,'The guidance must be personal.\nThe case must be credible.',722,533,460,67,{fontFace:F.serif,fontSize:30,bold:true,color:C.ink,breakLine:true});
    note(s,['Official SIH 2026 Problem Statement: SIH260480.','National Classification of Occupations (NCO-2015): https://www.ncs.gov.in/Documents/National%20Classification%20of%20Occupations%20_Vol%20I-%202015.pdf','National Qualifications Register: https://www.nqr.gov.in','CareerCase PROJECT_BRIEF.md and implementation audit — knowledge-base counts and prototype status.','Repository: https://github.com/KamalReddy2901/AI-Enhanced-Career-Guidance-System-for-Personalized-Career-Pathways']);
  }

  for (const [i,s] of deck.slides.items.entries()) { await saveBlob(`${RENDER}/slide-${i+1}.png`,await deck.export({slide:s,format:'png',scale:1})); }
  await saveBlob(`${RENDER}/montage.webp`,await deck.export({format:'webp',montage:true,scale:1}));
  const pptx=await PresentationFile.exportPptx(deck); await pptx.save(OUT);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
