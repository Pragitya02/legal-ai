// =====================================================
// GOOGLE AUTH SERVICE
// =====================================================
// Takes the OAuth access token the frontend got from Google
// (via @react-oauth/google's implicit flow) and asks Google
// directly for the profile it belongs to. This never trusts
// data supplied by the frontend — only what Google's own
// endpoint returns for that token.
// =====================================================

async function fetchGoogleProfile(accessToken) {

    if (!accessToken) {
        const err = new Error("Missing Google access token.");
        err.code = "GOOGLE_TOKEN_MISSING";
        throw err;
    }

    const res = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    if (!res.ok) {

        const err = new Error("Could not verify Google account. Please try again.");
        err.code = "GOOGLE_TOKEN_INVALID";
        throw err;

    }

    const profile = await res.json();

    if (!profile.email || profile.email_verified !== true) {

        const err = new Error("Your Google account's email is not verified.");
        err.code = "GOOGLE_EMAIL_UNVERIFIED";
        throw err;

    }

    return {
        googleId: profile.sub,
        email: String(profile.email).toLowerCase(),
        name: profile.name || profile.email.split("@")[0],
        picture: profile.picture || null
    };

}


module.exports = {
    fetchGoogleProfile
};
