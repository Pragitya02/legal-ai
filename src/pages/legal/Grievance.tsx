import LegalPage, { LegalSection, Placeholder } from './LegalPage'

// ─── EDIT ME ────────────────────────────────────────────────────────────────
// Replace these placeholder values with the real grievance contact.
// While a value still starts with "[" it is shown as an unfilled placeholder.
const GRIEVANCE_CONTACT_NAME = '[ADD CONTACT NAME]'
const GRIEVANCE_CONTACT_EMAIL = '[ADD CONTACT EMAIL]'
// ────────────────────────────────────────────────────────────────────────────

const isFilled = (v: string) => !v.trim().startsWith('[')

function Field({ label, value, mailto }: { label: string; value: string; mailto?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      {!isFilled(value) ? (
        <span><Placeholder>{value.replace(/^\[|\]$/g, '')}</Placeholder></span>
      ) : mailto ? (
        <a href={`mailto:${value}`} style={{ color: '#C27635' }}>{value}</a>
      ) : (
        <span style={{ color: '#F5F1E8' }}>{value}</span>
      )}
    </div>
  )
}

export default function Grievance() {
  return (
    <LegalPage title="Grievance">
      <LegalSection title="Raise a concern">
        <p>
          If you have a complaint about the service, an advocate listing or how your information is handled, contact us using
          the details below.
        </p>
      </LegalSection>

      <LegalSection title="Grievance contact">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: 20,
            background: '#141414',
            border: '1px solid #262626',
            borderRadius: 12,
          }}
        >
          <Field label="Contact name" value={GRIEVANCE_CONTACT_NAME} />
          <Field label="Contact email" value={GRIEVANCE_CONTACT_EMAIL} mailto />
        </div>
      </LegalSection>

      <LegalSection title="Response time">
        <p><Placeholder>ADD ACKNOWLEDGEMENT AND RESOLUTION TIMELINES</Placeholder></p>
      </LegalSection>
    </LegalPage>
  )
}
