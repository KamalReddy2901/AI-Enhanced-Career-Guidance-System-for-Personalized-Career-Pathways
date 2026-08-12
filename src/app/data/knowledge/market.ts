// ══════════════════════════════════════════════════════════════════════════════
// CareerCase Knowledge Base — Market Signals (Indicative Demand Data)
// Timestamped demand snapshots grounded in NCO/NSQF, not live statistics
// ══════════════════════════════════════════════════════════════════════════════

import type { MarketSignal } from './schema';

export const MARKET_SIGNALS: MarketSignal[] = [
  // ═══ IT-ITeS SECTOR ═════════════════════════════════════════════════════════
  { occupationId: 'software-developer', demandIndex: 92, growthTrend: 'rising', regions: ['All metros', 'Tier-2 cities'], observedPeriod: '2025-H2', source: 'Curated from NCS postings + NASSCOM reports (indicative)' },
  { occupationId: 'data-analyst', demandIndex: 88, growthTrend: 'rising', regions: ['Bangalore', 'Pune', 'Hyderabad', 'Delhi-NCR'], observedPeriod: '2025-H2', source: 'Curated from NCS + BFSI hiring trends (indicative)' },
  { occupationId: 'cybersecurity-analyst', demandIndex: 85, growthTrend: 'rising', regions: ['Metros', 'State capitals'], observedPeriod: '2025-H2', source: 'Curated from IT-ITeS skill demand reports (indicative)' },
  { occupationId: 'web-developer', demandIndex: 80, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from NCS postings (indicative)' },
  { occupationId: 'mobile-app-developer', demandIndex: 82, growthTrend: 'rising', regions: ['Bangalore', 'Pune', 'Chennai', 'Hyderabad'], observedPeriod: '2025-H2', source: 'Curated from IT-ITeS sector reports (indicative)' },
  { occupationId: 'data-scientist', demandIndex: 90, growthTrend: 'rising', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from NASSCOM + analytics hiring trends (indicative)' },
  { occupationId: 'network-administrator', demandIndex: 70, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from IT infrastructure demand (indicative)' },
  { occupationId: 'database-administrator', demandIndex: 72, growthTrend: 'stable', regions: ['Metros', 'Tier-2 cities'], observedPeriod: '2025-H2', source: 'Curated from BFSI + IT hiring (indicative)' },
  { occupationId: 'it-support-specialist', demandIndex: 68, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from NCS entry-level IT postings (indicative)' },
  { occupationId: 'devops-engineer', demandIndex: 87, growthTrend: 'rising', regions: ['Bangalore', 'Pune', 'Hyderabad', 'Gurgaon'], observedPeriod: '2025-H2', source: 'Curated from cloud/DevOps demand reports (indicative)' },
  { occupationId: 'ui-ux-designer', demandIndex: 78, growthTrend: 'rising', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from product company hiring trends (indicative)' },
  
  // ═══ HEALTHCARE SECTOR ══════════════════════════════════════════════════════
  { occupationId: 'doctor', demandIndex: 88, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from MCI registration + health sector reports (indicative)' },
  { occupationId: 'nurse', demandIndex: 90, growthTrend: 'rising', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from MSDE healthcare skill gap reports (indicative)' },
  { occupationId: 'lab-technician', demandIndex: 75, growthTrend: 'rising', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from diagnostic centre expansions (indicative)' },
  { occupationId: 'pharmacist', demandIndex: 80, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from pharmacy council + healthcare trends (indicative)' },
  { occupationId: 'physiotherapist', demandIndex: 76, growthTrend: 'rising', regions: ['Metros', 'Urban areas'], observedPeriod: '2025-H2', source: 'Curated from allied health demand (indicative)' },
  { occupationId: 'dental-hygienist', demandIndex: 68, growthTrend: 'stable', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from dental health sector (indicative)' },
  { occupationId: 'radiographer', demandIndex: 74, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from diagnostic imaging sector (indicative)' },
  { occupationId: 'paramedic', demandIndex: 70, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from emergency medical services expansion (indicative)' },
  { occupationId: 'healthcare-assistant', demandIndex: 82, growthTrend: 'rising', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from MSDE skill gap + eldercare demand (indicative)' },
  { occupationId: 'medical-coder', demandIndex: 72, growthTrend: 'stable', regions: ['Metros', 'Tier-2 cities'], observedPeriod: '2025-H2', source: 'Curated from health IT sector (indicative)' },
  { occupationId: 'veterinarian', demandIndex: 65, growthTrend: 'stable', regions: ['Rural + Urban India'], observedPeriod: '2025-H2', source: 'Curated from livestock + pet care sectors (indicative)' },
  
  // ═══ VOCATIONAL TRADES ══════════════════════════════════════════════════════
  { occupationId: 'electrician', demandIndex: 85, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from NSDC construction + infrastructure demand (indicative)' },
  { occupationId: 'plumber', demandIndex: 80, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from housing + infrastructure sector (indicative)' },
  { occupationId: 'welder', demandIndex: 78, growthTrend: 'stable', regions: ['Industrial hubs', 'Metros'], observedPeriod: '2025-H2', source: 'Curated from manufacturing + construction sector (indicative)' },
  { occupationId: 'cnc-operator', demandIndex: 82, growthTrend: 'stable', regions: ['Industrial clusters', 'Tier-2 cities'], observedPeriod: '2025-H2', source: 'Curated from manufacturing sector demand (indicative)' },
  { occupationId: 'solar-technician', demandIndex: 88, growthTrend: 'rising', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from MNRE renewable energy targets (indicative)' },
  { occupationId: 'hvac-technician', demandIndex: 76, growthTrend: 'stable', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from building services sector (indicative)' },
  { occupationId: 'automotive-mechanic', demandIndex: 74, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from automotive aftermarket sector (indicative)' },
  { occupationId: 'ev-technician', demandIndex: 90, growthTrend: 'rising', regions: ['Metros', 'State capitals'], observedPeriod: '2025-H2', source: 'Curated from EV adoption + FAME targets (indicative)' },
  { occupationId: 'carpenter', demandIndex: 72, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from construction + furniture sector (indicative)' },
  { occupationId: 'mason', demandIndex: 75, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from construction sector (indicative)' },
  { occupationId: 'painter', demandIndex: 70, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from construction + real estate sector (indicative)' },
  { occupationId: 'tailor', demandIndex: 68, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from apparel + retail sector (indicative)' },
  { occupationId: 'beautician', demandIndex: 74, growthTrend: 'rising', regions: ['Urban India'], observedPeriod: '2025-H2', source: 'Curated from beauty & wellness sector reports (indicative)' },
  { occupationId: 'chef', demandIndex: 76, growthTrend: 'stable', regions: ['Metros', 'Tourist destinations'], observedPeriod: '2025-H2', source: 'Curated from hospitality + food service sector (indicative)' },
  { occupationId: 'security-guard', demandIndex: 70, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from private security industry (indicative)' },
  { occupationId: 'driver', demandIndex: 80, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from logistics + cab aggregator demand (indicative)' },
  { occupationId: 'mobile-repair-technician', demandIndex: 72, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from electronics repair sector (indicative)' },
  
  // ═══ BFSI SECTOR ════════════════════════════════════════════════════════════
  { occupationId: 'chartered-accountant', demandIndex: 78, growthTrend: 'stable', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from ICAI + BFSI hiring trends (indicative)' },
  { occupationId: 'financial-analyst', demandIndex: 80, growthTrend: 'stable', regions: ['Metros'], observedPeriod: '2025-H2', source: 'Curated from BFSI + corporate finance demand (indicative)' },
  { occupationId: 'bank-teller', demandIndex: 60, growthTrend: 'declining', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from bank digitization trends (indicative)' },
  { occupationId: 'loan-officer', demandIndex: 68, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from banking sector lending growth (indicative)' },
  { occupationId: 'insurance-agent', demandIndex: 70, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from insurance penetration trends (indicative)' },
  { occupationId: 'tax-consultant', demandIndex: 74, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from GST + tax compliance demand (indicative)' },
  { occupationId: 'auditor', demandIndex: 72, growthTrend: 'stable', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from corporate compliance + audit sector (indicative)' },
  { occupationId: 'investment-advisor', demandIndex: 75, growthTrend: 'rising', regions: ['Metros', 'Urban areas'], observedPeriod: '2025-H2', source: 'Curated from wealth management sector (indicative)' },
  { occupationId: 'accountant', demandIndex: 76, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from SME + corporate accounting demand (indicative)' },
  { occupationId: 'data-entry-operator', demandIndex: 50, growthTrend: 'declining', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from automation + digitization trends (indicative)' },
  
  // ═══ EDUCATION & TRAINING ═══════════════════════════════════════════════════
  { occupationId: 'teacher', demandIndex: 82, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from MHRD school expansion + NEP (indicative)' },
  { occupationId: 'corporate-trainer', demandIndex: 75, growthTrend: 'rising', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from L&D + skill development sector (indicative)' },
  { occupationId: 'career-counselor', demandIndex: 70, growthTrend: 'rising', regions: ['Metros', 'Urban areas'], observedPeriod: '2025-H2', source: 'Curated from education + counseling sector (indicative)' },
  { occupationId: 'college-professor', demandIndex: 72, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from higher education expansion (indicative)' },
  { occupationId: 'instructional-designer', demandIndex: 78, growthTrend: 'rising', regions: ['Metros'], observedPeriod: '2025-H2', source: 'Curated from EdTech + eLearning sector (indicative)' },
  { occupationId: 'tutor', demandIndex: 74, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from private tutoring + coaching sector (indicative)' },
  
  // ═══ AGRICULTURE & GREEN JOBS ═══════════════════════════════════════════════
  { occupationId: 'farmer', demandIndex: 65, growthTrend: 'stable', regions: ['Rural India'], observedPeriod: '2025-H2', source: 'Curated from agriculture census + NSSO data (indicative)' },
  { occupationId: 'agri-extension-worker', demandIndex: 68, growthTrend: 'stable', regions: ['Rural + Semi-urban'], observedPeriod: '2025-H2', source: 'Curated from ICAR + state agriculture dept. demand (indicative)' },
  { occupationId: 'organic-farmer', demandIndex: 72, growthTrend: 'rising', regions: ['Rural India', 'Peri-urban'], observedPeriod: '2025-H2', source: 'Curated from organic farming schemes + consumer trends (indicative)' },
  { occupationId: 'horticulturist', demandIndex: 70, growthTrend: 'stable', regions: ['Agri hubs', 'State capitals'], observedPeriod: '2025-H2', source: 'Curated from horticulture sector reports (indicative)' },
  { occupationId: 'dairy-farmer', demandIndex: 68, growthTrend: 'stable', regions: ['Rural India'], observedPeriod: '2025-H2', source: 'Curated from dairy cooperatives + livestock sector (indicative)' },
  { occupationId: 'poultry-farmer', demandIndex: 70, growthTrend: 'stable', regions: ['Rural + Semi-urban'], observedPeriod: '2025-H2', source: 'Curated from poultry sector reports (indicative)' },
  { occupationId: 'aquaculture-specialist', demandIndex: 66, growthTrend: 'stable', regions: ['Coastal states', 'Fish-producing regions'], observedPeriod: '2025-H2', source: 'Curated from aquaculture sector (indicative)' },
  
  // ═══ CREATIVE & MEDIA ═══════════════════════════════════════════════════════
  { occupationId: 'graphic-designer', demandIndex: 80, growthTrend: 'rising', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from creative + digital marketing demand (indicative)' },
  { occupationId: 'video-editor', demandIndex: 78, growthTrend: 'rising', regions: ['Metros', 'Media hubs'], observedPeriod: '2025-H2', source: 'Curated from OTT + content production sector (indicative)' },
  { occupationId: 'photographer', demandIndex: 72, growthTrend: 'stable', regions: ['Metros', 'Urban areas'], observedPeriod: '2025-H2', source: 'Curated from media + events sector (indicative)' },
  { occupationId: 'content-writer', demandIndex: 82, growthTrend: 'rising', regions: ['All India (remote-friendly)'], observedPeriod: '2025-H2', source: 'Curated from digital content + marketing sector (indicative)' },
  { occupationId: 'social-media-manager', demandIndex: 84, growthTrend: 'rising', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from digital marketing + brand management (indicative)' },
  { occupationId: 'animator', demandIndex: 76, growthTrend: 'rising', regions: ['Mumbai', 'Bangalore', 'Hyderabad'], observedPeriod: '2025-H2', source: 'Curated from animation + gaming sector (indicative)' },
  { occupationId: 'music-producer', demandIndex: 65, growthTrend: 'stable', regions: ['Metros', 'Music hubs'], observedPeriod: '2025-H2', source: 'Curated from entertainment + OTT music sector (indicative)' },
  { occupationId: 'interior-designer', demandIndex: 74, growthTrend: 'stable', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from real estate + home décor sector (indicative)' },
  
  // ═══ LOGISTICS & OPERATIONS ════════════════════════════════════════════════
  { occupationId: 'warehouse-manager', demandIndex: 78, growthTrend: 'rising', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from eCommerce + logistics expansion (indicative)' },
  { occupationId: 'supply-chain-analyst', demandIndex: 80, growthTrend: 'rising', regions: ['Metros', 'Industrial hubs'], observedPeriod: '2025-H2', source: 'Curated from supply chain optimization demand (indicative)' },
  { occupationId: 'logistics-coordinator', demandIndex: 76, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from logistics + warehousing sector (indicative)' },
  { occupationId: 'delivery-manager', demandIndex: 82, growthTrend: 'rising', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from eCommerce + quick commerce expansion (indicative)' },
  { occupationId: 'customs-officer', demandIndex: 65, growthTrend: 'stable', regions: ['Ports', 'Airports', 'Border areas'], observedPeriod: '2025-H2', source: 'Curated from government recruitment + trade volume (indicative)' },
  
  // ═══ RETAIL & SALES ═════════════════════════════════════════════════════════
  { occupationId: 'store-manager', demandIndex: 75, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from retail sector expansion (indicative)' },
  { occupationId: 'retail-sales-associate', demandIndex: 72, growthTrend: 'stable', regions: ['Urban India'], observedPeriod: '2025-H2', source: 'Curated from organized retail sector (indicative)' },
  { occupationId: 'visual-merchandiser', demandIndex: 68, growthTrend: 'stable', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from retail + fashion sector (indicative)' },
  { occupationId: 'ecommerce-manager', demandIndex: 85, growthTrend: 'rising', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from eCommerce sector growth (indicative)' },
  { occupationId: 'customer-service-rep', demandIndex: 70, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from BPO + customer support sector (indicative)' },
  
  // ═══ GREEN JOBS & ENVIRONMENT ═══════════════════════════════════════════════
  { occupationId: 'environmental-consultant', demandIndex: 72, growthTrend: 'rising', regions: ['Metros', 'Industrial hubs'], observedPeriod: '2025-H2', source: 'Curated from ESG compliance + sustainability demand (indicative)' },
  { occupationId: 'waste-management-specialist', demandIndex: 70, growthTrend: 'rising', regions: ['Metros', 'Smart cities'], observedPeriod: '2025-H2', source: 'Curated from Swachh Bharat + circular economy initiatives (indicative)' },
  { occupationId: 'renewable-energy-technician', demandIndex: 85, growthTrend: 'rising', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from renewable energy targets + solar/wind expansion (indicative)' },
  { occupationId: 'sustainability-manager', demandIndex: 76, growthTrend: 'rising', regions: ['Metros', 'Corporate hubs'], observedPeriod: '2025-H2', source: 'Curated from ESG + corporate sustainability reporting (indicative)' },
  { occupationId: 'gis-specialist', demandIndex: 74, growthTrend: 'stable', regions: ['Metros', 'State capitals'], observedPeriod: '2025-H2', source: 'Curated from GIS + urban planning sector (indicative)' },
  { occupationId: 'water-resource-specialist', demandIndex: 70, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from water management + irrigation sector (indicative)' },
  
  // ═══ PUBLIC SERVICE & POLICY ════════════════════════════════════════════════
  { occupationId: 'civil-servant', demandIndex: 60, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from UPSC + state PSC recruitment cycles (indicative)' },
  { occupationId: 'policy-analyst', demandIndex: 68, growthTrend: 'stable', regions: ['Delhi', 'State capitals'], observedPeriod: '2025-H2', source: 'Curated from think tanks + govt. advisory demand (indicative)' },
  { occupationId: 'ngo-program-manager', demandIndex: 66, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from development sector + CSR programs (indicative)' },
  { occupationId: 'social-worker', demandIndex: 70, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from social welfare + community programs (indicative)' },
  { occupationId: 'public-relations-officer', demandIndex: 72, growthTrend: 'stable', regions: ['Metros', 'Corporate hubs'], observedPeriod: '2025-H2', source: 'Curated from PR + corporate communications sector (indicative)' },
  
  // ═══ MANUFACTURING & INDUSTRIAL ════════════════════════════════════════════
  { occupationId: 'quality-inspector', demandIndex: 76, growthTrend: 'stable', regions: ['Industrial hubs'], observedPeriod: '2025-H2', source: 'Curated from manufacturing + QA demand (indicative)' },
  { occupationId: 'production-supervisor', demandIndex: 78, growthTrend: 'stable', regions: ['Industrial clusters'], observedPeriod: '2025-H2', source: 'Curated from manufacturing + operations sector (indicative)' },
  { occupationId: 'cnc-programmer', demandIndex: 80, growthTrend: 'rising', regions: ['Industrial hubs', 'Auto clusters'], observedPeriod: '2025-H2', source: 'Curated from precision manufacturing demand (indicative)' },
  { occupationId: 'industrial-engineer', demandIndex: 78, growthTrend: 'stable', regions: ['Industrial hubs'], observedPeriod: '2025-H2', source: 'Curated from manufacturing + process optimization (indicative)' },
  
  // ═══ MEDIA & PROFESSIONAL SERVICES ═════════════════════════════════════════
  { occupationId: 'journalist', demandIndex: 65, growthTrend: 'declining', regions: ['Metros', 'Media hubs'], observedPeriod: '2025-H2', source: 'Curated from traditional media contraction trends (indicative)' },
  { occupationId: 'digital-marketer', demandIndex: 86, growthTrend: 'rising', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from digital advertising growth (indicative)' },
  { occupationId: 'hr-manager', demandIndex: 75, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from corporate + HR services sector (indicative)' },
  { occupationId: 'business-analyst', demandIndex: 84, growthTrend: 'rising', regions: ['Metros', 'IT hubs'], observedPeriod: '2025-H2', source: 'Curated from IT + consulting demand (indicative)' },
  { occupationId: 'project-manager', demandIndex: 82, growthTrend: 'stable', regions: ['Metros', 'IT/Infra hubs'], observedPeriod: '2025-H2', source: 'Curated from project-based work growth (indicative)' },
  { occupationId: 'legal-assistant', demandIndex: 68, growthTrend: 'stable', regions: ['Metros', 'State capitals'], observedPeriod: '2025-H2', source: 'Curated from legal services sector (indicative)' },
  { occupationId: 'lawyer', demandIndex: 70, growthTrend: 'stable', regions: ['Metros', 'Tier-1 cities'], observedPeriod: '2025-H2', source: 'Curated from legal profession + bar council data (indicative)' },
  { occupationId: 'real-estate-agent', demandIndex: 72, growthTrend: 'stable', regions: ['All India'], observedPeriod: '2025-H2', source: 'Curated from real estate + RERA registrations (indicative)' },
  
  // ═══ EMERGING TECH ══════════════════════════════════════════════════════════
  { occupationId: 'blockchain-developer', demandIndex: 75, growthTrend: 'rising', regions: ['Metros', 'Tech hubs'], observedPeriod: '2025-H2', source: 'Curated from Web3 + fintech sector (indicative)' },
  { occupationId: 'drone-pilot', demandIndex: 78, growthTrend: 'rising', regions: ['Metros', 'Agriculture belts'], observedPeriod: '2025-H2', source: 'Curated from drone adoption + DGCA licensing trends (indicative)' },
  { occupationId: 'robotics-engineer', demandIndex: 80, growthTrend: 'rising', regions: ['Metros', 'Industrial hubs'], observedPeriod: '2025-H2', source: 'Curated from automation + Industry 4.0 demand (indicative)' },
  { occupationId: 'iot-specialist', demandIndex: 82, growthTrend: 'rising', regions: ['Metros', 'IT hubs'], observedPeriod: '2025-H2', source: 'Curated from IoT + smart city projects (indicative)' },
  { occupationId: '3d-printing-technician', demandIndex: 74, growthTrend: 'rising', regions: ['Metros', 'Industrial hubs'], observedPeriod: '2025-H2', source: 'Curated from additive manufacturing + prototyping demand (indicative)' },
];
