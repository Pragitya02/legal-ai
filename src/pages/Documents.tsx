import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { isLoggedIn } from "../lib/auth";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Lock,
  Eye,
  X,
  ShieldCheck,
  Info,
  Copy,
  ExternalLink,
  Clock,
  Share2,
} from "lucide-react";

interface Doc {
  id?: number;
  name: string;
  size: string;
  date: string;
  type: string;
  url?: string;
  documentHash?: string | null;
  blockchainTxHash?: string | null;
  blockchainStatus?: string | null;
  blockchainNetwork?: string | null;
}

// Audit Trail (Step 4) — one entry returned by
// GET /api/documents/:id/audit. Read-only, matches the
// shape already produced by the Step 3 backend endpoint.
interface DocumentShare {
  id: number;
  documentId: number;
  fileName: string;
  fileType?: string | null;
  senderId: number;
  recipientId: number;
  senderName?: string | null;
  senderEmail?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  shareType: "permanent" | "temporary";
  durationDays?: number | null;
  expiresAt?: string | null;
  status: "pending" | "accepted" | "rejected" | "revoked" | "expired";
  createdAt: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  revokedAt?: string | null;
}
interface ShareRecipient {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuditLogEntry {
  id: number;
  description: string;
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
}

type ProtectedAction =
  | "load"
  | "upload"
  | "open"
  | "download"
  | "rename"
  | "delete"
  | "verify_blockchain"
  | "register_blockchain";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function Documents() {
  const location = useLocation();
  const isAdvocate = location.pathname.startsWith("/advocate");

  const [docs, setDocs] = useState<Doc[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // =====================================================
  // DOCUMENT SECURITY PASSWORD STATE
  // =====================================================

  const [securityLoading, setSecurityLoading] = useState(true);
  const [hasSecurityPassword, setHasSecurityPassword] =
    useState(false);

  const [showSetupModal, setShowSetupModal] =
    useState(false);

  const [showVerifyModal, setShowVerifyModal] =
    useState(false);

  const [securityPassword, setSecurityPassword] =
    useState("");

  const [securityConfirmPassword, setSecurityConfirmPassword] =
    useState("");

  const [securityError, setSecurityError] =
    useState<string | null>(null);

  const [securitySubmitting, setSecuritySubmitting] =
    useState(false);

  // =====================================================
  // DOCUMENT SECURITY PASSWORD RESET STATE
  // =====================================================

  const [showResetModal, setShowResetModal] =
    useState(false);

  const [resetStep, setResetStep] =
    useState<"request" | "verify">("request");

  const [resetCode, setResetCode] =
    useState("");

  const [resetPassword, setResetPassword] =
    useState("");

  const [resetConfirmPassword, setResetConfirmPassword] =
    useState("");

  const [resetError, setResetError] =
    useState<string | null>(null);

  const [resetSubmitting, setResetSubmitting] =
    useState(false);

  const [resetEmail, setResetEmail] =
    useState<string | null>(null);

  const [protectedAction, setProtectedAction] =
    useState<ProtectedAction | null>(null);

  const [pendingUploadFiles, setPendingUploadFiles] =
    useState<File[]>([]);

  const [pendingDocument, setPendingDocument] =
    useState<Doc | null>(null);

  const [pendingRenameId, setPendingRenameId] =
    useState<number | undefined>(undefined);

  const [pendingRenameName, setPendingRenameName] =
    useState("");

  const [verifyingBlockchainId, setVerifyingBlockchainId] =
    useState<number | undefined>(undefined);

  // =====================================================
  // BLOCKCHAIN PROOF / DETAILS VIEW STATE (Step 6)
  // =====================================================

  const [showBlockchainDetails, setShowBlockchainDetails] =
    useState(false);

  const [blockchainDetailsDoc, setBlockchainDetailsDoc] =
    useState<Doc | null>(null);

  // Most recent /blockchain/verify result per document id,
  // so the Details view can show the last-known verification
  // result without re-triggering a verify itself.
  const [blockchainVerifyResults, setBlockchainVerifyResults] =
    useState<
      Record<
        number,
        { status: string; verified?: boolean }
      >
    >({});

  const [pendingDeleteId, setPendingDeleteId] =
    useState<number | undefined>(undefined);

  const [pendingDeleteName, setPendingDeleteName] =
    useState("");

  // =====================================================
  // AUDIT TRAIL / ACTIVITY HISTORY STATE (Step 4)
  // =====================================================

  const [showAuditModal, setShowAuditModal] =
    useState(false);

  const [auditDoc, setAuditDoc] =
    useState<Doc | null>(null);

  const [auditLoading, setAuditLoading] =
    useState(false);

  const [auditError, setAuditError] =
    useState<string | null>(null);

  const [auditHistory, setAuditHistory] =
    useState<AuditLogEntry[]>([]);

  // =====================================================
  // DOCUMENT SHARING STATE (Step 2)
  // =====================================================

  const [showShareModal, setShowShareModal] =
    useState(false);

  const [shareDocument, setShareDocument] =
    useState<Doc | null>(null);

  const [shareType, setShareType] =
    useState<"permanent" | "temporary">("permanent");

  const [shareDurationDays, setShareDurationDays] =
    useState<number>(7);

  const [shareRecipients, setShareRecipients] =
    useState<ShareRecipient[]>([]);

  const [selectedRecipientId, setSelectedRecipientId] =
    useState<number | null>(null);

  const [shareRecipientsLoading, setShareRecipientsLoading] =
    useState(false);

  const [shareSubmitting, setShareSubmitting] =
    useState(false);

  const [shareError, setShareError] =
    useState<string | null>(null);

  // Shared documents management state.
  const [incomingShares, setIncomingShares] =
    useState<DocumentShare[]>([]);

  const [outgoingShares, setOutgoingShares] =
    useState<DocumentShare[]>([]);

  const [sharesLoading, setSharesLoading] =
    useState(false);

  const [sharesError, setSharesError] =
    useState<string | null>(null);

  const [shareActionId, setShareActionId] =
    useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);

  // =====================================================
  // TOAST
  // =====================================================

  const showToast = (message: string) => {
    setToast(message);

    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  // =====================================================
  // DOCUMENT SHARING
  // =====================================================

  const openShareModal = async (doc: Doc) => {
    if (!doc.id) {
      showToast("Unable to share this document.");
      return;
    }

    if (!isLoggedIn()) {
      showToast("Please login again.");
      return;
    }

    setShareDocument(doc);
    setShareType("permanent");
    setShareDurationDays(7);
    setSelectedRecipientId(null);
    setShareError(null);
    setShareRecipients([]);
    setShowShareModal(true);
    setShareRecipientsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/document-shares/recipients`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setShareError(
          result.message ||
            "Unable to load eligible recipients."
        );
        return;
      }

      setShareRecipients(
        Array.isArray(result.recipients)
          ? result.recipients.map((recipient: any) => ({
              id: Number(recipient.id),
              name:
                recipient.name ||
                recipient.full_name ||
                "Unknown user",
              email: recipient.email || "",
              role: recipient.role || "",
            }))
          : []
      );
    } catch (error) {
      console.error(
        "LOAD SHARE RECIPIENTS ERROR:",
        error
      );

      setShareError(
        "Unable to load eligible recipients."
      );
    } finally {
      setShareRecipientsLoading(false);
    }
  };

  const closeShareModal = () => {
    if (shareSubmitting) {
      return;
    }

    setShowShareModal(false);
    setShareDocument(null);
    setShareType("permanent");
    setShareDurationDays(7);
    setShareRecipients([]);
    setSelectedRecipientId(null);
    setShareError(null);
  };

  const submitDocumentShare = async () => {
    if (!shareDocument?.id) {
      setShareError("Document ID is missing.");
      return;
    }

    if (!selectedRecipientId) {
      setShareError(
        isAdvocate
          ? "Please select a client."
          : "Please select an advocate."
      );
      return;
    }

    if (
      shareType === "temporary" &&
      (
        !Number.isInteger(shareDurationDays) ||
        shareDurationDays < 1 ||
        shareDurationDays > 365
      )
    ) {
      setShareError(
        "Temporary sharing must be between 1 and 365 days."
      );
      return;
    }

    try {
      setShareSubmitting(true);
      setShareError(null);

      if (!isLoggedIn()) {
        setShareError("Please login again.");
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/document-shares`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: shareDocument.id,
            recipientId: selectedRecipientId,
            shareType,
            durationDays:
              shareType === "temporary"
                ? shareDurationDays
                : null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setShareError(
          result.message ||
            "Unable to share document."
        );
        return;
      }

      showToast(
        shareType === "temporary"
          ? `Document share request sent for ${shareDurationDays} day${shareDurationDays === 1 ? "" : "s"}.`
          : "Document share request sent."
      );

      await loadDocumentShares();
      closeShareModal();
    } catch (error) {
      console.error(
        "DOCUMENT SHARE ERROR:",
        error
      );

      setShareError(
        "Unable to share document. Please try again."
      );
    } finally {
      setShareSubmitting(false);
    }
  };

  // =====================================================
  // SHARED DOCUMENTS MANAGEMENT
  // =====================================================

