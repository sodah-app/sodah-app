import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 5;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getSupabaseClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanText(value, maxLength = 2000) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().slice(0, maxLength);
}

function safeFileExtension(file) {
  const type = file.type?.toLowerCase();

  if (type === "image/jpeg" || type === "image/jpg") {
    return "jpg";
  }

  if (type === "image/png") {
    return "png";
  }

  if (type === "image/webp") {
    return "webp";
  }

  if (type === "image/gif") {
    return "gif";
  }

  return "jpg";
}

function safeFileName(name) {
  return (
    String(name || "image")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 100) || "image"
  );
}

async function getAuthenticatedUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("PRODUCT API AUTH ERROR:", error);
    return null;
  }

  return user || null;
}

async function analyzeProductWithAI({
  message,
  imageFiles,
  business,
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const content = [
    {
      type: "text",
      text: `
You are the product catalog extraction AI for Sodah.

Your job is to understand the business owner's request and extract
PRODUCT information for the business catalog.

Business name:
${business.business_name || "Unknown"}

Business industry:
${business.industry || "Unknown"}

Business location:
${business.location || "Unknown"}

Owner request:
${message || "(No text provided)"}

IMPORTANT RULES:

1. Only extract information supported by the owner's message or the
   attached product image.

2. NEVER invent a product name.

3. NEVER invent a price.

4. NEVER invent availability.

5. NEVER invent a promotion.

6. If a field is not known, return null.

7. If the owner gives a price such as "AED 650", extract:
   price = 650
   currency = "AED"

8. If the owner gives "$650", extract:
   price = 650
   currency = "USD"

9. If the owner gives a product name in the message, prefer that name
   over guessing from the image.

10. The image can help identify the product, but visual identification
    must not override explicit information from the owner.

11. If the request is clearly about adding or updating a product,
    return the product information.

12. If the request does not contain enough information to identify a
    product, set product_name to null.

13. Return JSON only.

Return exactly:

{
  "product_name": string | null,
  "description": string | null,
  "price": number | null,
  "currency": string | null,
  "availability": string | null,
  "promotion": string | null,
  "category": string | null,
  "sku": string | null
}
      `.trim(),
    },
  ];

  /*
   * Send the attached images to OpenAI for product understanding.
   * We only use the image as supporting information.
   */
  for (const file of imageFiles) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    content.push({
      type: "image_url",
      image_url: {
        url: `data:${file.type};base64,${base64}`,
      },
    });
  }

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "You extract structured product catalog information. Never invent missing business data.",
          },
          {
            role: "user",
            content,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "OPENAI PRODUCT ANALYSIS ERROR:",
      response.status,
      errorText
    );

    throw new Error("Unable to analyze the product information.");
  }

  const result = await response.json();

  const rawContent =
    result?.choices?.[0]?.message?.content || "{}";

  let parsed;

  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    console.error(
      "PRODUCT AI JSON PARSE ERROR:",
      rawContent
    );

    throw new Error(
      "The product information could not be understood."
    );
  }

  return {
    product_name:
      cleanText(parsed.product_name, 200) || null,

    description:
      cleanText(parsed.description, 2000) || null,

    price:
      typeof parsed.price === "number" &&
      Number.isFinite(parsed.price)
        ? parsed.price
        : null,

    currency:
      cleanText(parsed.currency, 20).toUpperCase() || null,

    availability:
      cleanText(parsed.availability, 100) || null,

    promotion:
      cleanText(parsed.promotion, 1000) || null,

    category:
      cleanText(parsed.category, 100) || null,

    sku:
      cleanText(parsed.sku, 100) || null,
  };
}

