import LegalPage, { LegalSection } from './LegalPage'

export default function Disclaimer() {
  return (
    <LegalPage title="Disclaimer">
      <LegalSection title="General information only">
        <p>
          Nyaya AI gives general legal information, not legal advice. Nothing on this website, in the AI assistant, in a guidance
          report or in a document analysis creates an advocate-client relationship.
        </p>
      </LegalSection>

      <LegalSection title="AI-generated content can be wrong">
        <p>
          AI-generated information may be incomplete, outdated or inaccurate, and laws and procedures change. Please verify it
          with a qualified advocate before acting on it. For your specific case, consult a qualified advocate.
        </p>
      </LegalSection>

      <LegalSection title="Advocates">
        <p>
          Advocates listed on Nyaya AI are independent professionals. Their profiles are provided by them, and Nyaya AI does not
          guarantee their advice or any outcome.
        </p>
      </LegalSection>

      <LegalSection title="Urgent situations">
        <p>If you are in immediate danger, contact the emergency services rather than relying on this website.</p>
      </LegalSection>
    </LegalPage>
  )
}
