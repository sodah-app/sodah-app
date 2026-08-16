import { createClient } from "@supabase/supabase-js";

type CompleteInstagramConnectionParams = {
  code: string;
  redirectUri: string;
  userId: string;
  businessId?: string | null;
};

type InstagramConnectionResult = {
  success: boolean;
  instagramUserId?: string;
  username?: string;
  name?: string;
  error?: string;
};

export async function completeInstagramConnection({
  code,
  redirectUri,
  userId,
  businessId,
}: CompleteInstagramConnectionParams): Promise<InstagramConnectionResult> {
  try {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!clientId) {
      throw new Error("INSTAGRAM_CLIENT_ID is missing.");
    }

    if (!clientSecret) {
      throw new Error("INSTAGRAM_CLIENT_SECRET is missing.");
    }

    if (!supabaseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");
    }

    if (!supabaseServiceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
    }

    /*
     * ---------------------------------------------------------
     * STEP 1
     * Exchange Instagram authorization code for access token
     * ---------------------------------------------------------
     */

    const tokenResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
        cache: "no-store",
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Instagram token exchange failed:", tokenData);

      throw new Error(
        tokenData?.error_message ||
          tokenData?.error_type ||
          "Instagram token exchange failed."
      );
    }

    const accessToken = tokenData.access_token;
    const instagramUserId = tokenData.user_id;

    /*
     * ---------------------------------------------------------
     * STEP 2
     * Get Instagram account information
     * ---------------------------------------------------------
     */

    const profileResponse = await fetch(
      `https://graph.instagram.com/${instagramUserId}?fields=id,username,name&access_token=${encodeURIComponent(
        accessToken
      )}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error("Instagram profile request failed:", profileData);

      throw new Error(
        profileData?.error?.message ||
          "Unable to retrieve Instagram account information."
      );
    }

    const username = profileData.username || "";
    const name = profileData.name || "";

    /*
     * ---------------------------------------------------------
     * STEP 3
     * Save connection in Supabase
     * ---------------------------------------------------------
     */

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /*
     * IMPORTANT:
     *
     * Replace "instagram_connections" below with the actual
     * Supabase table you created for Instagram connections
     * if your table has a different name.
     */

    const connectionPayload = {
      user_id: userId,
      business_id: businessId || null,
      instagram_user_id: String(instagramUserId),
      instagram_username: username,
      instagram_name: name,
      access_token: accessToken,
      status: "connected",
      connected_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("instagram_connections")
      .upsert(connectionPayload, {
        onConflict: "instagram_user_id",
      });

    if (saveError) {
      console.error("Failed to save Instagram connection:", saveError);

      throw new Error(
        saveError.message || "Failed to save Instagram connection."
      );
    }

    /*
     * ---------------------------------------------------------
     * STEP 4
     * Everything succeeded
     * ---------------------------------------------------------
     */

    return {
      success: true,
      instagramUserId: String(instagramUserId),
      username,
      name,
    };
  } catch (error) {
    console.error("Instagram connection error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Instagram connection failed.",
    };
  }
}