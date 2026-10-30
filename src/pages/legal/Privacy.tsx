import LegalPage, { LegalSection } from './LegalPage'

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="At Nyaya AI, we take your privacy and the security of your personal information seriously. This Privacy Policy explains what information we collect, how we use it, where it is processed, how it is protected, and what rights you have when using our AI-powered legal technology platform. This policy applies to citizens, advocates and visitors using Nyaya AI."
    >
      <LegalSection title="1. Information We Collect">
        <p>
          We collect and process information necessary to provide
          our legal technology services, including:
        </p>

        <p><strong>Account Information</strong></p>
        <ul>
          <li>Name and email address.</li>
          <li>Phone number, where provided.</li>
          <li>Account type and role (Citizen or Advocate).</li>
          <li>Hashed password information for password-based accounts.</li>
          <li>Authentication and account security information.</li>
        </ul>

        <p><strong>AI Conversations and Research</strong></p>
        <p>
          Conversations, questions, prompts and responses generated
          through the AI Assistant and AI Research features may be
          stored against your account to support conversation history
          and related platform functionality.
        </p>

        <p><strong>Cases and Documents</strong></p>
        <p>
          We process case information, notes, uploaded legal documents,
          document analysis results and related metadata. Documents
          may be stored using cloud storage providers. Document
          fingerprints (cryptographic hashes) may also be generated
          for integrity verification.
        </p>

        <p><strong>Appointments and Activity Information</strong></p>
        <p>
          We may collect appointment details, booking information,
          notifications, meeting feedback, case activity history
          and document audit records.
        </p>

        <p><strong>Advocate Information</strong></p>
        <p>
          Advocates may provide profile information such as their
          specialisation, professional biography, location,
          Bar Council enrolment number, High Court details,
          enrolment year and consultation information.
        </p>

        <p>
          Users should avoid uploading unnecessary sensitive
          personal information or information belonging to
          other individuals without appropriate authorization.
        </p>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <p>
          We use collected information for the following purposes:
        </p>

        <ul>
          <li>Creating and managing user accounts.</li>
          <li>Providing AI-powered legal guidance and research assistance.</li>
          <li>Analyzing uploaded legal documents.</li>
          <li>Managing cases, notes and document records.</li>
          <li>Enabling citizens to discover and contact advocates.</li>
          <li>Managing consultation bookings and meeting workflows.</li>
          <li>Sending account verification emails and notifications.</li>
          <li>Maintaining platform security and preventing unauthorized access.</li>
          <li>Maintaining document integrity and audit records.</li>
          <li>Improving platform reliability and functionality.</li>
        </ul>

        <p>
          We do not intend to sell users' personal information
          to third parties.
        </p>
      </LegalSection>

      <LegalSection title="3. Information Sharing and Visibility">
        <p>
          Your account information, conversations and documents
          are associated with your account. Access may be provided
          to other users only where required for a platform feature
          or authorized by you.
        </p>

        <p><strong>Advocate Document Sharing</strong></p>
        <p>
          Documents can be shared with advocates through the
          platform's document-sharing functionality. Depending
          on the sharing workflow, an advocate may need to accept
          the share before accessing the document. Sharing
          permissions may expire or be withdrawn where supported
          by the platform.
        </p>

        <p><strong>Consultations</strong></p>
        <p>
          Advocates you book may access the information necessary
          to manage your consultation and provide their services.
        </p>

        <p><strong>Public Advocate Profiles</strong></p>
        <p>
          Advocate profile information intended for public
          discovery, including professional details, practice
          areas and location, may be visible to users browsing
          the advocate directory.
        </p>

        <p>
          We may also share limited information with service
          providers when necessary to operate the platform,
          as explained in the following section.
        </p>
      </LegalSection>

      <LegalSection title="4. Third-Party Service Providers">
        <p>
          Nyaya AI uses third-party infrastructure and technology
          providers to operate its features. Depending on the
          functionality being used, relevant information may
          be processed by these providers.
        </p>

        <ul>
          <li>
            <strong>Groq:</strong> AI text generation and
            processing of legal questions, prompts and
            related context.
          </li>
          <li>
            <strong>Sarvam AI:</strong> Speech-to-text,
            text-to-speech and language-related processing
            where these features are used.
          </li>
          <li>
            <strong>Supabase:</strong> Cloud file storage
            and related document operations.
          </li>
          <li>
            <strong>Email delivery providers:</strong>
            Sending account verification messages,
            notifications and other service-related emails.
          </li>
          <li>
            <strong>Cloud hosting and database providers:</strong>
            Hosting application infrastructure and storing
            information required for platform functionality.
          </li>
          <li>
            <strong>TinyFish:</strong> Web research functionality
            where external web research is requested.
          </li>
          <li>
            <strong>Google authentication services:</strong>
            Authentication when users choose to sign in
            using Google.
          </li>
        </ul>

        <p>
          Information is sent to a provider only when required
          for the relevant feature. For example, a legal question
          may be processed by an AI provider, while an audio
          recording may be sent to a speech-processing provider.
        </p>

        <p>
          These providers operate under their own applicable
          privacy policies and service terms. Their processing,
          security practices and retention arrangements may
          differ. Users should review the relevant provider
          policies where appropriate.
        </p>
      </LegalSection>

      <LegalSection title="5. Data Security">
        <p>
          We implement reasonable technical and organizational
          measures designed to protect user information against
          unauthorized access, alteration, disclosure or loss.
        </p>

        <p>Our security measures include:</p>

        <ul>
          <li>Secure authentication using HttpOnly cookies.</li>
          <li>Password hashing for password-based accounts.</li>
          <li>Cross-Site Request Forgery (CSRF) protection.</li>
          <li>Controlled access to user and case information.</li>
          <li>Secure communication through HTTPS.</li>
          <li>Document integrity verification using cryptographic hashes.</li>
          <li>Activity and audit logging for relevant operations.</li>
        </ul>

        <p>
          However, no internet-based platform or electronic
          storage system can guarantee absolute security.
        </p>

        <p>
          Nyaya AI is not an end-to-end encrypted service.
          Information processed through AI, document storage
          and other platform features may be accessible to
          our systems and the relevant service providers
          for the purpose of delivering those features.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Retention">
        <p>
          We retain personal information only for as long
          as reasonably necessary to provide our services,
          maintain platform functionality, fulfil legitimate
          operational requirements and comply with applicable
          legal obligations.
        </p>

        <ul>
          <li>
            <strong>Account Information:</strong> Retained
            while your account remains active and for any
            additional period required for legitimate
            operational or legal purposes.
          </li>
          <li>
            <strong>AI Conversations:</strong> Retained
            to provide conversation history and related
            account functionality until deleted or otherwise
            removed in accordance with applicable procedures.
          </li>
          <li>
            <strong>Documents and Cases:</strong> Retained
            while needed for case management, document
            sharing and related services, subject to
            deletion requests and applicable obligations.
          </li>
          <li>
            <strong>Appointment Records:</strong> Retained
            as necessary to manage bookings, consultations
            and related records.
          </li>
          <li>
            <strong>Security and Audit Logs:</strong> Retained
            for appropriate security, integrity, dispute
            resolution and compliance purposes.
          </li>
        </ul>

        <p>
          When information is no longer required, we will
          take reasonable steps to delete it or anonymize
          it, subject to applicable legal requirements.
        </p>

        <p>
          Certain information may remain in backup systems
          for a limited period or where retention is
          required by law.
        </p>
      </LegalSection>

      <LegalSection title="7. Your Privacy Rights and Data Deletion">
        <p>
          Subject to applicable law, users may request
          information about their personal data and
          exercise available privacy rights.
        </p>

        <p>These requests may include:</p>

        <ul>
          <li>
            <strong>Access:</strong> Request information
            about personal data associated with your account.
          </li>
          <li>
            <strong>Correction:</strong> Request correction
            of inaccurate or incomplete personal information.
          </li>
          <li>
            <strong>Deletion:</strong> Request deletion
            of personal information, subject to applicable
            retention requirements.
          </li>
          <li>
            <strong>Withdrawal of Consent:</strong> Withdraw
            consent where processing is based on consent,
            subject to applicable law.
          </li>
            <li>
            <strong>Grievance:</strong> Raise concerns
            regarding the collection, use or processing
            of personal information.
          </li>
        </ul>

        <p>
          To submit a privacy request, contact us using
          the email address provided in the Contact section.
          Please include your registered email address
          and describe the request clearly.
        </p>

        <p>
          We may request reasonable information to verify
          your identity before processing a request.
          We aim to respond within the timelines required
          under applicable law.
        </p>

        <p>
          Some records may need to be retained where
          required for legal compliance, security,
          dispute resolution or other lawful purposes.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies and Authentication">
        <p>
          Nyaya AI uses authentication cookies and related
          technologies to maintain secure user sessions,
          authenticate accounts and protect platform
          functionality.
        </p>

        <p>
          Authentication cookies are configured with
          security attributes, including HttpOnly, so
          they cannot be directly accessed by ordinary
          browser page scripts.
        </p>

        <p>
          These technologies are necessary for important
          platform functions. Disabling them may affect
          your ability to sign in or use certain features.
        </p>
      </LegalSection>

      <LegalSection title="9. Children's Privacy">
        <p>
          Nyaya AI is not specifically designed for
          children. Individuals should use the platform
          in accordance with applicable age requirements
          and laws.
        </p>

        <p>
          If we become aware that personal information
          has been collected in violation of applicable
          children's privacy requirements, we will
          take appropriate steps as required by law.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy to reflect
          changes in our technology, platform features,
          service providers, security practices or
          applicable laws.
        </p>

        <p>
          Updated versions will be published on this
          page with the revised date.
        </p>

        <p>
          Users are encouraged to review this page
          periodically to remain informed about how
          their information is handled.
        </p>
      </LegalSection>

      <LegalSection title="11. Privacy Contact and Grievance">
        <p>
          If you have questions, privacy concerns,
          requests regarding your personal information
          or complaints about how your data is handled,
          you can contact Nyaya AI.
        </p>

        <p>
          <strong>Platform:</strong> Nyaya AI
        </p>

        <p>
          <strong>Privacy Contact Email:</strong>{' '}
          <a href="mailto:nyaya.ai2007@gmail.com">
            nyaya.ai2007@gmail.com
          </a>
        </p>

        <p>
          Please use the subject line
          <strong> "Privacy Request – Nyaya AI"</strong>
          when contacting us about personal information.
        </p>

        <p>
          You may also submit complaints through the
          Grievance section available on our platform.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
