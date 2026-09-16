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

type ProtectedAction =
  | "load"
  | "upload"
  | "open"
  | "download"
  | "rename"
  | "delete"
  | "verify_blockchain";

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
        `${API_BASE}/api/documents`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "X-Document-Password":
              documentPassword,
          },
        }
      );

      const result = await response.json();

      console.log("SAVED DOCUMENTS:", result);

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

    const file = fileArray[0];

    // 100 MB frontend check
    const maxSize = 100 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        "File is too large. Maximum size is 100 MB."
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

    const file = files[0];

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

      const uploadedFile: Doc = {
        id: result.file?.id,

        name:
          result.file?.originalName ||
          file.name,

        size:
          result.file?.size
            ? formatFileSize(
                result.file.size
              )
            : formatFileSize(
                file.size
              ),

        date:
          new Date().toLocaleDateString(
            "en-IN",
            {
              day: "numeric",
              month: "short",
              year: "numeric",
            }
          ),

        type:
          result.file?.mimetype ||
          file.type ||
          "Uploaded",

        url:
          result.file?.url ||
          undefined,
      };

      setDocs((prev) => [
        uploadedFile,
        ...prev,
      ]);

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

      setDocs((prev) =>
        prev.filter(
          (doc) =>
            doc.id !== id
        )
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
              fileName:
                newName,
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

      setDocs((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                name: newName,
              }
            : doc
        )
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
  // VERIFY ON BLOCKCHAIN REQUEST
  // =====================================================

  const verifyOnBlockchain = (
    doc: Doc
  ) => {
    if (!doc.id) {
      alert(
        "Document ID not found."
      );
      return;
    }

    if (verifyingBlockchainId) {
      // Already verifying a document — ignore
      // duplicate clicks.
      return;
    }

    setPendingDocument(doc);

    requireDocumentPassword(
      "verify_blockchain"
    );
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
            accept=".pdf,.png,.jpg,.jpeg,.mp3,.wav,.webm,.m4a,.mp4,.mov"
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
          PDF, PNG, JPG, MP3,
          WAV, M4A, MP4, MOV,
          WEBM up to 100MB
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

              {/* VERIFY ON BLOCKCHAIN */}

              <button
                title="Verify on Blockchain"
                disabled={
                  verifyingBlockchainId ===
                  d.id
                }
                onClick={() =>
                  verifyOnBlockchain(d)
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
                  ? "Verifying..."
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