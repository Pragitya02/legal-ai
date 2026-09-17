import React, { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

interface PendingFeedback {
  appointmentId: number;
  revieweeId: number;
  revieweeRole: "citizen" | "advocate";
  revieweeName: string;
}

interface MandatoryFeedbackGateProps {
  children: React.ReactNode;
}

/*
|--------------------------------------------------------------------------
| MANDATORY FEEDBACK GATE
|--------------------------------------------------------------------------
|
| This component protects authenticated dashboard pages.
|
| Flow:
|
| Permanent consultation end
|          ↓
| Backend creates pending feedback
|          ↓
| User closes website
|          ↓
| User logs in later
|          ↓
| DashboardLayout mounts
|          ↓
| /api/feedback/pending is checked
|          ↓
| Pending feedback exists?
|       YES ↓
|      /feedback
|          ↓
| Feedback submitted
|          ↓
| Dashboard becomes accessible
|
| There is intentionally NO close button.
|--------------------------------------------------------------------------
*/

export default function MandatoryFeedbackGate({
  children,
}: MandatoryFeedbackGateProps) {
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState<PendingFeedback | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkPendingFeedback() {
      /*
      |--------------------------------------------------------------------------
      | Feedback page must always remain accessible
      |--------------------------------------------------------------------------
      |
      | The feedback page itself is outside DashboardLayout in routes.tsx,
      | but this protection also prevents accidental redirect loops if the
      | component is ever reused elsewhere.
      |--------------------------------------------------------------------------
      */

      const currentPath = window.location.pathname;

      if (currentPath.startsWith("/feedback")) {
        if (!cancelled) {
          setChecking(false);
          setPending(null);
        }

        return;
      }

      try {
        const baseUrl = BACKEND_URL.replace(/\/+$/, "");

        const response = await fetch(
          `${baseUrl}/api/feedback/pending`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          }
        );

        /*
        |--------------------------------------------------------------------------
        | Authentication/session problems
        |--------------------------------------------------------------------------
        */

        if (response.status === 401 || response.status === 403) {
          if (!cancelled) {
            setPending(null);
            setChecking(false);
          }

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Other API errors
        |--------------------------------------------------------------------------
        */

        if (!response.ok) {
          console.warn(
            "Mandatory feedback API returned:",
            response.status
          );

          if (!cancelled) {
            setPending(null);
            setChecking(false);
          }

          return;
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Expected backend response
        |--------------------------------------------------------------------------
        |
        | {
        |   success: true,
        |   pending: true,
        |   feedback: {
        |     appointmentId: 123,
        |     revieweeId: 456,
        |     revieweeRole: "advocate",
        |     revieweeName: "..."
        |   }
        | }
        |--------------------------------------------------------------------------
        */

        if (
          data?.success === true &&
          data?.pending === true &&
          data?.feedback
        ) {
          const feedback = data.feedback as PendingFeedback;

          /*
          |--------------------------------------------------------------------------
          | Basic validation
          |--------------------------------------------------------------------------
          */

          if (
            Number.isFinite(Number(feedback.appointmentId)) &&
            Number.isFinite(Number(feedback.revieweeId)) &&
            (feedback.revieweeRole === "citizen" ||
              feedback.revieweeRole === "advocate")
          ) {
            setPending(feedback);
            setChecking(false);

            /*
            |--------------------------------------------------------------------------
            | Redirect to mandatory feedback
            |--------------------------------------------------------------------------
            */

            const appointmentId = encodeURIComponent(
              String(feedback.appointmentId)
            );

            window.location.replace(
              `/feedback?appointmentId=${appointmentId}`
            );

            return;
          }

          console.warn(
            "Invalid pending feedback response:",
            data
          );
        }

        /*
        |--------------------------------------------------------------------------
        | No pending feedback
        |--------------------------------------------------------------------------
        */

        setPending(null);
        setChecking(false);
      } catch (error) {
        /*
        |--------------------------------------------------------------------------
        | Network/API failure
        |--------------------------------------------------------------------------
        */

        console.warn(
          "Mandatory feedback check failed:",
          error
        );

        if (!cancelled) {
          setPending(null);
          setChecking(false);
        }
      }
    }

    void checkPendingFeedback();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CHECKING / REDIRECTING
  |--------------------------------------------------------------------------
  */

  if (checking || pending) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black text-white">
        <div className="px-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-yellow-500/20 bg-yellow-500/10">
            {pending ? (
              <ShieldCheck className="h-8 w-8 text-yellow-400" />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
            )}
          </div>

          <h2 className="mt-5 text-xl font-semibold">
            {pending
              ? "Feedback required"
              : "Checking consultation status..."}
          </h2>

          <p className="mt-2 max-w-md text-sm text-gray-500">
            {pending
              ? "Please complete your post-consultation feedback before using your account."
              : "Please wait..."}
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | NO PENDING FEEDBACK
  |--------------------------------------------------------------------------
  */

  return <>{children}</>;
}