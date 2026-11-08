import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============================================================
   CONFIG
============================================================ */

const PRODUCT_TABLE = "business_products";
const IMAGE_TABLE = "business_product_images";
const BUCKET = "business-product-images";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES_PER_UPLOAD = 5;
const MAX_IMAGES_PER_PRODUCT = 10;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/* ============================================================
   SUBSCRIPTION IMAGE LIMITS
============================================================ */

const PRODUCT_IMAGE_LIMITS = {
  free_trial: 20,
  starter: 20,
  business: 100,
  pro: 500,
};

/* ============================================================
   NORMALISE PLAN
============================================================ */

function normalisePlan(plan) {
  return String(plan || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/* ============================================================
   PLAN IMAGE LIMIT
============================================================ */

function getProductImageLimit(subscriptionPlan) {
  const plan = normalisePlan(subscriptionPlan);

  return (
    PRODUCT_IMAGE_LIMITS[plan] ??
    PRODUCT_IMAGE_LIMITS.free_trial
  );
}

/* ============================================================
   SUBSCRIPTION ACCESS
   ============================================================ */

function getSubscriptionAccess(business) {
  const plan = normalisePlan(business?.subscription_plan);
  const status = String(
    business?.subscription_status || "active"
  ).trim().toLowerCase();

  const expiryRaw = business?.subscription_expiry || null;
  const expiry = expiryRaw ? new Date(expiryRaw) : null;
  const hasValidExpiry =
    expiry && !Number.isNaN(expiry.getTime());

  const now = Date.now();

  const blockedStatuses = new Set([
    "expired",
    "cancelled",
    "canceled",
    "inactive",
    "suspended",
    "past_due",
  ]);

  const statusBlocked = blockedStatuses.has(status);
  const expiryBlocked =
    hasValidExpiry && expiry.getTime() <= now;

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
        "Your 7-day Free Trial has expired. Please upgrade your plan to continue uploading product images."
      );
    }

    throw new Error(
      "Your subscription has expired or is inactive. Please renew your plan to continue uploading product images."
    );
  }

  return access;
}

/* ============================================================
   PLAN DISPLAY NAME
============================================================ */

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

  return value
    ? value
        .split("_")
        .map(
          (part) =>
            part.charAt(0).toUpperCase() +
            part.slice(1)
        )
        .join(" ")
    : "Free Trial";
}

/* ============================================================
   SUPABASE SERVER CLIENT
   Used only for authentication + ownership verification.
============================================================ */

async function getClient() {
  const cookieStore = await cookies();

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "Supabase URL is not configured."
    );
  }

  if (!anonKey) {
    throw new Error(
      "Supabase anon key is not configured."
    );
  }

  return createServerClient(
    url,
    anonKey,
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
             * Some Next.js server contexts do not allow
             * cookies to be written here.
             */
          }
        },
      },
    }
  );
}