export async function POST(request) {
  let uploadedStoragePaths = [];

  try {
    // ============================================================
    // ENVIRONMENT
    // ============================================================

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    // ============================================================
    // AUTHENTICATION
    // ============================================================

    const authorization =
      request.headers.get("authorization") || "";

    const accessToken = authorization.startsWith(
      "Bearer "
    )
      ? authorization.slice(7)
      : "";

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your login session is missing. Please log in again.",
        },
        { status: 401 }
      );
    }

    const supabase =
      getSupabaseClient(accessToken);

    const user =
      await getAuthenticatedUser(supabase);

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your login session is invalid. Please log in again.",
        },
        { status: 401 }
      );
    }

    // ============================================================
    // FORM DATA
    // ============================================================

    const formData = await request.formData();

    const message = cleanText(
      formData.get("message"),
      4000
    );

    const requestedBusinessId = cleanText(
      formData.get("business_id"),
      200
    );

    /*
     * Accept:
     *
     * images
     * image
     *
     * This allows the frontend to use either naming convention.
     */
    const imageFiles = [];

    for (const entry of formData.getAll("images")) {
      if (
        entry &&
        typeof entry === "object" &&
        typeof entry.arrayBuffer === "function"
      ) {
        imageFiles.push(entry);
      }
    }

    const singleImage = formData.get("image");

    if (
      singleImage &&
      typeof singleImage === "object" &&
      typeof singleImage.arrayBuffer === "function"
    ) {
      imageFiles.push(singleImage);
    }

    // Remove duplicates by name + size + type.
    const uniqueImages = [];

    const seenImages = new Set();

    for (const file of imageFiles) {
      const key = [
        file.name,
        file.size,
        file.type,
      ].join("|");

      if (!seenImages.has(key)) {
        seenImages.add(key);
        uniqueImages.push(file);
      }
    }

    if (uniqueImages.length > MAX_IMAGES) {
      return NextResponse.json(
        {
          success: false,
          error: `You can upload up to ${MAX_IMAGES} product images at a time.`,
        },
        { status: 400 }
      );
    }

    // ============================================================
    // VALIDATE IMAGES
    // ============================================================

    for (const file of uniqueImages) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Unsupported image type: ${file.type || "unknown"}. ` +
              "Please use JPG, PNG, WEBP, or GIF.",
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Image "${file.name}" is larger than 10 MB.`,
          },
          { status: 400 }
        );
      }
    }

    if (!message && uniqueImages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please describe the product or attach a product image.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // RESOLVE BUSINESS
    //
    // NEVER trust the business ID supplied by the browser.
    // We verify that it belongs to the authenticated user.
    // ============================================================

    let businessQuery = supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user.id);

    if (requestedBusinessId) {
      businessQuery = businessQuery.eq(
        "business_id",
        requestedBusinessId
      );
    }

    const {
      data: business,
      error: businessError,
    } = await businessQuery.maybeSingle();

    if (businessError) {
      console.error(
        "PRODUCT BUSINESS LOOKUP ERROR:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify your business workspace.",
        },
        { status: 500 }
      );
    }

    if (!business?.business_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No Sodah business is linked to your account.",
        },
        { status: 404 }
      );
    }

    const businessId = business.business_id;

    // ============================================================
    // AI PRODUCT EXTRACTION
    // ============================================================

    const product =
      await analyzeProductWithAI({
        message,
        imageFiles: uniqueImages,
        business,
      });

    if (!product.product_name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "I couldn't determine the product name. Please tell me the product name.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // PRICE VALIDATION
    // ============================================================

    if (
      product.price !== null &&
      product.price < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Product price cannot be negative.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // CREATE PRODUCT
    // ============================================================

    const {
      data: createdProduct,
      error: productError,
    } = await supabase
      .from("business_products")
      .insert({
        business_id: businessId,
        product_name: product.product_name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        availability:
          product.availability || "available",
        promotion: product.promotion,
        category: product.category,
        sku: product.sku,
        active: true,
      })
      .select("*")
      .single();

    if (productError) {
      console.error(
        "PRODUCT CREATE ERROR:",
        productError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to save the product.",
        },
        { status: 500 }
      );
    }

    // ============================================================
    // UPLOAD PRODUCT IMAGES
    // ============================================================

    const savedImages = [];

    for (
      let index = 0;
      index < uniqueImages.length;
      index++
    ) {
      const file = uniqueImages[index];

      const extension =
        safeFileExtension(file);

      const originalName =
        safeFileName(file.name);

      const storagePath =
        `${businessId}/products/${createdProduct.id}/` +
        `${Date.now()}-${index}-${originalName || `image.${extension}`}`;

      const fileBuffer =
        Buffer.from(
          await file.arrayBuffer()
        );

      const {
        error: uploadError,
      } = await supabase.storage
        .from("business-product-images")
        .upload(
          storagePath,
          fileBuffer,
          {
            contentType: file.type,
            upsert: false,
          }
        );

      if (uploadError) {
        console.error(
          "PRODUCT IMAGE UPLOAD ERROR:",
          uploadError
        );

        /*
         * Cleanup files already uploaded during this request.
         */
        if (uploadedStoragePaths.length) {
          await supabase.storage
            .from("business-product-images")
            .remove(
              uploadedStoragePaths
            );
        }

        /*
         * Delete the product because the image upload
         * did not complete successfully.
         */
        await supabase
          .from("business_products")
          .delete()
          .eq("id", createdProduct.id)
          .eq("business_id", businessId);

        return NextResponse.json(
          {
            success: false,
            error:
              "The product was not saved because its image could not be uploaded.",
          },
          { status: 500 }
        );
      }

      uploadedStoragePaths.push(
        storagePath
      );

      /*
       * Because the bucket is private, we do NOT create
       * a permanent public URL.
       *
       * image_url stores the storage reference.
       * The application can generate a signed URL later.
       */

      const {
        data: imageRecord,
        error: imageRecordError,
      } = await supabase
        .from("business_product_images")
        .insert({
          product_id:
            createdProduct.id,
          business_id: businessId,
          image_url: storagePath,
          storage_path: storagePath,
          alt_text:
            product.product_name,
          sort_order: index,
        })
        .select("*")
        .single();

      if (imageRecordError) {
        console.error(
          "PRODUCT IMAGE RECORD ERROR:",
          imageRecordError
        );

        await supabase.storage
          .from("business-product-images")
          .remove(
            uploadedStoragePaths
          );

        await supabase
          .from("business_products")
          .delete()
          .eq("id", createdProduct.id)
          .eq("business_id", businessId);

        return NextResponse.json(
          {
            success: false,
            error:
              "The product image could not be registered.",
          },
          { status: 500 }
        );
      }

      savedImages.push(
        imageRecord
      );
    }

    // ============================================================
    // GENERATE SIGNED URLS FOR THE RESPONSE
    // ============================================================

    const imagesWithUrls = [];

    for (const image of savedImages) {
      const {
        data: signedData,
        error: signedError,
      } = await supabase.storage
        .from("business-product-images")
        .createSignedUrl(
          image.storage_path,
          60 * 60
        );

      if (!signedError && signedData?.signedUrl) {
        imagesWithUrls.push({
          ...image,
          signed_url:
            signedData.signedUrl,
        });
      } else {
        imagesWithUrls.push(image);
      }
    }

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json(
      {
        success: true,

        message:
          uniqueImages.length > 0
            ? `${product.product_name} has been added to your product catalog with ${uniqueImages.length} image${uniqueImages.length === 1 ? "" : "s"}.`
            : `${product.product_name} has been added to your product catalog.`,

        business_id: businessId,

        product: {
          ...createdProduct,
          images: imagesWithUrls,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "BUSINESS PRODUCTS API ERROR:",
      error
    );

    /*
     * Best-effort cleanup if an unexpected error occurs
     * after files have already been uploaded.
     */
    if (uploadedStoragePaths.length) {
      try {
        const url =
          process.env.NEXT_PUBLIC_SUPABASE_URL;

        const anonKey =
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const authorization =
          request.headers.get(
            "authorization"
          ) || "";

        const accessToken =
          authorization.startsWith("Bearer ")
            ? authorization.slice(7)
            : "";

        if (
          url &&
          anonKey &&
          accessToken
        ) {
          const supabase =
            getSupabaseClient(
              accessToken
            );

          await supabase.storage
            .from("business-product-images")
            .remove(
              uploadedStoragePaths
            );
        }
      } catch (cleanupError) {
        console.error(
          "PRODUCT IMAGE CLEANUP ERROR:",
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to add the product.",
      },
      { status: 500 }
    );
  }
}