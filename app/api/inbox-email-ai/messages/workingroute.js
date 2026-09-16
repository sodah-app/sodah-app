/**
 * ================================================================
 * 🔵 SODAH USER PLATFORM — INBOX EMAIL AI
 * ================================================================
 *
 * File:
 *   app/api/inbox-email-ai/messages/route.js
 *
 * PURPOSE
 * -------
 * Loads COMPLETE Gmail messages for the authenticated Sodah user.
 *
 * IMPORTANT
 * ---------
 * This route does NOT intentionally reduce an email to plain text.
 *
 * It loads:
 *
 *   - Full Gmail MIME message
 *   - text/plain
 *   - text/html
 *   - inline images
 *   - CID images
 *   - Gmail attachment-backed images
 *   - charts stored as images
 *   - normal attachments
 *   - MIME part information
 *   - Gmail message/thread IDs
 *
 * Inline images are resolved server-side and their CID references
 * are replaced inside the returned HTML so the frontend can render
 * the actual email instead of showing a cut-down plain-text version.
 *
 * Existing authentication and Gmail account resolution remain
 * unchanged.
 * ================================================================
 */

import { NextResponse } from "next/server";

import {
  db,
  authenticate,
  resolveAccount,
  gmail,
  fullMessage,
} from "@/lib/inbox-email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================================================================
   ERROR HELPERS
   ================================================================ */

function errorMessage(error) {
  return String(
    error?.response?.data?.error?.message ||
      error?.response?.data?.error_description ||
      error?.message ||
      ""
  ).trim();
}

function errorStatus(error) {
  return Number(
    error?.response?.status ||
      error?.code ||
      0
  );
}

function isPermissionError(error) {
  const status =
    errorStatus(error);

  const message =
    errorMessage(error)
      .toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    message.includes(
      "insufficient permission"
    ) ||
    message.includes(
      "insufficientpermissions"
    ) ||
    message.includes(
      "permission denied"
    ) ||
    message.includes(
      "unauthorized"
    )
  );
}

/* ================================================================
   BASE64URL HELPERS
   ================================================================ */

/**
 * Gmail returns attachment data as base64url.
 *
 * This converts Gmail's URL-safe base64 representation into
 * standard base64.
 */
function normalizeBase64Url(
  value
) {
  return String(
    value || ""
  )
    .replace(
      /-/g,
      "+"
    )
    .replace(
      /_/g,
      "/"
    )
    .replace(
      /\s+/g,
      ""
    );
}

/**
 * Converts Gmail base64url attachment data into a data URL.
 *
 * Example:
 *
 * data:image/png;base64,AAAA...
 */
function attachmentDataUrl(
  data,
  mimeType
) {
  if (!data) {
    return null;
  }

  const normalized =
    normalizeBase64Url(
      data
    );

  if (!normalized) {
    return null;
  }

  const safeMime =
    String(
      mimeType ||
        "application/octet-stream"
    )
      .trim()
      .toLowerCase();

  return `data:${safeMime};base64,${normalized}`;
}

/* ================================================================
   CID HELPERS
 * ================================================================ */

/**
 * Normalizes:
 *
 * cid:image001
 *
 * <image001>
 *
 * image001
 *
 * into:
 *
 * image001
 */
function normalizeCid(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .replace(
      /^cid:/i,
      ""
    )
    .replace(
      /^<|>$/g,
      ""
    )
    .trim()
    .toLowerCase();
}

/**
 * Escapes a string so it can safely be used inside a RegExp.
 */