/* ============================================================
   SUPABASE ADMIN CLIENT
   Server-side only.
============================================================ */

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "Supabase URL is not configured."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Supabase service role key is not configured."
    );
  }

  return createSupabaseClient(
    url,
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
   AUTHENTICATE + VERIFY BUSINESS OWNERSHIP
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
     COOKIE SESSION
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

  const {
    data: business,
    error,
  } =
    await supabase
      .from("businesses")
      .select(
        "business_id,user_id,business_name,subscription_plan,subscription_status,subscription_expiry"
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
   * IMPORTANT:
   *
   * Ownership is verified above.
   *
   * After ownership is verified, the service-role client is
   * used for product/catalog/storage operations so RLS does
   * not hide the user's own products.
   */

  const admin =
    getAdminClient();

  return {
    supabase,
    admin,
    user,
    business,
  };
}

/* ============================================================
   PRODUCT IMAGE USAGE
============================================================ */

async function getProductImageUsage(
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
   IMAGE LIMIT INFO
============================================================ */

function buildProductImageLimitInfo(
  subscriptionPlan,
  usage
) {
  const plan =
    normalisePlan(
      subscriptionPlan
    );

  const limit =
    getProductImageLimit(
      subscriptionPlan
    );

  const used =
    Number(usage) || 0;

  return {
    plan,
    limit,
    used,
    remaining: Math.max(
      0,
      limit - used
    ),
  };
}

/* ============================================================
   IMAGE LIMIT RESPONSE
============================================================ */

async function getImageLimitResponse(
  supabase,
  businessId
) {
  const {
    data: business,
    error,
  } =
    await supabase
      .from("businesses")
      .select(
        "subscription_plan"
      )
      .eq(
        "business_id",
        businessId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!business) {
    throw new Error(
      "Business not found."
    );
  }

  const usage =
    await getProductImageUsage(
      supabase,
      businessId
    );

  return {
    ...buildProductImageLimitInfo(
      business.subscription_plan,
      usage
    ),
    subscriptionStatus:
      business.subscription_status || "active",
    subscriptionExpiry:
      business.subscription_expiry || null,
    subscriptionActive:
      getSubscriptionAccess(business).active,
  };
}

/* ============================================================
   BUILD STORAGE OBJECT URL
============================================================ */

/*
 * The bucket can remain private.
 *
 * image_url is required by the database, so we store a stable
 * object URL here.
 *
 * When products are loaded, signedImage() generates the actual
 * temporary URL used by the browser.
 */

function buildStorageObjectUrl(
  storagePath
) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  if (
    !supabaseUrl ||
    !storagePath
  ) {
    return null;
  }

  const base =
    String(
      supabaseUrl
    ).replace(
      /\/$/,
      ""
    );

  const encodedPath =
    String(storagePath)
      .split("/")
      .map(
        (part) =>
          encodeURIComponent(
            part
          )
      )
      .join("/");

  return `${base}/storage/v1/object/${BUCKET}/${encodedPath}`;
}

/* ============================================================
   SIGN PRIVATE IMAGE
============================================================ */

async function signedImage(
  supabase,
  row
) {
  if (!row?.storage_path) {
    return {
      ...row,
      image_url:
        row?.image_url ||
        null,
    };
  }

  const {
    data,
    error,
  } =
    await supabase.storage
      .from(BUCKET)
      .createSignedUrl(
        row.storage_path,
        3600
      );

  if (error) {
    console.error(
      "Product image signed URL error:",
      error
    );

    return {
      ...row,
      image_url:
        row?.image_url ||
        null,
    };
  }

  return {
    ...row,
    image_url:
      data?.signedUrl ||
      row?.image_url ||
      null,
  };
}

/* ============================================================
   LIST PRODUCTS
============================================================ */

async function listProducts(
  supabase,
  businessId
) {
  /*
   * IMPORTANT:
   *
   * GET passes the ADMIN client here.
   *
   * This prevents RLS from returning:
   *
   *   products: []
   *
   * immediately after a successful insert.
   */

  const {
    data: products,
    error,
  } =
    await supabase
      .from(PRODUCT_TABLE)
      .select(
        "id,business_id,product_name,description,price,currency,availability,promotion,category,sku,active,created_at,updated_at"
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

  const {
    data: images,
    error: imageError,
  } =
    await supabase
      .from(IMAGE_TABLE)
      .select(
        "id,product_id,business_id,image_url,storage_path,alt_text,sort_order,created_at"
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

  if (imageError) {
    throw new Error(
      imageError.message
    );
  }

  const imageMap =
    new Map();

  for (
    const image of
      images || []
  ) {
    const signed =
      await signedImage(
        supabase,
        image
      );

    const existing =
      imageMap.get(
        image.product_id
      ) || [];

    existing.push(
      signed
    );

    imageMap.set(
      image.product_id,
      existing
    );
  }

  return (
    products || []
  ).map(
    (product) => ({
      ...product,
      images:
        imageMap.get(
          product.id
        ) || [],
    })
  );
}

/* ============================================================
   GET PRODUCTS
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

    const {
      admin,
      business,
    } =
      await requireOwner(
        request,
        businessId
      );

    /*
     * CRITICAL FIX:
     *
     * Use admin here, NOT the normal session client.
     *
     * The normal client can be blocked by RLS and return zero
     * products even though the product was successfully saved.
     */

    const products =
      await listProducts(
        admin,
        businessId
      );

    const usage =
      await getProductImageUsage(
        admin,
        businessId
      );

    const imageLimits =
      buildProductImageLimitInfo(
        business.subscription_plan,
        usage
      );

    return NextResponse.json({
      success: true,

      products,

      subscription: {
        plan:
          imageLimits.plan,

        status:
          imageLimits.subscriptionStatus,

        expiry:
          imageLimits.subscriptionExpiry,

        active:
          imageLimits.subscriptionActive,

        productImages: {
          limit:
            imageLimits.limit,

          used:
            imageLimits.used,

          remaining:
            imageLimits.remaining,
        },
      },
    });
  } catch (error) {
    console.error(
      "GET /api/business-products/manage error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to load products.",
      },
      {
        status:
          /subscription|trial|expired|inactive|renew/i.test(
            String(error?.message || "")
          )
            ? 403
            : 400,
      }
    );
  }
}

