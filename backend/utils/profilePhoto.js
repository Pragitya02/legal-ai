// =====================================================
// PROFILE PHOTO HELPERS
// =====================================================
//
// - buildProfilePhotoUrl(): turns the stored storage
//   reference into a backend-relative, cache-busted URL.
//   The raw storage path is never sent to the browser.
//
// - validateProfilePhotoBuffer(): server-side check of the
//   uploaded bytes (real JPEG structure, size, dimensions).
//   It does not trust the client-supplied MIME type.
//
// NOTE: this validates the *image file*, not the person. It
// cannot prove that a live human face is in the picture.
// =====================================================

const PHOTO_URL_PREFIX = "/api/profile/photo";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB
const MIN_PHOTO_BYTES = 4 * 1024; // 4 KB
const MIN_PHOTO_DIMENSION = 256;
const MAX_PHOTO_DIMENSION = 2048;

// Extracts the unique file id from "supabase://profile-photos/<uid>/<uuid>.jpg"
// so it can be used as a cache-busting version in the URL.
function getPhotoVersion(storagePath) {
    if (typeof storagePath !== "string") {
        return "";
    }

    const match = storagePath.match(/\/([0-9a-f-]{36})\.jpg$/i);

    return match ? match[1] : "";
}

function buildProfilePhotoUrl(userId, storagePath) {
    if (!storagePath || !userId) {
        return null;
    }

    const version = getPhotoVersion(storagePath);

    return (
        `${PHOTO_URL_PREFIX}/${Number(userId)}` +
        (version ? `?v=${version}` : "")
    );
}

// Walks the JPEG marker segments to read the frame header.
// Returns { width, height } or null when the structure is invalid.
function readJpegDimensions(buffer) {
    let offset = 2; // after SOI (FF D8)

    while (offset + 4 <= buffer.length) {
        if (buffer[offset] !== 0xff) {
            return null;
        }

        // Skip fill bytes (FF FF ...).
        while (
            offset < buffer.length &&
            buffer[offset + 1] === 0xff
        ) {
            offset += 1;
        }

        const marker = buffer[offset + 1];

        // Standalone markers have no length field.
        if (
            marker === 0x01 ||
            (marker >= 0xd0 && marker <= 0xd8)
        ) {
            offset += 2;
            continue;
        }

        // EOI before a frame header was found.
        if (marker === 0xd9) {
            return null;
        }

        const segmentLength = buffer.readUInt16BE(offset + 2);

        if (segmentLength < 2) {
            return null;
        }

        const isFrameHeader =
            marker >= 0xc0 &&
            marker <= 0xcf &&
            marker !== 0xc4 && // DHT
            marker !== 0xc8 && // JPG extension
            marker !== 0xcc; // DAC

        if (isFrameHeader) {
            if (offset + 9 > buffer.length) {
                return null;
            }

            return {
                height: buffer.readUInt16BE(offset + 5),
                width: buffer.readUInt16BE(offset + 7),
            };
        }

        // Image data begins without any frame header found.
        if (marker === 0xda) {
            return null;
        }

        offset += 2 + segmentLength;
    }

    return null;
}

function validateProfilePhotoBuffer(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        return { ok: false, message: "No photo was received." };
    }

    if (buffer.length > MAX_PHOTO_BYTES) {
        return {
            ok: false,
            status: 413,
            message: "Photo is too large. Maximum size is 2 MB.",
        };
    }

    if (buffer.length < MIN_PHOTO_BYTES) {
        return {
            ok: false,
            message: "Photo is too small or corrupted. Please retake it.",
        };
    }

    const hasJpegHeader =
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff;

    const hasJpegEnd =
        buffer[buffer.length - 2] === 0xff &&
        buffer[buffer.length - 1] === 0xd9;

    if (!hasJpegHeader || !hasJpegEnd) {
        return {
            ok: false,
            message: "Photo must be a valid JPEG image captured from the camera.",
        };
    }

    const dimensions = readJpegDimensions(buffer);

    if (!dimensions) {
        return {
            ok: false,
            message: "Photo could not be read. Please retake it.",
        };
    }

    const { width, height } = dimensions;

    if (
        width < MIN_PHOTO_DIMENSION ||
        height < MIN_PHOTO_DIMENSION
    ) {
        return {
            ok: false,
            message: `Photo resolution is too low (minimum ${MIN_PHOTO_DIMENSION}x${MIN_PHOTO_DIMENSION}).`,
        };
    }

    if (
        width > MAX_PHOTO_DIMENSION ||
        height > MAX_PHOTO_DIMENSION
    ) {
        return {
            ok: false,
            message: `Photo resolution is too high (maximum ${MAX_PHOTO_DIMENSION}x${MAX_PHOTO_DIMENSION}).`,
        };
    }

    const aspect = width / height;

    if (aspect < 0.5 || aspect > 2) {
        return {
            ok: false,
            message: "Photo has an unsupported shape. Please retake it.",
        };
    }

    return { ok: true, width, height };
}

module.exports = {
    MAX_PHOTO_BYTES,
    buildProfilePhotoUrl,
    validateProfilePhotoBuffer,
};
