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
];
