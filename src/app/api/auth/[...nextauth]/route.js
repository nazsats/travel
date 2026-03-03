import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope: [
                        "openid",
                        "email",
                        "profile",
                        "https://www.googleapis.com/auth/photoslibrary",
                        "https://www.googleapis.com/auth/photoslibrary.readonly",
                        "https://www.googleapis.com/auth/photoslibrary.appendonly",
                    ].join(" "),
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // On initial sign-in, store tokens from the OAuth account
            if (account) {
                console.log("=== NEW SIGN IN ===");
                console.log("Scopes granted:", account.scope);
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                // Store expiry — default to 1 hour from now if not provided
                token.expiresAt = account.expires_at
                    ? account.expires_at * 1000
                    : Date.now() + 3600 * 1000;
                return token;
            }

            // Return token as-is if it hasn't expired yet
            if (token.expiresAt && Date.now() < token.expiresAt) {
                return token;
            }

            // Token expired — try to refresh
            if (token.refreshToken) {
                console.log("=== REFRESHING TOKEN ===");
                try {
                    const res = await fetch("https://oauth2.googleapis.com/token", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            client_id: process.env.GOOGLE_CLIENT_ID,
                            client_secret: process.env.GOOGLE_CLIENT_SECRET,
                            grant_type: "refresh_token",
                            refresh_token: token.refreshToken,
                        }),
                    });
                    const data = await res.json();
                    console.log("Refresh response status:", res.status);
                    console.log("Refresh scopes:", data.scope);
                    if (data.access_token) {
                        token.accessToken = data.access_token;
                        token.expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
                    }
                } catch (err) {
                    console.error("Error refreshing access token:", err);
                }
            }
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
