import type { ContractObligation, DocumentMetadata } from '../types/obligation';
import { getTodayIsoString } from '../utils/dateUtils';

/**
 * Generates an ISO date string offset by N days from the reference date
 */
function getDateOffset(days: number, refDateStr?: string): string {
  const base = refDateStr ? new Date(refDateStr) : new Date();
  base.setDate(base.getDate() + days);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface DemoContractBundle {
  id: string;
  title: string;
  category: string;
  metadata: DocumentMetadata;
  getObligations: (refDate?: string) => ContractObligation[];
}

export const DEMO_CONTRACT_BUNDLES: DemoContractBundle[] = [
  {
    id: 'india-enterprise-it',
    title: 'Tata Infotech & HDFC Digital Banking Master Services Agreement (INR ₹)',
    category: 'Banking & Financial Technology (India)',
    metadata: {
      fileName: 'TCS_HDFC_Digital_Banking_MSA_2026.pdf',
      fileSize: '3.1 MB',
      pageCount: 16,
      uploadedAt: new Date().toISOString(),
      contractTitle: 'Master IT Services & Core Banking Infrastructure Agreement',
      contractType: 'Commercial IT Agreement (Schedule VII - RBI Compliant)',
      parties: ['Tata Consultancy Services Ltd. (Vendor)', 'HDFC Bank Ltd. (Client)'],
      rawTextPreview: `MASTER SERVICES AGREEMENT (SCHEDULE VII - CORE BANKING MIGRATION)
BETWEEN: TATA CONSULTANCY SERVICES LTD. ("Vendor") AND HDFC BANK LTD. ("Client")

1. RECITALS & SCOPE OF ENGAGEMENT
The Client hereby engages the Vendor to execute the end-to-end cloud migration of core retail banking workflows, UPI switches, and disaster recovery data centers. Both parties covenant to strictly abide by RBI guidelines and the Digital Personal Data Protection Act (DPDPA 2023).

2. KEY DELIVERABLES & OBLIGATIONS
2.1 CYBER AUDIT & CERTIFICATION:
Vendor shall deliver the comprehensive RBI Cyber Security Framework compliance audit & VAPT certification no later than 10 days prior to Phase 1 launch. Failure to present verified clearance carries a penalty of ₹50,000 per business day of delay with mandatory escalation to the Board Audit Committee. Monetary valuation allocated: ₹15,00,000.

2.2 UPI 2.0 & REAL-TIME SWITCH OVERHAUL:
Vendor shall complete high-throughput UPI 2.0 & ISO 20022 real-time switch migration. Cutover milestone value is fixed at ₹45,00,000. Late cutover shall incur 0.5% milestone deduction per week of cutover delay up to a maximum cap of ₹10,00,000.

2.3 PAYMENT OF MAINTENANCE RETAINER:
Client covenants to remit the Q3 Core Banking Platform AMC & SLA maintenance fee (₹85,00,000 inclusive of 18% GST and 2% TDS withholding) immediately on the milestone due date. Any undisputed delayed disbursements shall accrue 18% p.a. simple interest under Clause 8.3.

2.4 DISASTER RECOVERY COMMISSIONING:
Vendor covenants to commission Primary Disaster Recovery (DR) centers in Mumbai and Bengaluru guaranteeing RPO < 5s and RTO < 1hr. Capital allocation value: ₹1,25,00,000. In the event of unrectified recovery test failure, liquidated damages of ₹25,00,000 shall be assessed.

2.5 DATA PRIVACY COMPLIANCE:
Vendor shall execute full Data Protection Impact Assessment under DPDPA 2023 within 18 days. Allocated compliance value: ₹12,00,000. Any material breach triggers statutory breach indemnity and immediate full contract audit rights.

2.6 ANNUAL HARDWARE TRUE-UP:
Client shall conduct branch hardware & biometric terminal true-up across 3,500 locations within 30 days. Value: ₹60,00,000. Unverified counts lead to forfeiture of 5% performance bank guarantee (PBG).`
    },
    getObligations: (refDate = getTodayIsoString()): ContractObligation[] => [
      {
        id: 'OBL-IND-101',
        description: 'Submission of RBI Cyber Security Framework compliance audit & VAPT certification',
        responsibleParty: 'Tata Consultancy Services Ltd.',
        dueDate: getDateOffset(-10, refDate),
        monetaryValue: 1500000,
        latePenalty: '₹50,000 per business day of delay with mandatory escalation to Board Audit Committee',
        category: 'Compliance',
        sourceClause: 'Clause 2.1: "Vendor shall deliver the comprehensive RBI Cyber Security Framework compliance audit & VAPT certification... Failure to present verified clearance carries a penalty of ₹50,000 per business day of delay."',
        verificationStatus: 'VERIFIED',
        riskLevel: 'HIGH',
        notes: 'Mandatory under RBI Master Direction on Cyber Security Guidelines',
        isCompleted: false,
        confidenceScore: 0.98
      },
      {
        id: 'OBL-IND-102',
        description: 'Complete high-throughput UPI 2.0 & ISO 20022 real-time switch migration',
        responsibleParty: 'Tata Consultancy Services Ltd.',
        dueDate: getDateOffset(-2, refDate),
        monetaryValue: 4500000,
        latePenalty: '0.5% milestone deduction per week of cutover delay up to max ₹10,00,000',
        category: 'Deliverable',
        sourceClause: 'Clause 2.2: "Vendor shall complete high-throughput UPI 2.0 & ISO 20022 real-time switch migration. Cutover milestone value is fixed at ₹45,00,000. Late cutover shall incur 0.5% milestone deduction per week."',
        verificationStatus: 'VERIFIED',
        riskLevel: 'HIGH',
        notes: 'Requires dual sign-off from Chief Technology Officer (CTO)',
        isCompleted: false,
        confidenceScore: 0.95
      },
      {
        id: 'OBL-IND-103',
        description: 'Remit Q3 Core Banking Platform AMC & SLA maintenance fee (inclusive of 18% GST & 2% TDS)',
        responsibleParty: 'HDFC Bank Ltd.',
        dueDate: getDateOffset(0, refDate),
        monetaryValue: 8500000,
        latePenalty: '18% p.a. simple interest on undisputed delayed disbursements under Clause 8.3',
        category: 'Payment',
        sourceClause: 'Clause 2.3: "Client covenants to remit the Q3 Core Banking Platform AMC & SLA maintenance fee (₹85,00,000)... Any undisputed delayed disbursements shall accrue 18% p.a. simple interest."',
        verificationStatus: 'VERIFIED',
        riskLevel: 'HIGH',
        notes: 'Subject to Form 16A TDS certificate issuance within 15 days of quarter end',
        isCompleted: false,
        confidenceScore: 0.99
      },
      {
        id: 'OBL-IND-104',
        description: 'Commission Primary Disaster Recovery (DR) center in Mumbai & Bengaluru with RPO < 5s',
        responsibleParty: 'Tata Consultancy Services Ltd.',
        dueDate: getDateOffset(5, refDate),
        monetaryValue: 12500000,
        latePenalty: 'Liquidated damages of ₹25,00,000 per unrectified recovery test failure',
        category: 'SLA',
        sourceClause: 'Clause 2.4: "Vendor covenants to commission Primary Disaster Recovery (DR) centers... In the event of unrectified recovery test failure, liquidated damages of ₹25,00,000 shall be assessed."',
        verificationStatus: 'VERIFIED',
        riskLevel: 'HIGH',
        notes: 'Synchronous replication drill across Mumbai DC and Bengaluru DR',
        isCompleted: false,
        confidenceScore: 0.96
      },
      {
        id: 'OBL-IND-105',
        description: 'Execute Data Protection Impact Assessment under Digital Personal Data Protection Act (DPDPA 2023)',
        responsibleParty: 'Tata Consultancy Services Ltd.',
        dueDate: getDateOffset(18, refDate),
        monetaryValue: 1200000,
        latePenalty: 'Immediate statutory breach indemnity and full contract review rights',
        category: 'Legal',
        sourceClause: 'Clause 2.5: "Vendor shall execute full Data Protection Impact Assessment under DPDPA 2023 within 18 days... Any material breach triggers statutory breach indemnity."',
        verificationStatus: 'UNVERIFIED',
        riskLevel: 'MEDIUM',
        notes: 'Indian domestic data residency and biometric encryption assurance',
        isCompleted: false,
        confidenceScore: 0.93
      },
      {
        id: 'OBL-IND-106',
        description: 'Annual branch hardware & biometric terminal true-up reconciliation across 3,500 locations',
        responsibleParty: 'HDFC Bank Ltd.',
        dueDate: getDateOffset(30, refDate),
        monetaryValue: 6000000,
        latePenalty: 'Forfeiture of 5% performance bank guarantee (PBG) for unverified terminal counts',
        category: 'Audit',
        sourceClause: 'Clause 2.6: "Client shall conduct branch hardware & biometric terminal true-up... Unverified counts lead to forfeiture of 5% performance bank guarantee (PBG)."',
        verificationStatus: 'VERIFIED',
        riskLevel: 'HIGH',
        notes: 'Joint audit conducted with external statutory auditors',
        isCompleted: false,
        confidenceScore: 0.94
      }
    ]
  },
  {
    id: 'saas-msa',
    title: 'Enterprise Cloud SaaS & Service Level Agreement (SLA)',
    category: 'Information Technology & Cloud Infrastructure',
    metadata: {
      fileName: 'Nexus_CloudScale_MSA_Executed.pdf',
      fileSize: '2.4 MB',
      pageCount: 14,
      uploadedAt: new Date().toISOString(),
      contractTitle: 'Enterprise Cloud SaaS & SLA Agreement',
      contractType: 'Master Services Agreement (MSA)',
      parties: ['CloudScale Systems Inc. (Vendor)', 'Nexus Healthcare Enterprise (Client)'],
      rawTextPreview: `MASTER CLOUD HOSTING & SERVICE LEVEL AGREEMENT
BETWEEN CLOUDSCALE SYSTEMS INC. AND NEXUS HEALTHCARE ENTERPRISE

SECTION 3: COMPLIANCE & SECURITY ATTESTATION
3.1 SOC2 AUDIT: Vendor shall deliver verified SOC2 Type II compliance audit reports and third-party penetration testing attestations. In default thereof, a penalty deduction of $1,500/day applies up to 10% monthly invoice.
3.2 HYBRID CLOUD CUTOVER: Vendor covenants to complete initial hybrid cloud database migration and failover verification. Delay penalty: 2.0% fee reduction per calendar week.
3.3 SUPPORT RETAINER: Client shall remit Q3 Platform Maintenance & Support retainer ($87,500) upon invoice generation. Delinquent balances incur 1.5% late interest per month.
3.4 DR HOT-SITE: Vendor covenants to maintain RPO < 15min and RTO < 1hr with quarterly drills. Failure triggers $25,000 SLA service credits.`
    },
    getObligations: (refDate = getTodayIsoString()): ContractObligation[] => [
      {
        id: 'OBL-101',
        description: 'Delivery of SOC2 Type II compliance audit report and third-party penetration testing attestation',
        responsibleParty: 'CloudScale Systems Inc.',
        dueDate: getDateOffset(-12, refDate), // Overdue by 12 days
        monetaryValue: 45000,
        latePenalty: '$1,500/day penalty deduction up to maximum 10% of monthly invoice',
        category: 'Compliance',
        sourceClause: 'Clause 3.1: "Vendor shall deliver verified SOC2 Type II compliance audit reports... In default thereof, a penalty deduction of $1,500/day applies."',
        verificationStatus: 'VERIFIED',
        riskLevel: 'HIGH',
        notes: 'Mandatory healthcare HIPAA compliance condition under Schedule C',
        isCompleted: false,
        confidenceScore: 0.98
      },
      {
        id: 'OBL-102',
        description: 'Complete initial hybrid cloud database migration and failover cutover verification',
        responsibleParty: 'CloudScale Systems Inc.',
        dueDate: getDateOffset(-3, refDate), // Overdue by 3 days
        monetaryValue: 120000,
        latePenalty: '2.0% fee reduction on implementation fees per calendar week of delay',
        category: 'Deliverable',
        sourceClause: 'Clause 3.2: "Vendor covenants to complete initial hybrid cloud database migration... Delay penalty: 2.0% fee reduction per calendar week."',
        verificationStatus: 'VERIFIED',
        riskLevel: 'HIGH',
        notes: 'Requires dual sign-off from Client VP of Engineering',
        isCompleted: false,
        confidenceScore: 0.94
      },
      {
        id: 'OBL-103',
        description: 'Remit Q3 Platform Maintenance & Technical Support retainer disbursement',
        responsibleParty: 'Nexus Healthcare Enterprise',
        dueDate: getDateOffset(0, refDate), // DUE TODAY!
        monetaryValue: 87500,
        latePenalty: '1.5% late interest per month on outstanding undisputed balances',
        category: 'Payment',
        sourceClause: 'Clause 3.3: "Client shall remit Q3 Platform Maintenance & Support retainer ($87,500)... Delinquent balances incur 1.5% late interest per month."',
        verificationStatus: 'VERIFIED',
        riskLevel: 'HIGH',
        notes: 'Requires wire transfer confirmation by 17:00 EST',
        isCompleted: false,
        confidenceScore: 0.99
      },
      {
        id: 'OBL-104',
        description: 'Provision disaster recovery hot-site replication with RPO < 15min and RTO < 1hr',
        responsibleParty: 'CloudScale Systems Inc.',
        dueDate: getDateOffset(4, refDate), // Upcoming (4 days)
        monetaryValue: 65000,
        latePenalty: '$25,000 SLA service credit against next quarter billing',
        category: 'SLA',
        sourceClause: 'Clause 3.4: "Vendor covenants to maintain RPO < 15min and RTO < 1hr... Failure triggers $25,000 SLA service credits."',
        verificationStatus: 'VERIFIED',
        riskLevel: 'HIGH',
        notes: 'Quarterly load and recovery drill mandated under Section 7.4',
        isCompleted: false,
        confidenceScore: 0.96
      },
      {
        id: 'OBL-105',
        description: 'Submit updated Data Privacy Impact Assessment (DPIA) for cross-border telemetry',
        responsibleParty: 'CloudScale Systems Inc.',
        dueDate: getDateOffset(14, refDate), // Upcoming (14 days)
        monetaryValue: 32000,
        latePenalty: 'Right of immediate termination for uncured breach after 10 business days',
        category: 'Legal',
        sourceClause: 'Clause 4.1: "Submit updated Data Privacy Impact Assessment... Right of immediate termination for uncured breach."',
        verificationStatus: 'UNVERIFIED',
        riskLevel: 'MEDIUM',
        notes: 'European GDPR and California CCPA clause review',
        isCompleted: false,
        confidenceScore: 0.92
      },
      {
        id: 'OBL-106',
        description: 'Execute annual enterprise user seat true-up reconciliation and usage audit',
        responsibleParty: 'Nexus Healthcare Enterprise',
        dueDate: getDateOffset(28, refDate), // Upcoming (28 days)
        monetaryValue: 185000,
        latePenalty: 'Retroactive list-price rate adjustment for uncounted active licenses',
        category: 'Audit',
        sourceClause: 'Clause 5.2: "Execute annual enterprise user seat true-up... Retroactive list-price rate adjustment applies."',
        verificationStatus: 'VERIFIED',
        riskLevel: 'HIGH',
        notes: 'Scope covers 4,200 active clinical and administrative seats',
        isCompleted: false,
        confidenceScore: 0.95
      },
      {
        id: 'OBL-107',
        description: 'Final milestone acceptance certificate issuance for Phase 2 API Gateway Integration',
        responsibleParty: 'Nexus Healthcare Enterprise',
        dueDate: getDateOffset(45, refDate), // Upcoming (45 days)
        monetaryValue: 95000,
        latePenalty: 'Automatic milestone deemed acceptance after 15 calendar days silence',
        category: 'Deliverable',
        sourceClause: 'Clause 6.3: "Final milestone acceptance certificate issuance for Phase 2 API Gateway Integration."',
        verificationStatus: 'VERIFIED',
        riskLevel: 'LOW',
        notes: 'Pending final staging UAT test pass rate exceeding 99.5%',
        isCompleted: false,
        confidenceScore: 0.91
      }
    ]
  },
  {
    id: 'logistics-mou',
    title: 'Global Supply Chain & Freight Logistics Master Agreement',
    category: 'Procurement & Transportation',
    metadata: {
      fileName: 'Apex_Maritime_Freight_Contract.docx',
      fileSize: '1.8 MB',
      pageCount: 11,
      uploadedAt: new Date().toISOString(),
      contractTitle: 'Commercial Freight & Logistics Service Agreement',
      contractType: 'Commercial MoU & Logistics Framework',
      parties: ['Pacific Maritime Shipping Corp.', 'Apex Global Consumer Goods']
    },
    getObligations: (refDate = getTodayIsoString()): ContractObligation[] => [
      {
        id: 'LOG-201',
        description: 'Customs clearance documentation and hazardous material manifest filing for Port of Long Beach consignment',
        responsibleParty: 'Pacific Maritime Shipping Corp.',
        dueDate: getDateOffset(-7, refDate),
        monetaryValue: 78000,
        latePenalty: 'Demurrage fee of $450 per container per calendar day past free-time allowance',
        category: 'Compliance',
        isCompleted: false,
        confidenceScore: 0.97
      },
      {
        id: 'LOG-202',
        description: 'Payment of ocean freight charter bunker surcharge advance invoice',
        responsibleParty: 'Apex Global Consumer Goods',
        dueDate: getDateOffset(0, refDate), // DUE TODAY
        monetaryValue: 142000,
        latePenalty: 'Hold on bill of lading release and container gate dispatch',
        category: 'Payment',
        isCompleted: false,
        confidenceScore: 0.98
      },
      {
        id: 'LOG-203',
        description: 'Delivery of 120 temperature-controlled refrigerated containers to Inland Logistics Hub',
        responsibleParty: 'Pacific Maritime Shipping Corp.',
        dueDate: getDateOffset(6, refDate),
        monetaryValue: 310000,
        latePenalty: 'Liquidated damages of 1.0% shipment value per day of temperature breach or transit delay',
        category: 'Deliverable',
        isCompleted: false,
        confidenceScore: 0.95
      },
      {
        id: 'LOG-204',
        description: 'Quarterly carrier environmental emissions and IMO 2026 fuel compliance certification',
        responsibleParty: 'Pacific Maritime Shipping Corp.',
        dueDate: getDateOffset(22, refDate),
        monetaryValue: 25000,
        latePenalty: 'Suspension of preferred carrier status and forfeiture of annual performance bonus',
        category: 'Audit',
        isCompleted: false,
        confidenceScore: 0.93
      }
    ]
  },
  {
    id: 'hardware-procure',
    title: 'Turnkey Data Center Hardware & Installation Contract',
    category: 'Hardware Deployment & EPC',
    metadata: {
      fileName: 'InfraTech_Facility_Turnkey_EPC.pdf',
      fileSize: '3.1 MB',
      pageCount: 18,
      uploadedAt: new Date().toISOString(),
      contractTitle: 'Turnkey Data Center Deployment & Commissioning Contract',
      contractType: 'EPC Fixed-Price Agreement',
      parties: ['InfraTech Facilities Group LLC', 'Prime Global Data Centers']
    },
    getObligations: (refDate = getTodayIsoString()): ContractObligation[] => [
      {
        id: 'EPC-301',
        description: 'Structural seismic anchoring engineering sign-off and civil authority permit clearance',
        responsibleParty: 'InfraTech Facilities Group LLC',
        dueDate: getDateOffset(-20, refDate), // OVERDUE
        monetaryValue: 85000,
        latePenalty: '$2,000 per business day liquidated damages capped at 15% contract value',
        category: 'Deliverable',
        isCompleted: false,
        confidenceScore: 0.96
      },
      {
        id: 'EPC-302',
        description: 'High-voltage diesel backup generator load bank testing and environmental EPA certification',
        responsibleParty: 'InfraTech Facilities Group LLC',
        dueDate: getDateOffset(0, refDate), // DUE TODAY
        monetaryValue: 240000,
        latePenalty: 'Delay damages of $5,000 per operational cycle missed',
        category: 'Deliverable',
        isCompleted: false,
        confidenceScore: 0.94
      },
      {
        id: 'EPC-303',
        description: 'Progress Milestone Payment #3 release upon primary transformer energization',
        responsibleParty: 'Prime Global Data Centers',
        dueDate: getDateOffset(12, refDate),
        monetaryValue: 550000,
        latePenalty: 'Contractor right to pause onsite works after 5 business days delinquent notice',
        category: 'Payment',
        isCompleted: false,
        confidenceScore: 0.99
      },
      {
        id: 'EPC-304',
        description: 'Submission of Final As-Built BIM CAD Models and Equipment Maintenance Warranty Dossier',
        responsibleParty: 'InfraTech Facilities Group LLC',
        dueDate: getDateOffset(35, refDate),
        monetaryValue: 115000,
        latePenalty: '5% retainage withholding until full punch-list clearance',
        category: 'Deliverable',
        isCompleted: false,
        confidenceScore: 0.91
      }
    ]
  }
];

export const INITIAL_DEMO_CONTRACT = DEMO_CONTRACT_BUNDLES[0];
