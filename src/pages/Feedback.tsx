import React, { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    Flag,
    Loader2,
    ShieldCheck,
    Star,
} from "lucide-react";

const BACKEND_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5001";

type ReviewerRole = "citizen" | "advocate";

interface FeedbackFormData {
    appointmentId: number;
    reviewerRole: ReviewerRole;
    revieweeRole: ReviewerRole;
    revieweeId: number;
    revieweeName: string;
    status?: string;
}

const REPORT_OPTIONS = [
    { value: "technical_issue", label: "Technical issue" },
    { value: "bad_behaviour", label: "Bad behaviour" },
    { value: "unprofessional_conduct", label: "Unprofessional conduct" },
    { value: "harassment", label: "Harassment / inappropriate behaviour" },
    { value: "misleading_information", label: "Misleading information" },
    { value: "payment_issue", label: "Payment / consultation issue" },
    { value: "other", label: "Other" },
    { value: "custom", label: "Custom" },
];

function getAppointmentId(): string | null {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("appointmentId");
    if (fromQuery) return fromQuery;

    const parts = window.location.pathname.split("/").filter(Boolean);
    const index = parts.findIndex((part) => part === "feedback");
    return index >= 0 ? parts[index + 1] || null : null;
}

export default function Feedback() {
    const appointmentId = getAppointmentId();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState<FeedbackFormData | null>(null);

    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");

    const [showReport, setShowReport] = useState(false);
    const [reportCategory, setReportCategory] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [reportDetails, setReportDetails] = useState("");

    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            if (!appointmentId) {
                setError("Invalid consultation feedback link.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await fetch(
                    `${BACKEND_URL}/api/feedback/form/${encodeURIComponent(appointmentId)}`,
                    {
                        credentials: "include",
                        headers: { Accept: "application/json" },
                    }
                );

                const data = await response.json();

                if (!response.ok || !data?.success) {
                    throw new Error(
                        data?.message || "Unable to load feedback form."
                    );
                }

                if (cancelled) return;

                if (data.alreadySubmitted) {
                    setSubmitted(true);
                    return;
                }

                setForm(data.consultation);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load feedback form."
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [appointmentId]);

    const title = useMemo(() => {
        if (!form) return "Consultation Feedback";
        return form.reviewerRole === "citizen"
            ? "Rate Your Advocate"
            : "Consultation Feedback";
    }, [form]);

    const reportLabel = form?.reviewerRole === "citizen"
        ? "Report Advocate"
        : "Report User";

    async function submitFeedback() {
        if (!form || !appointmentId || submitting) return;

        if (rating < 1 || rating > 5) {
            setError("Please select a rating from 1 to 5 stars.");
            return;
        }

        if (showReport && !reportCategory) {
            setError(`Please select a reason to ${reportLabel.toLowerCase()}.`);
            return;
        }

        if (showReport && reportCategory === "custom" && !customReason.trim()) {
            setError("Please describe your custom report reason.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            const report = showReport
                ? {
                    category: reportCategory,
                    customReason: customReason.trim(),
                    details: reportDetails.trim(),
                }
                : null;

            const response = await fetch(
                `${BACKEND_URL}/api/feedback/submit`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        appointmentId: Number(appointmentId),
                        rating,
                        comment: comment.trim(),
                        report,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(
                    data?.message || "Unable to submit feedback."
                );
            }

            setSubmitted(true);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to submit feedback."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
                <div className="text-center">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-yellow-400" />
                    <p className="mt-4 text-gray-400">Loading feedback...</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
                <div className="w-full max-w-lg rounded-2xl border border-green-500/20 bg-gray-950 p-8 text-center shadow-2xl">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                        <CheckCircle2 className="h-9 w-9 text-green-400" />
                    </div>

                    <h1 className="mt-6 text-2xl font-bold">
                        Thank you for your feedback
                    </h1>

                    <p className="mt-3 text-gray-400">
                        Your consultation feedback has been submitted successfully.
                    </p>
<button
    type="button"
    onClick={() => {
        if (form?.reviewerRole === "advocate") {
            window.location.href = "/advocate/meetings";
        } else {
            window.location.href = "/dashboard/meetings";
        }
    }}
    className="mt-7 rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-black hover:bg-yellow-400"
>
    Continue
</button>
                </div>
            </div>
        );
    }

    if (error && !form) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
                <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-gray-950 p-8 text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
                    <h1 className="mt-5 text-2xl font-bold">
                        Feedback unavailable
                    </h1>
                    <p className="mt-3 text-red-300">{error}</p>
                    <p className="mt-4 text-sm text-gray-500">
                        Please try signing in again.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gray-950 shadow-2xl overflow-hidden">
                <div className="border-b border-white/10 bg-gray-900/80 p-6 md:p-8">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-yellow-500/10 p-3">
                            <ShieldCheck className="h-6 w-6 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider text-gray-500">
                                Nyaya AI
                            </p>
                            <h1 className="text-2xl font-bold">{title}</h1>
                        </div>
                    </div>

                    <p className="mt-5 text-gray-300">
                        Your consultation with{" "}
                        <span className="font-semibold text-white">
                            {form?.revieweeName || "the other participant"}
                        </span>{" "}
                        has ended permanently.
                    </p>

                    <div className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-100">
                        Please complete this feedback before continuing to your account.
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    {error && (
                        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <section>
                        <h2 className="text-lg font-semibold">
                            {form?.reviewerRole === "citizen"
                                ? "How would you rate this advocate?"
                                : "How was your consultation?"}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            A rating is required.
                        </p>

                        <div className="mt-5 flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((value) => {
                                const active =
                                    value <= (hoverRating || rating);

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onMouseEnter={() => setHoverRating(value)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => {
                                            setRating(value);
                                            setError("");
                                        }}
                                        className="rounded-lg p-1 transition hover:scale-110"
                                        aria-label={`${value} star${value > 1 ? "s" : ""}`}
                                    >
                                        <Star
                                            className={`h-10 w-10 transition ${
                                                active
                                                    ? "fill-yellow-400 text-yellow-400"
                                                    : "text-gray-600"
                                            }`}
                                        />
                                    </button>
                                );
                            })}
                        </div>

                        <p className="mt-2 text-sm text-gray-500">
                            {rating
                                ? `${rating} out of 5 stars`
                                : "Select a rating"}
                        </p>
                    </section>

                    <section className="mt-8">
                        <label className="block text-sm font-semibold text-white">
                            Additional feedback
                        </label>
                        <textarea
                            value={comment}
                            onChange={(event) => setComment(event.target.value)}
                            rows={5}
                            maxLength={2000}
                            placeholder={
                                form?.reviewerRole === "citizen"
                                    ? "Tell us about your experience with the advocate..."
                                    : "Tell us about your consultation experience..."
                            }
                            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-yellow-500/50"
                        />
                        <p className="mt-1 text-right text-xs text-gray-600">
                            {comment.length}/2000
                        </p>
                    </section>

                    <section className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                        <button
                            type="button"
                            onClick={() => {
                                setShowReport((value) => !value);
                                setError("");
                            }}
                            className="flex w-full items-center justify-between text-left"
                        >
                            <span className="flex items-center gap-3 font-semibold text-white">
                                <Flag className="h-5 w-5 text-red-400" />
                                {reportLabel}
                            </span>
                            <span className="text-sm text-gray-500">
                                {showReport ? "Hide" : "Optional"}
                            </span>
                        </button>

                        {showReport && (
                            <div className="mt-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">
                                        Reason
                                    </label>
                                    <select
                                        value={reportCategory}
                                        onChange={(event) => {
                                            setReportCategory(event.target.value);
                                            setError("");
                                        }}
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none focus:border-red-500/50"
                                    >
                                        <option value="">Select a reason</option>
                                        {REPORT_OPTIONS.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {reportCategory === "custom" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300">
                                            Custom reason
                                        </label>
                                        <input
                                            value={customReason}
                                            onChange={(event) =>
                                                setCustomReason(event.target.value)
                                            }
                                            maxLength={500}
                                            placeholder="Describe the reason..."
                                            className="mt-2 w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-red-500/50"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-300">
                                        Details
                                    </label>
                                    <textarea
                                        value={reportDetails}
                                        onChange={(event) =>
                                            setReportDetails(event.target.value)
                                        }
                                        rows={4}
                                        maxLength={2000}
                                        placeholder="Provide any useful details for the Nyaya AI support team..."
                                        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-red-500/50"
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    <button
                        type="button"
                        onClick={submitFeedback}
                        disabled={submitting || rating === 0}
                        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 px-5 py-3.5 font-semibold text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-5 w-5" />
                                Submit Feedback
                            </>
                        )}
                    </button>

                    <p className="mt-4 text-center text-xs text-gray-600">
                        Your feedback helps improve the consultation experience.
                        Reports are reviewed separately and are not displayed publicly.
                    </p>
                </div>
            </div>
        </div>
    );
}