/* ============================================================
   PATCH PRODUCT
============================================================ */

export async function PATCH(
  request
) {
  try {
    const body =
      await request.json();

    const businessId =
      String(
        body.businessId ||
          ""
      ).trim();

    const productId =
      String(
        body.productId ||
          ""
      ).trim();

    if (!businessId) {
      throw new Error(
        "businessId is required."
      );
    }

    if (!productId) {
      throw new Error(
        "productId is required."
      );
    }

    const {
      admin,
    } =
      await requireOwner(
        request,
        businessId
      );

    const allowedFields = [
      "product_name",
      "description",
      "price",
      "currency",
      "availability",
      "promotion",
      "category",
      "sku",
      "active",
    ];

    const patch = {};

    for (
      const field of
        allowedFields
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
      ) {
        patch[field] =
          body[field];
      }
    }

    if (
      patch.product_name !==
        undefined &&
      !String(
        patch.product_name
      ).trim()
    ) {
      throw new Error(
        "Product name cannot be empty."
      );
    }

    if (
      patch.price !==
        undefined &&
      patch.price !==
        null
    ) {
      const numericPrice =
        Number(
          patch.price
        );

      if (
        !Number.isFinite(
          numericPrice
        ) ||
        numericPrice < 0
      ) {
        throw new Error(
          "Price must be a valid non-negative number."
        );
      }

      patch.price =
        numericPrice;
    }

    if (
      patch.currency !==
        undefined
    ) {
      patch.currency =
        String(
          patch.currency ||
            "AED"
        )
          .trim()
          .toUpperCase();
    }

    if (
      !Object.keys(
        patch
      ).length
    ) {
      throw new Error(
        "No product changes were supplied."
      );
    }

    const {
      data,
      error,
    } =
      await admin
        .from(PRODUCT_TABLE)
        .update(patch)
        .eq(
          "id",
          productId
        )
        .eq(
          "business_id",
          businessId
        )
        .select(
          "id,business_id,product_name,description,price,currency,availability,promotion,category,sku,active,created_at,updated_at"
        )
        .maybeSingle();

    if (error) {
      throw new Error(
        error.message
      );
    }

    if (!data) {
      throw new Error(
        "Product not found."
      );
    }

    const products =
      await listProducts(
        admin,
        businessId
      );

    const imageLimits =
      await getImageLimitResponse(
        admin,
        businessId
      );

    return NextResponse.json({
      success: true,

      product: data,

      products,

      imageLimits,
    });
  } catch (error) {
    console.error(
      "PATCH /api/business-products/manage error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to update product.",
      },
      {
        status: 400,
      }
    );
  }
}

/* ============================================================
   DELETE PRODUCT OR PRODUCT IMAGE
============================================================ */

