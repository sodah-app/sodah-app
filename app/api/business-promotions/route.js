import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============================================================
   CONFIG
============================================================ */

const PROMOTION_TABLE = "business_promotions";
const IMAGE_TABLE = "business_promotion_images";
const BUCKET = "business-promotion-images";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES_PER_UPLOAD = 5;
const MAX_IMAGES_PER_PROMOTION = 10;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/* ============================================================
   SUBSCRIPTION PROMOTION IMAGE LIMITS

   Total promotion images allowed per BUSINESS.
============================================================ */

const PROMOTION_IMAGE_LIMITS = {
  free_trial: 2,
  starter: 2,
  business: 5,
  pro: 10,
};

/* ============================================================
   PLAN HELPERS
============================================================ */

function normalisePlan(plan) {
  return String(plan || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatPlanName(plan) {
  const value = normalisePlan(plan);

  if (
    value === "free_trial" ||
    value === "trial" ||
    value === "free"
  ) {
    return "Free Trial";
  }

  if (value === "starter") {
    return "Starter";
  }

  if (value === "business") {
    return "Business";
  }

  if (value === "pro") {
    return "Pro";
  }

  if (!value) {
    return "Free Trial";
  }

  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function getPromotionImageLimit(subscriptionPlan) {
  const plan = normalisePlan(subscriptionPlan);

  return (
    PROMOTION_IMAGE_LIMITS[plan] ??
    PROMOTION_IMAGE_LIMITS.free_trial
  );
}

/* ============================================================
   SUBSCRIPTION ACCESS
============================================================ */

function getSubscriptionAccess(business) {
  const plan = normalisePlan(
    business?.subscription_plan
  );

  const status = String(
    business?.subscription_status || "active"
  )
    .trim()
    .toLowerCase();

  const expiryRaw =
    business?.subscription_expiry || null;

  const expiry = expiryRaw
    ? new Date(expiryRaw)
    : null;

  const hasValidExpiry =
    expiry &&
    !Number.isNaN(expiry.getTime());

  const blockedStatuses = new Set([
    "expired",
    "cancelled",
    "canceled",
    "inactive",
    "suspended",
    "past_due",
  ]);

  const statusBlocked =
    blockedStatuses.has(status);

  const expiryBlocked =
    hasValidExpiry &&
    expiry.getTime() <= Date.now();

  const isFreeTrial =
    plan === "free_trial" ||
    plan === "trial" ||
    plan === "free";

  return {
    plan: plan || "free_trial",
    status,
    expiry: expiryRaw,
    isFreeTrial,

    active:
      !statusBlocked &&
      !expiryBlocked,

    expired:
      statusBlocked ||
      expiryBlocked,
  };
}

function assertSubscriptionCanUpload(business) {
  const access =
    getSubscriptionAccess(business);

  if (access.expired) {
    if (access.isFreeTrial) {
      throw new Error(
        "Your 7-day Free Trial has expired. Please upgrade your plan to continue using promotion images."
      );
    }

    throw new Error(
      "Your subscription has expired or is inactive. Please renew your plan to continue using promotion images."
    );
  }

  return access;
}

/* ============================================================
   SUPABASE SERVER CLIENT
============================================================ */

async function getClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL,

    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY,

    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          } catch {
            /*
             * Some Next.js server contexts do not
             * allow cookie writes.
             */
          }
        },
      },
    }
  );
}

/* ============================================================
   ADMIN CLIENT
============================================================ */

function getAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Supabase URL is not configured."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured."
    );
  }

  return createSupabaseAdmin(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/* ============================================================
   AUTHENTICATION + BUSINESS OWNERSHIP
============================================================ */

async function requireOwner(
  request,
  businessId
) {
  if (!businessId) {
    throw new Error(
      "businessId is required."
    );
  }

  const supabase =
    await getClient();

  let user = null;

  /* ----------------------------------------------------------
     BEARER TOKEN
  ---------------------------------------------------------- */

  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  if (
    authorization.startsWith(
      "Bearer "
    )
  ) {
    const accessToken =
      authorization
        .slice(7)
        .trim();

    if (accessToken) {
      const {
        data: {
          user: bearerUser,
        },
        error: bearerError,
      } =
        await supabase.auth.getUser(
          accessToken
        );

      if (
        !bearerError &&
        bearerUser
      ) {
        user = bearerUser;
      }
    }
  }

  /* ----------------------------------------------------------
     COOKIE SESSION FALLBACK
  ---------------------------------------------------------- */

  if (!user) {
    const {
      data: {
        user: cookieUser,
      },
      error: cookieError,
    } =
      await supabase.auth.getUser();

    if (
      !cookieError &&
      cookieUser
    ) {
      user = cookieUser;
    }
  }

  if (!user) {
    throw new Error(
      "Your login session has expired. Please log in again."
    );
  }

  /* ----------------------------------------------------------
     VERIFY BUSINESS OWNERSHIP
  ---------------------------------------------------------- */

  const admin =
    getAdminClient();

  const {
    data: business,
    error,
  } =
    await admin
      .from("businesses")
      .select(
        [
          "business_id",
          "user_id",
          "subscription_plan",
          "subscription_status",
          "subscription_expiry",
        ].join(",")
      )
      .eq(
        "business_id",
        businessId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!business) {
    throw new Error(
      "You do not have access to this business."
    );
  }

  /*
   * Attach verified business information to the
   * server-side admin client.
   *
   * This never goes to the browser.
   */
  admin.__sodahBusiness =
    business;

  return admin;
}

/* ============================================================
   DATE NORMALISATION
============================================================ */

function normalizePromotionTimestamp(
  value,
  fieldName,
  endOfDay = false
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const raw =
    String(value).trim();

  /*
   * Date-only value:
   * YYYY-MM-DD
   */
  const dateOnly =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (dateOnly) {
    const year =
      Number(dateOnly[1]);

    const month =
      Number(dateOnly[2]);

    const day =
      Number(dateOnly[3]);

    const date = endOfDay
      ? new Date(
          year,
          month - 1,
          day,
          23,
          59,
          59,
          999
        )
      : new Date(
          year,
          month - 1,
          day,
          0,
          0,
          0,
          0
        );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      throw new Error(
        `${fieldName} must be a valid date.`
      );
    }

    return date.toISOString();
  }

  const date =
    new Date(raw);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid date/time.`
    );
  }

  return date.toISOString();
}

/* ============================================================
   PROMOTION VALIDITY
============================================================ */

function isCurrentlyValid(
  row
) {
  const now =
    Date.now();

  if (
    row.active === false
  ) {
    return false;
  }

  if (
    row.valid_from &&
    new Date(
      row.valid_from
    ).getTime() > now
  ) {
    return false;
  }

  if (
    row.valid_until &&
    new Date(
      row.valid_until
    ).getTime() < now
  ) {
    return false;
  }

  return true;
}

/* ============================================================
   SUBSCRIPTION RESPONSE
============================================================ */

function buildSubscriptionResponse(
  business,
  imageUsage
) {
  const access =
    getSubscriptionAccess(
      business
    );

  const limit =
    getPromotionImageLimit(
      business?.subscription_plan
    );

  const used =
    Number(imageUsage || 0);

  return {
    plan: access.plan,
    planName: formatPlanName(
      access.plan
    ),
    status: access.status,
    expiry: access.expiry,
    active: access.active,

    promotionImages: {
      limit,
      used,
      remaining: Math.max(
        0,
        limit - used
      ),
    },
  };
}

/* ============================================================
   GET BUSINESS IMAGE USAGE
============================================================ */

async function getBusinessImageUsage(
  supabase,
  businessId
) {
  const {
    count,
    error,
  } =
    await supabase
      .from(IMAGE_TABLE)
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "business_id",
        businessId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return count || 0;
}

/* ============================================================
   ATTACH PROMOTION IMAGES
============================================================ */

async function withImages(
  supabase,
  promotions,
  businessId
) {
  const {
    data: images,
    error,
  } =
    await supabase
      .from(IMAGE_TABLE)
      .select(
        [
          "id",
          "promotion_id",
          "business_id",
          "image_url",
          "storage_path",
          "alt_text",
          "sort_order",
          "created_at",
        ].join(",")
      )
      .eq(
        "business_id",
        businessId
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const map =
    new Map();

  for (
    const image of
      images || []
  ) {
    let imageUrl =
      image.image_url ||
      null;

    if (
      image.storage_path
    ) {
      const {
        data: signedData,
      } =
        await supabase.storage
          .from(BUCKET)
          .createSignedUrl(
            image.storage_path,
            3600
          );

      imageUrl =
        signedData?.signedUrl ||
        imageUrl;
    }

    const list =
      map.get(
        image.promotion_id
      ) || [];

    list.push({
      ...image,
      image_url:
        imageUrl,
    });

    map.set(
      image.promotion_id,
      list
    );
  }

  return (
    promotions || []
  ).map(
    (promotion) => ({
      ...promotion,

      images:
        map.get(
          promotion.id
        ) || [],

      currently_valid:
        isCurrentlyValid(
          promotion
        ),
    })
  );
}

/* ============================================================
   LIST PROMOTIONS
============================================================ */

async function listPromotions(
  supabase,
  businessId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        PROMOTION_TABLE
      )
      .select(
        [
          "id",
          "business_id",
          "title",
          "description",
          "price",
          "currency",
          "promotion_type",
          "valid_from",
          "valid_until",
          "active",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq(
        "business_id",
        businessId
      )
      .order(
        "updated_at",
        {
          ascending: false,
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return withImages(
    supabase,
    data,
    businessId
  );
}

/* ============================================================
   GET
============================================================ */

export async function GET(
  request
) {
  try {
    const businessId =
      new URL(
        request.url
      ).searchParams.get(
        "businessId"
      );

    const supabase =
      await requireOwner(
        request,
        businessId
      );

    const promotions =
      await listPromotions(
        supabase,
        businessId
      );

    const imageUsage =
      await getBusinessImageUsage(
        supabase,
        businessId
      );

    const business =
      supabase.__sodahBusiness;

    return NextResponse.json({
      success: true,

      promotions,

      subscription:
        buildSubscriptionResponse(
          business,
          imageUsage
        ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to load promotions.",
      },
      {
        status: 400,
      }
    );
  }
}

/* ============================================================
   POST
   CREATE / UPDATE PROMOTION
   AND/OR UPLOAD PROMOTION IMAGES
============================================================ */

export async function POST(
  request
) {
  try {
    const form =
      await request.formData();

    const businessId =
      String(
        form.get(
          "businessId"
        ) || ""
      ).trim();

    const promotionId =
      String(
        form.get(
          "promotionId"
        ) || ""
      ).trim();

    const title =
      String(
        form.get(
          "title"
        ) || ""
      ).trim();

    const description =
      String(
        form.get(
          "description"
        ) || ""
      ).trim() || null;

    const priceRaw =
      String(
        form.get(
          "price"
        ) || ""
      ).trim();

    const currency =
      String(
        form.get(
          "currency"
        ) || "AED"
      ).trim() || "AED";

    const promotionType =
      String(
        form.get(
          "promotion_type"
        ) || "promotion"
      ).trim() ||
      "promotion";

    const validFromRaw =
      String(
        form.get(
          "valid_from"
        ) || ""
      ).trim();

    const validUntilRaw =
      String(
        form.get(
          "valid_until"
        ) || ""
      ).trim();

    const active =
      String(
        form.get(
          "active"
        ) || "true"
      ).toLowerCase() !==
      "false";

    /* ----------------------------------------------------------
       VALIDATE TITLE
    ---------------------------------------------------------- */

    if (!title) {
      throw new Error(
        "Promotion title is required."
      );
    }

    /* ----------------------------------------------------------
       VALIDATE PRICE
    ---------------------------------------------------------- */

    if (
      priceRaw &&
      (
        Number.isNaN(
          Number(priceRaw)
        ) ||
        Number(priceRaw) < 0
      )
    ) {
      throw new Error(
        "Price must be a valid non-negative number."
      );
    }

    /* ----------------------------------------------------------
       NORMALISE DATES
    ---------------------------------------------------------- */

    const validFrom =
      normalizePromotionTimestamp(
        validFromRaw,
        "Start date",
        false
      );

    const validUntil =
      normalizePromotionTimestamp(
        validUntilRaw,
        "Expiry date",
        true
      );

    if (
      validFrom &&
      validUntil &&
      new Date(
        validUntil
      ).getTime() <
        new Date(
          validFrom
        ).getTime()
    ) {
      throw new Error(
        "Expiry date must be after the start date."
      );
    }

    /* ----------------------------------------------------------
       AUTHENTICATION + OWNERSHIP
    ---------------------------------------------------------- */

    const supabase =
      await requireOwner(
        request,
        businessId
      );

    const business =
      supabase.__sodahBusiness;

    /*
     * POST is also used for image uploads.
     * Require an active subscription before changing
     * promotion content through this route.
     */
    const subscriptionAccess =
      assertSubscriptionCanUpload(
        business
      );

    /* ----------------------------------------------------------
       PROMOTION PAYLOAD
    ---------------------------------------------------------- */

    const payload = {
      business_id:
        businessId,

      title,

      description,

      price:
        priceRaw
          ? Number(priceRaw)
          : null,

      currency,

      promotion_type:
        promotionType,

      valid_from:
        validFrom,

      valid_until:
        validUntil,

      active,
    };

    let promotion;

    /* ----------------------------------------------------------
       UPDATE EXISTING PROMOTION
    ---------------------------------------------------------- */

    if (promotionId) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            PROMOTION_TABLE
          )
          .update(
            payload
          )
          .eq(
            "id",
            promotionId
          )
          .eq(
            "business_id",
            businessId
          )
          .select("*")
          .maybeSingle();

      if (error) {
        throw new Error(
          error.message
        );
      }

      if (!data) {
        throw new Error(
          "Promotion not found."
        );
      }

      promotion = data;
    }

    /* ----------------------------------------------------------
       CREATE NEW PROMOTION
    ---------------------------------------------------------- */

    else {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            PROMOTION_TABLE
          )
          .insert(
            payload
          )
          .select("*")
          .single();

      if (error) {
        throw new Error(
          error.message
        );
      }

      promotion = data;
    }

    /* ----------------------------------------------------------
       IMAGE FILES
    ---------------------------------------------------------- */

    const files =
      form
        .getAll("images")
        .filter(
          (item) =>
            item instanceof File
        );

    if (
      files.length >
      MAX_IMAGES_PER_UPLOAD
    ) {
      throw new Error(
        `You can upload up to ${MAX_IMAGES_PER_UPLOAD} promotion images at a time.`
      );
    }

    /* ----------------------------------------------------------
       UPLOAD IMAGES
    ---------------------------------------------------------- */

    if (files.length > 0) {
      /*
       * First check how many images this promotion already has.
       */
      const {
        count: promotionImageCount,
        error:
          promotionCountError,
      } =
        await supabase
          .from(
            IMAGE_TABLE
          )
          .select(
            "id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "business_id",
            businessId
          )
          .eq(
            "promotion_id",
            promotion.id
          );

      if (
        promotionCountError
      ) {
        throw new Error(
          promotionCountError.message
        );
      }

      const existingPromotionImages =
        promotionImageCount || 0;

      if (
        existingPromotionImages +
          files.length >
        MAX_IMAGES_PER_PROMOTION
      ) {
        throw new Error(
          `A promotion can have up to ${MAX_IMAGES_PER_PROMOTION} images.`
        );
      }

      /*
       * Now enforce the BUSINESS-WIDE subscription limit.
       */
      const businessImageCount =
        await getBusinessImageUsage(
          supabase,
          businessId
        );

      const promotionImageLimit =
        getPromotionImageLimit(
          business.subscription_plan
        );

      const remaining =
        Math.max(
          0,
          promotionImageLimit -
            businessImageCount
        );

      if (
        businessImageCount +
          files.length >
        promotionImageLimit
      ) {
        if (
          remaining <= 0
        ) {
          throw new Error(
            `You have reached your ${promotionImageLimit}-image promotion limit for your ${formatPlanName(
              business.subscription_plan
            )} plan. Please upgrade your plan to add more promotion images.`
          );
        }

        throw new Error(
          `You can add only ${remaining} more promotion image${
            remaining === 1
              ? ""
              : "s"
          } on your current plan.`
        );
      }

      /*
       * Validate every file BEFORE uploading.
       */
      for (
        const file of files
      ) {
        if (
          !ALLOWED_TYPES.has(
            file.type
          )
        ) {
          throw new Error(
            `${file.name} is not a supported image type. Use JPG, PNG, WEBP or GIF.`
          );
        }

        if (
          file.size >
          MAX_IMAGE_SIZE
        ) {
          throw new Error(
            `${file.name} is larger than 10 MB.`
          );
        }
      }

      const uploadedPaths = [];

      try {
        /* ------------------------------------------------------
           UPLOAD TO SUPABASE STORAGE
        ------------------------------------------------------ */

        for (
          const file of files
        ) {
          const safeName =
            file.name.replace(
              /[^a-zA-Z0-9._-]/g,
              "-"
            );

          const path =
            `${businessId}/promotions/${promotion.id}/${Date.now()}-${Math.random()
              .toString(36)
              .slice(
                2,
                10
              )}-${safeName}`;

          const buffer =
            Buffer.from(
              await file.arrayBuffer()
            );

          const {
            error:
              uploadError,
          } =
            await supabase.storage
              .from(BUCKET)
              .upload(
                path,
                buffer,
                {
                  contentType:
                    file.type,

                  upsert:
                    false,
                }
              );

          if (
            uploadError
          ) {
            throw new Error(
              uploadError.message
            );
          }

          uploadedPaths.push(
            path
          );
        }

        /* ------------------------------------------------------
           INSERT IMAGE RECORDS
        ------------------------------------------------------ */

        const rows =
          uploadedPaths.map(
            (
              storagePath,
              index
            ) => ({
              business_id:
                businessId,

              promotion_id:
                promotion.id,

              storage_path:
                storagePath,

              image_url:
                null,

              sort_order:
                existingPromotionImages +
                index,
            })
          );

        const {
          error:
            imageInsertError,
        } =
          await supabase
            .from(
              IMAGE_TABLE
            )
            .insert(
              rows
            );

        if (
          imageInsertError
        ) {
          throw new Error(
            imageInsertError.message
          );
        }
      } catch (error) {
        /*
         * If database insertion fails after Storage upload,
         * clean the uploaded files.
         */
        if (
          uploadedPaths.length
        ) {
          await supabase.storage
            .from(BUCKET)
            .remove(
              uploadedPaths
            );
        }

        throw error;
      }
    }

    /* ----------------------------------------------------------
       FINAL IMAGE USAGE
    ---------------------------------------------------------- */

    const finalImageUsage =
      await getBusinessImageUsage(
        supabase,
        businessId
      );

    const finalPromotionImageLimit =
      getPromotionImageLimit(
        business.subscription_plan
      );

    return NextResponse.json({
      success: true,

      promotion,

      promotions:
        await listPromotions(
          supabase,
          businessId
        ),

      subscription: {
        plan:
          subscriptionAccess.plan,

        planName:
          formatPlanName(
            subscriptionAccess.plan
          ),

        status:
          subscriptionAccess.status,

        expiry:
          subscriptionAccess.expiry,

        active:
          subscriptionAccess.active,

        promotionImages: {
          limit:
            finalPromotionImageLimit,

          used:
            finalImageUsage,

          remaining:
            Math.max(
              0,
              finalPromotionImageLimit -
                finalImageUsage
            ),
        },
      },
    });
  } catch (error) {
    const message =
      String(
        error?.message || ""
      );

    const isSubscriptionError =
      /subscription|trial|expired|inactive|renew|upgrade/i.test(
        message
      );

    return NextResponse.json(
      {
        success: false,

        error:
          message ||
          "Unable to save promotion.",
      },
      {
        status:
          isSubscriptionError
            ? 403
            : 400,
      }
    );
  }
}

/* ============================================================
   PATCH
   UPDATE PROMOTION DETAILS
============================================================ */

export async function PATCH(
  request
) {
  try {
    const body =
      await request.json();

    const businessId =
      String(
        body.businessId || ""
      ).trim();

    const promotionId =
      String(
        body.promotionId || ""
      ).trim();

    if (!promotionId) {
      throw new Error(
        "promotionId is required."
      );
    }

    const supabase =
      await requireOwner(
        request,
        businessId
      );

    const patch = {};

    const allowedFields = [
      "title",
      "description",
      "price",
      "currency",
      "promotion_type",
      "valid_from",
      "valid_until",
      "active",
    ];

    for (
      const key of allowedFields
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          key
        )
      ) {
        patch[key] =
          body[key];
      }
    }

    /* ----------------------------------------------------------
       NORMALISE DATES
    ---------------------------------------------------------- */

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "valid_from"
      )
    ) {
      patch.valid_from =
        normalizePromotionTimestamp(
          body.valid_from,
          "Start date",
          false
        );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "valid_until"
      )
    ) {
      patch.valid_until =
        normalizePromotionTimestamp(
          body.valid_until,
          "Expiry date",
          true
        );
    }

    /* ----------------------------------------------------------
       VALIDATE TITLE
    ---------------------------------------------------------- */

    if (
      patch.title !==
        undefined &&
      !String(
        patch.title
      ).trim()
    ) {
      throw new Error(
        "Promotion title cannot be empty."
      );
    }

    /* ----------------------------------------------------------
       VALIDATE PRICE
    ---------------------------------------------------------- */

    if (
      patch.price !==
        undefined &&
      patch.price !==
        null &&
      (
        Number.isNaN(
          Number(
            patch.price
          )
        ) ||
        Number(
          patch.price
        ) < 0
      )
    ) {
      throw new Error(
        "Price must be a valid non-negative number."
      );
    }

    /* ----------------------------------------------------------
       VALIDATE DATES
    ---------------------------------------------------------- */

    if (
      patch.valid_from &&
      patch.valid_until &&
      new Date(
        patch.valid_until
      ).getTime() <
        new Date(
          patch.valid_from
        ).getTime()
    ) {
      throw new Error(
        "Expiry date must be after the start date."
      );
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          PROMOTION_TABLE
        )
        .update(
          patch
        )
        .eq(
          "id",
          promotionId
        )
        .eq(
          "business_id",
          businessId
        )
        .select("*")
        .maybeSingle();

    if (error) {
      throw new Error(
        error.message
      );
    }

    if (!data) {
      throw new Error(
        "Promotion not found."
      );
    }

    const business =
      supabase.__sodahBusiness;

    const imageUsage =
      await getBusinessImageUsage(
        supabase,
        businessId
      );

    return NextResponse.json({
      success: true,

      promotion: data,

      promotions:
        await listPromotions(
          supabase,
          businessId
        ),

      subscription:
        buildSubscriptionResponse(
          business,
          imageUsage
        ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to update promotion.",
      },
      {
        status: 400,
      }
    );
  }
}

/* ============================================================
   DELETE
   DELETE ONE IMAGE OR ENTIRE PROMOTION
============================================================ */

export async function DELETE(
  request
) {
  try {
    const body =
      await request
        .json()
        .catch(
          () => ({})
        );

    const url =
      new URL(
        request.url
      );

    const businessId =
      String(
        body.businessId ||
          url.searchParams.get(
            "businessId"
          ) ||
          ""
      ).trim();

    const promotionId =
      String(
        body.promotionId ||
          url.searchParams.get(
            "promotionId"
          ) ||
          ""
      ).trim();

    const imageId =
      String(
        body.imageId ||
          url.searchParams.get(
            "imageId"
          ) ||
          ""
      ).trim();

    if (!promotionId) {
      throw new Error(
        "promotionId is required."
      );
    }

    const supabase =
      await requireOwner(
        request,
        businessId
      );

    /* ----------------------------------------------------------
       DELETE ONE IMAGE
    ---------------------------------------------------------- */

    if (imageId) {
      const {
        data: image,
        error:
          imageLookupError,
      } =
        await supabase
          .from(
            IMAGE_TABLE
          )
          .select(
            "id,storage_path"
          )
          .eq(
            "id",
            imageId
          )
          .eq(
            "promotion_id",
            promotionId
          )
          .eq(
            "business_id",
            businessId
          )
          .maybeSingle();

      if (
        imageLookupError
      ) {
        throw new Error(
          imageLookupError.message
        );
      }

      if (!image) {
        throw new Error(
          "Promotion image not found."
        );
      }

      if (
        image.storage_path
      ) {
        const {
          error:
            storageDeleteError,
        } =
          await supabase.storage
            .from(BUCKET)
            .remove([
              image.storage_path,
            ]);

        if (
          storageDeleteError
        ) {
          throw new Error(
            storageDeleteError.message
          );
        }
      }

      const {
        error:
          imageDeleteError,
      } =
        await supabase
          .from(
            IMAGE_TABLE
          )
          .delete()
          .eq(
            "id",
            imageId
          )
          .eq(
            "promotion_id",
            promotionId
          )
          .eq(
            "business_id",
            businessId
          );

      if (
        imageDeleteError
      ) {
        throw new Error(
          imageDeleteError.message
        );
      }

      const business =
        supabase.__sodahBusiness;

      const imageUsage =
        await getBusinessImageUsage(
          supabase,
          businessId
        );

      return NextResponse.json({
        success: true,

        promotions:
          await listPromotions(
            supabase,
            businessId
          ),

        subscription:
          buildSubscriptionResponse(
            business,
            imageUsage
          ),
      });
    }

    /* ----------------------------------------------------------
       DELETE ENTIRE PROMOTION
    ---------------------------------------------------------- */

    const {
      data: images,
      error:
        imageLookupError,
    } =
      await supabase
        .from(
          IMAGE_TABLE
        )
        .select(
          "id,storage_path"
        )
        .eq(
          "business_id",
          businessId
        )
        .eq(
          "promotion_id",
          promotionId
        );

    if (
      imageLookupError
    ) {
      throw new Error(
        imageLookupError.message
      );
    }

    const paths =
      (images || [])
        .map(
          (image) =>
            image.storage_path
        )
        .filter(Boolean);

    if (
      paths.length > 0
    ) {
      const {
        error:
          storageDeleteError,
      } =
        await supabase.storage
          .from(BUCKET)
          .remove(paths);

      if (
        storageDeleteError
      ) {
        throw new Error(
          storageDeleteError.message
        );
      }
    }

    const {
      error:
        promotionDeleteError,
    } =
      await supabase
        .from(
          PROMOTION_TABLE
        )
        .delete()
        .eq(
          "id",
          promotionId
        )
        .eq(
          "business_id",
          businessId
        );

    if (
      promotionDeleteError
    ) {
      throw new Error(
        promotionDeleteError.message
      );
    }

    const business =
      supabase.__sodahBusiness;

    const imageUsage =
      await getBusinessImageUsage(
        supabase,
        businessId
      );

    return NextResponse.json({
      success: true,

      promotions:
        await listPromotions(
          supabase,
          businessId
        ),

      subscription:
        buildSubscriptionResponse(
          business,
          imageUsage
        ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to delete promotion.",
      },
      {
        status: 400,
      }
    );
  }
}