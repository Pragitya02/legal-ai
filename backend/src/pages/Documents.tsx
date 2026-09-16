import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import {
  Upload,
  FileText,
  Download,
  Trash2,
} from "lucide-react";

interface Doc {
  id?: number;
  name: string;
  size: string;
  date: string;
  type: string;
  url?: string;
}

export default function Documents() {
  const location = useLocation();

  const isAdvocate =
    location.pathname.startsWith("/advocate");
const [docs, setDocs] = useState<Doc[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fileRef = useRef<HTMLInputElement | null>(null);

  // =====================================================
  // LOAD SAVED DOCUMENTS FROM DATABASE
  // =====================================================

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const token = localStorage.getItem("token");

        console.log("LOADING DOCUMENTS...");
        console.log("TOKEN EXISTS:", !!token);

        if (!token) {
          console.error("No authentication token found");
          setLoading(false);
          return;
        }

        const response = await fetch(
          "https://legal-ai-z7vb.onrender.com/api/documents",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log(
          "DOCUMENT GET STATUS:",
          response.status
        );

        const result = await response.json();

        console.log(
          "DOCUMENTS FROM SERVER:",
          result
        );

        if (!response.ok || !result.success) {
          console.error(
            "FAILED TO LOAD DOCUMENTS:",
            result
          );

          setLoading(false);
          return;
        }

        const loadedDocs: Doc[] =
          result.documents.map((doc: any) => ({
            id: doc.id,

            name: doc.file_name,

            size: "Uploaded",

            date: new Date(
              doc.uploaded_at
            ).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),

            type: doc.file_type,

            url: doc.file_path,
          }));

        console.log(
          "LOADED DOCUMENTS:",
          loadedDocs
        );

        // Database documents first,
        // demo documents after them.
        setDocs([
          ...loadedDocs
        ]);

      } catch (error) {
        console.error(
          "LOAD DOCUMENTS ERROR:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  // =====================================================
  // UPLOAD DOCUMENT
  // =====================================================

  const handleUpload = async (
    files: FileList | null
  ) => {
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    try {
      const token =
        localStorage.getItem("token");

      if (!token) {
        alert("Please login again.");
        return;
      }

      console.log(
        "UPLOADING FILE:",
        file.name
      );

      const formData = new FormData();

      formData.append(
        "document",
        file
      );

      const response = await fetch(
        "https://legal-ai-z7vb.onrender.com/api/upload",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          body: formData,
        }
      );

      console.log(
        "UPLOAD STATUS:",
        response.status
      );

      const result =
        await response.json();

      console.log(
        "UPLOAD RESULT:",
        result
      );

      if (
        !response.ok ||
        !result.success
      ) {
        alert(
          result.message ||
            "Upload failed"
        );

        return;
      }

      // Calculate file size
      const sizeKb =
        file.size / 1024;

      const size =
        sizeKb > 1024
          ? `${(
              sizeKb / 1024
            ).toFixed(1)} MB`
          : `${sizeKb.toFixed(
              0
            )} KB`;

      // Add uploaded document
      // immediately to the UI
      const newDoc: Doc = {
        id: result.file.id,

        name:
          result.file.originalName,

        size,

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
          result.file.mimetype,

        url:
          result.file.url,
      };

      setDocs((prev) => [
        newDoc,
        ...prev,
      ]);

      setToast(
        `${file.name} uploaded successfully`
      );

      setTimeout(() => {
        setToast(null);
      }, 2500);

    } catch (error) {
      console.error(
        "UPLOAD ERROR:",
        error
      );

      alert(
        "Server upload failed"
      );
    }
  };

  // =====================================================
  // DOWNLOAD DOCUMENT
  // =====================================================

  const downloadDocument = (
    doc: Doc
  ) => {
    if (!doc.url) {
      alert(
        "This demo document is not stored on the server."
      );

      return;
    }

    const link =
      document.createElement("a");

    link.href =
      `https://legal-ai-z7vb.onrender.com${doc.url}`;

    link.target = "_blank";

    link.rel =
      "noopener noreferrer";

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );
  };

  // =====================================================
  // REMOVE FROM CURRENT UI
  // =====================================================

  const remove = (
    name: string
  ) => {
    setDocs((prev) =>
      prev.filter(
        (doc) =>
          doc.name !== name
      )
    );
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div>

      {/* HEADER */}
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
            }}
          >
            Documents
          </h1>

          <p
            style={{
              color:
                "var(--text-muted)",
              fontSize: "0.9rem",
              marginTop: 2,
            }}
          >
            {isAdvocate
              ? "Client documents & case files"
              : "FIRs, contracts, receipts, and AI reports"}
          </p>

        </div>

        {/* UPLOAD BUTTON */}
        <div>

          <input
            ref={fileRef}
            type="file"
            accept="
              .pdf,
              .png,
              .jpg,
              .jpeg,
              .mp3,
              .wav,
              .webm,
              .m4a,
              .mp4,
              .mov
            "
            style={{
              display: "none",
            }}
            onChange={(e) => {
              handleUpload(
                e.target.files
              );

              // Allows selecting
              // the same file again
              e.target.value = "";
            }}
          />

          <button
            onClick={() =>
              fileRef.current?.click()
            }
            className="btn-primary"
            style={{
              padding:
                "9px 16px",
              borderRadius: 9,
              fontSize:
                "0.85rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems:
                "center",
              gap: 6,
            }}
          >
            <Upload size={15} />

            Upload Document
          </button>

        </div>

      </div>

      {/* TOAST */}
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

      {/* DROP AREA */}
      <div
        onDragOver={(e) =>
          e.preventDefault()
        }
        onDrop={(e) => {
          e.preventDefault();

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
          cursor: "pointer",
        }}
        onClick={() =>
          fileRef.current?.click()
        }
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
            color: "var(--text)",
            fontSize:
              "0.9rem",
          }}
        >
          Drag & drop a file,
          or click to browse
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
          WAV, WEBM, M4A,
          MP4, MOV up to 100MB
        </div>

      </div>

      {/* DOCUMENT LIST */}
      <div
        className="card"
        style={{
          padding: 8,
        }}
      >

        {/* LOADING */}
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

        ) : (

          <>

            {docs.map(
              (doc, index) => (

                <div
                  key={
                    doc.id ??
                    `seed-${index}`
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 12,
                    padding:
                      "12px 14px",
                    borderBottom:
                      index <
                      docs.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >

                  {/* ICON */}
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

                  {/* NAME + DATE */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >

                    <div
                      style={{
                        fontWeight:
                          500,
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
                      {doc.name}
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
                      {doc.size}
                      {" · "}
                      {doc.date}
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
                      flexShrink: 0,
                    }}
                  >
                    {doc.type}
                  </span>

                  {/* DOWNLOAD */}
                  <button
                    title="Download"
                    onClick={() =>
                      downloadDocument(
                        doc
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
                    <Download
                      size={13}
                    />
                  </button>

                  {/* REMOVE FROM UI */}
                  <button
                    title="Remove"
                    onClick={() =>
                      remove(
                        doc.name
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
                      flexShrink: 0,
                    }}
                  >
                    <Trash2
                      size={13}
                    />
                  </button>

                </div>

              )
            )}

            {/* EMPTY */}
            {docs.length === 0 && (

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
              </div>

            )}

          </>

        )}

      </div>

    </div>
  );
}