export async function DELETE(
  request
) {
  try {
    const url =
      new URL(
        request.url
      );

    let body = {};

    try {
      body =
        await request.json();
    } catch {
      body = {};
    }

    const businessId =
      String(
        body.businessId ||
          url.searchParams.get(
            "businessId"
          ) ||
          ""
      ).trim();

    const productId =
      String(
        body.productId ||
          url.searchParams.get(
            "productId"
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

    if (!businessId) {
      throw new Error(
        "businessId is required."
      );
    }

    if (!productId) {
      throw new Error(
        "productId is required."
      );
    }

    const {
      admin,
    } =
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
        await admin
          .from(IMAGE_TABLE)
          .select(
            "id,storage_path"
          )
          .eq(
            "id",
            imageId
          )
          .eq(
            "product_id",
            productId
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
          "Product image not found."
        );
      }

      if (
        image.storage_path
      ) {
        const {
          error:
            storageDeleteError,
        } =
          await admin.storage
            .from(BUCKET)
            .remove([
              image.storage_path,
            ]);

        if (
          storageDeleteError
        ) {
          console.error(
            "Product image storage delete error:",
            storageDeleteError
          );
        }
      }

      const {
        error:
          imageDeleteError,
      } =
        await admin
          .from(IMAGE_TABLE)
          .delete()
          .eq(
            "id",
            imageId
          )
          .eq(
            "product_id",
            productId
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

      return NextResponse.json({
        success: true,

        products:
          await listProducts(
            admin,
            businessId
          ),

        imageLimits:
          await getImageLimitResponse(
            admin,
            businessId
          ),
      });
    }

    /* ----------------------------------------------------------
       DELETE ENTIRE PRODUCT
    ---------------------------------------------------------- */

    const {
      data: images,
      error: imageError,
    } =
      await admin
        .from(IMAGE_TABLE)
        .select(
          "id,storage_path"
        )
        .eq(
          "business_id",
          businessId
        )
        .eq(
          "product_id",
          productId
        );

    if (imageError) {
      throw new Error(
        imageError.message
      );
    }

    const storagePaths =
      (
        images || []
      )
        .map(
          (image) =>
            image.storage_path
        )
        .filter(Boolean);

    if (
      storagePaths.length
    ) {
      const {
        error:
          storageDeleteError,
      } =
        await admin.storage
          .from(BUCKET)
          .remove(
            storagePaths
          );

      if (
        storageDeleteError
      ) {
        console.error(
          "Product image storage cleanup error:",
          storageDeleteError
        );
      }
    }

    /*
     * Delete image database records explicitly first.
     * This avoids depending on a database ON DELETE CASCADE.
     */

    const {
      error:
        imageRowsDeleteError,
    } =
      await admin
        .from(IMAGE_TABLE)
        .delete()
        .eq(
          "business_id",
          businessId
        )
        .eq(
          "product_id",
          productId
        );

    if (
      imageRowsDeleteError
    ) {
      throw new Error(
        imageRowsDeleteError.message
      );
    }

    const {
      error:
        productDeleteError,
    } =
      await admin
        .from(PRODUCT_TABLE)
        .delete()
        .eq(
          "id",
          productId
        )
        .eq(
          "business_id",
          businessId
        );

    if (
      productDeleteError
    ) {
      throw new Error(
        productDeleteError.message
      );
    }

    return NextResponse.json({
      success: true,

      products:
        await listProducts(
          admin,
          businessId
        ),

      imageLimits:
        await getImageLimitResponse(
          admin,
          businessId
        ),
    });
  } catch (error) {
    console.error(
      "DELETE /api/business-products/manage error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to delete product.",
      },
      {
        status: 400,
      }
    );
  }
}

/* ============================================================
   POST PRODUCT / PRODUCT IMAGES
============================================================ */

/*
 * This POST supports BOTH flows.
 *
 * ------------------------------------------------------------
 * NEW PRODUCT
 * ------------------------------------------------------------
 *
 * businessId
 * product_name
 * description
 * price
 * currency
 * availability
 * category
 * sku
 * active
 * images[]
 *
 * productId is NOT required.
 *
 * ------------------------------------------------------------
 * EXISTING PRODUCT
 * ------------------------------------------------------------
 *
 * businessId
 * productId
 * images[]
 *
 * ------------------------------------------------------------
 */

