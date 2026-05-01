/**
 * linkedin — Echo sitt publiseringsverktøy.
 *
 * Poster innhold til LinkedIn via den offisielle Share API v2.
 * Krever: LINKEDIN_ACCESS_TOKEN + LINKEDIN_PERSON_URN
 *
 * Slik henter du token:
 * 1. Lag en LinkedIn App på developer.linkedin.com
 * 2. Aktiver scopes: w_member_social, r_liteprofile
 * 3. OAuth-flow → access token (gyldig 60 dager)
 * 4. r_liteprofile call → hent din "person URN" (urn:li:person:XXXXX)
 */

export interface PostLinkedInInput {
  text: string;
  visibility?: "PUBLIC" | "CONNECTIONS";
}

export interface PostLinkedInResult {
  ok: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export async function postToLinkedIn(
  input: PostLinkedInInput
): Promise<PostLinkedInResult> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!accessToken || !personUrn) {
    console.warn("[linkedin] LINKEDIN_ACCESS_TOKEN eller LINKEDIN_PERSON_URN ikke satt");
    return {
      ok: false,
      error: "LinkedIn ikke konfigurert — legg til LINKEDIN_ACCESS_TOKEN og LINKEDIN_PERSON_URN",
    };
  }

  try {
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: personUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: input.text,
            },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": input.visibility ?? "PUBLIC",
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[linkedin] API feil:", err);
      return { ok: false, error: err };
    }

    const postId = res.headers.get("x-restli-id") ?? "unknown";
    const postUrl = `https://www.linkedin.com/feed/update/${postId}`;

    return { ok: true, postId, postUrl };
  } catch (err) {
    console.error("[linkedin] Feil:", err);
    return { ok: false, error: String(err) };
  }
}

/** Check if LinkedIn is configured */
export function isLinkedInConfigured(): boolean {
  return !!(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_PERSON_URN);
}
