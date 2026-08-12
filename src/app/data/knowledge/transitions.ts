// ══════════════════════════════════════════════════════════════════════════════
// CareerCase Knowledge Base — Career Transition Edges
// Directed progression and lateral pathways between occupations
// ══════════════════════════════════════════════════════════════════════════════

import type { TransitionEdge } from './schema';

export const TRANSITIONS: TransitionEdge[] = [
  // ═══ IT-ITeS SECTOR PROGRESSIONS ═══════════════════════════════════════════
  { fromId: 'it-support-specialist', toId: 'network-administrator', strength: 0.85, typicalYears: 2, transferNote: 'Troubleshooting & infrastructure knowledge transfer directly' },
  { fromId: 'it-support-specialist', toId: 'web-developer', strength: 0.60, typicalYears: 3, transferNote: 'Tech foundation + self-study coding path' },
  { fromId: 'web-developer', toId: 'software-developer', strength: 0.80, typicalYears: 2, transferNote: 'Programming fundamentals & git workflow transfer' },
  { fromId: 'web-developer', toId: 'ui-ux-designer', strength: 0.70, typicalYears: 2, transferNote: 'Frontend work gives UI sensibility; need UX research upskilling' },
  { fromId: 'web-developer', toId: 'mobile-app-developer', strength: 0.75, typicalYears: 2, transferNote: 'JavaScript/React knowledge transfers to React Native' },
  { fromId: 'software-developer', toId: 'devops-engineer', strength: 0.70, typicalYears: 3, transferNote: 'Coding + cloud/CI-CD learning path' },
  { fromId: 'software-developer', toId: 'data-scientist', strength: 0.60, typicalYears: 4, transferNote: 'Programming base; need stats & ML upskilling' },
  { fromId: 'data-analyst', toId: 'data-scientist', strength: 0.75, typicalYears: 3, transferNote: 'SQL & analytics foundation; add ML & Python' },
  { fromId: 'data-analyst', toId: 'business-analyst', strength: 0.80, typicalYears: 2, transferNote: 'Data interpretation & stakeholder communication transfer' },
  { fromId: 'network-administrator', toId: 'cybersecurity-analyst', strength: 0.75, typicalYears: 3, transferNote: 'Network knowledge + security certifications' },
  { fromId: 'database-administrator', toId: 'data-analyst', strength: 0.70, typicalYears: 2, transferNote: 'SQL mastery + analytical skill development' },
  { fromId: 'mobile-app-developer', toId: 'software-developer', strength: 0.85, typicalYears: 2, transferNote: 'Programming logic & git practices transfer fully' },
  { fromId: 'ui-ux-designer', toId: 'graphic-designer', strength: 0.75, typicalYears: 2, transferNote: 'Design tools & visual communication transfer' },
  { fromId: 'ui-ux-designer', toId: 'web-developer', strength: 0.55, typicalYears: 3, transferNote: 'Design sensibility helps; need coding bootcamp' },
  { fromId: 'devops-engineer', toId: 'software-developer', strength: 0.70, typicalYears: 2, transferNote: 'Scripting & architecture knowledge transfer' },
  { fromId: 'cybersecurity-analyst', toId: 'software-developer', strength: 0.65, typicalYears: 2, transferNote: 'Security mindset & coding skills transfer' },
  { fromId: 'data-scientist', toId: 'machine-learning-engineer', strength: 0.90, typicalYears: 2, transferNote: 'ML theory + production engineering path' },
  { fromId: 'data-entry-operator', toId: 'data-analyst', strength: 0.50, typicalYears: 4, transferNote: 'Data familiarity; need Excel/SQL/analytics training' },
  
  // ═══ HEALTHCARE SECTOR PROGRESSIONS ════════════════════════════════════════
  { fromId: 'healthcare-assistant', toId: 'nurse', strength: 0.70, typicalYears: 4, transferNote: 'Patient care experience + nursing degree path' },
  { fromId: 'nurse', toId: 'nurse-educator', strength: 0.75, typicalYears: 5, transferNote: 'Clinical expertise + teaching credential' },
  { fromId: 'nurse', toId: 'nurse-practitioner', strength: 0.80, typicalYears: 4, transferNote: 'Advanced practice nursing degree path' },
  { fromId: 'lab-technician', toId: 'radiographer', strength: 0.60, typicalYears: 3, transferNote: 'Medical equipment & patient interaction transfer' },
  { fromId: 'lab-technician', toId: 'medical-coder', strength: 0.55, typicalYears: 2, transferNote: 'Healthcare domain knowledge + coding training' },
  { fromId: 'paramedic', toId: 'nurse', strength: 0.70, typicalYears: 3, transferNote: 'Emergency care skills + nursing bridge program' },
  { fromId: 'paramedic', toId: 'healthcare-assistant', strength: 0.80, typicalYears: 1, transferNote: 'Patient care & first aid transfer directly' },
  { fromId: 'dental-hygienist', toId: 'dentist', strength: 0.50, typicalYears: 6, transferNote: 'Clinical exposure + dental school path' },
  { fromId: 'pharmacist', toId: 'clinical-pharmacist', strength: 0.85, typicalYears: 2, transferNote: 'Pharmaceutical knowledge + clinical rotation' },
  { fromId: 'physiotherapist', toId: 'sports-therapist', strength: 0.80, typicalYears: 2, transferNote: 'Rehabilitation skills + sports medicine specialization' },
  { fromId: 'medical-coder', toId: 'health-information-manager', strength: 0.75, typicalYears: 3, transferNote: 'Coding + healthcare admin + HIM certification' },
  { fromId: 'radiographer', toId: 'ultrasound-technician', strength: 0.70, typicalYears: 2, transferNote: 'Imaging experience + sonography training' },
  { fromId: 'veterinarian', toId: 'animal-welfare-officer', strength: 0.75, typicalYears: 2, transferNote: 'Animal care + policy/advocacy experience' },
  
  // ═══ VOCATIONAL TRADES PROGRESSIONS ════════════════════════════════════════
  { fromId: 'electrician', toId: 'solar-technician', strength: 0.85, typicalYears: 1, transferNote: 'Electrical wiring + solar PV certification' },
  { fromId: 'electrician', toId: 'electrical-supervisor', strength: 0.80, typicalYears: 5, transferNote: 'Field experience + team leadership' },
  { fromId: 'electrician', toId: 'electrical-contractor', strength: 0.75, typicalYears: 6, transferNote: 'Technical skills + business setup (entrepreneurial)' },
  { fromId: 'solar-technician', toId: 'renewable-energy-consultant', strength: 0.70, typicalYears: 4, transferNote: 'Solar expertise + business advisory skills' },
  { fromId: 'plumber', toId: 'plumbing-contractor', strength: 0.80, typicalYears: 5, transferNote: 'Trade skills + business management (entrepreneurial)' },
  { fromId: 'plumber', toId: 'hvac-technician', strength: 0.65, typicalYears: 2, transferNote: 'Pipework knowledge + HVAC certification' },
  { fromId: 'welder', toId: 'welding-supervisor', strength: 0.75, typicalYears: 5, transferNote: 'Mastery + safety oversight + crew management' },
  { fromId: 'welder', toId: 'fabricator', strength: 0.85, typicalYears: 3, transferNote: 'Welding + metal shaping & blueprint reading' },
  { fromId: 'carpenter', toId: 'furniture-designer', strength: 0.70, typicalYears: 4, transferNote: 'Woodwork + design & CAD training' },
  { fromId: 'carpenter', toId: 'construction-supervisor', strength: 0.70, typicalYears: 5, transferNote: 'Trade experience + site management' },
  { fromId: 'automotive-mechanic', toId: 'ev-technician', strength: 0.80, typicalYears: 2, transferNote: 'Mechanical foundation + EV systems upskilling' },
  { fromId: 'automotive-mechanic', toId: 'automotive-service-advisor', strength: 0.75, typicalYears: 4, transferNote: 'Technical knowledge + customer relations' },
  { fromId: 'ev-technician', toId: 'automotive-mechanic', strength: 0.85, typicalYears: 1, transferNote: 'Core mechanical skills remain transferable' },
  { fromId: 'hvac-technician', toId: 'hvac-designer', strength: 0.70, typicalYears: 4, transferNote: 'Field experience + system design & CAD' },
  { fromId: 'cnc-operator', toId: 'cnc-programmer', strength: 0.75, typicalYears: 3, transferNote: 'Machine operation + programming & CAD skills' },
  { fromId: 'cnc-programmer', toId: 'manufacturing-engineer', strength: 0.70, typicalYears: 4, transferNote: 'CNC + broader process optimization' },
  { fromId: 'mason', toId: 'construction-supervisor', strength: 0.65, typicalYears: 6, transferNote: 'Trade mastery + site coordination' },
  { fromId: 'painter', toId: 'interior-decorator', strength: 0.60, typicalYears: 3, transferNote: 'Surface finishing + color/design sense' },
  { fromId: 'tailor', toId: 'fashion-designer', strength: 0.65, typicalYears: 4, transferNote: 'Garment construction + design education' },
  { fromId: 'tailor', toId: 'textile-entrepreneur', strength: 0.70, typicalYears: 5, transferNote: 'Tailoring + business setup (entrepreneurial)' },
  { fromId: 'beautician', toId: 'salon-owner', strength: 0.80, typicalYears: 4, transferNote: 'Beauty skills + salon management (entrepreneurial)' },
  
  // ═══ BFSI SECTOR PROGRESSIONS ══════════════════════════════════════════════
  { fromId: 'bank-teller', toId: 'loan-officer', strength: 0.75, typicalYears: 3, transferNote: 'Banking operations + credit assessment training' },
  { fromId: 'loan-officer', toId: 'relationship-manager', strength: 0.80, typicalYears: 3, transferNote: 'Client interaction + portfolio management' },
  { fromId: 'accountant', toId: 'financial-analyst', strength: 0.75, typicalYears: 3, transferNote: 'Accounting base + strategic finance skills' },
  { fromId: 'accountant', toId: 'tax-consultant', strength: 0.80, typicalYears: 3, transferNote: 'Accounting + tax law specialization' },
  { fromId: 'financial-analyst', toId: 'investment-banker', strength: 0.70, typicalYears: 4, transferNote: 'Financial modeling + deal structuring' },
  { fromId: 'insurance-agent', toId: 'insurance-underwriter', strength: 0.75, typicalYears: 3, transferNote: 'Product knowledge + risk assessment' },
  { fromId: 'auditor', toId: 'compliance-officer', strength: 0.75, typicalYears: 3, transferNote: 'Audit experience + regulatory expertise' },
  
  // ═══ AGRICULTURE & GREEN JOBS ═══════════════════════════════════════════════
  { fromId: 'farmer', toId: 'organic-farming-consultant', strength: 0.70, typicalYears: 5, transferNote: 'Crop cultivation + organic certification & advisory' },
  { fromId: 'farmer', toId: 'agri-entrepreneur', strength: 0.65, typicalYears: 6, transferNote: 'Farming + value-addition & market linkage (entrepreneurial)' },
  { fromId: 'agricultural-technician', toId: 'agronomist', strength: 0.75, typicalYears: 4, transferNote: 'Field experience + agronomy degree' },
  { fromId: 'veterinarian', toId: 'livestock-consultant', strength: 0.80, typicalYears: 3, transferNote: 'Animal health + farm advisory' },
  { fromId: 'greenhouse-technician', toId: 'horticulturist', strength: 0.75, typicalYears: 3, transferNote: 'Plant care + horticulture science' },
  { fromId: 'solar-technician', toId: 'solar-project-manager', strength: 0.70, typicalYears: 4, transferNote: 'Installation + project coordination' },
  { fromId: 'waste-management-worker', toId: 'environmental-consultant', strength: 0.55, typicalYears: 5, transferNote: 'Waste domain + environmental science degree' },
  
  // ═══ RETAIL & SALES PROGRESSIONS ═══════════════════════════════════════════
  { fromId: 'sales-executive', toId: 'sales-manager', strength: 0.85, typicalYears: 4, transferNote: 'Sales performance + team leadership' },
  { fromId: 'sales-executive', toId: 'key-account-manager', strength: 0.80, typicalYears: 3, transferNote: 'Client relations + strategic account handling' },
  { fromId: 'retail-associate', toId: 'store-manager', strength: 0.75, typicalYears: 4, transferNote: 'Retail operations + inventory & people management' },
  { fromId: 'store-manager', toId: 'regional-manager', strength: 0.80, typicalYears: 5, transferNote: 'Store performance + multi-location oversight' },
  { fromId: 'cashier', toId: 'retail-associate', strength: 0.80, typicalYears: 1, transferNote: 'Customer service + product knowledge' },
  { fromId: 'visual-merchandiser', toId: 'retail-buyer', strength: 0.65, typicalYears: 3, transferNote: 'Merchandising + procurement & trend analysis' },
  { fromId: 'real-estate-agent', toId: 'real-estate-broker', strength: 0.85, typicalYears: 3, transferNote: 'Sales experience + broker license (entrepreneurial)' },
  
  // ═══ LOGISTICS & OPERATIONS ════════════════════════════════════════════════
  { fromId: 'warehouse-associate', toId: 'logistics-coordinator', strength: 0.75, typicalYears: 3, transferNote: 'Warehouse ops + supply chain coordination' },
  { fromId: 'logistics-coordinator', toId: 'supply-chain-manager', strength: 0.80, typicalYears: 4, transferNote: 'Logistics + strategic procurement & planning' },
  { fromId: 'delivery-driver', toId: 'fleet-manager', strength: 0.60, typicalYears: 5, transferNote: 'Driving experience + vehicle & route management' },
  { fromId: 'production-supervisor', toId: 'operations-manager', strength: 0.80, typicalYears: 4, transferNote: 'Shop floor + cross-functional operations' },
  { fromId: 'quality-inspector', toId: 'quality-manager', strength: 0.75, typicalYears: 4, transferNote: 'QA experience + process improvement & ISO' },
  
  // ═══ EDUCATION & TRAINING ═══════════════════════════════════════════════════
  { fromId: 'teacher', toId: 'school-principal', strength: 0.70, typicalYears: 8, transferNote: 'Teaching + admin & leadership certification' },
  { fromId: 'teacher', toId: 'education-counselor', strength: 0.75, typicalYears: 4, transferNote: 'Student interaction + counseling certification' },
  { fromId: 'training-coordinator', toId: 'learning-and-development-manager', strength: 0.80, typicalYears: 4, transferNote: 'Training delivery + L&D strategy' },
  { fromId: 'content-writer', toId: 'instructional-designer', strength: 0.70, typicalYears: 3, transferNote: 'Content creation + pedagogy & eLearning tools' },
  
  // ═══ CREATIVE & MEDIA PROGRESSIONS ═════════════════════════════════════════
  { fromId: 'graphic-designer', toId: 'art-director', strength: 0.75, typicalYears: 5, transferNote: 'Design execution + creative leadership' },
  { fromId: 'graphic-designer', toId: 'ui-ux-designer', strength: 0.70, typicalYears: 2, transferNote: 'Visual design + UX research & interaction design' },
  { fromId: 'photographer', toId: 'creative-director', strength: 0.60, typicalYears: 6, transferNote: 'Visual storytelling + campaign strategy' },
  { fromId: 'video-editor', toId: 'video-producer', strength: 0.75, typicalYears: 3, transferNote: 'Editing + production planning & direction' },
  { fromId: 'content-writer', toId: 'content-strategist', strength: 0.75, typicalYears: 3, transferNote: 'Writing + content planning & SEO' },
  { fromId: 'content-writer', toId: 'journalist', strength: 0.70, typicalYears: 2, transferNote: 'Writing + reporting & research rigor' },
  { fromId: 'journalist', toId: 'editor', strength: 0.80, typicalYears: 5, transferNote: 'Reporting + editorial judgment & team management' },
  { fromId: 'social-media-manager', toId: 'digital-marketer', strength: 0.80, typicalYears: 2, transferNote: 'Social media + broader digital channels' },
  { fromId: 'digital-marketer', toId: 'marketing-manager', strength: 0.85, typicalYears: 4, transferNote: 'Digital campaigns + integrated marketing strategy' },
  { fromId: 'animator', toId: 'game-designer', strength: 0.65, typicalYears: 3, transferNote: 'Animation + game mechanics & storytelling' },
  
  // ═══ PROFESSIONAL SERVICES PROGRESSIONS ════════════════════════════════════
  { fromId: 'hr-assistant', toId: 'hr-manager', strength: 0.80, typicalYears: 4, transferNote: 'HR operations + strategic HR & labor law' },
  { fromId: 'hr-manager', toId: 'hr-business-partner', strength: 0.85, typicalYears: 3, transferNote: 'HR generalist + business alignment' },
  { fromId: 'legal-assistant', toId: 'lawyer', strength: 0.50, typicalYears: 5, transferNote: 'Legal domain + law degree & bar exam' },
  { fromId: 'data-analyst', toId: 'business-analyst', strength: 0.80, typicalYears: 2, transferNote: 'Data skills + business process understanding' },
  { fromId: 'business-analyst', toId: 'product-manager', strength: 0.75, typicalYears: 3, transferNote: 'Requirements analysis + product strategy' },
  { fromId: 'project-manager', toId: 'program-manager', strength: 0.85, typicalYears: 4, transferNote: 'Project delivery + multi-project portfolio' },
  { fromId: 'project-manager', toId: 'operations-manager', strength: 0.75, typicalYears: 3, transferNote: 'Project coordination + ongoing operations' },
  { fromId: 'management-consultant', toId: 'strategy-consultant', strength: 0.80, typicalYears: 3, transferNote: 'Consulting + strategic frameworks & C-suite advisory' },
  
  // ═══ EMERGING TECH PROGRESSIONS ════════════════════════════════════════════
  { fromId: 'drone-pilot', toId: 'drone-surveyor', strength: 0.75, typicalYears: 2, transferNote: 'Piloting + surveying & GIS software' },
  { fromId: '3d-printing-technician', toId: 'additive-manufacturing-engineer', strength: 0.70, typicalYears: 3, transferNote: '3D printing + materials science & process engineering' },
  { fromId: 'iot-specialist', toId: 'solutions-architect', strength: 0.70, typicalYears: 4, transferNote: 'IoT + cloud architecture & systems design' },
  { fromId: 'blockchain-developer', toId: 'web3-developer', strength: 0.85, typicalYears: 2, transferNote: 'Blockchain + dApp development' },
  { fromId: 'robotics-engineer', toId: 'ai-engineer', strength: 0.70, typicalYears: 3, transferNote: 'Robotics + ML & neural networks' },
  { fromId: 'data-scientist', toId: 'ai-engineer', strength: 0.80, typicalYears: 2, transferNote: 'ML models + production deployment & MLOps' },
  
  // ═══ PUBLIC SERVICE & ADVOCACY ══════════════════════════════════════════════
  { fromId: 'social-worker', toId: 'ngo-program-manager', strength: 0.75, typicalYears: 4, transferNote: 'Field work + program design & grants' },
  { fromId: 'social-worker', toId: 'counselor', strength: 0.80, typicalYears: 3, transferNote: 'Client interaction + counseling certification' },
  { fromId: 'community-organizer', toId: 'policy-analyst', strength: 0.60, typicalYears: 4, transferNote: 'Grassroots experience + policy research degree' },
  { fromId: 'public-relations-officer', toId: 'communications-manager', strength: 0.85, typicalYears: 3, transferNote: 'PR + corporate communications strategy' },
  
  // ═══ HOSPITALITY & TOURISM ═════════════════════════════════════════════════
  { fromId: 'front-desk-associate', toId: 'hotel-manager', strength: 0.70, typicalYears: 5, transferNote: 'Guest services + ops & revenue management' },
  { fromId: 'chef', toId: 'executive-chef', strength: 0.80, typicalYears: 6, transferNote: 'Culinary skills + kitchen management & menu design' },
  { fromId: 'chef', toId: 'catering-entrepreneur', strength: 0.75, typicalYears: 5, transferNote: 'Cooking + catering business setup (entrepreneurial)' },
  { fromId: 'tour-guide', toId: 'travel-consultant', strength: 0.75, typicalYears: 3, transferNote: 'Tourism knowledge + itinerary planning & booking' },
  { fromId: 'housekeeping-supervisor', toId: 'facility-manager', strength: 0.70, typicalYears: 4, transferNote: 'Housekeeping + facility ops & vendor management' },
  
  // ═══ MANUFACTURING & INDUSTRIAL ════════════════════════════════════════════
  { fromId: 'machine-operator', toId: 'production-supervisor', strength: 0.70, typicalYears: 5, transferNote: 'Machine operation + team & schedule management' },
  { fromId: 'quality-inspector', toId: 'quality-assurance-engineer', strength: 0.75, typicalYears: 3, transferNote: 'Inspection + statistical process control' },
  { fromId: 'industrial-engineer', toId: 'plant-manager', strength: 0.75, typicalYears: 6, transferNote: 'Process optimization + plant operations & P&L' },
  { fromId: 'maintenance-technician', toId: 'maintenance-manager', strength: 0.75, typicalYears: 5, transferNote: 'Equipment repair + preventive maintenance planning' },
  
  // ═══ CROSS-SECTOR LATERAL TRANSITIONS ══════════════════════════════════════
  { fromId: 'teacher', toId: 'corporate-trainer', strength: 0.80, typicalYears: 2, transferNote: 'Teaching + corporate training content & delivery' },
  { fromId: 'journalist', toId: 'content-writer', strength: 0.85, typicalYears: 1, transferNote: 'Writing & research transfer directly' },
  { fromId: 'lawyer', toId: 'legal-compliance-officer', strength: 0.80, typicalYears: 2, transferNote: 'Legal expertise + corporate compliance' },
  { fromId: 'accountant', toId: 'business-analyst', strength: 0.65, typicalYears: 3, transferNote: 'Financial analysis + business process modeling' },
  { fromId: 'software-developer', toId: 'technical-writer', strength: 0.60, typicalYears: 2, transferNote: 'Tech knowledge + documentation & communication skills' },
  { fromId: 'graphic-designer', toId: 'marketing-manager', strength: 0.55, typicalYears: 4, transferNote: 'Visual communication + marketing strategy' },
  { fromId: 'sales-executive', toId: 'business-development-manager', strength: 0.85, typicalYears: 3, transferNote: 'Sales + partnership & market expansion' },
  { fromId: 'data-analyst', toId: 'operations-analyst', strength: 0.80, typicalYears: 2, transferNote: 'Analytics + process optimization' },
  { fromId: 'project-manager', toId: 'product-manager', strength: 0.70, typicalYears: 3, transferNote: 'Project delivery + product vision & roadmapping' },
  { fromId: 'customer-service-representative', toId: 'sales-executive', strength: 0.70, typicalYears: 2, transferNote: 'Client interaction + sales techniques' },
  
  // ═══ MORE IT LATERAL & UPSKILLING PATHS ═══════════════════════════════════
  { fromId: 'software-developer', toId: 'machine-learning-engineer', strength: 0.65, typicalYears: 3, transferNote: 'Programming + ML frameworks & statistics' },
  { fromId: 'software-developer', toId: 'blockchain-developer', strength: 0.60, typicalYears: 2, transferNote: 'Coding + blockchain protocols & smart contracts' },
  { fromId: 'software-developer', toId: 'cloud-architect', strength: 0.65, typicalYears: 4, transferNote: 'Development + cloud infrastructure design' },
  { fromId: 'data-analyst', toId: 'machine-learning-engineer', strength: 0.60, typicalYears: 4, transferNote: 'Data work + Python ML & model deployment' },
  { fromId: 'data-entry-operator', toId: 'mis-analyst', strength: 0.70, typicalYears: 2, transferNote: 'Data familiarity + MIS reporting & Excel' },
  { fromId: 'network-administrator', toId: 'cloud-architect', strength: 0.65, typicalYears: 4, transferNote: 'Infrastructure + cloud services design' },
  { fromId: 'database-administrator', toId: 'database-architect', strength: 0.80, typicalYears: 4, transferNote: 'DBA + enterprise data architecture' },
  { fromId: 'ui-ux-designer', toId: 'product-designer', strength: 0.85, typicalYears: 2, transferNote: 'UI/UX + product strategy & design thinking' },
  { fromId: 'cybersecurity-analyst', toId: 'security-architect', strength: 0.75, typicalYears: 4, transferNote: 'Security operations + enterprise security design' },
  { fromId: 'devops-engineer', toId: 'site-reliability-engineer', strength: 0.80, typicalYears: 2, transferNote: 'DevOps + SRE practices & monitoring' },
  { fromId: 'mobile-app-developer', toId: 'technical-lead', strength: 0.75, typicalYears: 4, transferNote: 'Development + architecture & team leadership' },
  
  // ═══ MORE HEALTHCARE PATHS ═════════════════════════════════════════════════
  { fromId: 'nurse', toId: 'healthcare-administrator', strength: 0.65, typicalYears: 5, transferNote: 'Clinical experience + healthcare management degree' },
  { fromId: 'doctor', toId: 'medical-director', strength: 0.75, typicalYears: 8, transferNote: 'Clinical expertise + hospital administration' },
  { fromId: 'doctor', toId: 'public-health-officer', strength: 0.70, typicalYears: 5, transferNote: 'Medical knowledge + public health & epidemiology' },
  { fromId: 'pharmacist', toId: 'pharmaceutical-sales', strength: 0.70, typicalYears: 2, transferNote: 'Drug knowledge + sales & client relations' },
  { fromId: 'lab-technician', toId: 'lab-manager', strength: 0.75, typicalYears: 5, transferNote: 'Lab operations + team & equipment management' },
  { fromId: 'physiotherapist', toId: 'rehabilitation-manager', strength: 0.70, typicalYears: 5, transferNote: 'Patient care + rehab center management' },
  { fromId: 'dental-hygienist', toId: 'dental-assistant', strength: 0.85, typicalYears: 1, transferNote: 'Oral care skills transfer directly' },
  { fromId: 'paramedic', toId: 'emergency-medical-technician', strength: 0.90, typicalYears: 1, transferNote: 'Emergency response skills overlap' },
  { fromId: 'medical-coder', toId: 'medical-billing-specialist', strength: 0.85, typicalYears: 1, transferNote: 'Coding + billing & insurance claims' },
  { fromId: 'radiographer', toId: 'mri-technician', strength: 0.75, typicalYears: 2, transferNote: 'Imaging + MRI-specific training' },
  
  // ═══ MORE TRADES & VOCATIONAL PROGRESSIONS ═════════════════════════════════
  { fromId: 'electrician', toId: 'ev-technician', strength: 0.70, typicalYears: 2, transferNote: 'Electrical base + EV battery & motor systems' },
  { fromId: 'electrician', toId: 'instrumentation-technician', strength: 0.70, typicalYears: 3, transferNote: 'Electrical + control systems & sensors' },
  { fromId: 'welder', toId: 'pipeline-welder', strength: 0.85, typicalYears: 2, transferNote: 'Welding + specialized pipeline techniques' },
  { fromId: 'carpenter', toId: 'carpenter-contractor', strength: 0.75, typicalYears: 5, transferNote: 'Craft + project bidding & business (entrepreneurial)' },
  { fromId: 'plumber', toId: 'fire-protection-specialist', strength: 0.65, typicalYears: 3, transferNote: 'Piping + fire sprinkler systems' },
  { fromId: 'cnc-operator', toId: 'tool-and-die-maker', strength: 0.75, typicalYears: 3, transferNote: 'Machine operation + precision tooling' },
  { fromId: 'automotive-mechanic', toId: 'diesel-mechanic', strength: 0.80, typicalYears: 2, transferNote: 'Mechanical base + diesel engine specialization' },
  { fromId: 'hvac-technician', toId: 'refrigeration-technician', strength: 0.85, typicalYears: 1, transferNote: 'HVAC + refrigeration circuits overlap' },
  { fromId: 'solar-technician', toId: 'wind-turbine-technician', strength: 0.60, typicalYears: 2, transferNote: 'Renewable energy + wind system mechanics' },
  { fromId: 'mason', toId: 'tile-setter', strength: 0.75, typicalYears: 2, transferNote: 'Surface work + tiling techniques' },
  { fromId: 'painter', toId: 'drywall-installer', strength: 0.65, typicalYears: 2, transferNote: 'Surface prep + drywall & joint finishing' },
  { fromId: 'tailor', toId: 'pattern-maker', strength: 0.75, typicalYears: 2, transferNote: 'Garment construction + pattern design' },
  { fromId: 'beautician', toId: 'makeup-artist', strength: 0.80, typicalYears: 1, transferNote: 'Beauty skills + advanced makeup techniques' },
  { fromId: '3d-printing-technician', toId: 'prototyping-specialist', strength: 0.75, typicalYears: 2, transferNote: '3D printing + rapid prototyping & materials' },
  
  // ═══ MORE BFSI & FINANCE PATHS ═════════════════════════════════════════════
  { fromId: 'bank-teller', toId: 'customer-service-representative', strength: 0.80, typicalYears: 1, transferNote: 'Customer interaction transfers' },
  { fromId: 'loan-officer', toId: 'credit-analyst', strength: 0.80, typicalYears: 2, transferNote: 'Lending + credit risk assessment' },
  { fromId: 'accountant', toId: 'chartered-accountant', strength: 0.70, typicalYears: 3, transferNote: 'Accounting + CA qualification' },
  { fromId: 'accountant', toId: 'cost-accountant', strength: 0.75, typicalYears: 2, transferNote: 'Accounting + cost & management accounting' },
  { fromId: 'financial-analyst', toId: 'portfolio-manager', strength: 0.75, typicalYears: 4, transferNote: 'Financial analysis + investment strategy' },
  { fromId: 'financial-analyst', toId: 'equity-research-analyst', strength: 0.80, typicalYears: 2, transferNote: 'Analysis + sector research & valuation' },
  { fromId: 'insurance-agent', toId: 'insurance-broker', strength: 0.80, typicalYears: 3, transferNote: 'Product knowledge + brokerage license' },
  { fromId: 'insurance-underwriter', toId: 'actuarial-analyst', strength: 0.60, typicalYears: 4, transferNote: 'Risk assessment + actuarial exams & statistics' },
  { fromId: 'auditor', toId: 'internal-auditor', strength: 0.85, typicalYears: 2, transferNote: 'Audit + internal controls & risk management' },
  { fromId: 'auditor', toId: 'forensic-auditor', strength: 0.70, typicalYears: 3, transferNote: 'Audit + fraud detection & investigation' },
  
  // ═══ MORE RETAIL & SALES TRANSITIONS ═══════════════════════════════════════
  { fromId: 'cashier', toId: 'sales-executive', strength: 0.65, typicalYears: 2, transferNote: 'Customer interaction + sales training' },
  { fromId: 'retail-associate', toId: 'visual-merchandiser', strength: 0.70, typicalYears: 2, transferNote: 'Store layout + merchandising principles' },
  { fromId: 'sales-executive', toId: 'regional-sales-manager', strength: 0.75, typicalYears: 5, transferNote: 'Sales + territory & team management' },
  { fromId: 'sales-manager', toId: 'business-development-manager', strength: 0.85, typicalYears: 2, transferNote: 'Sales leadership + strategic partnerships' },
  { fromId: 'key-account-manager', toId: 'sales-director', strength: 0.75, typicalYears: 5, transferNote: 'Account management + sales org leadership' },
  { fromId: 'store-manager', toId: 'district-manager', strength: 0.80, typicalYears: 3, transferNote: 'Store ops + multi-store oversight' },
  { fromId: 'real-estate-agent', toId: 'property-manager', strength: 0.70, typicalYears: 2, transferNote: 'Real estate + property ops & tenant relations' },
  { fromId: 'visual-merchandiser', toId: 'category-manager', strength: 0.65, typicalYears: 3, transferNote: 'Merchandising + category strategy & buying' },
  
  // ═══ MORE AGRICULTURE & GREEN JOBS ══════════════════════════════════════════
  { fromId: 'farmer', toId: 'farm-manager', strength: 0.75, typicalYears: 4, transferNote: 'Farming + commercial farm operations' },
  { fromId: 'farmer', toId: 'agri-input-dealer', strength: 0.70, typicalYears: 3, transferNote: 'Farming knowledge + input sales (entrepreneurial)' },
  { fromId: 'agricultural-technician', toId: 'soil-scientist', strength: 0.65, typicalYears: 4, transferNote: 'Agri + soil science degree' },
  { fromId: 'greenhouse-technician', toId: 'greenhouse-manager', strength: 0.80, typicalYears: 3, transferNote: 'Plant care + facility & team management' },
  { fromId: 'greenhouse-technician', toId: 'landscape-designer', strength: 0.60, typicalYears: 3, transferNote: 'Horticulture + design & landscaping' },
  { fromId: 'solar-technician', toId: 'solar-sales-consultant', strength: 0.75, typicalYears: 2, transferNote: 'Solar technical + sales & customer advisory' },
  { fromId: 'waste-management-worker', toId: 'recycling-coordinator', strength: 0.75, typicalYears: 2, transferNote: 'Waste handling + recycling program management' },
  { fromId: 'environmental-consultant', toId: 'sustainability-manager', strength: 0.80, typicalYears: 3, transferNote: 'Environmental + corporate sustainability strategy' },
  
  // ═══ MORE LOGISTICS & OPERATIONS ════════════════════════════════════════════
  { fromId: 'warehouse-associate', toId: 'inventory-specialist', strength: 0.80, typicalYears: 2, transferNote: 'Warehouse ops + inventory control & WMS' },
  { fromId: 'warehouse-associate', toId: 'forklift-operator', strength: 0.85, typicalYears: 1, transferNote: 'Material handling + forklift certification' },
  { fromId: 'logistics-coordinator', toId: 'freight-forwarder', strength: 0.75, typicalYears: 3, transferNote: 'Logistics + international shipping & customs' },
  { fromId: 'supply-chain-manager', toId: 'procurement-manager', strength: 0.80, typicalYears: 2, transferNote: 'Supply chain + strategic sourcing' },
  { fromId: 'delivery-driver', toId: 'logistics-coordinator', strength: 0.60, typicalYears: 3, transferNote: 'Routes + dispatch & coordination' },
  { fromId: 'production-supervisor', toId: 'plant-manager', strength: 0.75, typicalYears: 5, transferNote: 'Production + plant-wide operations & P&L' },
  { fromId: 'quality-inspector', toId: 'quality-engineer', strength: 0.70, typicalYears: 3, transferNote: 'QA + process design & Six Sigma' },
  { fromId: 'operations-manager', toId: 'general-manager', strength: 0.80, typicalYears: 5, transferNote: 'Operations + business unit leadership' },
  
  // ═══ MORE EDUCATION & TRAINING ══════════════════════════════════════════════
  { fromId: 'teacher', toId: 'curriculum-developer', strength: 0.75, typicalYears: 4, transferNote: 'Teaching + instructional design & curriculum' },
  { fromId: 'teacher', toId: 'special-education-teacher', strength: 0.70, typicalYears: 2, transferNote: 'Teaching + special ed certification' },
  { fromId: 'education-counselor', toId: 'career-counselor', strength: 0.85, typicalYears: 1, transferNote: 'Counseling + career development focus' },
  { fromId: 'training-coordinator', toId: 'corporate-trainer', strength: 0.85, typicalYears: 2, transferNote: 'Training + content delivery & facilitation' },
  { fromId: 'corporate-trainer', toId: 'leadership-development-facilitator', strength: 0.75, typicalYears: 3, transferNote: 'Training + leadership & coaching' },
  { fromId: 'content-writer', toId: 'technical-writer', strength: 0.75, typicalYears: 2, transferNote: 'Writing + technical documentation & API docs' },
  
  // ═══ MORE CREATIVE & MEDIA TRANSITIONS ══════════════════════════════════════
  { fromId: 'graphic-designer', toId: 'brand-designer', strength: 0.80, typicalYears: 3, transferNote: 'Design + brand strategy & identity systems' },
  { fromId: 'graphic-designer', toId: 'motion-graphics-designer', strength: 0.70, typicalYears: 2, transferNote: 'Design + animation & After Effects' },
  { fromId: 'photographer', toId: 'photo-editor', strength: 0.85, typicalYears: 1, transferNote: 'Photography + post-processing & editing' },
  { fromId: 'photographer', toId: 'cinematographer', strength: 0.65, typicalYears: 3, transferNote: 'Visual storytelling + video & lighting' },
  { fromId: 'video-editor', toId: 'motion-graphics-designer', strength: 0.70, typicalYears: 2, transferNote: 'Editing + animation & design' },
  { fromId: 'video-producer', toId: 'film-director', strength: 0.65, typicalYears: 5, transferNote: 'Production + creative direction & storytelling' },
  { fromId: 'content-writer', toId: 'copywriter', strength: 0.80, typicalYears: 1, transferNote: 'Writing + persuasive copy & marketing' },
  { fromId: 'content-strategist', toId: 'brand-strategist', strength: 0.75, typicalYears: 3, transferNote: 'Content strategy + brand positioning' },
  { fromId: 'social-media-manager', toId: 'community-manager', strength: 0.85, typicalYears: 1, transferNote: 'Social media + community engagement' },
  { fromId: 'digital-marketer', toId: 'performance-marketer', strength: 0.80, typicalYears: 2, transferNote: 'Digital + paid ads & conversion optimization' },
  { fromId: 'digital-marketer', toId: 'seo-specialist', strength: 0.75, typicalYears: 2, transferNote: 'Digital + SEO deep-dive & technical SEO' },
  { fromId: 'marketing-manager', toId: 'growth-marketer', strength: 0.75, typicalYears: 2, transferNote: 'Marketing + growth hacking & experimentation' },
  { fromId: 'animator', toId: 'vfx-artist', strength: 0.70, typicalYears: 2, transferNote: 'Animation + visual effects & compositing' },
  { fromId: 'game-designer', toId: 'game-producer', strength: 0.75, typicalYears: 4, transferNote: 'Design + project & team management' },
  
  // ═══ MORE PROFESSIONAL SERVICES PATHS ═══════════════════════════════════════
  { fromId: 'hr-assistant', toId: 'recruiter', strength: 0.80, typicalYears: 2, transferNote: 'HR ops + talent acquisition & sourcing' },
  { fromId: 'recruiter', toId: 'talent-acquisition-manager', strength: 0.85, typicalYears: 3, transferNote: 'Recruiting + hiring strategy & team leadership' },
  { fromId: 'hr-manager', toId: 'organizational-development-consultant', strength: 0.70, typicalYears: 4, transferNote: 'HR + OD & change management' },
  { fromId: 'hr-business-partner', toId: 'chief-people-officer', strength: 0.70, typicalYears: 8, transferNote: 'HRBP + executive HR leadership' },
  { fromId: 'legal-assistant', toId: 'paralegal', strength: 0.85, typicalYears: 2, transferNote: 'Legal support + research & case management' },
  { fromId: 'lawyer', toId: 'corporate-counsel', strength: 0.85, typicalYears: 3, transferNote: 'Legal practice + in-house advisory' },
  { fromId: 'lawyer', toId: 'judge', strength: 0.50, typicalYears: 10, transferNote: 'Legal expertise + judicial service exam' },
  { fromId: 'business-analyst', toId: 'solutions-architect', strength: 0.70, typicalYears: 4, transferNote: 'Requirements + technical architecture' },
  { fromId: 'product-manager', toId: 'senior-product-manager', strength: 0.90, typicalYears: 3, transferNote: 'PM + larger scope & strategy' },
  { fromId: 'product-manager', toId: 'product-director', strength: 0.75, typicalYears: 5, transferNote: 'PM + product org leadership' },
  { fromId: 'project-manager', toId: 'pmo-manager', strength: 0.80, typicalYears: 4, transferNote: 'PM + portfolio & PMO governance' },
  { fromId: 'management-consultant', toId: 'independent-consultant', strength: 0.75, typicalYears: 5, transferNote: 'Consulting + solo practice (entrepreneurial)' },
  { fromId: 'strategy-consultant', toId: 'chief-strategy-officer', strength: 0.65, typicalYears: 10, transferNote: 'Consulting + executive strategy role' },
  
  // ═══ MORE HOSPITALITY & TOURISM PATHS ═══════════════════════════════════════
  { fromId: 'front-desk-associate', toId: 'concierge', strength: 0.75, typicalYears: 2, transferNote: 'Guest services + personalized assistance' },
  { fromId: 'hotel-manager', toId: 'revenue-manager', strength: 0.70, typicalYears: 3, transferNote: 'Hotel ops + pricing & yield management' },
  { fromId: 'chef', toId: 'sous-chef', strength: 0.90, typicalYears: 2, transferNote: 'Cooking + kitchen leadership' },
  { fromId: 'sous-chef', toId: 'executive-chef', strength: 0.90, typicalYears: 3, transferNote: 'Sous chef + full kitchen & menu responsibility' },
  { fromId: 'tour-guide', toId: 'tour-operator', strength: 0.75, typicalYears: 3, transferNote: 'Guiding + tour planning & business (entrepreneurial)' },
  { fromId: 'travel-consultant', toId: 'travel-agency-owner', strength: 0.70, typicalYears: 4, transferNote: 'Consulting + agency business (entrepreneurial)' },
  { fromId: 'housekeeping-supervisor', toId: 'housekeeping-manager', strength: 0.85, typicalYears: 2, transferNote: 'Supervision + department management' },
  { fromId: 'facility-manager', toId: 'regional-facility-manager', strength: 0.80, typicalYears: 4, transferNote: 'Facility ops + multi-site oversight' },
  
  // ═══ CROSS-SECTOR SENIOR & SPECIALIST TRANSITIONS ══════════════════════════
  { fromId: 'industrial-engineer', toId: 'operations-manager', strength: 0.80, typicalYears: 3, transferNote: 'Process optimization + ops leadership' },
  { fromId: 'maintenance-technician', toId: 'facilities-engineer', strength: 0.75, typicalYears: 3, transferNote: 'Maintenance + engineering & planning' },
  { fromId: 'machine-operator', toId: 'machine-technician', strength: 0.75, typicalYears: 3, transferNote: 'Operation + troubleshooting & repair' },
  { fromId: 'quality-assurance-engineer', toId: 'quality-manager', strength: 0.80, typicalYears: 4, transferNote: 'QA + quality systems & team management' },
  { fromId: 'drone-pilot', toId: 'aerial-cinematographer', strength: 0.70, typicalYears: 2, transferNote: 'Piloting + filmmaking & camera work' },
  { fromId: 'blockchain-developer', toId: 'smart-contract-auditor', strength: 0.75, typicalYears: 2, transferNote: 'Blockchain + security auditing & testing' },
  { fromId: 'iot-specialist', toId: 'embedded-systems-engineer', strength: 0.70, typicalYears: 3, transferNote: 'IoT + hardware & firmware development' },
  { fromId: 'ai-engineer', toId: 'research-scientist', strength: 0.65, typicalYears: 4, transferNote: 'AI + research & publication' },
  { fromId: 'robotics-engineer', toId: 'automation-engineer', strength: 0.80, typicalYears: 2, transferNote: 'Robotics + industrial automation' },
];