function escapeRegExp(
  value
) {
  return String(
    value || ""
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

/* ================================================================
   HTML CID IMAGE REPLACEMENT
 * ================================================================ */

/**
 * Replaces Gmail CID image references inside HTML.
 *
 * Example:
 *
 * BEFORE:
 *
 * <img src="cid:image001">
 *
 * AFTER:
 *
 * <img src="data:image/png;base64,...">
 *
 * We support common variations:
 *
 *   cid:image001
 *   CID:image001
 *   cid%3Aimage001
 *   <image001>
 *
 * The replacement is performed only for CID references that
 * actually have a successfully retrieved Gmail attachment.
 */
function replaceCidImages(
  html,
  cidMap
) {
  let result =
    String(
      html || ""
    );

  if (
    !result ||
    !(cidMap instanceof Map) ||
    cidMap.size === 0
  ) {
    return result;
  }

  for (
    const [
      cid,
      dataUrl,
    ] of cidMap.entries()
  ) {
    if (
      !cid ||
      !dataUrl
    ) {
      continue;
    }

    const escapedCid =
      escapeRegExp(
        cid
      );

    /*
     * Match:
     *
     * cid:image001
     */
    const cidPattern =
      new RegExp(
        `cid:${escapedCid}`,
        "gi"
      );

    result =
      result.replace(
        cidPattern,
        dataUrl
      );

    /*
     * Match URL-encoded:
     *
     * cid%3Aimage001
     */
    const encodedPattern =
      new RegExp(
        `cid%3A${escapedCid}`,
        "gi"
      );

    result =
      result.replace(
        encodedPattern,
        dataUrl
      );

    /*
     * Some malformed emails can contain:
     *
     * src="<image001>"
     *
     * This is harmless to support.
     */
    const bracketPattern =
      new RegExp(
        `<${escapedCid}>`,
        "gi"
      );

    result =
      result.replace(
        bracketPattern,
        dataUrl
      );
  }

  return result;
}

/* ================================================================
   RESOLVE INLINE IMAGE
 * ================================================================ */

/**
 * Fetches the actual bytes of an inline Gmail image.
 *
 * Gmail message.get(format=full) may return:
 *
 *   body.attachmentId
 *
 * instead of:
 *
 *   body.data
 *
 * Therefore we make the required Gmail attachment request here.
 */
async function resolveInlineImage(
  client,
  messageId,
  image
) {
  if (!image) {
    return null;
  }

  const mimeType =
    String(
      image?.mimeType ||
        ""
    )
      .trim()
      .toLowerCase();

  /*
   * --------------------------------------------------------------
   * CASE 1 — IMAGE DATA ALREADY PRESENT
   * --------------------------------------------------------------
   */

  if (
    image?.data &&
    mimeType.startsWith(
      "image/"
    )
  ) {
    const dataUrl =
      attachmentDataUrl(
        image.data,
        mimeType
      );

    if (dataUrl) {
      return {
        ...image,

        resolved:
          true,

        source:
          "inline-data",

        dataUrl,
      };
    }
  }

  /*
   * --------------------------------------------------------------
   * CASE 2 — GMAIL ATTACHMENT ID
   * --------------------------------------------------------------
   */

  const attachmentId =
    String(
      image?.attachmentId ||
        ""
    ).trim();

  if (
    !attachmentId ||
    !messageId
  ) {
    return {
      ...image,

      resolved:
        false,

      dataUrl:
        null,
    };
  }

  try {
    const response =
      await client.users.messages.attachments.get(
        {
          userId:
            "me",

          messageId,

          id:
            attachmentId,
        }
      );

    const data =
      response?.data?.data ||
      null;

    if (!data) {
      console.warn(
        "[Inbox Email AI] Gmail attachment returned no data:",
        {
          message_id:
            messageId,

          attachment_id:
            attachmentId,

          content_id:
            image?.contentId ||
            null,
        }
      );

      return {
        ...image,

        resolved:
          false,

        dataUrl:
          null,
      };
    }

    const dataUrl =
      attachmentDataUrl(
        data,
        mimeType
      );

    if (!dataUrl) {
      return {
        ...image,

        resolved:
          false,

        dataUrl:
          null,
      };
    }

    return {
      ...image,

      resolved:
        true,

      source:
        "gmail-attachment",

      dataUrl,
    };
  } catch (error) {
    /*
     * An individual broken image must NEVER make the entire
     * Gmail message fail.
     */

    console.error(
      "[Inbox Email AI] Inline Gmail image load failed:",
      {
        message_id:
          messageId,

        attachment_id:
          attachmentId,

        content_id:
          image?.contentId ||
          null,

        status:
          errorStatus(
            error
          ),

        error:
          errorMessage(
            error
          ),
      }
    );

    return {
      ...image,

      resolved:
        false,

      dataUrl:
        null,
    };
  }
}

/* ================================================================
   RESOLVE ALL INLINE IMAGES
 * ================================================================ */

async function resolveInlineImages(
  client,
  messageId,
  inlineImages
) {
  if (
    !Array.isArray(
      inlineImages
    ) ||
    inlineImages.length === 0
  ) {
    return {
      images: [],

      cidMap:
        new Map(),
    };
  }

  /*
   * Fetch several inline images concurrently.
   *
   * This is considerably faster than fetching them sequentially.
   */
  const resolved =
    await Promise.all(
      inlineImages.map(
        (image) =>
          resolveInlineImage(
            client,
            messageId,
            image
          )
      )
    );

  const images =
    resolved.filter(
      Boolean
    );

  const cidMap =
    new Map();

  for (
    const image of images
  ) {
    if (
      !image?.dataUrl
    ) {
      continue;
    }

    const cid =
      normalizeCid(
        image?.contentId ||
          image?.contentIdNormalized ||
          ""
      );

    if (!cid) {
      continue;
    }

    cidMap.set(
      cid,
      image.dataUrl
    );
  }

  return {
    images,

    cidMap,
  };
}

/* ================================================================
   NORMALIZE FULL MESSAGE FOR FRONTEND
 * ================================================================ */

async function buildCompleteMessage(
  client,
  gmailMessage
) {
  const message =
    fullMessage(
      gmailMessage
    );

  const messageId =
    message?.gmailMessageId ||
    message?.messageId ||
    message?.id ||
    null;

  /*
   * --------------------------------------------------------------
   * RESOLVE INLINE IMAGES
   * --------------------------------------------------------------
   */

  const {
    images:
      resolvedInlineImages,
    cidMap,
  } =
    await resolveInlineImages(
      client,
      messageId,
      message?.inlineImages || []
    );

  /*
   * --------------------------------------------------------------
   * REPLACE CID REFERENCES IN HTML
   * --------------------------------------------------------------
   */

  const originalHtml =
    String(
      message?.html ||
        ""
    );

  const renderedHtml =
    replaceCidImages(
      originalHtml,
      cidMap
    );

  /*
   * --------------------------------------------------------------
   * RETURN COMPLETE MESSAGE
   * --------------------------------------------------------------
   */

  return {
    ...message,

    /*
     * The frontend should render this HTML when available.
     */
    html:
      renderedHtml,

    /*
     * Keep the original HTML too.
     *
     * This is useful if we later need to debug an individual
     * message without losing the Gmail source representation.
     */
    originalHtml:
      originalHtml,

    /*
     * Resolved images now contain actual data URLs where Gmail
     * supplied the attachment successfully.
     */
    inlineImages:
      resolvedInlineImages,

    inlineImageCount:
      resolvedInlineImages.length,

    hasInlineImages:
      resolvedInlineImages.length > 0,

    /*
     * Indicates that HTML was actually returned.
     */
    hasHtml:
      Boolean(
        renderedHtml
      ),

    /*
     * Useful diagnostic information.
     */
    rendering:
      {
        html:
          Boolean(
            renderedHtml
          ),

        inlineImagesDetected:
          Array.isArray(
            message?.inlineImages
          )
            ? message.inlineImages
                .length
            : 0,

        inlineImagesResolved:
          resolvedInlineImages.length,

        inlineImagesFailed:
          Math.max(
            0,
            (
              Array.isArray(
                message?.inlineImages
              )
                ? message.inlineImages
                    .length
                : 0
            ) -
              resolvedInlineImages.length
          ),

        attachmentsDetected:
          Array.isArray(
            message?.attachments
          )
            ? message.attachments
                .length
            : 0,

        mimePartsDetected:
          Array.isArray(
            message?.mimeParts
          )
            ? message.mimeParts
                .length
            : 0,
      },
  };
}

/* ================================================================
   GET — LOAD INBOX
 * ================================================================ */

export async function GET(
  request
) {
  try {
    /*
     * ============================================================
     * 1. AUTHENTICATE CURRENT SODAH USER
     * ============================================================
     */

    const user =
      await authenticate(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Your session has expired. Please sign in again.",
        },
        {
          status:
            401,
        }
      );
    }

    /*
     * ============================================================
     * 2. RESOLVE BUSINESS + EXISTING GMAIL ACCOUNT
     * ============================================================
     */

    const admin =
      db();

    const {
      business,
      account,
    } =
      await resolveAccount(
        admin,
        user
      );

    if (!business) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Unable to resolve your Sodah business.",
        },
        {
          status:
            404,
        }
      );
    }

    if (!account) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Connect Gmail before using Inbox. The Inbox uses the same Gmail account connected to Email AI.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * 3. READ QUERY PARAMETERS
     * ============================================================
     */

    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const rawLimit =
      Number(
        searchParams.get(
          "limit"
        ) || 40
      );

    const limit =
      Math.min(
        Math.max(
          Number.isFinite(
            rawLimit
          )
            ? Math.floor(
                rawLimit
              )
            : 40,
          1
        ),
        100
      );

    const q =
      String(
        searchParams.get(
          "q"
        ) || ""
      ).trim();

    /*
     * ============================================================
     * 4. CREATE GMAIL CLIENT
     * ============================================================
     */

    const client =
      gmail(
        account
      );

    /*
     * ============================================================
     * 5. LIST GMAIL MESSAGE REFERENCES
     * ============================================================
     */

    const listResponse =
      await client.users.messages.list(
        {
          userId:
            "me",

          maxResults:
            limit,

          ...(q
            ? {
                q,
              }
            : {}),
        }
      );

    const messageRefs =
      Array.isArray(
        listResponse
          ?.data
          ?.messages
      )
        ? listResponse.data.messages
        : [];

    /*
     * ============================================================
     * 6. EMPTY INBOX
     * ============================================================
     */

    if (
      messageRefs.length ===
      0
    ) {
      return NextResponse.json({
        success:
          true,

        business_id:
          business?.business_id ||
          business?.id ||
          null,

        gmail:
          account?.gmail_email ||
          account?.email ||
          null,

        messages:
          [],

        total:
          0,
      });
    }

    /*
     * ============================================================
     * 7. LOAD COMPLETE GMAIL MESSAGES
     * ============================================================
     *
     * IMPORTANT:
     *
     * We deliberately use:
     *
     *   format: "full"
     *
     * and then pass the complete Gmail object through
     * buildCompleteMessage().
     *
     * We no longer reduce the response to messageSummary().
     */

    const results =
      await Promise.all(
        messageRefs.map(
          async (
            ref
          ) => {
            try {
              if (
                !ref?.id
              ) {
                return null;
              }

              /*
               * Fetch the COMPLETE MIME message.
               */
              const response =
                await client.users.messages.get(
                  {
                    userId:
                      "me",

                    id:
                      ref.id,

                    format:
                      "full",
                  }
                );

              const gmailMessage =
                response?.data;

              if (
                !gmailMessage
              ) {
                return null;
              }

              /*
               * Build the complete renderable message.
               *
               * This also resolves inline Gmail images.
               */
              return await buildCompleteMessage(
                client,
                gmailMessage
              );
            } catch (
              messageError
            ) {
              /*
               * One bad/deleted Gmail message must NOT break
               * the entire Inbox.
               */

              console.error(
                "[Inbox Email AI] Individual Gmail message load failed:",
                {
                  message_id:
                    ref?.id ||
                    null,

                  status:
                    errorStatus(
                      messageError
                    ),

                  error:
                    errorMessage(
                      messageError
                    ),
                }
              );

              return null;
            }
          }
        )
      );

    /*
     * ============================================================
     * 8. REMOVE FAILED MESSAGES
     * ============================================================
     */

    const messages =
      results.filter(
        Boolean
      );

    /*
     * ============================================================
     * 9. NEWEST FIRST
     * ============================================================
     */

    messages.sort(
      (
        a,
        b
      ) =>
        Number(
          b?.internalDate ||
            0
        ) -
        Number(
          a?.internalDate ||
            0
        )
    );

    /*
     * ============================================================
     * 10. RETURN COMPLETE INBOX
     * ============================================================
     */

    return NextResponse.json(
      {
        success:
          true,

        business_id:
          business?.business_id ||
          business?.id ||
          null,

        gmail:
          account?.gmail_email ||
          account?.email ||
          null,

        messages,

        total:
          messages.length,
      },
      {
        /*
         * Do not cache Gmail content.
         */
        headers:
          {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
      }
    );
  } catch (
    error
  ) {
    const status =
      errorStatus(
        error
      );

    const message =
      errorMessage(
        error
      );

    console.error(
      "[Inbox Email AI] Messages load failed:",
      {
        status,

        message,

        error,
      }
    );

    /*
     * ============================================================
     * GMAIL PERMISSION ERROR
     * ============================================================
     */

    if (
      isPermissionError(
        error
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "GMAIL_READ_PERMISSION_REQUIRED",

          message:
            "Your connected Gmail account needs Inbox read permission. Please reconnect the same Gmail account through the Inbox Gmail connection so Sodah can read received emails.",
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * ============================================================
     * GMAIL CONNECTION ERROR
     * ============================================================
     */

    if (
      message
        .toLowerCase()
        .includes(
          "connect gmail"
        )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Connect Gmail before using Inbox. The Inbox uses the same Gmail account connected to Email AI.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * GMAIL NOT FOUND / MESSAGE NOT FOUND
     * ============================================================
     *
     * Do not expose a confusing generic 404 when Gmail itself
     * returned a different useful message.
     */

    if (
      status ===
        404 &&
      message
        .toLowerCase()
        .includes(
          "not found"
        )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "GMAIL_RESOURCE_NOT_FOUND",

          message:
            "Gmail could not find one of the requested email resources. Please refresh the Inbox and try again.",
        },
        {
          status:
            404,
        }
      );
    }

    /*
     * ============================================================
     * GENERAL ERROR
     * ============================================================
     */

    return NextResponse.json(
      {
        success:
          false,

        message:
          message ||
          "Unable to load Gmail Inbox.",
      },
      {
        status:
          status >= 400 &&
          status < 600
            ? status
            : 500,
      }
    );
  }
}