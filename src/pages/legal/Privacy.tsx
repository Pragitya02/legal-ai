import LegalPage, { LegalSection, Placeholder } from './LegalPage'

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      intro="This page describes, in plain terms, what the application currently does with your information. It is a working draft that must be reviewed by a qualified lawyer."
    >
      <LegalSection title="1. Information we handle">
        <p>Account details such as your name, email address, phone number and role, and a hashed form of your password (not the password itself) if you sign up with a password.</p>
        <p>Your conversations with the AI assistant, which are stored against your account.</p>
        <p>Cases, notes and documents you create or upload. Uploaded documents are kept in cloud storage, and a fingerprint (hash) of a document may be recorded to check its integrity later.</p>
        <p>Appointments, notifications, meeting feedback, an activity history and document audit logs.</p>
        <p>For advocates: profile details such as specialisation, location, bio, Bar Council enrolment number, High Court and enrolment year.</p>
      </LegalSection>

      <LegalSection title="2. Who can see it">
        <p>Your conversations and documents are tied to your account. A document is shared with an advocate only when you share it, and shares can be accepted, declined or expire. Advocates you book can see the details needed for that consultation.</p>
        <p>Advocate profile information is shown to users browsing advocates.</p>
      </LegalSection>

      <LegalSection title="3. Service providers">
        <p>
          To run the service we use providers for AI text generation (Groq), speech-to-text and translation (Sarvam), cloud file
          storage (Supabase) and email delivery. Content needed for a feature, such as your message or audio, is sent to the relevant provider to produce a result.
        </p>
      </LegalSection>

      <LegalSection title="4. Security">
        <p>
          Sign-in uses authentication cookies that are not readable by page scripts. Nyaya AI is not end-to-end encrypted: because the
          AI and storage features process your content on our servers and with the providers above, it is not hidden from them.
        </p>
      </LegalSection>

      <LegalSection title="5. Retention, access and deletion">
        <p><Placeholder>ADD RETENTION PERIODS</Placeholder></p>
        <p><Placeholder>ADD HOW USERS CAN REQUEST ACCESS, CORRECTION OR DELETION</Placeholder></p>
      </LegalSection>

      <LegalSection title="6. Contact">
        <p><Placeholder>ADD PRIVACY CONTACT</Placeholder> For complaints, see the Grievance page.</p>
      </LegalSection>
    </LegalPage>
  )
}