  const loadDocumentShares = async () => {
    try {
      if (!isLoggedIn()) {
        return;
      }

      setSharesLoading(true);
      setSharesError(null);

      const response = await fetch(
        `${API_BASE}/api/document-shares?_=${Date.now()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to load shared documents."
        );
      }

      setIncomingShares(
        Array.isArray(result.incoming)
          ? result.incoming
          : []
      );

      setOutgoingShares(
        Array.isArray(result.outgoing)
          ? result.outgoing
          : []
      );
    } catch (error) {
      console.error(
        "LOAD DOCUMENT SHARES ERROR:",
        error
      );

      setSharesError(
        error instanceof Error
          ? error.message
          : "Unable to load shared documents."
      );
    } finally {
      setSharesLoading(false);
    }
  };

  const hasActiveTemporaryShare = (
    documentId?: number
  ) => {
    if (!documentId) {
      return false;
    }

    return outgoingShares.some(
      (share) =>
        Number(share.documentId) ===
          Number(documentId) &&
        share.shareType === "temporary" &&
        (share.status === "pending" ||
          share.status === "accepted") &&
        (
          !share.expiresAt ||
          new Date(share.expiresAt).getTime() >
            Date.now()
        )
    );
  };

  const removeIncomingSharedDocument = async (
    share: DocumentShare
  ) => {
    const confirmed = window.confirm(
      "Remove this shared document from your Shared Documents list?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setShareActionId(share.id);
      setSharesError(null);

      const response = await fetch(
        `${API_BASE}/api/document-shares/${share.id}/remove`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        showToast(
          result.message ||
            "Unable to remove shared document."
        );
        return;
      }

      showToast(
        "Shared document removed."
      );

      await loadDocumentShares();
    } catch (error) {
      console.error(
        "REMOVE SHARED DOCUMENT ERROR:",
        error
      );

      showToast(
        "Unable to remove shared document."
      );
    } finally {
      setShareActionId(null);
    }
  };

  const respondToDocumentShare = async (
    shareId: number,
    action: "accept" | "reject"
  ) => {
    try {
      setShareActionId(shareId);
      setSharesError(null);

      const response = await fetch(
        `${API_BASE}/api/document-shares/${shareId}/respond`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        showToast(
          result.message ||
            `Unable to ${action} document share.`
        );
        return;
      }

      showToast(
        action === "accept"
          ? "Document share accepted."
          : "Document share rejected."
      );

      await loadDocumentShares();
    } catch (error) {
      console.error(
        "RESPOND DOCUMENT SHARE ERROR:",
        error
      );

      showToast(
        `Unable to ${action} document share.`
      );
    } finally {
      setShareActionId(null);
    }
  };

  const revokeDocumentShare = async (
    shareId: number
  ) => {
    const confirmed = window.confirm(
      "Revoke access to this shared document?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setShareActionId(shareId);
      setSharesError(null);

      const response = await fetch(
        `${API_BASE}/api/document-shares/${shareId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        showToast(
          result.message ||
            "Unable to revoke document access."
        );
        return;
      }

      showToast("Document access revoked.");

      await loadDocumentShares();
    } catch (error) {
      console.error(
        "REVOKE DOCUMENT SHARE ERROR:",
        error
      );

      showToast(
        "Unable to revoke document access."
      );
    } finally {
      setShareActionId(null);
    }
  };

  const openSharedDocument = async (
    share: DocumentShare
  ) => {
    try {
      setShareActionId(share.id);

      const response = await fetch(
        `${API_BASE}/api/document-shares/${share.id}/content`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        let message =
          "Unable to open shared document.";

        try {
          const result = await response.json();
          message =
            result.message ||
            message;
        } catch {
          // Response was not JSON.
        }

        showToast(message);
        return;
      }

      const blob = await response.blob();
      const blobUrl =
        URL.createObjectURL(blob);

      window.open(
        blobUrl,
        "_blank",
        "noopener,noreferrer"
      );

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch (error) {
      console.error(
        "OPEN SHARED DOCUMENT ERROR:",
        error
      );

      showToast(
        "Unable to open shared document."
      );
    } finally {
      setShareActionId(null);
    }
  };

  const downloadSharedDocument = async (
    share: DocumentShare
  ) => {
    if (share.shareType === "temporary") {
      showToast("Download is not permitted for temporary shares.");
      return;
    }

    try {
      setShareActionId(share.id);

      const response = await fetch(
        `${API_BASE}/api/document-shares/${share.id}/download`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        let message =
          "Unable to download shared document.";

        try {
          const result = await response.json();
          message =
            result.message ||
            message;
        } catch {
          // Response was not JSON.
        }

        showToast(message);
        return;
      }

      const blob = await response.blob();
      const blobUrl =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = blobUrl;
      anchor.download =
        share.fileName ||
        "shared-document";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch (error) {
      console.error(
        "DOWNLOAD SHARED DOCUMENT ERROR:",
        error
      );

      showToast(
        "Unable to download shared document."
      );
    } finally {
      setShareActionId(null);
    }
  };

  const formatShareDate = (
    value?: string | null
  ) => {
    if (!value) {
      return "—";
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  const getShareStatusStyle = (
    status: DocumentShare["status"]
  ) => {
    switch (status) {
      case "accepted":
        return {
          background:
            "rgba(34, 197, 94, 0.10)",
          color: "#22C55E",
          border:
            "1px solid rgba(34, 197, 94, 0.22)",
        };

      case "pending":
        return {
          background:
            "rgba(234, 179, 8, 0.10)",
          color: "#EAB308",
          border:
            "1px solid rgba(234, 179, 8, 0.22)",
        };

      case "rejected":
      case "revoked":
      case "expired":
        return {
          background:
            "rgba(239, 68, 68, 0.08)",
          color: "#EF4444",
          border:
            "1px solid rgba(239, 68, 68, 0.18)",
        };

      default:
        return {
          background:
            "var(--bg-card)",
          color:
            "var(--text-muted)",
          border:
            "1px solid var(--border)",
        };
    }
  };

  useEffect(() => {
    loadDocumentShares();
  }, []);

  // =====================================================
  // CHECK DOCUMENT SECURITY PASSWORD
  // =====================================================

  useEffect(() => {
    const checkDocumentSecurity = async () => {
      try {

        if (!isLoggedIn()) {
          setSecurityLoading(false);
          setLoading(false);
          return;
        }

        const response = await fetch(
          `${API_BASE}/api/document-security/status`,
          {
            method: "GET",
            credentials: "include",
            headers: {
            },
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          console.error(
            "DOCUMENT SECURITY STATUS ERROR:",
            result.message
          );

          setSecurityError(
            result.message ||
              "Unable to check Document Security."
          );
          setSecurityLoading(false);
          setLoading(false);
          return;
        }

        const passwordExists =
          result.hasPassword === true;

        setHasSecurityPassword(passwordExists);

        if (!passwordExists) {
          // First-time user: create the separate
          // Document Security Password.
          setLoading(false);
          setShowSetupModal(true);
        } else {
          // Existing user: the document list itself is
          // protected, so ask for the document password
          // BEFORE calling GET /api/documents.
          setProtectedAction("load");
          setSecurityPassword("");
          setSecurityError(null);
          setShowVerifyModal(true);
        }

        setSecurityLoading(false);
      } catch (error) {
        console.error(
          "DOCUMENT SECURITY CHECK ERROR:",
          error
        );

        setSecurityError(
          "Unable to check Document Security."
        );
        setSecurityLoading(false);
        setLoading(false);
      }
    };

    checkDocumentSecurity();
  }, []);

  // =====================================================
  // LOAD SAVED DOCUMENTS
  // =====================================================

  const loadDocuments = async (
    documentPassword: string
  ) => {
    try {
      setLoading(true);


      if (!isLoggedIn()) {
        console.error("No login token found");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/documents?_=${Date.now()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "X-Document-Password":
              documentPassword,
          },
        }
      );

      const result = await response.json();

      console.log("SAVED DOCUMENTS:", result);
      console.log(
        "DOCUMENT COUNT:",
        Array.isArray(result.documents)
          ? result.documents.length
          : 0
      );

      if (!response.ok || !result.success) {
        console.error(
          "Failed to load documents:",
          result.message
        );

        alert(
          result.message ||
            "Unable to load your documents."
        );

        setLoading(false);
        return;
      }

      const loadedDocs: Doc[] =
        (result.documents || []).map(
          (doc: any) => ({
            id: doc.id,

            name:
              doc.file_name ||
              doc.original_name ||
              "Unnamed file",

            size: doc.file_size
              ? formatFileSize(doc.file_size)
              : "Saved",

            date: doc.uploaded_at
              ? new Date(
                  doc.uploaded_at
                ).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "",

            type:
              doc.file_type ||
              doc.mimetype ||
              "Uploaded",

            // Do NOT use a public file URL.
            // Files are opened/downloaded through
            // protected backend endpoints.
            url: undefined,

            // Blockchain proof/details (Step 6) — already
            // provided by GET /api/documents.
            documentHash: doc.document_hash || null,
            blockchainTxHash:
              doc.blockchain_tx_hash || null,
            blockchainStatus:
              doc.blockchain_status || null,
            blockchainNetwork:
              doc.blockchain_network || null,
          })
        );

      setDocs(loadedDocs);
    } catch (error) {
      console.error(
        "LOAD DOCUMENTS ERROR:",
        error
      );

      alert(
        "Unable to load your documents."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FILE SIZE FORMATTER
  // =====================================================

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 KB";

    const kb = bytes / 1024;

    if (kb > 1024) {
      return `${(kb / 1024).toFixed(1)} MB`;
    }

    return `${kb.toFixed(0)} KB`;
  };

  // =====================================================
  // SECURITY ACTION LABEL
  // =====================================================

  const getActionLabel = (
    action: ProtectedAction | null
  ) => {
    switch (action) {
      case "load":
        return "load your saved documents";

      case "upload":
        return "upload a document";

      case "open":
        return "open this document";

      case "download":
        return "download this document";

      case "rename":
        return "rename this document";

      case "delete":
        return "delete this document";

      case "verify_blockchain":
        return "verify this document on the blockchain";

      case "register_blockchain":
        return "register this document on the blockchain";

      default:
        return "continue";
    }
  };

  // =====================================================
  // START PROTECTED ACTION
  // =====================================================

  const requireDocumentPassword = (
    action: ProtectedAction
  ) => {
    if (!hasSecurityPassword) {
      setSecurityError(
        "Please create your Document Security Password first."
      );

      setShowSetupModal(true);
      return;
    }

    setProtectedAction(action);
    setSecurityPassword("");
    setSecurityError("");
    setShowVerifyModal(true);
  };

  // =====================================================
  // SET DOCUMENT SECURITY PASSWORD
  // =====================================================

  const handleSetSecurityPassword = async () => {
    setSecurityError(null);

    if (!securityPassword) {
      setSecurityError(
        "Please enter a Document Security Password."
      );
      return;
    }

    if (securityPassword.length < 8) {
      setSecurityError(
        "Document Security Password must be at least 8 characters."
      );
      return;
    }

    if (securityPassword.length > 128) {
      setSecurityError(
        "Document Security Password must not exceed 128 characters."
      );
      return;
    }

    if (
      securityPassword !==
      securityConfirmPassword
    ) {
      setSecurityError(
        "Document passwords do not match."
      );
      return;
    }

    try {
      setSecuritySubmitting(true);


      if (!isLoggedIn()) {
        setSecurityError(
          "Please login again."
        );
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/document-security/set-password`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: securityPassword,
            confirmPassword:
              securityConfirmPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setSecurityError(
          result.message ||
            "Unable to create Document Security Password."
        );
        return;
      }

      const newlyCreatedPassword =
        securityPassword;

      setHasSecurityPassword(true);

      setShowSetupModal(false);

      setSecurityPassword("");
      setSecurityConfirmPassword("");
      setSecurityError(null);

      showToast(
        "Document Security Password created successfully"
      );

      // The document list is also protected.
      // Load it immediately using the password that
      // was just created. The password is not stored
      // in localStorage.
      await loadDocuments(
        newlyCreatedPassword
      );
    } catch (error) {
      console.error(
        "SET DOCUMENT PASSWORD ERROR:",
        error
      );

      setSecurityError(
        "Unable to create Document Security Password."
      );
    } finally {
      setSecuritySubmitting(false);
    }
  };

  // =====================================================
  // VERIFY DOCUMENT SECURITY PASSWORD
  // =====================================================

  const handleVerifySecurityPassword =
    async () => {
      setSecurityError(null);

      if (!securityPassword) {
        setSecurityError(
          "Please enter your Document Security Password."
        );
        return;
      }

      try {
        setSecuritySubmitting(true);


        if (!isLoggedIn()) {
          setSecurityError(
            "Please login again."
          );
          return;
        }

        const response = await fetch(
          `${API_BASE}/api/document-security/verify-password`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              password: securityPassword,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.verified) {
          setSecurityError(
            result.message ||
              "Incorrect Document Security Password."
          );
          return;
        }

        const verifiedPassword =
          securityPassword;

        setShowVerifyModal(false);

        setSecurityPassword("");
        setSecurityError(null);

        await continueProtectedAction(
          protectedAction,
          verifiedPassword
        );
      } catch (error) {
        console.error(
          "VERIFY DOCUMENT PASSWORD ERROR:",
          error
        );

        setSecurityError(
          "Unable to verify Document Security Password."
        );
      } finally {
        setSecuritySubmitting(false);
      }
    };

  // =====================================================
  // REQUEST DOCUMENT SECURITY PASSWORD RESET
  // =====================================================

  const handleRequestDocumentPasswordReset = async () => {
    setResetError(null);

    try {
      setResetSubmitting(true);

      if (!isLoggedIn()) {
        setResetError("Please login again.");
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/document-security/request-reset`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setResetError(
          result.message ||
            "Unable to send the reset code."
        );
        return;
      }

      setResetEmail(
        result.emailMasked ||
          result.email ||
          null
      );
      setResetStep("verify");
      setResetError(null);
    } catch (error) {
      console.error(
        "REQUEST DOCUMENT PASSWORD RESET ERROR:",
        error
      );

      setResetError(
        "Unable to send the reset code."
      );
    } finally {
      setResetSubmitting(false);
    }
  };

  // =====================================================
  // RESET DOCUMENT SECURITY PASSWORD
  // =====================================================

  const handleResetDocumentPassword = async () => {
    setResetError(null);

    if (!resetCode.trim()) {
      setResetError("Please enter the reset code.");
      return;
    }

    if (!resetPassword) {
      setResetError(
        "Please enter a new Document Security Password."
      );
      return;
    }

    if (resetPassword.length < 8) {
      setResetError(
        "Document Security Password must be at least 8 characters."
      );
      return;
    }

    if (resetPassword.length > 128) {
      setResetError(
        "Document Security Password must not exceed 128 characters."
      );
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setResetError(
        "New Document Security Passwords do not match."
      );
      return;
    }

    try {
      setResetSubmitting(true);

      if (!isLoggedIn()) {
        setResetError("Please login again.");
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/document-security/reset-password`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: resetCode.trim(),
            password: resetPassword,
            confirmPassword: resetConfirmPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setResetError(
          result.message ||
            "Unable to reset Document Security Password."
        );
        return;
      }

      const newlyResetPassword = resetPassword;
      const actionAfterReset = protectedAction;

      setHasSecurityPassword(true);
      setShowResetModal(false);
      setResetStep("request");
      setResetCode("");
      setResetPassword("");
      setResetConfirmPassword("");
      setResetEmail(null);
      setResetError(null);

      showToast(
        "Document Security Password reset successfully"
      );

      // Continue the action that originally required the
      // Document Security Password. The new password is
      // kept only in memory and is not stored in localStorage.
      if (actionAfterReset) {
        await continueProtectedAction(
          actionAfterReset,
          newlyResetPassword
        );
      }
    } catch (error) {
      console.error(
        "RESET DOCUMENT PASSWORD ERROR:",
        error
      );

      setResetError(
        "Unable to reset Document Security Password."
      );
    } finally {
      setResetSubmitting(false);
    }
  };

  // =====================================================
  // CONTINUE AFTER PASSWORD VERIFICATION
  // =====================================================

  const continueProtectedAction = async (
    action: ProtectedAction | null,
    password: string
  ) => {
    if (!action) return;

    switch (action) {
      case "load":
        await loadDocuments(password);
        break;

      case "upload":
        await performUpload(
          pendingUploadFiles,
          password
        );
        break;

      case "open":
        if (pendingDocument) {
          await openDocument(
            pendingDocument,
            password
          );
        }
        break;

      case "download":
        if (pendingDocument) {
          await downloadDocument(
            pendingDocument,
            password
          );
        }
        break;

      case "rename":
        await performRename(
          pendingRenameId,
          pendingRenameName,
          password
        );
        break;

      case "delete":
        await performDelete(
          pendingDeleteId,
          pendingDeleteName,
          password
        );
        break;

      case "verify_blockchain":
        if (pendingDocument) {
          await performBlockchainVerify(
            pendingDocument,
            password
          );
        }
        break;

      case "register_blockchain":
        if (pendingDocument) {
          await performBlockchainRegister(
            pendingDocument,
            password
          );
        }
        break;
    }

    setProtectedAction(null);
    setPendingUploadFiles([]);
    setPendingDocument(null);
    setPendingRenameId(undefined);
    setPendingRenameName("");
    setPendingDeleteId(undefined);
    setPendingDeleteName("");
  };

  // =====================================================
  // UPLOAD REQUEST
  // =====================================================

  const handleUpload = (
    files: FileList | File[] | null
  ) => {
    if (!files || files.length === 0) {
      return;
    }

    const fileArray = Array.from(files);

    // Only one file is allowed per upload action.
    if (fileArray.length > 1) {
      alert("Please upload one file at a time.");
      return;
    }

    const file = fileArray[0];

    // Maximum size: 10 MB per file.
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        "File is too large. Maximum size is 10 MB per file."
      );
      return;
    }

    // Allowed document/media types.
    // These match the file types displayed in the Documents UI.
    const allowedMimeTypes = new Set([
      // PDF
      "application/pdf",

      // Images
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",

      // Audio
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/webm",
      "audio/mp4",
      "audio/x-m4a",

      // Video
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ]);

    if (!allowedMimeTypes.has(file.type)) {
      alert(
        "Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, GIF, MP3, WAV, M4A, MP4, MOV and WEBM."
      );
      return;
    }

    if (!hasSecurityPassword) {
      setShowSetupModal(true);
      return;
    }

    setPendingUploadFiles(fileArray);

    requireDocumentPassword("upload");
  };

  // =====================================================
  // PERFORM UPLOAD AFTER PASSWORD VERIFICATION
  // =====================================================

  const performUpload = async (
    files: File[],
    documentPassword: string
  ) => {
    if (!files || files.length === 0) {
      return;
    }

    // Defensive check: never send more than one file.
    if (files.length > 1) {
      alert("Please upload one file at a time.");
      return;
    }

    const file = files[0];

    // Defensive size check before sending the request.
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        "File is too large. Maximum size is 10 MB per file."
      );
      return;
    }

    const formData = new FormData();

    formData.append(
      "document",
      file
    );

    try {
      setUploading(true);


      if (!isLoggedIn()) {
        alert("Please login again.");
        return;
      }

      console.log(
        "Uploading:",
        file.name
      );

      console.log(
        "Type:",
        file.type
      );

      console.log(
        "Size:",
        file.size
      );

      const response = await fetch(
        `${API_BASE}/api/upload`,
        {
          method: "POST",

          credentials: "include",

          headers: {

            // Used by the protected backend
            // document-upload endpoint.
            "X-Document-Password":
              documentPassword,
          },

          body: formData,
        }
      );

      const result = await response.json();

      console.log(
        "UPLOAD RESULT:",
        result
      );

      if (!response.ok || !result.success) {
        alert(
          result.message ||
            "File upload failed"
        );

        return;
      }

      // Reload the authoritative list from the backend.
      // This avoids constructing a partial local document
      // object and guarantees the list contains every saved
      // document plus the newly uploaded one.
      await loadDocuments(
        documentPassword
      );

      showToast(
        `${file.name} uploaded successfully`
      );
    } catch (err) {
      console.error(
        "UPLOAD ERROR:",
        err
      );

      alert(
        "Server upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  // =====================================================
  // DELETE REQUEST
  // =====================================================

  const remove = async (
    id?: number,
    name?: string
  ) => {
    if (!id) {
      alert(
        "Document ID not found"
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${name || "this document"}"?`
      );

    if (!confirmed) {
      return;
    }

    setPendingDeleteId(id);
    setPendingDeleteName(
      name || "Document"
    );

    requireDocumentPassword("delete");
  };

  // =====================================================
  // PERFORM DELETE
  // =====================================================

  const performDelete = async (
    id?: number,
    name?: string,
    documentPassword?: string
  ) => {
    if (!id) {
      alert(
        "Document ID not found"
      );
      return;
    }

    try {

      if (!isLoggedIn()) {
        alert(
          "Please login again."
        );
        return;
      }

      console.log(
        "Deleting document ID:",
        id
      );

      const response = await fetch(
        `${API_BASE}/api/documents/${id}`,
        {
          method: "DELETE",

          credentials: "include",

          headers: {

            "X-Document-Password":
              documentPassword || "",
          },
        }
      );

      const result =
        await response.json();

      console.log(
        "DELETE RESULT:",
        result
      );

      if (
        !response.ok ||
        !result.success
      ) {
        alert(
          result.message ||
            "Failed to delete document"
        );

        return;
      }

      // Reload from the backend so the UI always reflects
      // the database after deletion.
      await loadDocuments(
        documentPassword || ""
      );

      showToast(
        `${name || "Document"} deleted successfully`
      );
    } catch (err) {
      console.error(
        "DELETE ERROR:",
        err
      );

      alert(
        "Server delete failed"
      );
    }
  };

  // =====================================================
  // RENAME REQUEST
  // =====================================================

  const renameDocument = async (
    id?: number,
    currentName?: string
  ) => {
    if (!id) {
      alert(
        "Document ID not found"
      );
      return;
    }

    const newName =
      window.prompt(
        "Enter new document name:",
        currentName || ""
      );

    if (newName === null) {
      return;
    }

    const trimmedName =
      newName.trim();

    if (!trimmedName) {
      alert(
        "Document name cannot be empty"
      );
      return;
    }

    setPendingRenameId(id);
    setPendingRenameName(
      trimmedName
    );

    requireDocumentPassword(
      "rename"
    );
  };

  // =====================================================
  // PERFORM RENAME
  // =====================================================

  const performRename = async (
    id?: number,
    newName?: string,
    documentPassword?: string
  ) => {
    if (!id) {
      alert(
        "Document ID not found"
      );
      return;
    }

    if (!newName) {
      return;
    }

    try {

      if (!isLoggedIn()) {
        alert(
          "Please login again."
        );
        return;
      }

      const response =
        await fetch(
          `${API_BASE}/api/documents/${id}`,
          {
            method: "PUT",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",


              "X-Document-Password":
                documentPassword || "",
            },
body: JSON.stringify({
  file_name: newName,
}),
          }
        );

      const result =
        await response.json();

      console.log(
        "RENAME RESULT:",
        result
      );

      if (
        !response.ok ||
        !result.success
      ) {
        alert(
          result.message ||
            "Failed to rename document"
        );

        return;
      }

      // Reload from the backend after rename instead of only
      // changing React state. This keeps the UI synchronized
      // with the database and also restores the complete
      // document list if the page previously had stale state.
      await loadDocuments(
        documentPassword || ""
      );

      showToast(
        `${newName} renamed successfully`
      );
    } catch (err) {
      console.error(
        "RENAME ERROR:",
        err
      );

      alert(
        "Server rename failed"
      );
    }
  };

  // =====================================================
  // OPEN DOCUMENT REQUEST
  // =====================================================

  const viewDocument = (
    doc: Doc
  ) => {
    if (!doc.id) {
      alert(
        "Document ID not found."
      );
      return;
    }

    setPendingDocument(doc);

    requireDocumentPassword(
      "open"
    );
  };

  // =====================================================
  // OPEN DOCUMENT AFTER PASSWORD
  // =====================================================

  const openDocument = async (
    doc: Doc,
    documentPassword: string
  ) => {
    if (!doc.id) {
      alert(
        "Document ID not found."
      );
      return;
    }

    try {

      if (!isLoggedIn()) {
        alert(
          "Please login again."
        );
        return;
      }

      const response =
        await fetch(
          `${API_BASE}/api/documents/${doc.id}/content`,
          {
            method: "GET",

            credentials: "include",

            headers: {

              "X-Document-Password":
                documentPassword,
            },
          }
        );

      if (!response.ok) {
        let message =
          "Unable to open document.";

        try {
          const result =
            await response.json();

          message =
            result.message ||
            message;
        } catch {
          // Response was not JSON.
        }

        alert(message);
        return;
      }

      const blob =
        await response.blob();

      const blobUrl =
        URL.createObjectURL(blob);

      window.open(
        blobUrl,
        "_blank"
      );

      setTimeout(() => {
        URL.revokeObjectURL(
          blobUrl
        );
      }, 60000);
    } catch (error) {
      console.error(
        "OPEN DOCUMENT ERROR:",
        error
      );

      alert(
        "Unable to open document."
      );
    }
  };

  // =====================================================
  // DOWNLOAD DOCUMENT REQUEST
  // =====================================================

  const downloadFile = (
    doc: Doc
  ) => {
    if (!doc.id) {
      alert(
        "Document ID not found."
      );
      return;
    }

    setPendingDocument(doc);

    requireDocumentPassword(
      "download"
    );
  };

  // =====================================================
  // DOWNLOAD DOCUMENT AFTER PASSWORD
  // =====================================================

  const downloadDocument =
    async (
      doc: Doc,
      documentPassword: string
    ) => {
      if (!doc.id) {
        alert(
          "Document ID not found."
        );
        return;
      }

      try {

        if (!isLoggedIn()) {
          alert(
            "Please login again."
          );
          return;
        }

        const response =
          await fetch(
            `${API_BASE}/api/documents/${doc.id}/download`,
            {
              method: "GET",

              credentials: "include",

              headers: {

                "X-Document-Password":
                  documentPassword,
              },
            }
          );

        if (!response.ok) {
          let message =
            "Unable to download document.";

          try {
            const result =
              await response.json();

            message =
              result.message ||
              message;
          } catch {
            // Response was not JSON.
          }

          alert(message);
          return;
        }

        const blob =
          await response.blob();

        const blobUrl =
          URL.createObjectURL(
            blob
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href =
          blobUrl;

        anchor.download =
          doc.name ||
          "document";

        document.body.appendChild(
          anchor
        );

        anchor.click();

        anchor.remove();

        setTimeout(() => {
          URL.revokeObjectURL(
            blobUrl
          );
        }, 60000);
      } catch (error) {
        console.error(
          "DOWNLOAD DOCUMENT ERROR:",
          error
        );

        alert(
          "Unable to download document."
        );
      }
    };

  // =====================================================
  // BLOCKCHAIN ACTION REQUEST
  //
  // The shield button performs the correct action based on
  // the current document state:
  // - registered -> verify the existing on-chain record
  // - not registered / failed -> register (or retry) the hash
  // =====================================================

  const handleBlockchainAction = (
    doc: Doc
  ) => {
    if (!doc.id) {
      alert(
        "Document ID not found."
      );
      return;
    }

    if (verifyingBlockchainId) {
      // Already processing a document — ignore
      // duplicate clicks.
      return;
    }

    setPendingDocument(doc);

    requireDocumentPassword(
      doc.blockchainStatus === "registered"
        ? "verify_blockchain"
        : "register_blockchain"
    );
  };

  // =====================================================
  // REGISTER ON BLOCKCHAIN AFTER PASSWORD
  // =====================================================

  const performBlockchainRegister =
    async (
      doc: Doc,
      documentPassword: string
    ) => {
      if (!doc.id) {
        alert(
          "Document ID not found."
        );
        return;
      }

      try {
        setVerifyingBlockchainId(
          doc.id
        );

        if (!isLoggedIn()) {
          alert(
            "Please login again."
          );
          return;
        }

        const response =
          await fetch(
            `${API_BASE}/api/documents/${doc.id}/blockchain/register`,
            {
              method: "POST",

              credentials: "include",

              headers: {
                "X-Document-Password":
                  documentPassword,
              },
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          showToast(
            result.message ||
              "Unable to register document on blockchain."
          );
          return;
        }

        showToast(
          "✓ Document registered on blockchain"
        );

        // Refresh the document list so the saved
        // blockchain status, transaction hash and network
        // returned by GET /api/documents are immediately
        // visible in the UI.
        await loadDocuments(
          documentPassword
        );
      } catch (error) {
        console.error(
          "BLOCKCHAIN REGISTER ERROR:",
          error
        );

        showToast(
          "Blockchain registration failed"
        );
      } finally {
        setVerifyingBlockchainId(
          undefined
        );
      }
    };

  // =====================================================
  // VERIFY ON BLOCKCHAIN AFTER PASSWORD
  // =====================================================

  const performBlockchainVerify =
    async (
      doc: Doc,
      documentPassword: string
    ) => {
      if (!doc.id) {
        alert(
          "Document ID not found."
        );
        return;
      }

      try {
        setVerifyingBlockchainId(
          doc.id
        );

        if (!isLoggedIn()) {
          alert(
            "Please login again."
          );
          return;
        }

        const response =
          await fetch(
            `${API_BASE}/api/documents/${doc.id}/blockchain/verify`,
            {
              method: "POST",

              credentials: "include",

              headers: {

                "X-Document-Password":
                  documentPassword,
              },
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          showToast(
            result.message ||
              "Unable to verify document on blockchain."
          );
          return;
        }

        if (doc.id) {
          setBlockchainVerifyResults((prev) => ({
            ...prev,
            [doc.id as number]: {
              status: result.status,
              verified: result.verified,
            },
          }));
        }

        switch (result.status) {
          case "verified":
            showToast(
              "✓ Blockchain Verified"
            );
            break;

          case "tampered":
            showToast(
              "⚠ Document Tampered"
            );
            break;

          case "not_registered":
            showToast(
              "Blockchain Registration Not Found"
            );
            break;

          case "blockchain_unavailable":
            showToast(
              "Blockchain Verification Unavailable"
            );
            break;

          default:
            showToast(
              "Blockchain Verification Unavailable"
            );
            break;
        }
      } catch (error) {
        console.error(
          "BLOCKCHAIN VERIFY ERROR:",
          error
        );

        showToast(
          "Blockchain Verification Unavailable"
        );
      } finally {
        setVerifyingBlockchainId(
          undefined
        );
      }
    };

  // =====================================================
  // BLOCKCHAIN PROOF / DETAILS VIEW (Step 6)
  // =====================================================

  const openBlockchainDetails = (doc: Doc) => {
    setBlockchainDetailsDoc(doc);
    setShowBlockchainDetails(true);
  };

  const closeBlockchainDetails = () => {
    setShowBlockchainDetails(false);
    setBlockchainDetailsDoc(null);
  };

  // =====================================================
  // AUDIT TRAIL / ACTIVITY HISTORY (Step 4)
  //
  // Read-only view over the existing
  // GET /api/documents/:id/audit endpoint (Step 3). No new
  // table, no backend changes — this only fetches and
  // renders what that endpoint already returns.
  // =====================================================

  const openAuditTrail = async (doc: Doc) => {
    if (!doc.id) {
      showToast("Document ID not found.");
      return;
    }

    setAuditDoc(doc);
    setShowAuditModal(true);
    setAuditError(null);
    setAuditHistory([]);
    setAuditLoading(true);

    try {
      if (!isLoggedIn()) {
        setAuditError("Please login again.");
        setAuditLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/documents/${doc.id}/audit`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message =
          result.message ||
          "Unable to load audit history.";
        setAuditError(message);
        showToast(message);
        return;
      }

      setAuditHistory(
        Array.isArray(result.history)
          ? result.history
          : []
      );
    } catch (error) {
      console.error(
        "AUDIT TRAIL FETCH ERROR:",
        error
      );

      setAuditError(
        "Unable to load audit history."
      );
      showToast(
        "Unable to load audit history."
      );
    } finally {
      setAuditLoading(false);
    }
  };

  const closeAuditModal = () => {
    setShowAuditModal(false);
    setAuditDoc(null);
    setAuditHistory([]);
    setAuditError(null);
    setAuditLoading(false);
  };

  const formatAuditDate = (
    value: string
  ) => {
    try {
      const parsed = new Date(value);

      if (isNaN(parsed.getTime())) {
        return value;
      }

      return parsed.toLocaleString();
    } catch {
      return value;
    }
  };

  const shortenHash = (
    hash: string,
    front = 8,
    back = 6
  ) => {
    if (!hash || hash.length <= front + back + 3) {
      return hash;
    }
    return `${hash.slice(0, front)}...${hash.slice(-back)}`;
  };

  const copyToClipboard = async (
    value: string,
    label: string
  ) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied`);
    } catch (error) {
      console.error("COPY ERROR:", error);
      showToast("Unable to copy");
    }
  };

  // Only known testnet/mainnet network labels get a
  // constructed explorer link. Unrecognized/unset network
  // names simply don't render a "View Transaction" link.
  const BLOCK_EXPLORER_BASE_URLS: Record<string, string> = {
    "polygon-amoy": "https://amoy.polygonscan.com/tx/",
    "polygon-mainnet": "https://polygonscan.com/tx/",
    polygon: "https://polygonscan.com/tx/",
    sepolia: "https://sepolia.etherscan.io/tx/",
    goerli: "https://goerli.etherscan.io/tx/",
    ethereum: "https://etherscan.io/tx/",
    mainnet: "https://etherscan.io/tx/",
  };

  const getExplorerTxUrl = (
    network: string | null | undefined,
    txHash: string | null | undefined
  ) => {
    if (!network || !txHash) {
      return null;
    }
    const base =
      BLOCK_EXPLORER_BASE_URLS[
        network.trim().toLowerCase()
      ];
    return base ? `${base}${txHash}` : null;
  };

  // =====================================================
  // CLOSE SECURITY MODALS
  // =====================================================

  const closeVerifyModal = () => {
    if (securitySubmitting) {
      return;
    }

    setShowVerifyModal(false);

    setSecurityPassword("");

    setSecurityError(null);

    setProtectedAction(null);

    setPendingUploadFiles([]);

    setPendingDocument(null);

    setPendingRenameId(
      undefined
    );

    setPendingRenameName("");

    setPendingDeleteId(
      undefined
    );

    setPendingDeleteName("");
  };

  // =====================================================
  // SECURITY LOADING SCREEN
  // =====================================================

  if (securityLoading) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "0.9rem",
        }}
      >
        Checking Document Security...
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
      }}
    >
      {/* ======================================
          HEADER
      ====================================== */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing:
                "-0.03em",
              margin: 0,
            }}
          >
            Documents
          </h1>

          <p
            style={{
              color:
                "var(--text-muted)",
              fontSize:
                "0.9rem",
              marginTop: 2,
            }}
          >
            {isAdvocate
              ? "Client documents & case files"
              : "FIRs, contracts, receipts, and AI reports"}
          </p>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.mp3,.wav,.webm,.m4a,.mp4,.mov"
            style={{
              display: "none",
            }}
            onChange={(e) => {
              handleUpload(
                e.target.files
              );

              e.target.value =
                "";
            }}
          />

          <button
            onClick={() => {
              if (!hasSecurityPassword) {
                setShowSetupModal(
                  true
                );
                return;
              }

              fileRef.current?.click();
            }}
            disabled={uploading}
            className="btn-primary"
            style={{
              padding:
                "9px 16px",
              borderRadius: 9,
              fontSize:
                "0.85rem",
              fontWeight: 600,
              border: "none",
              cursor: uploading
                ? "not-allowed"
                : "pointer",
              display: "flex",
              alignItems:
                "center",
              gap: 6,
              opacity:
                uploading
                  ? 0.7
                  : 1,
            }}
          >
            <Upload size={15} />

            {uploading
              ? "Uploading..."
              : "Upload Document"}
          </button>
        </div>
      </div>

      {/* ======================================
          SECURITY INFORMATION
      ====================================== */}

      {hasSecurityPassword && (
        <div
          style={{
            marginBottom: 16,
            padding:
              "9px 12px",
            borderRadius: 8,
            background:
              "var(--blue-subtle)",
            border:
              "1px solid var(--border)",
            color:
              "var(--text-muted)",
            fontSize:
              "0.76rem",
            display: "flex",
            alignItems:
              "center",
            gap: 8,
          }}
        >
          <Lock
            size={14}
            style={{
              color:
                "var(--blue)",
            }}
          />

          <span>
            Your documents are protected by a
            separate Document Security Password.
          </span>
        </div>
      )}

      {/* ======================================
          SUCCESS TOAST
      ====================================== */}

      {toast && (
        <div
          style={{
            marginBottom: 16,
            padding:
              "10px 14px",
            borderRadius: 8,
            background:
              "var(--emerald-subtle)",
            border:
              "1px solid var(--emerald-light)",
            color:
              "var(--emerald)",
            fontSize:
              "0.82rem",
            fontWeight: 500,
            display: "flex",
            alignItems:
              "center",
            gap: 8,
          }}
        >
          <FileText size={14} />

          {toast}
        </div>
      )}

      {/* ======================================
          DRAG & DROP
      ====================================== */}

      <div
        onDragOver={(e) =>
          e.preventDefault()
        }
        onDrop={(e) => {
          e.preventDefault();

          if (!hasSecurityPassword) {
            setShowSetupModal(
              true
            );
            return;
          }

          handleUpload(
            e.dataTransfer.files
          );
        }}
        className="card"
        style={{
          padding: 28,
          marginBottom: 20,
          textAlign: "center",
          border:
            "2px dashed var(--border)",
          cursor: uploading
            ? "not-allowed"
            : "pointer",
          opacity: uploading
            ? 0.7
            : 1,
        }}
        onClick={() => {
          if (uploading) {
            return;
          }

          if (!hasSecurityPassword) {
            setShowSetupModal(
              true
            );
            return;
          }

          fileRef.current?.click();
        }}
      >
        <Upload
          size={26}
          style={{
            color:
              "var(--text-subtle)",
            marginBottom: 8,
          }}
        />

        <div
          style={{
            fontWeight: 600,
            color:
              "var(--text)",
            fontSize:
              "0.9rem",
          }}
        >
          Drag & drop a file,
          or click
          to browse
        </div>

        <div
          style={{
            color:
              "var(--text-muted)",
            fontSize:
              "0.78rem",
            marginTop: 3,
          }}
        >
          PDF, PNG, JPG, WEBP, GIF, MP3,
          WAV, M4A, MP4, MOV, WEBM
          · Max 10MB per file
        </div>
      </div>

      {/* ======================================
          DOCUMENT LIST
      ====================================== */}

      <div
        className="card"
        style={{
          padding: 8,
        }}
      >
        {loading ? (
          <div
            style={{
              padding:
                "40px 20px",
              textAlign:
                "center",
              color:
                "var(--text-muted)",
              fontSize:
                "0.85rem",
            }}
          >
            Loading documents...
          </div>
        ) : docs.length ===
          0 ? (
          <div
            style={{
              padding:
                "40px 20px",
              textAlign:
                "center",
              color:
                "var(--text-muted)",
              fontSize:
                "0.85rem",
            }}
          >
            No documents yet.
            <br />
            Upload your first
            document above.
          </div>
        ) : (
          docs.map((d, i) => (
            <div
              key={
                d.id ??
                `${d.name}-${i}`
              }
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 12,
                padding:
                  "12px 14px",
                borderBottom:
                  i <
                  docs.length - 1
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              {/* FILE ICON */}

              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  flexShrink: 0,
                  background:
                    "var(--blue-subtle)",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                <FileText
                  size={16}
                  style={{
                    color:
                      "var(--blue)",
                  }}
                />
              </div>

              {/* FILE INFO */}

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontWeight: 500,
                    color:
                      "var(--text)",
                    fontSize:
                      "0.85rem",
                    overflow:
                      "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {d.name}
                </div>

                <div
                  style={{
                    fontSize:
                      "0.7rem",
                    color:
                      "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {d.size} ·{" "}
                  {d.date}
                </div>
              </div>

              {/* TYPE */}

              <span
                className="badge"
                style={{
                  background:
                    "var(--blue-subtle)",
                  color:
                    "var(--blue)",
                  maxWidth: 130,
                  overflow:
                    "hidden",
                  textOverflow:
                    "ellipsis",
                  whiteSpace:
                    "nowrap",
                }}
              >
                {getFileTypeLabel(
                  d.type
                )}
              </span>

              {/* OPEN */}

              <button
                title="Open"
                onClick={() =>
                  viewDocument(d)
                }
                style={{
                  padding: 7,
                  borderRadius: 6,
                  border:
                    "1px solid var(--border)",
                  background:
                    "var(--bg-card)",
                  color:
                    "var(--text-muted)",
                  cursor:
                    "pointer",
                  display:
                    "flex",
                }}
              >
                <Eye
                  size={13}
                />
              </button>

              {/* DOWNLOAD */}

              <button
                title="Download"
                onClick={() =>
                  downloadFile(d)
                }
                style={{
                  padding: 7,
                  borderRadius: 6,
                  border:
                    "1px solid var(--border)",
                  background:
                    "var(--bg-card)",
                  color:
                    "var(--text-muted)",
                  cursor:
                    "pointer",
                  display:
                    "flex",
                }}
              >
                <Download
                  size={13}
                />
              </button>

              {/* SHARE */}

              {!hasActiveTemporaryShare(d.id) && (
                <>
              <button
                title="Share document"
                onClick={() =>
                  openShareModal(d)
                }
                style={{
                  padding: 7,
                  borderRadius: 6,
                  border:
                    "1px solid var(--border)",
                  background:
                    "var(--bg-card)",
                  color:
                    "var(--text-muted)",
                  cursor:
                    "pointer",
                  display:
                    "flex",
                }}
              >
                <Share2
                  size={13}
                />
              </button>

                </>
              )}

              {/* BLOCKCHAIN ACTION */}

              <button
                title={
                  d.blockchainStatus === "registered"
                    ? "Verify on Blockchain"
                    : "Register on Blockchain"
                }
                disabled={
                  verifyingBlockchainId ===
                  d.id
                }
                onClick={() =>
                  handleBlockchainAction(d)
                }
                style={{
                  padding: 7,
                  borderRadius: 6,
                  border:
                    "1px solid var(--border)",
                  background:
                    "var(--bg-card)",
                  color:
                    "var(--text-muted)",
                  cursor:
                    verifyingBlockchainId ===
                    d.id
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    verifyingBlockchainId ===
                    d.id
                      ? 0.6
                      : 1,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 4,
                  fontSize:
                    "0.7rem",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck
                  size={13}
                />
                {verifyingBlockchainId ===
                d.id
                  ? "Processing..."
                  : ""}
              </button>

              {/* BLOCKCHAIN PROOF / DETAILS */}

              <button
                title="Blockchain Proof / Details"
                onClick={() =>
                  openBlockchainDetails(d)
                }
                style={{
                  padding: 7,
                  borderRadius: 6,
                  border:
                    "1px solid var(--border)",
                  background:
                    "var(--bg-card)",
                  color:
                    "var(--text-muted)",
                  cursor:
                    "pointer",
                  display:
                    "flex",
                }}
              >
                <Info
                  size={13}
                />
              </button>

              {/* AUDIT TRAIL */}

              <button
                title="Audit Trail"
                onClick={() =>
                  openAuditTrail(d)
                }
                style={{
                  padding: 7,
                  borderRadius: 6,
                  border:
                    "1px solid var(--border)",
                  background:
                    "var(--bg-card)",
                  color:
                    "var(--text-muted)",
                  cursor:
                    "pointer",
                  display:
                    "flex",
                }}
              >
                <Clock
                  size={13}
                />
              </button>

              {/* RENAME */}

              <button
                title="Rename"
                onClick={() =>
                  renameDocument(
                    d.id,
                    d.name
                  )
                }
                style={{
                  padding: 7,
                  borderRadius: 6,
                  border:
                    "1px solid var(--border)",
                  background:
                    "var(--bg-card)",
                  color:
                    "var(--text-muted)",
                  cursor:
                    "pointer",
                  display:
                    "flex",
                  flexShrink: 0,
                }}
              >
                Rename
              </button>

              {/* REMOVE */}

              <button
                title="Remove"
                onClick={() =>
                  remove(
                    d.id,
                    d.name
                  )
                }
                style={{
                  padding: 7,
                  borderRadius: 6,
                  border:
                    "1px solid var(--border)",
                  background:
                    "var(--bg-card)",
                  color:
                    "#EF4444",
                  cursor:
                    "pointer",
                  display:
                    "flex",
                }}
              >
                <Trash2
                  size={13}
                />
              </button>
            </div>
          ))
        )}
      </div>

      {/* =====================================================
          SHARED DOCUMENTS
      ===================================================== */}

      <div
        className="card"
        style={{
          marginTop: 20,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              Shared Documents
            </h2>

            <div
              style={{
                marginTop: 4,
                fontSize: "0.72rem",
                color: "var(--text-muted)",
              }}
            >
              Documents you have received and documents you
              have shared
            </div>
          </div>

          <button
            type="button"
            onClick={loadDocumentShares}
            disabled={sharesLoading}
            style={{
              padding: "7px 10px",
              borderRadius: 7,
              border:
                "1px solid var(--border)",
              background:
                "var(--bg-card)",
              color:
                "var(--text-muted)",
              cursor: sharesLoading
                ? "not-allowed"
                : "pointer",
              fontSize: "0.7rem",
              opacity: sharesLoading ? 0.6 : 1,
            }}
          >
            {sharesLoading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {sharesError && (
          <div
            style={{
              marginBottom: 14,
              padding: "9px 11px",
              borderRadius: 8,
              background:
                "rgba(239, 68, 68, 0.08)",
              border:
                "1px solid rgba(239, 68, 68, 0.20)",
              color: "#EF4444",
              fontSize: "0.76rem",
            }}
          >
            {sharesError}
          </div>
        )}

        {/* -------------------------------------------------
            SHARED WITH ME
        ------------------------------------------------- */}

        <div
          style={{
            border:
              "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "13px 14px",
              borderBottom:
                "1px solid var(--border)",
              background:
                "var(--bg-card)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.84rem",
                    fontWeight: 750,
                    color: "var(--text)",
                  }}
                >
                  Shared With Me
                </div>

                <div
                  style={{
                    marginTop: 3,
                    fontSize: "0.68rem",
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Documents shared with your account
                </div>
              </div>

              <span
                style={{
                  minWidth: 24,
                  height: 24,
                  padding: "0 7px",
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "var(--blue-subtle)",
                  color:
                    "var(--blue)",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                }}
              >
                {incomingShares.length}
              </span>
            </div>
          </div>

          {sharesLoading &&
          incomingShares.length === 0 ? (
            <div
              style={{
                padding: 28,
                textAlign: "center",
                color:
                  "var(--text-muted)",
                fontSize: "0.78rem",
              }}
            >
              Loading shared documents...
            </div>
          ) : incomingShares.length ===
            0 ? (
            <div
              style={{
                padding: 28,
                textAlign: "center",
                color:
                  "var(--text-muted)",
                fontSize: "0.78rem",
              }}
            >
              No documents have been shared with you.
            </div>
          ) : (
            incomingShares.map(
              (share, index) => {
                const statusStyle =
                  getShareStatusStyle(
                    share.status
                  );

                return (
                  <div
                    key={share.id}
                    style={{
                      padding:
                        "14px",
                      borderBottom:
                        index <
                        incomingShares.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "flex-start",
                        justifyContent:
                          "space-between",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "flex-start",
                          gap: 10,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            flexShrink: 0,
                            background:
                              "var(--blue-subtle)",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                          }}
                        >
                          <FileText
                            size={15}
                            style={{
                              color:
                                "var(--blue)",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "0.82rem",
                              fontWeight: 650,
                              color:
                                "var(--text)",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                            title={
                              share.fileName
                            }
                          >
                            {share.fileName}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize:
                                "0.68rem",
                              color:
                                "var(--text-muted)",
                            }}
                          >
                            Shared by{" "}
                            <strong>
                              {share.senderName ||
                                share.senderEmail ||
                                "Unknown user"}
                            </strong>
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              fontSize:
                                "0.66rem",
                              color:
                                "var(--text-subtle)",
                            }}
                          >
                            {share.shareType ===
                            "temporary"
                              ? `Temporary • ${
                                  share.expiresAt
                                    ? `Expires ${formatShareDate(
                                        share.expiresAt
                                      )}`
                                    : `${share.durationDays || "—"} day access`
                                }`
                              : "Permanent access"}
                            {" • "}
                            Shared{" "}
                            {formatShareDate(
                              share.createdAt
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: 7,
                          flexWrap: "wrap",
                          justifyContent:
                            "flex-end",
                        }}
                      >
                        <span
                          style={{
                            ...statusStyle,
                            padding:
                              "4px 8px",
                            borderRadius:
                              999,
                            fontSize:
                              "0.62rem",
                            fontWeight: 750,
                            textTransform:
                              "capitalize",
                          }}
                        >
                          {share.status}
                        </span>

                        {share.status ===
                          "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={
                                shareActionId ===
                                share.id
                              }
                              onClick={() =>
                                respondToDocumentShare(
                                  share.id,
                                  "accept"
                                )
                              }
                              style={{
                                padding:
                                  "6px 9px",
                                borderRadius:
                                  7,
                                border:
                                  "1px solid rgba(34, 197, 94, 0.25)",
                                background:
                                  "rgba(34, 197, 94, 0.08)",
                                color:
                                  "#22C55E",
                                cursor:
                                  shareActionId ===
                                  share.id
                                    ? "not-allowed"
                                    : "pointer",
                                fontSize:
                                  "0.68rem",
                                fontWeight:
                                  700,
                                opacity:
                                  shareActionId ===
                                  share.id
                                    ? 0.55
                                    : 1,
                              }}
                            >
                              Accept
                            </button>

                            <button
                              type="button"
                              disabled={
                                shareActionId ===
                                share.id
                              }
                              onClick={() =>
                                respondToDocumentShare(
                                  share.id,
                                  "reject"
                                )
                              }
                              style={{
                                padding:
                                  "6px 9px",
                                borderRadius:
                                  7,
                                border:
                                  "1px solid rgba(239, 68, 68, 0.22)",
                                background:
                                  "rgba(239, 68, 68, 0.07)",
                                color:
                                  "#EF4444",
                                cursor:
                                  shareActionId ===
                                  share.id
                                    ? "not-allowed"
                                    : "pointer",
                                fontSize:
                                  "0.68rem",
                                fontWeight:
                                  700,
                                opacity:
                                  shareActionId ===
                                  share.id
                                    ? 0.55
                                    : 1,
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {share.status ===
                          "accepted" && (
                          <>
                            <button
                              type="button"
                              disabled={
                                shareActionId ===
                                share.id
                              }
                              onClick={() =>
                                openSharedDocument(
                                  share
                                )
                              }
                              style={{
                                padding:
                                  "6px 9px",
                                borderRadius:
                                  7,
                                border:
                                  "1px solid var(--border)",
                                background:
                                  "var(--bg-card)",
                                color:
                                  "var(--text)",
                                cursor:
                                  shareActionId ===
                                  share.id
                                    ? "not-allowed"
                                    : "pointer",
                                fontSize:
                                  "0.68rem",
                                fontWeight:
                                  650,
                                opacity:
                                  shareActionId ===
                                  share.id
                                    ? 0.55
                                    : 1,
                              }}
                            >
                              <Eye
                                size={12}
                                style={{
                                  verticalAlign:
                                    "middle",
                                  marginRight: 4,
                                }}
                              />
                              Open
                            </button>

                            {share.shareType ===
                              "permanent" && (
                              <button
                                type="button"
                                disabled={
                                  shareActionId ===
                                  share.id
                                }
                                onClick={() =>
                                  downloadSharedDocument(
                                    share
                                  )
                                }
                                style={{
                                  padding:
                                    "6px 9px",
                                  borderRadius:
                                    7,
                                  border:
                                    "1px solid var(--border)",
                                  background:
                                    "var(--bg-card)",
                                  color:
                                    "var(--text)",
                                  cursor:
                                    shareActionId ===
                                    share.id
                                      ? "not-allowed"
                                      : "pointer",
                                  fontSize:
                                    "0.68rem",
                                  fontWeight:
                                    650,
                                  opacity:
                                    shareActionId ===
                                    share.id
                                      ? 0.55
                                      : 1,
                                }}
                              >
                                <Download
                                  size={12}
                                  style={{
                                    verticalAlign:
                                      "middle",
                                    marginRight: 4,
                                  }}
                                />
                                Download
                              </button>
                            )}
                          </>
                        )}

                        {(share.status ===
                            "accepted" ||
                            share.status ===
                              "pending") && (
                          <button
                            type="button"
                            title="Remove shared document"
                            disabled={
                              shareActionId ===
                              share.id
                            }
                            onClick={() =>
                              removeIncomingSharedDocument(
                                share
                              )
                            }
                            style={{
                              padding:
                                "6px 9px",
                              borderRadius:
                                7,
                              border:
                                "1px solid rgba(239, 68, 68, 0.22)",
                              background:
                                "rgba(239, 68, 68, 0.07)",
                              color:
                                "#EF4444",
                              cursor:
                                shareActionId ===
                                share.id
                                  ? "not-allowed"
                                  : "pointer",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              fontSize:
                                "0.68rem",
                              fontWeight:
                                700,
                              opacity:
                                shareActionId ===
                                share.id
                                  ? 0.55
                                  : 1,
                            }}
                          >
                            <Trash2
                              size={12}
                            />
                          </button>
                        )}

                      </div>
                    </div>
                  </div>
                );
              }
            )
          )}
        </div>

        {/* -------------------------------------------------
            SHARED BY ME
        ------------------------------------------------- */}

        <div
          style={{
            marginTop: 14,
            border:
              "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "13px 14px",
              borderBottom:
                "1px solid var(--border)",
              background:
                "var(--bg-card)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.84rem",
                    fontWeight: 750,
                    color: "var(--text)",
                  }}
                >
                  Shared By Me
                </div>

                <div
                  style={{
                    marginTop: 3,
                    fontSize: "0.68rem",
                    color:
                      "var(--text-muted)",
                  }}
                >
                  Documents you have shared with others
                </div>
              </div>

              <span
                style={{
                  minWidth: 24,
                  height: 24,
                  padding: "0 7px",
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "var(--blue-subtle)",
                  color:
                    "var(--blue)",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                }}
              >
                {outgoingShares.length}
              </span>
            </div>
          </div>

          {sharesLoading &&
          outgoingShares.length === 0 ? (
            <div
              style={{
                padding: 28,
                textAlign: "center",
                color:
                  "var(--text-muted)",
                fontSize: "0.78rem",
              }}
            >
              Loading shared documents...
            </div>
          ) : outgoingShares.length ===
            0 ? (
            <div
              style={{
                padding: 28,
                textAlign: "center",
                color:
                  "var(--text-muted)",
                fontSize: "0.78rem",
              }}
            >
              You have not shared any documents yet.
            </div>
          ) : (
            outgoingShares.map(
              (share, index) => {
                const statusStyle =
                  getShareStatusStyle(
                    share.status
                  );

                return (
                  <div
                    key={share.id}
                    style={{
                      padding:
                        "14px",
                      borderBottom:
                        index <
                        outgoingShares.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "flex-start",
                        justifyContent:
                          "space-between",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "flex-start",
                          gap: 10,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            flexShrink: 0,
                            background:
                              "var(--blue-subtle)",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                          }}
                        >
                          <Share2
                            size={15}
                            style={{
                              color:
                                "var(--blue)",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "0.82rem",
                              fontWeight: 650,
                              color:
                                "var(--text)",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                            title={
                              share.fileName
                            }
                          >
                            {share.fileName}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize:
                                "0.68rem",
                              color:
                                "var(--text-muted)",
                            }}
                          >
                            Shared with{" "}
                            <strong>
                              {share.recipientName ||
                                share.recipientEmail ||
                                "Unknown user"}
                            </strong>
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              fontSize:
                                "0.66rem",
                              color:
                                "var(--text-subtle)",
                            }}
                          >
                            {share.shareType ===
                            "temporary"
                              ? `Temporary • ${
                                  share.expiresAt
                                    ? `Expires ${formatShareDate(
                                        share.expiresAt
                                      )}`
                                    : `${share.durationDays || "—"} day access`
                                }`
                              : "Permanent access"}
                            {" • "}
                            Shared{" "}
                            {formatShareDate(
                              share.createdAt
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: 7,
                          flexWrap: "wrap",
                          justifyContent:
                            "flex-end",
                        }}
                      >
                        <span
                          style={{
                            ...statusStyle,
                            padding:
                              "4px 8px",
                            borderRadius:
                              999,
                            fontSize:
                              "0.62rem",
                            fontWeight: 750,
                            textTransform:
                              "capitalize",
                          }}
                        >
                          {share.status}
                        </span>

                        {(share.status ===
                          "pending" ||
                          share.status ===
                            "accepted") && (
                          <button
                            type="button"
                            disabled={
                              shareActionId ===
                              share.id
                            }
                            onClick={() =>
                              revokeDocumentShare(
                                share.id
                              )
                            }
                            style={{
                              padding:
                                "6px 9px",
                              borderRadius:
                                7,
                              border:
                                "1px solid rgba(239, 68, 68, 0.22)",
                              background:
                                "rgba(239, 68, 68, 0.07)",
                              color:
                                "#EF4444",
                              cursor:
                                shareActionId ===
                                share.id
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize:
                                "0.68rem",
                              fontWeight:
                                700,
                              opacity:
                                shareActionId ===
                                share.id
                                  ? 0.55
                                  : 1,
                            }}
                          >
                            {share.status ===
                            "pending"
                              ? "Cancel"
                              : "Revoke"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )
          )}
        </div>
      </div>

      {/* =====================================================
          FIRST-TIME DOCUMENT SECURITY PASSWORD MODAL
      ===================================================== */}


      {showSetupModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background:
              "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 440,
              padding: 24,
              borderRadius: 14,
              position:
                "relative",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background:
                  "var(--blue-subtle)",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                marginBottom: 14,
              }}
            >
              <Lock
                size={22}
                style={{
                  color:
                    "var(--blue)",
                }}
              />
            </div>

            <h2
              style={{
                margin: 0,
                fontSize:
                  "1.15rem",
                fontWeight: 750,
                color:
                  "var(--text)",
              }}
            >
              Create Document Security Password
            </h2>

            <p
              style={{
                marginTop: 7,
                marginBottom: 20,
                color:
                  "var(--text-muted)",
                fontSize:
                  "0.82rem",
                lineHeight: 1.5,
              }}
            >
              Create a separate password
              to protect your documents.
              This password is different
              from your normal login password.
            </p>

            <label
              style={{
                display:
                  "block",
                fontSize:
                  "0.8rem",
                fontWeight: 600,
                color:
                  "var(--text)",
                marginBottom: 6,
              }}
            >
              Document Security Password
            </label>

            <input
              type="password"
              value={
                securityPassword
              }
              onChange={(e) => {
                setSecurityPassword(
                  e.target.value
                );
                setSecurityError(
                  null
                );
              }}
              placeholder="Enter password"
              disabled={
                securitySubmitting
              }
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "11px 12px",
                borderRadius: 8,
                border:
                  "1px solid var(--border)",
                background:
                  "var(--bg-card)",
                color:
                  "var(--text)",
                outline: "none",
                marginBottom: 12,
              }}
            />

            <label
              style={{
                display:
                  "block",
                fontSize:
                  "0.8rem",
                fontWeight: 600,
                color:
                  "var(--text)",
                marginBottom: 6,
              }}
            >
              Confirm Password
            </label>

            <input
              type="password"
              value={
                securityConfirmPassword
              }
              onChange={(e) => {
                setSecurityConfirmPassword(
                  e.target.value
                );
                setSecurityError(
                  null
                );
              }}
              placeholder="Confirm password"
              disabled={
                securitySubmitting
              }
              onKeyDown={(e) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  handleSetSecurityPassword();
                }
              }}
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "11px 12px",
                borderRadius: 8,
                border:
                  "1px solid var(--border)",
                background:
                  "var(--bg-card)",
                color:
                  "var(--text)",
                outline: "none",
              }}
            />

            {securityError && (
              <div
                style={{
                  marginTop: 12,
                  padding:
                    "9px 11px",
                  borderRadius: 8,
                  background:
                    "rgba(239, 68, 68, 0.08)",
                  border:
                    "1px solid rgba(239, 68, 68, 0.2)",
                  color:
                    "#EF4444",
                  fontSize:
                    "0.78rem",
                }}
              >
                {securityError}
              </div>
            )}

            <div
              style={{
                marginTop: 18,
                fontSize:
                  "0.72rem",
                color:
                  "var(--text-muted)",
              }}
            >
              Minimum 8 characters.
              Your password will be securely
              hashed and will never be stored
              as plain text.
            </div>

            <button
              onClick={
                handleSetSecurityPassword
              }
              disabled={
                securitySubmitting
              }
              className="btn-primary"
              style={{
                width: "100%",
                marginTop: 18,
                padding:
                  "11px 16px",
                borderRadius: 9,
                border: "none",
                fontWeight: 650,
                cursor:
                  securitySubmitting
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  securitySubmitting
                    ? 0.7
                    : 1,
              }}
            >
              {securitySubmitting
                ? "Creating..."
                : "Create Document Password"}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          PASSWORD VERIFICATION MODAL
      ===================================================== */}

      {showVerifyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background:
              "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 410,
              padding: 24,
              borderRadius: 14,
              position:
                "relative",
            }}
          >
            <button
              onClick={
                closeVerifyModal
              }
              disabled={
                securitySubmitting
              }
              style={{
                position:
                  "absolute",
                top: 14,
                right: 14,
                border: "none",
                background:
                  "transparent",
                color:
                  "var(--text-muted)",
                cursor:
                  securitySubmitting
                    ? "not-allowed"
                    : "pointer",
                padding: 4,
              }}
            >
              <X size={18} />
            </button>

            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background:
                  "var(--blue-subtle)",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                marginBottom: 14,
              }}
            >
              <Lock
                size={22}
                style={{
                  color:
                    "var(--blue)",
                }}
              />
            </div>

            <h2
              style={{
                margin: 0,
                fontSize:
                  "1.15rem",
                fontWeight: 750,
                color:
                  "var(--text)",
              }}
            >
              Document Security
            </h2>

            <p
              style={{
                marginTop: 7,
                marginBottom: 20,
                color:
                  "var(--text-muted)",
                fontSize:
                  "0.82rem",
                lineHeight: 1.5,
              }}
            >
              Enter your Document Security
              Password to{" "}
              <strong>
                {getActionLabel(
                  protectedAction
                )}
              </strong>
              .
            </p>

            <label
              style={{
                display:
                  "block",
                fontSize:
                  "0.8rem",
                fontWeight: 600,
                color:
                  "var(--text)",
                marginBottom: 6,
              }}
            >
              Document Security Password
            </label>

            <input
              autoFocus
              type="password"
              value={
                securityPassword
              }
              onChange={(e) => {
                setSecurityPassword(
                  e.target.value
                );
                setSecurityError(
                  null
                );
              }}
              placeholder="Enter your document password"
              disabled={
                securitySubmitting
              }
              onKeyDown={(e) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  handleVerifySecurityPassword();
                }
              }}
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding:
                  "11px 12px",
                borderRadius: 8,
                border:
                  "1px solid var(--border)",
                background:
                  "var(--bg-card)",
                color:
                  "var(--text)",
                outline: "none",
              }}
            />

            {securityError && (
              <div
                style={{
                  marginTop: 12,
                  padding:
                    "9px 11px",
                  borderRadius: 8,
                  background:
                    "rgba(239, 68, 68, 0.08)",
                  border:
                    "1px solid rgba(239, 68, 68, 0.2)",
                  color:
                    "#EF4444",
                  fontSize:
                    "0.78rem",
                }}
              >
                {securityError}
              </div>
            )}

            <button
              onClick={
                handleVerifySecurityPassword
              }
              disabled={
                securitySubmitting
              }
              className="btn-primary"
              style={{
                width: "100%",
                marginTop: 18,
                padding:
                  "11px 16px",
                borderRadius: 9,
                border: "none",
                fontWeight: 650,
                cursor:
                  securitySubmitting
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  securitySubmitting
                    ? 0.7
                    : 1,
              }}
            >
              {securitySubmitting
                ? "Verifying..."
                : "Verify & Continue"}
            </button>

            <div
              style={{
                textAlign: "center",
                marginTop: 13,
                fontSize: "0.72rem",
                color: "var(--text-muted)",
              }}
            >
              Forgot your Document Security Password?{" "}
              <button
                type="button"
                onClick={() => {
                  setShowVerifyModal(false);
                  setShowResetModal(true);
                  setResetStep("request");
                  setResetCode("");
                  setResetPassword("");
                  setResetConfirmPassword("");
                  setResetEmail(null);
                  setResetError(null);
                }}
                disabled={securitySubmitting}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  color: "var(--gold)",
                  cursor: securitySubmitting
                    ? "not-allowed"
                    : "pointer",
                  fontSize: "inherit",
                  textDecoration: "underline",
                  opacity: securitySubmitting ? 0.6 : 1,
                }}
              >
                Reset it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          DOCUMENT SECURITY PASSWORD RESET MODAL
      ===================================================== */}

      {showResetModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 440,
              padding: 24,
              borderRadius: 14,
              position: "relative",
            }}
          >
            <button
              onClick={() => {
                if (resetSubmitting) return;
                setShowResetModal(false);
                setResetStep("request");
                setResetCode("");
                setResetPassword("");
                setResetConfirmPassword("");
                setResetEmail(null);
                setResetError(null);
              }}
              disabled={resetSubmitting}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: resetSubmitting
                  ? "not-allowed"
                  : "pointer",
                padding: 4,
              }}
            >
              <X size={18} />
            </button>

            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "var(--blue-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Lock
                size={22}
                style={{ color: "var(--blue)" }}
              />
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "1.15rem",
                fontWeight: 750,
                color: "var(--text)",
              }}
            >
              Reset Document Security Password
            </h2>

            <p
              style={{
                marginTop: 7,
                marginBottom: 20,
                color: "var(--text-muted)",
                fontSize: "0.82rem",
                lineHeight: 1.5,
              }}
            >
              {resetStep === "request"
                ? "We will send a verification code to your registered email address."
                : `Enter the verification code sent to ${resetEmail || "your registered email"}, then create a new password.`}
            </p>

            {resetStep === "request" ? (
              <>
                <button
                  onClick={handleRequestDocumentPasswordReset}
                  disabled={resetSubmitting}
                  className="btn-primary"
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "11px 16px",
                    borderRadius: 9,
                    border: "none",
                    fontWeight: 650,
                    cursor: resetSubmitting
                      ? "not-allowed"
                      : "pointer",
                    opacity: resetSubmitting ? 0.7 : 1,
                  }}
                >
                  {resetSubmitting
                    ? "Sending Code..."
                    : "Send Reset Code"}
                </button>
              </>
            ) : (
              <>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 6,
                  }}
                >
                  Verification Code
                </label>

                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={resetCode}
                  onChange={(e) => {
                    setResetCode(
                      e.target.value.replace(/\D/g, "").slice(0, 8)
                    );
                    setResetError(null);
                  }}
                  placeholder="Enter verification code"
                  disabled={resetSubmitting}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text)",
                    outline: "none",
                    marginBottom: 12,
                  }}
                />

                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 6,
                  }}
                >
                  New Document Security Password
                </label>

                <input
                  type="password"
                  autoComplete="new-password"
                  value={resetPassword}
                  onChange={(e) => {
                    setResetPassword(e.target.value);
                    setResetError(null);
                  }}
                  placeholder="Enter new password"
                  disabled={resetSubmitting}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text)",
                    outline: "none",
                    marginBottom: 12,
                  }}
                />

                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 6,
                  }}
                >
                  Confirm New Password
                </label>

                <input
                  type="password"
                  autoComplete="new-password"
                  value={resetConfirmPassword}
                  onChange={(e) => {
                    setResetConfirmPassword(e.target.value);
                    setResetError(null);
                  }}
                  placeholder="Confirm new password"
                  disabled={resetSubmitting}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleResetDocumentPassword();
                    }
                  }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text)",
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    marginTop: 12,
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Minimum 8 characters. The reset code should be used only once.
                </div>

                <button
                  onClick={handleResetDocumentPassword}
                  disabled={resetSubmitting}
                  className="btn-primary"
                  style={{
                    width: "100%",
                    marginTop: 18,
                    padding: "11px 16px",
                    borderRadius: 9,
                    border: "none",
                    fontWeight: 650,
                    cursor: resetSubmitting
                      ? "not-allowed"
                      : "pointer",
                    opacity: resetSubmitting ? 0.7 : 1,
                  }}
                >
                  {resetSubmitting
                    ? "Resetting..."
                    : "Reset Password"}
                </button>

                <button
                  type="button"
                  onClick={handleRequestDocumentPasswordReset}
                  disabled={resetSubmitting}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-muted)",
                    cursor: resetSubmitting
                      ? "not-allowed"
                      : "pointer",
                    fontSize: "0.78rem",
                  }}
                >
                  Resend Code
                </button>
              </>
            )}

            {resetError && (
              <div
                style={{
                  marginTop: 12,
                  padding: "9px 11px",
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#EF4444",
                  fontSize: "0.78rem",
                }}
              >
                {resetError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          DOCUMENT SHARE MODAL (Step 2)
      ===================================================== */}

      {showShareModal &&
        shareDocument && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              background: "rgba(0, 0, 0, 0.62)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={closeShareModal}
          >
            <div
              className="card"
              onClick={(event) =>
                event.stopPropagation()
              }
              style={{
                width: "100%",
                maxWidth: 520,
                maxHeight: "calc(100vh - 40px)",
                overflowY: "auto",
                padding: 24,
                position: "relative",
              }}
            >
              {/* HEADER */}

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      marginBottom: 6,
                    }}
                  >
                    <Share2
                      size={18}
                      style={{
                        color: "var(--blue)",
                        flexShrink: 0,
                      }}
                    />

                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        fontWeight: 800,
                        color: "var(--text)",
                      }}
                    >
                      Share Document
                    </h2>
                  </div>

                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      wordBreak: "break-word",
                    }}
                  >
                    {shareDocument.name}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeShareModal}
                  disabled={shareSubmitting}
                  aria-label="Close share dialog"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: shareSubmitting
                      ? "not-allowed"
                      : "pointer",
                    display: "flex",
                    padding: 4,
                    flexShrink: 0,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* SHARE TYPE */}

              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: 9,
                  }}
                >
                  Sharing Type
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setShareType("permanent")
                    }
                    disabled={shareSubmitting}
                    style={{
                      padding: "12px 10px",
                      borderRadius: 9,
                      border:
                        shareType === "permanent"
                          ? "1px solid var(--blue)"
                          : "1px solid var(--border)",
                      background:
                        shareType === "permanent"
                          ? "var(--blue-subtle)"
                          : "var(--bg-card)",
                      color: "var(--text)",
                      cursor: shareSubmitting
                        ? "not-allowed"
                        : "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.82rem",
                      }}
                    >
                      Permanent Share
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: "0.68rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      Access remains until the
                      share is revoked.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShareType("temporary")
                    }
                    disabled={shareSubmitting}
                    style={{
                      padding: "12px 10px",
                      borderRadius: 9,
                      border:
                        shareType === "temporary"
                          ? "1px solid var(--blue)"
                          : "1px solid var(--border)",
                      background:
                        shareType === "temporary"
                          ? "var(--blue-subtle)"
                          : "var(--bg-card)",
                      color: "var(--text)",
                      cursor: shareSubmitting
                        ? "not-allowed"
                        : "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.82rem",
                      }}
                    >
                      Temporary Share
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: "0.68rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      Access expires automatically.
                    </div>
                  </button>
                </div>
              </div>

              {/* TEMPORARY DURATION */}

              {shareType === "temporary" && (
                <div style={{ marginBottom: 20 }}>
                  <label
                    htmlFor="share-duration"
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "var(--text)",
                      marginBottom: 8,
                    }}
                  >
                    Access duration
                  </label>

                  <select
                    id="share-duration"
                    value={shareDurationDays}
                    onChange={(event) =>
                      setShareDurationDays(
                        Number(event.target.value)
                      )
                    }
                    disabled={shareSubmitting}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--bg-card)",
                      color: "var(--text)",
                      outline: "none",
                    }}
                  >
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>180 days</option>
                    <option value={365}>365 days</option>
                  </select>
                </div>
              )}

              {/* RECIPIENT */}

              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "var(--text)",
                    marginBottom: 9,
                  }}
                >
                  {isAdvocate
                    ? "Select Client"
                    : "Select Advocate"}
                </div>

                {shareRecipientsLoading ? (
                  <div
                    style={{
                      padding: "24px 12px",
                      borderRadius: 9,
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                      fontSize: "0.78rem",
                      textAlign: "center",
                    }}
                  >
                    Loading eligible{" "}
                    {isAdvocate
                      ? "clients"
                      : "advocates"}
                    ...
                  </div>
                ) : shareRecipients.length === 0 ? (
                  <div
                    style={{
                      padding: "16px 12px",
                      borderRadius: 9,
                      border: "1px solid var(--border)",
                      background: "var(--bg-card)",
                      color: "var(--text-muted)",
                      fontSize: "0.76rem",
                      lineHeight: 1.5,
                    }}
                  >
                    No eligible{" "}
                    {isAdvocate
                      ? "clients"
                      : "advocates"}{" "}
                    found.

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: "0.68rem",
                      }}
                    >
                      Sharing is available only
                      with users who have a confirmed
                      consultation with you.
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    {shareRecipients.map((recipient) => {
                      const selected =
                        selectedRecipientId === recipient.id;

                      return (
                        <button
                          key={recipient.id}
                          type="button"
                          onClick={() =>
                            setSelectedRecipientId(
                              recipient.id
                            )
                          }
                          disabled={shareSubmitting}
                          style={{
                            width: "100%",
                            padding: "11px 12px",
                            borderRadius: 9,
                            border: selected
                              ? "1px solid var(--blue)"
                              : "1px solid var(--border)",
                            background: selected
                              ? "var(--blue-subtle)"
                              : "var(--bg-card)",
                            color: "var(--text)",
                            cursor: shareSubmitting
                              ? "not-allowed"
                              : "pointer",
                            textAlign: "left",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 700,
                            }}
                          >
                            {recipient.name}
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              fontSize: "0.68rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {recipient.email}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ERROR */}

              {shareError && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(220,38,38,0.3)",
                    background: "rgba(220,38,38,0.08)",
                    color: "#ef4444",
                    fontSize: "0.74rem",
                    lineHeight: 1.45,
                  }}
                >
                  {shareError}
                </div>
              )}

              {/* ACTIONS */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={closeShareModal}
                  disabled={shareSubmitting}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text)",
                    cursor: shareSubmitting
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitDocumentShare}
                  disabled={
                    shareSubmitting ||
                    !selectedRecipientId ||
                    shareRecipientsLoading
                  }
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      "linear-gradient(135deg, #E3A15F, #C27635)",
                    color: "#000000",
                    fontWeight: 800,
                    cursor:
                      shareSubmitting || !selectedRecipientId
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      shareSubmitting || !selectedRecipientId
                        ? 0.6
                        : 1,
                  }}
                >
                  {shareSubmitting
                    ? "Sharing..."
                    : "Share Document"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          BLOCKCHAIN PROOF / DETAILS MODAL (Step 6)
      ===================================================== */}

      {showBlockchainDetails &&
        blockchainDetailsDoc && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background:
                "rgba(0, 0, 0, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              className="card"
              style={{
                width: "100%",
                maxWidth: 440,
                padding: 24,
                borderRadius: 14,
                position: "relative",
              }}
            >
              <button
                onClick={
                  closeBlockchainDetails
                }
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>

              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background:
                    "var(--blue-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <ShieldCheck
                  size={22}
                  style={{
                    color: "var(--blue)",
                  }}
                />
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                }}
              >
                Blockchain Proof
              </h2>

              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  marginBottom: 16,
                  wordBreak: "break-word",
                }}
              >
                {blockchainDetailsDoc.name}
              </div>

              {(() => {
                const status =
                  blockchainDetailsDoc.blockchainStatus;

                const statusLabel =
                  status === "registered"
                    ? "Registered on blockchain"
                    : status === "failed"
                    ? "Registration failed"
                    : "Not registered";

                const verifyResult =
                  blockchainDetailsDoc.id
                    ? blockchainVerifyResults[
                        blockchainDetailsDoc.id
                      ]
                    : undefined;

                const verifyLabel = (() => {
                  if (!verifyResult) {
                    if (status !== "registered") {
                      return "Not registered yet — use \"Register on Blockchain\" to anchor this document hash.";
                    }

                    return "Not checked yet — use \"Verify on Blockchain\" to check.";
                  }
                  switch (verifyResult.status) {
                    case "verified":
                      return "✓ Verified — matches on-chain record";
                    case "tampered":
                      return "⚠ Tampered — does not match on-chain record";
                    case "not_registered":
                      return "Not registered on blockchain";
                    case "blockchain_unavailable":
                      return "Blockchain unavailable — try again later";
                    default:
                      return "Unknown";
                  }
                })();

                const explorerUrl = getExplorerTxUrl(
                  blockchainDetailsDoc.blockchainNetwork,
                  blockchainDetailsDoc.blockchainTxHash
                );

                const rowStyle: React.CSSProperties = {
                  marginBottom: 14,
                };

                const labelStyle: React.CSSProperties = {
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-muted)",
                  marginBottom: 4,
                };

                const valueRowStyle: React.CSSProperties = {
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.85rem",
                  fontFamily:
                    "monospace",
                  wordBreak: "break-all",
                };

                return (
                  <div>
                    <div style={rowStyle}>
                      <div style={labelStyle}>
                        Blockchain Status
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                        }}
                      >
                        {statusLabel}
                      </div>
                    </div>

                    <div style={rowStyle}>
                      <div style={labelStyle}>
                        SHA-256 Document Hash
                      </div>
                      {blockchainDetailsDoc.documentHash ? (
                        <div style={valueRowStyle}>
                          <span>
                            {shortenHash(
                              blockchainDetailsDoc.documentHash
                            )}
                          </span>
                          <button
                            title="Copy full hash"
                            onClick={() =>
                              copyToClipboard(
                                blockchainDetailsDoc.documentHash as string,
                                "Document hash"
                              )
                            }
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              padding: 2,
                              display: "flex",
                            }}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Not available
                        </div>
                      )}
                    </div>

                    <div style={rowStyle}>
                      <div style={labelStyle}>
                        Blockchain Transaction Hash
                      </div>
                      {blockchainDetailsDoc.blockchainTxHash ? (
                        <div style={valueRowStyle}>
                          <span>
                            {shortenHash(
                              blockchainDetailsDoc.blockchainTxHash
                            )}
                          </span>
                          <button
                            title="Copy full transaction hash"
                            onClick={() =>
                              copyToClipboard(
                                blockchainDetailsDoc.blockchainTxHash as string,
                                "Transaction hash"
                              )
                            }
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              padding: 2,
                              display: "flex",
                            }}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Not available
                        </div>
                      )}
                    </div>

                    <div style={rowStyle}>
                      <div style={labelStyle}>
                        Blockchain Network
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                        }}
                      >
                        {blockchainDetailsDoc.blockchainNetwork ||
                          "Not available"}
                      </div>
                    </div>

                    <div style={rowStyle}>
                      <div style={labelStyle}>
                        Verification Status
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                        }}
                      >
                        {verifyLabel}
                      </div>
                    </div>

                    {status !== "registered" && (
                      <button
                        onClick={() => {
                          const doc =
                            blockchainDetailsDoc;

                          closeBlockchainDetails();
                          setPendingDocument(doc);

                          requireDocumentPassword(
                            "register_blockchain"
                          );
                        }}
                        disabled={
                          verifyingBlockchainId ===
                          blockchainDetailsDoc.id
                        }
                        style={{
                          width: "100%",
                          marginTop: 10,
                          padding: "9px 14px",
                          borderRadius: 8,
                          border:
                            "1px solid var(--border)",
                          background:
                            "var(--bg-card)",
                          color: "var(--blue)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor:
                            verifyingBlockchainId ===
                            blockchainDetailsDoc.id
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            verifyingBlockchainId ===
                            blockchainDetailsDoc.id
                              ? 0.6
                              : 1,
                        }}
                      >
                        Register on Blockchain
                      </button>
                    )}

                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          marginTop: 10,
                          padding: "9px 14px",
                          borderRadius: 8,
                          border:
                            "1px solid var(--border)",
                          background:
                            "var(--bg-card)",
                          color: "var(--blue)",
                          fontSize: "0.8rem",
                          textDecoration: "none",
                        }}
                      >
                        View Transaction
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      {/* ======================================
          AUDIT TRAIL / ACTIVITY HISTORY MODAL
          (Step 4)
      ====================================== */}

      {showAuditModal &&
        auditDoc && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background:
                "rgba(0, 0, 0, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              className="card"
              style={{
                width: "100%",
                maxWidth: 520,
                maxHeight: "80vh",
                padding: 24,
                borderRadius: 14,
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <button
                onClick={
                  closeAuditModal
                }
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>

              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background:
                    "var(--blue-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                  flexShrink: 0,
                }}
              >
                <Clock
                  size={22}
                  style={{
                    color: "var(--blue)",
                  }}
                />
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                }}
              >
                Audit Trail
              </h2>

              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  marginBottom: 16,
                  wordBreak: "break-word",
                }}
              >
                {auditDoc.name}
              </div>

              <div
                style={{
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                  marginRight: -8,
                  paddingRight: 8,
                }}
              >
                {auditLoading ? (
                  <div
                    style={{
                      padding:
                        "40px 20px",
                      textAlign:
                        "center",
                      color:
                        "var(--text-muted)",
                      fontSize:
                        "0.85rem",
                    }}
                  >
                    Loading activity
                    history...
                  </div>
                ) : auditError ? (
                  <div
                    style={{
                      padding:
                        "40px 20px",
                      textAlign:
                        "center",
                      color:
                        "var(--text-muted)",
                      fontSize:
                        "0.85rem",
                    }}
                  >
                    {auditError}
                  </div>
                ) : auditHistory.length ===
                  0 ? (
                  <div
                    style={{
                      padding:
                        "40px 20px",
                      textAlign:
                        "center",
                      color:
                        "var(--text-muted)",
                      fontSize:
                        "0.85rem",
                    }}
                  >
                    No activity recorded
                    for this document
                    yet.
                  </div>
                ) : (
                  [...auditHistory]
                    .sort(
                      (a, b) =>
                        new Date(
                          b.created_at
                        ).getTime() -
                        new Date(
                          a.created_at
                        ).getTime()
                    )
                    .map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          padding:
                            "10px 0",
                          borderBottom:
                            "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "0.85rem",
                            color:
                              "var(--text)",
                            fontWeight: 500,
                          }}
                        >
                          {entry.description ||
                            "Activity recorded"}
                        </div>

                        <div
                          style={{
                            fontSize:
                              "0.7rem",
                            color:
                              "var(--text-muted)",
                            marginTop: 3,
                          }}
                        >
                          {formatAuditDate(
                            entry.created_at
                          )}
                        </div>

                        {(entry.ip_address ||
                          entry.user_agent) && (
                          <div
                            style={{
                              fontSize:
                                "0.7rem",
                              color:
                                "var(--text-subtle)",
                              marginTop: 4,
                              wordBreak:
                                "break-word",
                            }}
                          >
                            {entry.ip_address && (
                              <div>
                                IP:{" "}
                                {
                                  entry.ip_address
                                }
                              </div>
                            )}
                            {entry.user_agent && (
                              <div>
                                {
                                  entry.user_agent
                                }
                              </div>
                            )}
                          </div>
                        )}

                        {entry.metadata &&
                          Object.keys(
                            entry.metadata
                          ).length > 0 && (
                            <div
                              style={{
                                fontSize:
                                  "0.68rem",
                                color:
                                  "var(--text-subtle)",
                                marginTop: 4,
                                fontFamily:
                                  "monospace",
                                wordBreak:
                                  "break-word",
                              }}
                            >
                              {Object.entries(
                                entry.metadata
                              ).map(
                                ([
                                  key,
                                  value,
                                ]) => (
                                  <div
                                    key={
                                      key
                                    }
                                  >
                                    {key}
                                    :{" "}
                                    {typeof value ===
                                    "object"
                                      ? JSON.stringify(
                                          value
                                        )
                                      : String(
                                          value
                                        )}
                                  </div>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// =====================================================
// FILE TYPE LABEL
// =====================================================

function getFileTypeLabel(
  type: string
) {
  if (!type) {
    return "Uploaded";
  }

  if (
    type.includes("pdf")
  ) {
    return "PDF";
  }

  if (
    type.includes("png") ||
    type.includes("jpeg") ||
    type.includes("jpg")
  ) {
    return "Image";
  }

  if (
    type.includes("mpeg") ||
    type.includes("mp3") ||
    type.includes("wav") ||
    type.includes("m4a") ||
    type.includes("webm")
  ) {
    return "Audio";
  }

  if (
    type.includes("mp4") ||
    type.includes("quicktime")
  ) {
    return "Video";
  }

  return "Uploaded";
}
