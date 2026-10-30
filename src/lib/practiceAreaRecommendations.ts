import { practiceAreas } from '../data/practiceAreas'

type PracticeArea = (typeof practiceAreas)[number]

const RULES: { area: PracticeArea; pattern: RegExp }[] = [
  { area: 'Property Law', pattern: /\b(property|landlord|tenant|tenancy|rent(al)?|lease|security deposit|eviction|possession|sale deed|title deed|encroachment|partition)\b/i },
  { area: 'Real Estate Law', pattern: /\b(real estate|builder|rera|flat|apartment|plot|housing|home ?buyer)\b/i },
  { area: 'Civil Litigation', pattern: /\b(civil suit|civil court|recovery|injunction|decree|damages|civil litigation|refund|deposit|money suit|cpc)\b/i },
  { area: 'Consumer Law', pattern: /\b(consumer|defective|deficiency in service|unfair trade|consumer forum|consumer commission|e-?commerce)\b/i },
  { area: 'Criminal Law', pattern: /\b(fir|ipc|bns|bnss|crpc|arrest|police|theft|assault|cheating|fraud|criminal|bail|offence|offense)\b/i },
  { area: 'Criminal Defence', pattern: /\b(bail|anticipatory bail|accused|defen[cs]e|charge ?sheet)\b/i },
  { area: 'Divorce & Matrimonial Law', pattern: /\b(divorce|alimony|maintenance|separation|matrimonial|dowry|domestic violence|498a)\b/i },
  { area: 'Family Law', pattern: /\b(custody|adoption|guardian|family dispute|marriage|spouse|child support)\b/i },
  { area: 'Employment & Labour Law', pattern: /\b(employer|employee|salary|wages|termination|labou?r|gratuity|provident fund|epf|workplace|posh|wrongful dismissal)\b/i },
  { area: 'Corporate Law', pattern: /\b(company law|shareholder|director|incorporation|roc|llp|corporate)\b/i },
  { area: 'Contracts Law', pattern: /\b(contract|agreement|breach|mou|non-?compete|indemnity)\b/i },
  { area: 'Intellectual Property Law', pattern: /\b(trademark|copyright|patent|intellectual property|passing off)\b/i },
  { area: 'Cyber Law', pattern: /\b(cyber|online fraud|hacking|phishing|it act|identity theft|upi fraud)\b/i },
  { area: 'Tax Law', pattern: /\b(income tax|tax notice|itr|tax evasion|tds)\b/i },
  { area: 'GST & Indirect Tax', pattern: /\b(gst|input tax credit|indirect tax)\b/i },
  { area: 'Motor Accident Claims', pattern: /\b(motor accident|road accident|mact|vehicle accident|hit and run)\b/i },
  { area: 'Wills, Trusts & Estate Planning', pattern: /\b(will|probate|succession|inheritance|estate planning|heir|legal heir)\b/i },
  { area: 'Banking & Finance Law', pattern: /\b(loan|emi|bank|cheque bounce|negotiable instrument|section 138|sarfaesi|recovery agent)\b/i },
  { area: 'Bankruptcy & Insolvency Law', pattern: /\b(insolvency|bankruptcy|ibc|nclt)\b/i },
  { area: 'Service Law', pattern: /\b(government job|service matter|pension|cat tribunal|departmental inquiry)\b/i },
  { area: 'Immigration & Visa Law', pattern: /\b(visa|immigration|passport|deportation|citizenship)\b/i },
  { area: 'Medical & Healthcare Law', pattern: /\b(medical negligence|hospital|doctor negligence|malpractice)\b/i },
  { area: 'Data Protection & Privacy Law', pattern: /\b(data protection|dpdp|privacy|personal data)\b/i },
  { area: 'Environmental Law', pattern: /\b(environment(al)?|pollution|ngt)\b/i },
  { area: 'Constitutional Law', pattern: /\b(fundamental right|writ|article 21|article 14|constitution(al)?)\b/i },
  { area: 'Arbitration & Mediation', pattern: /\b(arbitration|mediation|arbitrator)\b/i },
]

// Weighs the user's query double vs. the AI response; returns 2-4 areas, or [] if none.
export function getRecommendedPracticeAreas(
  query: string,
  response: string,
): PracticeArea[] {
  const scored = RULES.map(({ area, pattern }, order) => {
    const g = new RegExp(pattern.source, 'gi')
    const q = (query.match(g) || []).length
    const r = (response.match(g) || []).length
    return { area, order, score: q * 2 + Math.min(r, 3) }
  })
    .filter(s => s.score > 0 && (practiceAreas as readonly string[]).includes(s.area))
    .sort((a, b) => b.score - a.score || a.order - b.order)

  // Avoid redundant near-duplicates
  const picked: PracticeArea[] = []
  for (const s of scored) {
    if (s.area === 'Criminal Defence' && picked.includes('Criminal Law') && s.score < 3) continue
    if (s.area === 'Family Law' && picked.includes('Divorce & Matrimonial Law') && s.score < 3) continue
    picked.push(s.area)
    if (picked.length === 4) break
  }
  return picked.length >= 2 || (picked.length === 1 && scored[0].score >= 3) ? picked : []
}
