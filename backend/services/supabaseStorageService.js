const crypto = require("crypto");

const SUPABASE_URL = String(
    process.env.SUPABASE_URL || ""
).replace(/\/+$/, "");

const SUPABASE_SECRET_KEY =
    process.env.SUPABASE_SECRET_KEY || "";

const SUPABASE_STORAGE_BUCKET =
    process.env.SUPABASE_STORAGE_BUCKET ||
    "nyaya-documents";

function ensureConfigured() {
    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
        throw new Error(
            "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY."
        );
    }
}

function encodeObjectPath(objectPath) {
    return objectPath
        .split("/")
        .filter(Boolean)
        .map((part) => encodeURIComponent(part))
        .join("/");
}

function objectUrl(objectPath) {
    ensureConfigured();

    return (
        `${SUPABASE_URL}/storage/v1/object/` +
        `${encodeURIComponent(SUPABASE_STORAGE_BUCKET)}/` +
        encodeObjectPath(objectPath)
    );
}

function storageHeaders(extra = {}) {
    ensureConfigured();

    return {
        apikey: SUPABASE_SECRET_KEY,
        ...extra
    };
}

function createDocumentStoragePath(
    userId,
    originalFileName
) {
    const extension = String(originalFileName || "")
        .split(".")
        .pop()
        .toLowerCase();

    const safeExtension =
        extension &&
        /^[a-z0-9]{1,10}$/.test(extension)
            ? `.${extension}`
            : "";

    return (
        `documents/${Number(userId)}/` +
        `${crypto.randomUUID()}${safeExtension}`
    );
}

function createProfilePhotoStoragePath(userId) {
    // Profile photos live in the same private bucket as documents,
    // under their own prefix. The backend is the only reader/writer
    // (via the secret key); the browser never talks to Storage directly.
    return (
        `profile-photos/${Number(userId)}/` +
        `${crypto.randomUUID()}.jpg`
    );
}

function toStorageReference(objectPath) {
    return `supabase://${objectPath}`;
}

function isSupabaseStorageReference(filePath) {
    return (
        typeof filePath === "string" &&
        filePath.startsWith("supabase://")
    );
}

function getObjectPathFromReference(filePath) {
    if (!isSupabaseStorageReference(filePath)) {
        return null;
    }

    const objectPath = filePath.slice(
        "supabase://".length
    );

    if (
        !objectPath ||
        objectPath.includes("..")
    ) {
        return null;
    }

    return objectPath;
}

async function uploadDocumentBuffer(
    buffer,
    objectPath,
    contentType
) {
    if (!Buffer.isBuffer(buffer)) {
        throw new Error(
            "uploadDocumentBuffer expects a Buffer."
        );
    }

    const response = await fetch(
        objectUrl(objectPath),
        {
            method: "POST",
            headers: storageHeaders({
                "Content-Type":
                    contentType ||
                    "application/octet-stream",

                "x-upsert": "false",

                "cache-control": "3600"
            }),
            body: buffer
        }
    );

    if (!response.ok) {
        const body =
            await response
                .text()
                .catch(() => "");

        throw new Error(
            `Supabase Storage upload failed (${response.status}): ${body.slice(
                0,
                500
            )}`
        );
    }

    return true;
}

async function downloadDocumentBuffer(
    filePath
) {
    const objectPath =
        getObjectPathFromReference(filePath);

    if (!objectPath) {
        throw new Error(
            "Invalid Supabase document storage reference."
        );
    }

    const response = await fetch(
        objectUrl(objectPath),
        {
            method: "GET",
            headers: storageHeaders()
        }
    );

    if (!response.ok) {
        const body =
            await response
                .text()
                .catch(() => "");

        if (response.status === 404) {
            const error = new Error(
                "Document file is no longer available."
            );

            error.code =
                "STORAGE_NOT_FOUND";

            throw error;
        }

        throw new Error(
            `Supabase Storage download failed (${response.status}): ${body.slice(
                0,
                500
            )}`
        );
    }

    const arrayBuffer =
        await response.arrayBuffer();

    return Buffer.from(arrayBuffer);
}

async function deleteDocumentFromStorage(
    filePath
) {
    const objectPath =
        getObjectPathFromReference(filePath);

    if (!objectPath) {
        throw new Error(
            "Invalid Supabase document storage reference."
        );
    }

    const response = await fetch(
        objectUrl(objectPath),
        {
            method: "DELETE",
            headers: storageHeaders()
        }
    );

    if (
        !response.ok &&
        response.status !== 404
    ) {
        const body =
            await response
                .text()
                .catch(() => "");

        throw new Error(
            `Supabase Storage delete failed (${response.status}): ${body.slice(
                0,
                500
            )}`
        );
    }

    return true;
}

module.exports = {
    createDocumentStoragePath,
    createProfilePhotoStoragePath,
    toStorageReference,
    isSupabaseStorageReference,
    uploadDocumentBuffer,
    downloadDocumentBuffer,
    deleteDocumentFromStorage
};