export async function POST(
  request
) {
  let businessId = "";
  let createdProductId = null;
  let uploadedPaths = [];

  try {
    const form =
      await request.formData();

    businessId =
      String(
        form.get(
          "businessId"
        ) || ""
      ).trim();

    let productId =
      String(
        form.get(
          "productId"
        ) || ""
      ).trim();

    if (!businessId) {
      throw new Error(
        "businessId is required."
      );
    }

    const {
      admin,
      business,
    } =
      await requireOwner(
        request,
        businessId
      );

    /*
     * Uploads are subscription-protected.
     * Existing products/images can still be viewed or deleted,
     * but a blocked/expired subscription cannot add new images.
     */
    const subscriptionAccess =
      assertSubscriptionCanUpload(
        business
      );

    /* ----------------------------------------------------------
       GET IMAGE FILES
    ---------------------------------------------------------- */

    const files =
      form
        .getAll(
          "images"
        )
        .filter(
          (item) =>
            item instanceof File
        );

    /* ----------------------------------------------------------
       MAX FILES PER REQUEST
    ---------------------------------------------------------- */

    if (
      files.length >
      MAX_IMAGES_PER_UPLOAD
    ) {
      throw new Error(
        `You can upload up to ${MAX_IMAGES_PER_UPLOAD} images at a time.`
      );
    }

    /* ==========================================================
       CREATE NEW PRODUCT
    ========================================================== */

    if (!productId) {
      const productName =
        String(
          form.get(
            "product_name"
          ) || ""
        ).trim();

      if (!productName) {
        throw new Error(
          "Product name is required."
        );
      }

      /* --------------------------------------------------------
         PRICE
      -------------------------------------------------------- */

      const rawPrice =
        String(
          form.get(
            "price"
          ) || ""
        ).trim();

      let price = null;

      if (
        rawPrice !== ""
      ) {
        const numericPrice =
          Number(
            rawPrice
          );

        if (
          !Number.isFinite(
            numericPrice
          ) ||
          numericPrice < 0
        ) {
          throw new Error(
            "Price must be a valid non-negative number."
          );
        }

        price =
          numericPrice;
      }

      /* --------------------------------------------------------
         OTHER FIELDS
      -------------------------------------------------------- */

      const description =
        String(
          form.get(
            "description"
          ) || ""
        ).trim();

      const currency =
        String(
          form.get(
            "currency"
          ) || "AED"
        )
          .trim()
          .toUpperCase() ||
        "AED";

      const availability =
        String(
          form.get(
            "availability"
          ) ||
            "available"
        ).trim() ||
        "available";

      const category =
        String(
          form.get(
            "category"
          ) || ""
        ).trim();

      const sku =
        String(
          form.get(
            "sku"
          ) || ""
        ).trim();

      const activeValue =
        String(
          form.get(
            "active"
          ) || "true"
        )
          .trim()
          .toLowerCase();

      const active =
        ![
          "false",
          "0",
          "no",
          "off",
        ].includes(
          activeValue
        );

      /* --------------------------------------------------------
         CHECK TOTAL IMAGE CAPACITY
      -------------------------------------------------------- */

      const businessImageCount =
        await getProductImageUsage(
          admin,
          businessId
        );

      const productImageLimit =
        getProductImageLimit(
          business.subscription_plan
        );

      const remainingBusinessImages =
        Math.max(
          0,
          productImageLimit -
            businessImageCount
        );

      if (
        files.length >
        remainingBusinessImages
      ) {
        if (
          remainingBusinessImages ===
          0
        ) {
          throw new Error(
            `You have reached your ${productImageLimit}-image product limit for your ${formatPlanName(
              business.subscription_plan
            )} plan. Please upgrade your plan to add more product images.`
          );
        }

        throw new Error(
          `You can add only ${remainingBusinessImages} more product image${
            remainingBusinessImages ===
            1
              ? ""
              : "s"
          } on your current plan.`
        );
      }

      /* --------------------------------------------------------
         CREATE PRODUCT
      -------------------------------------------------------- */

      const productPayload = {
        business_id:
          businessId,

        product_name:
          productName,

        description:
          description ||
          null,

        price,

        currency,

        availability,

        promotion:
          null,

        category:
          category ||
          null,

        sku:
          sku ||
          null,

        active,
      };

      const {
        data: createdProduct,
        error:
          createProductError,
      } =
        await admin
          .from(
            PRODUCT_TABLE
          )
          .insert(
            productPayload
          )
          .select(
            "id,business_id,product_name,description,price,currency,availability,promotion,category,sku,active,created_at,updated_at"
          )
          .single();

      if (
        createProductError
      ) {
        throw new Error(
          `Product could not be created: ${createProductError.message}`
        );
      }

      if (
        !createdProduct?.id
      ) {
        throw new Error(
          "Product was created but no product ID was returned."
        );
      }

      productId =
        String(
          createdProduct.id
        );

      createdProductId =
        productId;
    }

    /* ==========================================================
       EXISTING PRODUCT VERIFICATION
    ========================================================== */

    const {
      data: product,
      error:
        productError,
    } =
      await admin
        .from(
          PRODUCT_TABLE
        )
        .select(
          "id,business_id,product_name,description,price,currency,availability,promotion,category,sku,active,created_at,updated_at"
        )
        .eq(
          "id",
          productId
        )
        .eq(
          "business_id",
          businessId
        )
        .maybeSingle();

    if (
      productError
    ) {
      throw new Error(
        productError.message
      );
    }

    if (!product) {
      throw new Error(
        "Product not found."
      );
    }

    /* ==========================================================
       NO IMAGES
    ========================================================== */

    if (!files.length) {
      const finalUsage =
        await getProductImageUsage(
          admin,
          businessId
        );

      const imageLimits =
        buildProductImageLimitInfo(
          business.subscription_plan,
          finalUsage
        );

      const products =
        await listProducts(
          admin,
          businessId
        );

      const returnedProduct =
        products.find(
          (item) =>
            String(
              item.id
            ) ===
            String(
              productId
            )
        ) || product;

      return NextResponse.json({
        success: true,

        message:
          createdProductId
            ? "Product created successfully."
            : "Product saved successfully.",

        product:
          returnedProduct,

        productId,

        products,

        subscription: {
          plan:
            imageLimits.plan,

          status:
            business.subscription_status || "active",

          expiry:
            business.subscription_expiry || null,

          active:
            subscriptionAccess.active,

          productImages: {
            limit:
              imageLimits.limit,

            used:
              imageLimits.used,

            remaining:
              imageLimits.remaining,
          },
        },
      });
    }

    /* ==========================================================
       CURRENT PRODUCT IMAGE COUNT
    ========================================================== */

    const {
      count:
        currentProductImageCount,
      error:
        productCountError,
    } =
      await admin
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
          "product_id",
          productId
        );

    if (
      productCountError
    ) {
      throw new Error(
        productCountError.message
      );
    }

    const currentProductImages =
      currentProductImageCount ||
      0;

    /* ==========================================================
       PER PRODUCT LIMIT
    ========================================================== */

    if (
      currentProductImages +
        files.length >
      MAX_IMAGES_PER_PRODUCT
    ) {
      const remainingForProduct =
        Math.max(
          0,
          MAX_IMAGES_PER_PRODUCT -
            currentProductImages
        );

      throw new Error(
        remainingForProduct >
          0
          ? `This product can have up to ${MAX_IMAGES_PER_PRODUCT} images. You can add ${remainingForProduct} more.`
          : `This product already has the maximum of ${MAX_IMAGES_PER_PRODUCT} images.`
      );
    }

    /* ==========================================================
       BUSINESS TOTAL IMAGE LIMIT
    ========================================================== */

    const businessImageCount =
      await getProductImageUsage(
        admin,
        businessId
      );

    const productImageLimit =
      getProductImageLimit(
        business.subscription_plan
      );

    const remainingBusinessImages =
      Math.max(
        0,
        productImageLimit -
          businessImageCount
      );

    if (
      businessImageCount +
        files.length >
      productImageLimit
    ) {
      if (
        remainingBusinessImages ===
        0
      ) {
        throw new Error(
          `You have reached your ${productImageLimit}-image product limit for your ${formatPlanName(
            business.subscription_plan
          )} plan. Please upgrade your plan to add more product images.`
        );
      }

      throw new Error(
        `You can add only ${remainingBusinessImages} more product image${
          remainingBusinessImages ===
          1
            ? ""
            : "s"
        } on your current plan. Your plan allows ${productImageLimit} product images in total.`
      );
    }

    /* ==========================================================
       VALIDATE FILES
    ========================================================== */

    for (
      const file of files
    ) {
      if (
        !ALLOWED_TYPES.has(
          file.type
        )
      ) {
        throw new Error(
          `${file.name} is not a supported image type. Please use JPG, PNG, WEBP, or GIF.`
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

      if (
        file.size <=
        0
      ) {
        throw new Error(
          `${file.name} is empty or invalid.`
        );
      }
    }

    /* ==========================================================
       UPLOAD IMAGES
    ========================================================== */

    try {
      for (
        const file of files
      ) {
        const safeName =
          file.name
            .replace(
              /[^a-zA-Z0-9._-]/g,
              "-"
            )
            .slice(
              0,
              150
            );

        const storagePath =
          `${businessId}/products/${productId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

        const buffer =
          Buffer.from(
            await file.arrayBuffer()
          );

        const {
          error:
            uploadError,
        } =
          await admin.storage
            .from(
              BUCKET
            )
            .upload(
              storagePath,
              buffer,
              {
                contentType:
                  file.type,

                cacheControl:
                  "3600",

                upsert:
                  false,
              }
            );

        if (
          uploadError
        ) {
          throw new Error(
            `Storage upload failed for "${file.name}": ${uploadError.message}`
          );
        }

        uploadedPaths.push(
          storagePath
        );
      }

      /* ========================================================
         INSERT IMAGE DATABASE ROWS
      ======================================================== */

      const rows =
        uploadedPaths.map(
          (
            storagePath,
            index
          ) => {
            const imageUrl =
              buildStorageObjectUrl(
                storagePath
              );

            if (
              !imageUrl
            ) {
              throw new Error(
                "Unable to build product image URL. Supabase URL is not configured."
              );
            }

            return {
              business_id:
                businessId,

              product_id:
                productId,

              storage_path:
                storagePath,

              /*
               * IMPORTANT:
               *
               * image_url is NOT NULL in the database.
               *
               * We therefore NEVER insert null here.
               */
              image_url:
                imageUrl,

              alt_text:
                null,

              sort_order:
                currentProductImages +
                index,
            };
          }
        );

      const {
        error:
          insertError,
      } =
        await admin
          .from(
            IMAGE_TABLE
          )
          .insert(
            rows
          );

      if (
        insertError
      ) {
        throw new Error(
          `Product image database insert failed: ${insertError.message}`
        );
      }
    } catch (uploadOrDatabaseError) {
      /* --------------------------------------------------------
         CLEAN STORAGE IF IMAGE DATABASE INSERT FAILS
      -------------------------------------------------------- */

      if (
        uploadedPaths.length
      ) {
        const {
          error:
            cleanupError,
        } =
          await admin.storage
            .from(
              BUCKET
            )
            .remove(
              uploadedPaths
            );

        if (
          cleanupError
        ) {
          console.error(
            "Product image storage cleanup failed:",
            cleanupError
          );
        }
      }

      /*
       * If this was a brand-new product and its image operation
       * failed, remove the newly-created product as well.
       */

      if (
        createdProductId
      ) {
        const {
          error:
            productCleanupError,
        } =
          await admin
            .from(
              PRODUCT_TABLE
            )
            .delete()
            .eq(
              "id",
              createdProductId
            )
            .eq(
              "business_id",
              businessId
            );

        if (
          productCleanupError
        ) {
          console.error(
            "Created product cleanup failed:",
            productCleanupError
          );
        }
      }

      throw uploadOrDatabaseError;
    }

    /* ==========================================================
       FINAL USAGE
    ========================================================== */

    const finalUsage =
      await getProductImageUsage(
        admin,
        businessId
      );

    const imageLimits =
      buildProductImageLimitInfo(
        business.subscription_plan,
        finalUsage
      );

    /* ==========================================================
       FINAL PRODUCT LIST
    ========================================================== */

    const products =
      await listProducts(
        admin,
        businessId
      );

    const returnedProduct =
      products.find(
        (item) =>
          String(
            item.id
          ) ===
          String(
            productId
          )
      ) || null;

    return NextResponse.json({
      success: true,

      message:
        createdProductId
          ? `Product created successfully with ${files.length} image${
              files.length ===
              1
                ? ""
                : "s"
            }.`
          : files.length ===
            1
          ? "Product image uploaded successfully."
          : `${files.length} product images uploaded successfully.`,

      product:
        returnedProduct,

      productId,

      products,

      subscription: {
        plan:
          imageLimits.plan,

        productImages: {
          limit:
            imageLimits.limit,

          used:
            imageLimits.used,

          remaining:
            imageLimits.remaining,
        },
      },
    });
  } catch (error) {
    console.error(
      "POST /api/business-products/manage error:",
      error
    );

    /*
     * This cleanup is only for an unexpected failure outside
     * the image transaction above.
     */

    if (
      createdProductId &&
      businessId
    ) {
      try {
        const admin =
          getAdminClient();

        /*
         * Remove any storage objects that may still exist.
         */
        if (
          uploadedPaths.length
        ) {
          await admin.storage
            .from(
              BUCKET
            )
            .remove(
              uploadedPaths
            );
        }

        /*
         * Remove image rows belonging to the newly-created
         * product.
         */
        await admin
          .from(
            IMAGE_TABLE
          )
          .delete()
          .eq(
            "business_id",
            businessId
          )
          .eq(
            "product_id",
            createdProductId
          );

        /*
         * Remove the newly-created product.
         */
        await admin
          .from(
            PRODUCT_TABLE
          )
          .delete()
          .eq(
            "id",
            createdProductId
          )
          .eq(
            "business_id",
            businessId
          );
      } catch (
        cleanupError
      ) {
        console.error(
          "POST product final cleanup failed:",
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to create product or upload product images.",

        message:
          error?.message ||
          "Unable to create product or upload product images.",
      },
      {
        status: 400,
      }
    );
  }
}