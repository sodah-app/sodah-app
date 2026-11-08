"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { createClient } from "@supabase/supabase-js";

/* ============================================================
   SUPABASE
============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ============================================================
   CONSTANTS
============================================================ */

const GENDERS = [
  {
    id: "female",
    title: "Lady",
    description: "Warm, clear and friendly female voice",
    icon: "♀",
  },
  {
    id: "male",
    title: "Man",
    description: "Confident, clear and professional male voice",
    icon: "♂",
  },
];

const ACCENTS = [
  {
    id: "american",
    title: "American",
    flag: "🇺🇸",
    description: "Natural American English",
  },
  {
    id: "uk",
    title: "UK / British",
    flag: "🇬🇧",
    description: "Natural British English",
  },
  {
    id: "dubai",
    title: "Dubai / UAE",
    flag: "🇦🇪",
    description: "Natural UAE English style",
  },
  {
    id: "african",
    title: "African",
    flag: "🌍",
    description: "Natural African English style",
  },
  {
    id: "nigerian",
    title: "Nigerian",
    flag: "🇳🇬",
    description: "Natural Nigerian English",
  },
  {
    id: "ghanaian",
    title: "Ghanaian",
    flag: "🇬🇭",
    description: "Natural Ghanaian English",
  },
];

const CURRENCIES = [
  { code: "AED", label: "🇦🇪 AED — United Arab Emirates Dirham" },
  { code: "USD", label: "🇺🇸 USD — US Dollar" },
  { code: "EUR", label: "🇪🇺 EUR — Euro" },
  { code: "GBP", label: "🇬🇧 GBP — British Pound" },
  { code: "ZAR", label: "🇿🇦 ZAR — South African Rand" },
  { code: "SAR", label: "🇸🇦 SAR — Saudi Riyal" },
  { code: "QAR", label: "🇶🇦 QAR — Qatari Riyal" },
  { code: "KWD", label: "🇰🇼 KWD — Kuwaiti Dinar" },
  { code: "BHD", label: "🇧🇭 BHD — Bahraini Dinar" },
  { code: "OMR", label: "🇴🇲 OMR — Omani Rial" },
  { code: "INR", label: "🇮🇳 INR — Indian Rupee" },
  { code: "PKR", label: "🇵🇰 PKR — Pakistani Rupee" },
  { code: "NGN", label: "🇳🇬 NGN — Nigerian Naira" },
  { code: "GHS", label: "🇬🇭 GHS — Ghanaian Cedi" },
  { code: "CAD", label: "🇨🇦 CAD — Canadian Dollar" },
  { code: "AUD", label: "🇦🇺 AUD — Australian Dollar" },
  { code: "SGD", label: "🇸🇬 SGD — Singapore Dollar" },
  { code: "JPY", label: "🇯🇵 JPY — Japanese Yen" },
  { code: "CNY", label: "🇨🇳 CNY — Chinese Yuan" },
  { code: "KES", label: "🇰🇪 KES — Kenyan Shilling" },
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const MAX_IMAGES_PER_UPLOAD = 5;

const DEFAULT_PRODUCT_IMAGE_LIMIT = 20;
const DEFAULT_PROMOTION_IMAGE_LIMIT = 2;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/* ============================================================
   HELPERS
============================================================ */

function getBusinessId(searchParams) {
  return (
    searchParams?.get("businessId") ||
    (typeof window !== "undefined"
      ? localStorage.getItem("business_id")
      : "") ||
    ""
  );
}

function formatPrice(value, currency = "AED") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Price not set";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return `${value} ${currency || ""}`.trim();
  }

  return `${currency || "AED"} ${number.toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "No expiry";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toDateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) =>
    String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
}

function dateInputToISO(
  value,
  endOfDay = false
) {
  if (!value) return null;

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

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

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalisePlan(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatPlanName(value) {
  const plan = normalisePlan(value);

  if (
    plan === "free_trial" ||
    plan === "trial" ||
    plan === "free"
  ) {
    return "Free Trial";
  }

  if (plan === "starter") {
    return "Starter";
  }

  if (plan === "business") {
    return "Business";
  }

  if (plan === "pro") {
    return "Pro";
  }

  if (!plan) {
    return "Free Trial";
  }

  return plan
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function getUsagePercentage(
  used,
  limit
) {
  const safeLimit = Number(limit) || 0;
  const safeUsed = Number(used) || 0;

  if (safeLimit <= 0) return 0;

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (safeUsed / safeLimit) * 100
      )
    )
  );
}

function getRemaining(
  used,
  limit
) {
  return Math.max(
    0,
    Number(limit || 0) -
      Number(used || 0)
  );
}

/* ============================================================
   MAIN CONTENT
============================================================ */

function VoiceSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [businessId, setBusinessId] =
    useState("");

  const [connected, setConnected] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [gender, setGender] =
    useState("female");

  const [accent, setAccent] =
    useState("american");

  const [previewPlaying, setPreviewPlaying] = useState(false);

  function playVoicePreview() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setError("Voice preview is not supported by this browser. Please try Chrome or Edge.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      "Hello! Welcome to Sodah. How can I help you today? I can answer questions, share our products and promotions, and help you book an appointment."
    );
    utterance.lang = accent === "uk" ? "en-GB" : accent === "american" ? "en-US" : "en-GB";
    utterance.rate = 1;
    utterance.onstart = () => setPreviewPlaying(true);
    utterance.onend = () => setPreviewPlaying(false);
    utterance.onerror = () => setPreviewPlaying(false);
    window.speechSynthesis.speak(utterance);
  }

  /* ============================================================
     PRODUCTS
  ============================================================ */

  const [products, setProducts] =
    useState([]);

  const [productsLoading, setProductsLoading] =
    useState(false);

  const [productSaving, setProductSaving] =
    useState(false);

  const [productDeleting, setProductDeleting] =
    useState("");

  const [productUploading, setProductUploading] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState(null);

  /* New-product popup. The API submission will be wired separately. */
  const [newProductDraft, setNewProductDraft] =
    useState({
      product_name: "",
      price: "",
      currency: "AED",
      category: "",
      availability: "available",
      sku: "",
      description: "",
    });

  const [newProductImages, setNewProductImages] =
    useState([]);

  const [newProductImagePreviews, setNewProductImagePreviews] =
    useState([]);

  const [
    newProductModalOpen,
    setNewProductModalOpen,
  ] = useState(false);

  const [
    newProductImagePickerKey,
    setNewProductImagePickerKey,
  ] = useState(0);

  const [
    newProductSaving,
    setNewProductSaving,
  ] = useState(false);

  const [
    productDeleteConfirm,
    setProductDeleteConfirm,
  ] = useState(null);

  const [
    productImageInputKey,
    setProductImageInputKey,
  ] = useState(0);

  const [
    newProductInputKey,
    setNewProductInputKey,
  ] = useState(0);

  const [
    productImageLimit,
    setProductImageLimit,
  ] = useState(
    DEFAULT_PRODUCT_IMAGE_LIMIT
  );

  const [
    productImageUsage,
    setProductImageUsage,
  ] = useState(0);

  const [
    productImageRemaining,
    setProductImageRemaining,
  ] = useState(
    DEFAULT_PRODUCT_IMAGE_LIMIT
  );

  const [
    productSubscriptionPlan,
    setProductSubscriptionPlan,
  ] = useState("free_trial");

  /* ============================================================
     PROMOTIONS
  ============================================================ */

  const [promotions, setPromotions] =
    useState([]);

  const [promotionsLoading, setPromotionsLoading] =
    useState(false);

  const [promotionSaving, setPromotionSaving] =
    useState(false);

  const [promotionDeleting, setPromotionDeleting] =
    useState("");

  const [promotionUploading, setPromotionUploading] =
    useState(false);

  const [editingPromotion, setEditingPromotion] =
    useState(null);

  const [
    promotionImageInputKey,
    setPromotionImageInputKey,
  ] = useState(0);

  const [
    promotionImageLimit,
    setPromotionImageLimit,
  ] = useState(
    DEFAULT_PROMOTION_IMAGE_LIMIT
  );

  const [
    promotionImageUsage,
    setPromotionImageUsage,
  ] = useState(0);

  const [
    promotionImageRemaining,
    setPromotionImageRemaining,
  ] = useState(
    DEFAULT_PROMOTION_IMAGE_LIMIT
  );

  const [
    promotionSubscriptionPlan,
    setPromotionSubscriptionPlan,
  ] = useState("free_trial");

  const [
    promotionPreviewUrls,
    setPromotionPreviewUrls,
  ] = useState([]);

  /* ============================================================
     GLOBAL UI
  ============================================================ */

  const [notice, setNotice] =
    useState("");

  const [error, setError] =
    useState("");

  const [mediaSearch, setMediaSearch] =
    useState("");
  const [mediaSearchOpen, setMediaSearchOpen] =
    useState(false);

  /* ============================================================
     DERIVED
  ============================================================ */

  const selectedGender = useMemo(
    () =>
      GENDERS.find(
        (item) => item.id === gender
      ) || GENDERS[0],
    [gender]
  );

  const selectedAccent = useMemo(
    () =>
      ACCENTS.find(
        (item) => item.id === accent
      ) || ACCENTS[0],
    [accent]
  );

  // Voice customization is available only on active Business and Pro plans.
  const voiceChangeAllowed = ["business", "pro"].includes(
    normalisePlan(productSubscriptionPlan)
  );

  const activeProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.active !== false
      ),
    [products]
  );

  const activePromotions = useMemo(
    () =>
      promotions.filter(
        (promotion) =>
          promotion.active !== false
      ),
    [promotions]
  );

  const mediaSearchResults = useMemo(() => {
    const query = String(mediaSearch || "").trim().toLowerCase();

    if (!query) {
      return { products, promotions };
    }

    const matches = (value) =>
      String(value || "").toLowerCase().includes(query);

    const filteredProducts = products.filter((product) => {
      const imageText = (product.images || [])
        .map((image) =>
          [
            image?.file_name,
            image?.filename,
            image?.name,
            image?.alt_text,
          ].filter(Boolean).join(" ")
        )
        .join(" ");

      return [
        product.product_name,
        product.description,
        product.category,
        product.sku,
        product.availability,
        imageText,
      ].some(matches);
    });

    const filteredPromotions = promotions.filter((promotion) => {
      const imageText = (promotion.images || [])
        .map((image) =>
          [
            image?.file_name,
            image?.filename,
            image?.name,
            image?.alt_text,
          ].filter(Boolean).join(" ")
        )
        .join(" ");

      return [
        promotion.title,
        promotion.description,
        promotion.promotion_type,
        imageText,
      ].some(matches);
    });

    const matchedImages = [
      ...filteredProducts.flatMap((product) =>
        (product.images || []).map((image) => ({
          ...image,
          mediaType: "Product",
          mediaTitle: product.product_name,
        }))
      ),
      ...filteredPromotions.flatMap((promotion) =>
        (promotion.images || []).map((image) => ({
          ...image,
          mediaType: "Promotion",
          mediaTitle: promotion.title,
        }))
      ),
    ].slice(0, 8);

    return {
      products: filteredProducts,
      promotions: filteredPromotions,
      images: matchedImages,
    };
  }, [mediaSearch, products, promotions]);

  const productUsagePercentage =
    getUsagePercentage(
      productImageUsage,
      productImageLimit
    );

  const promotionUsagePercentage =
    getUsagePercentage(
      promotionImageUsage,
      promotionImageLimit
    );

  const canUploadProductImages =
    connected &&
    !loading &&
    !productsLoading &&
    !productUploading;

  const canUploadPromotionImages =
    connected &&
    !loading &&
    !promotionsLoading &&
    !promotionUploading &&
    promotionImageRemaining > 0;


  /* ============================================================
     PROMOTION PREVIEWS
  ============================================================ */

  useEffect(() => {
    const files = Array.isArray(
      editingPromotion?.newImages
    )
      ? editingPromotion.newImages
      : [];

    const urls = files.map((file) =>
      URL.createObjectURL(file)
    );

    setPromotionPreviewUrls(urls);

    return () => {
      urls.forEach((url) =>
        URL.revokeObjectURL(url)
      );
    };
  }, [editingPromotion?.newImages]);

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    let mounted = true;

    const id = getBusinessId(
      searchParams
    );

    setBusinessId(id);

    async function load() {
      if (!id) {
        if (mounted) {
          setConnected(false);
          setLoading(false);
          setError(
            "Your business ID could not be found."
          );
        }

        return;
      }

      try {
        const {
          data: sessionData,
        } =
          await supabase.auth.getSession();

        const token =
          sessionData?.session
            ?.access_token || "";

        const headers = token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {};

        const response = await fetch(
          `/api/voice-settings?businessId=${encodeURIComponent(
            id
          )}`,
          {
            cache: "no-store",
            credentials: "include",
            headers,
          }
        );

        const data =
          await response
            .json()
            .catch(() => null);

        if (!mounted) return;

        if (
          !response.ok ||
          data?.success !== true
        ) {
          setConnected(false);
          setError(
            data?.error ||
              "Unable to load voice settings."
          );

          return;
        }

        setConnected(
          data.whatsappConnected === true
        );

        setGender(
          data.settings?.voice_gender ||
            "female"
        );

        setAccent(
          data.settings?.voice_accent ||
            "american"
        );

        await Promise.all([
          loadProducts(id),
          loadPromotions(id),
        ]);
      } catch (loadError) {
        console.error(
          "[Voice Settings] Load failed:",
          loadError
        );

        if (mounted) {
          setConnected(false);
          setError(
            loadError?.message ||
              "Unable to check your WhatsApp connection."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  /* ============================================================
     AUTH
  ============================================================ */

  async function getAuthHeaders() {
    try {
      const { data } =
        await supabase.auth.getSession();

      const token =
        data?.session?.access_token || "";

      return token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {};
    } catch {
      return {};
    }
  }

  /* ============================================================
     PRODUCTS
  ============================================================ */

  function updateProductImageSubscription(
    subscription
  ) {
    const imageUsage =
      subscription?.productImages ||
      subscription?.product_images ||
      subscription?.images ||
      null;

    if (!imageUsage) return;

    const limit = Number(
      imageUsage.limit
    );

    const used = Number(
      imageUsage.used
    );

    const remaining = Number(
      imageUsage.remaining
    );

    if (
      Number.isFinite(limit) &&
      limit >= 0
    ) {
      setProductImageLimit(limit);
    }

    if (
      Number.isFinite(used) &&
      used >= 0
    ) {
      setProductImageUsage(used);
    }

    if (
      Number.isFinite(remaining) &&
      remaining >= 0
    ) {
      setProductImageRemaining(
        remaining
      );
    } else if (
      Number.isFinite(limit) &&
      Number.isFinite(used)
    ) {
      setProductImageRemaining(
        getRemaining(used, limit)
      );
    }

    if (subscription?.plan) {
      setProductSubscriptionPlan(
        normalisePlan(
          subscription.plan
        )
      );
    }
  }

  async function loadProducts(
    id = businessId
  ) {
    if (!id) return;

    setProductsLoading(true);

    try {
      const headers =
        await getAuthHeaders();

      const response = await fetch(
        `/api/business-products/manage?businessId=${encodeURIComponent(
          id
        )}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers,
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Unable to load your product catalog."
        );
      }

      setProducts(
        Array.isArray(data.products)
          ? data.products
          : []
      );

      updateProductImageSubscription(
        data.subscription
      );
    } catch (productError) {
      console.error(
        "[Voice Settings] Products load failed:",
        productError
      );

      setError(
        productError?.message ||
          "Unable to load your product catalog."
      );
    } finally {
      setProductsLoading(false);
    }
  }

  function openNewProductModal() {
    setError("");
    setNotice("");
    setNewProductDraft({
      product_name: "",
      price: "",
      currency: "AED",
      category: "",
      availability: "available",
      sku: "",
      description: "",
    });
    setNewProductImages([]);
    setNewProductImagePreviews([]);
    setNewProductModalOpen(true);
  }

  function closeNewProductModal() {
    setNewProductModalOpen(false);
    setNewProductImages([]);
    setNewProductImagePreviews([]);
    setNewProductImagePickerKey((value) => value + 1);
  }

  function handleNewProductImages(event) {
    const files = Array.from(event.target.files || []);

    setNewProductImagePickerKey((value) => value + 1);

    if (!files.length) return;

    const validFiles = files.filter((file) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError(
          `"${file.name}" is not supported. Use JPG, PNG, WEBP or GIF.`
        );
        return false;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError(
          `"${file.name}" is too large. Each image must be 10 MB or smaller.`
        );
        return false;
      }

      return true;
    });

    if (!validFiles.length) return;

    const maximumAllowed = Math.min(
      MAX_IMAGES_PER_UPLOAD,
      Math.max(0, productImageRemaining)
    );

    if (maximumAllowed <= 0) {
      setError(
        `Your ${formatPlanName(
          productSubscriptionPlan
        )} plan has reached its product image limit of ${productImageLimit}.`
      );
      return;
    }

    const selectedFiles = validFiles.slice(0, maximumAllowed);

    if (validFiles.length > maximumAllowed) {
      setNotice(
        `Only ${maximumAllowed} image${
          maximumAllowed === 1 ? "" : "s"
        } can be selected because of your current plan capacity.`
      );
    }

    setNewProductImages(selectedFiles);

    const previews = selectedFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    setNewProductImagePreviews(previews);
    setError("");
  }

  function removeNewProductImage(index) {
    setNewProductImages((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );

    setNewProductImagePreviews((current) => {
      const item = current[index];
      if (item?.url) URL.revokeObjectURL(item.url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function handleNewProductSubmit(event) {
    event.preventDefault();

    const productName = String(
      newProductDraft.product_name || ""
    ).trim();

    if (!productName) {
      setError("Please enter a product name.");
      return;
    }

    if (!businessId) {
      setError("Your business could not be identified. Please refresh the page and try again.");
      return;
    }

    if (newProductDraft.price !== "") {
      const numericPrice = Number(newProductDraft.price);

      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        setError("Please enter a valid product price.");
        return;
      }
    }

    if (newProductImages.length > productImageRemaining) {
      setError(
        `Only ${productImageRemaining} product image${
          productImageRemaining === 1 ? "" : "s"
        } remain on your current plan.`
      );
      return;
    }

    setNewProductSaving(true);
    setError("");
    setNotice("");

    try {
      const headers = await getAuthHeaders();
      const formData = new FormData();

      formData.append("businessId", businessId);
      formData.append("product_name", productName);
      formData.append(
        "description",
        String(newProductDraft.description || "").trim()
      );
      formData.append(
        "price",
        newProductDraft.price === ""
          ? ""
          : String(newProductDraft.price)
      );
      formData.append(
        "currency",
        String(newProductDraft.currency || "AED").trim().toUpperCase()
      );
      formData.append(
        "availability",
        String(newProductDraft.availability || "available").trim()
      );
      formData.append(
        "category",
        String(newProductDraft.category || "").trim()
      );
      formData.append(
        "sku",
        String(newProductDraft.sku || "").trim()
      );
      formData.append("active", "true");

      newProductImages.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch(
        "/api/business-products/manage",
        {
          method: "POST",
          credentials: "include",
          headers,
          body: formData,
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok || data?.success !== true) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Product could not be created. Server returned ${response.status}.`
        );
      }

      updateProductImageSubscription(
        data.subscription || data.imageLimits
      );

      await loadProducts();

      setNotice(
        `✓ ${productName} was added to your product catalog${
          newProductImages.length
            ? ` with ${newProductImages.length} image${
                newProductImages.length === 1 ? "" : "s"
              }`
            : ""
        }.`
      );

      closeNewProductModal();
    } catch (productError) {
      console.error(
        "[Voice Settings] Product creation failed:",
        productError
      );

      setError(
        productError?.message ||
          "Product could not be created."
      );
    } finally {
      setNewProductSaving(false);
    }
  }

  function addProductFromImages(event) {
    handleNewProductImages(event);
    setNewProductModalOpen(true);
  }


  async function saveProductChanges(
    product
  ) {
    if (!product?.id) return;

    setProductSaving(true);
    setError("");
    setNotice("");

    try {
      const headers =
        await getAuthHeaders();

      const response = await fetch(
        "/api/business-products/manage",
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
            ...headers,
          },
          body: JSON.stringify({
            businessId,
            productId: product.id,
            product_name:
              product.product_name || "",
            description:
              product.description || "",
            price:
              product.price === ""
                ? null
                : product.price,
            currency:
              product.currency || "AED",
            availability:
              product.availability ||
              "available",
            promotion:
              product.promotion || "",
            category:
              product.category || "",
            sku:
              product.sku || "",
            active:
              product.active !== false,
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Product could not be updated."
        );
      }

      updateProductImageSubscription(
        data.subscription
      );

      await loadProducts();

      setEditingProduct(null);

      setNotice(
        "Product updated successfully."
      );
    } catch (productError) {
      setError(
        productError?.message ||
          "Product could not be updated."
      );
    } finally {
      setProductSaving(false);
    }
  }

  async function deleteProduct(
    productId
  ) {
    if (
      !productId ||
      productDeleting
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this product and all of its images?"
      );

    if (!confirmed) return;

    setProductDeleting(productId);
    setError("");
    setNotice("");

    try {
      const headers =
        await getAuthHeaders();

      const response = await fetch(
        `/api/business-products/manage?businessId=${encodeURIComponent(
          businessId
        )}&productId=${encodeURIComponent(
          productId
        )}`,
        {
          method: "DELETE",
          credentials: "include",
          headers,
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Product could not be deleted."
        );
      }

      updateProductImageSubscription(
        data.subscription
      );

      await loadProducts();

      setNotice(
        "Product deleted successfully."
      );
    } catch (productError) {
      setError(
        productError?.message ||
          "Product could not be deleted."
      );
    } finally {
      setProductDeleting("");
    }
  }

  async function toggleProduct(product) {
    if (!product?.id) return;

    setError("");
    setNotice("");

    try {
      const headers = await getAuthHeaders();

      const response = await fetch(
        "/api/business-products/manage",
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({
            businessId,
            productId: product.id,
            active: product.active === false,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok || data?.success !== true) {
        throw new Error(
          data?.error ||
            "Product status could not be changed."
        );
      }

      await loadProducts();

      setNotice(
        product.active === false
          ? "Product activated."
          : "Product paused."
      );
    } catch (productError) {
      setError(
        productError?.message ||
          "Product status could not be changed."
      );
    }
  }

  async function uploadProductImages(
    productId,
    event
  ) {
    const files = Array.from(
      event.target.files || []
    );

    setProductImageInputKey(
      (value) => value + 1
    );

    if (!files.length || !productId) {
      return;
    }

    if (productImageRemaining <= 0) {
      setError(
        `Your ${formatPlanName(
          productSubscriptionPlan
        )} plan has reached its product image limit of ${productImageLimit}.`
      );

      return;
    }

    const maximumAllowed =
      Math.min(
        MAX_IMAGES_PER_UPLOAD,
        productImageRemaining
      );

    const selectedFiles = files.slice(
      0,
      maximumAllowed
    );

    if (
      files.length >
      maximumAllowed
    ) {
      setNotice(
        `Only ${maximumAllowed} image${
          maximumAllowed === 1
            ? ""
            : "s"
        } can be uploaded because of your current plan capacity.`
      );
    }

    for (const file of selectedFiles) {
      if (
        !ALLOWED_IMAGE_TYPES.includes(
          file.type
        )
      ) {
        setError(
          `"${file.name}" is not supported. Use JPG, PNG, WEBP or GIF.`
        );

        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError(
          `"${file.name}" is too large. Each image must be 10 MB or smaller.`
        );

        return;
      }
    }

    setProductUploading(true);
    setError("");

    try {
      const headers =
        await getAuthHeaders();

      const formData = new FormData();

      formData.append(
        "businessId",
        businessId
      );

      formData.append(
        "productId",
        productId
      );

      selectedFiles.forEach(
        (file) =>
          formData.append(
            "images",
            file
          )
      );

      const response = await fetch(
        "/api/business-products/manage",
        {
          method: "POST",
          credentials: "include",
          headers,
          body: formData,
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Product images could not be uploaded."
        );
      }

      updateProductImageSubscription(
        data.subscription ||
          data.imageLimits
      );

      await loadProducts();

      if (editingProduct?.id === productId) {
        setEditingProduct(null);
      }

      setNotice(
        `${selectedFiles.length} product image${
          selectedFiles.length === 1
            ? ""
            : "s"
        } uploaded successfully.`
      );
    } catch (uploadError) {
      console.error(
        "[Voice Settings] Product image upload failed:",
        uploadError
      );

      setError(
        uploadError?.message ||
          "Product images could not be uploaded."
      );
    } finally {
      setProductUploading(false);
    }
  }

  async function deleteProductImage(
    productId,
    imageId
  ) {
    if (!productId || !imageId) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const headers =
        await getAuthHeaders();

      const response = await fetch(
        `/api/business-products/manage?businessId=${encodeURIComponent(
          businessId
        )}&productId=${encodeURIComponent(
          productId
        )}&imageId=${encodeURIComponent(
          imageId
        )}`,
        {
          method: "DELETE",
          credentials: "include",
          headers,
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Product image could not be deleted."
        );
      }

      updateProductImageSubscription(
        data.subscription ||
          data.imageLimits
      );

      await loadProducts();

      setNotice(
        "Product image removed successfully."
      );
    } catch (imageError) {
      setError(
        imageError?.message ||
          "Product image could not be deleted."
      );
    }
  }

  /* ============================================================
     PROMOTIONS
  ============================================================ */

  function updatePromotionImageSubscription(
    subscription
  ) {
    const imageUsage =
      subscription?.promotionImages ||
      subscription?.promotion_images ||
      subscription?.images ||
      null;

    if (!imageUsage) return;

    const limit = Number(
      imageUsage.limit
    );

    const used = Number(
      imageUsage.used
    );

    const remaining = Number(
      imageUsage.remaining
    );

    if (
      Number.isFinite(limit) &&
      limit >= 0
    ) {
      setPromotionImageLimit(limit);
    }

    if (
      Number.isFinite(used) &&
      used >= 0
    ) {
      setPromotionImageUsage(used);
    }

    if (
      Number.isFinite(remaining) &&
      remaining >= 0
    ) {
      setPromotionImageRemaining(
        remaining
      );
    } else if (
      Number.isFinite(limit) &&
      Number.isFinite(used)
    ) {
      setPromotionImageRemaining(
        getRemaining(used, limit)
      );
    }

    if (subscription?.plan) {
      setPromotionSubscriptionPlan(
        normalisePlan(
          subscription.plan
        )
      );
    }
  }

  async function loadPromotions(
    id = businessId
  ) {
    if (!id) return;

    setPromotionsLoading(true);

    try {
      const headers =
        await getAuthHeaders();

      const response = await fetch(
        `/api/business-promotions?businessId=${encodeURIComponent(
          id
        )}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers,
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Unable to load promotions."
        );
      }

      setPromotions(
        Array.isArray(
          data.promotions
        )
          ? data.promotions
          : []
      );

      updatePromotionImageSubscription(
        data.subscription
      );
    } catch (promotionError) {
      console.error(
        "[Voice Settings] Promotions load failed:",
        promotionError
      );

      setError(
        promotionError?.message ||
          "Unable to load promotions."
      );
    } finally {
      setPromotionsLoading(false);
    }
  }

  function openNewPromotion() {
    setEditingPromotion({
      id: "",
      title: "",
      description: "",
      price: "",
      currency: "AED",
      promotion_type: "promotion",
      valid_from: "",
      valid_until: "",
      active: true,
      images: [],
      newImages: [],
    });
  }

  function openEditPromotion(
    promotion
  ) {
    setEditingPromotion({
      ...promotion,
      price:
        promotion?.price ?? "",
      valid_from:
        toDateInputValue(
          promotion?.valid_from
        ),
      valid_until:
        toDateInputValue(
          promotion?.valid_until
        ),
      newImages: [],
    });
  }

  async function savePromotion(
    promotion
  ) {
    if (
      !promotion?.title?.trim()
    ) {
      setError(
        "Please enter a promotion title."
      );

      return;
    }

    const requestedNewImages =
      Array.isArray(
        promotion.newImages
      )
        ? promotion.newImages.filter(
            Boolean
          )
        : [];

    if (
      requestedNewImages.length >
      promotionImageRemaining
    ) {
      setError(
        `Your current plan only has ${promotionImageRemaining} promotion image${
          promotionImageRemaining === 1
            ? ""
            : "s"
        } remaining.`
      );

      return;
    }

    const newImages =
      requestedNewImages.slice(
        0,
        MAX_IMAGES_PER_UPLOAD
      );

    const validFromISO =
      dateInputToISO(
        promotion.valid_from,
        false
      );

    const validUntilISO =
      dateInputToISO(
        promotion.valid_until,
        true
      );

    if (
      promotion.valid_from &&
      !validFromISO
    ) {
      setError(
        "Please choose a valid promotion start date."
      );

      return;
    }

    if (
      promotion.valid_until &&
      !validUntilISO
    ) {
      setError(
        "Please choose a valid promotion expiry date."
      );

      return;
    }

    if (
      validFromISO &&
      validUntilISO &&
      new Date(validUntilISO) <
        new Date(validFromISO)
    ) {
      setError(
        "Expiry date must be after the start date."
      );

      return;
    }

    for (const file of newImages) {
      if (
        !ALLOWED_IMAGE_TYPES.includes(
          file.type
        )
      ) {
        setError(
          `"${file.name}" is not supported. Use JPG, PNG, WEBP or GIF.`
        );

        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError(
          `"${file.name}" is too large. Each image must be 10 MB or smaller.`
        );

        return;
      }
    }

    setPromotionSaving(true);
    setError("");
    setNotice("");

    try {
      const headers =
        await getAuthHeaders();

      const isEdit =
        Boolean(promotion.id);

      if (!isEdit) {
        const formData =
          new FormData();

        formData.append(
          "businessId",
          businessId
        );

        formData.append(
          "title",
          promotion.title.trim()
        );

        formData.append(
          "description",
          promotion.description || ""
        );

        formData.append(
          "price",
          promotion.price === "" ||
            promotion.price === null ||
            promotion.price ===
              undefined
            ? ""
            : String(promotion.price)
        );

        formData.append(
          "currency",
          promotion.currency || "AED"
        );

        formData.append(
          "promotion_type",
          promotion.promotion_type ||
            "promotion"
        );

        formData.append(
          "valid_from",
          validFromISO || ""
        );

        formData.append(
          "valid_until",
          validUntilISO || ""
        );

        formData.append(
          "active",
          promotion.active !== false
            ? "true"
            : "false"
        );

        newImages.forEach(
          (file) =>
            formData.append(
              "images",
              file
            )
        );

        const response =
          await fetch(
            "/api/business-promotions",
            {
              method: "POST",
              credentials: "include",
              headers,
              body: formData,
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (
          !response.ok ||
          data?.success !== true
        ) {
          throw new Error(
            data?.error ||
              "Promotion could not be created."
          );
        }

        updatePromotionImageSubscription(
          data.subscription ||
            data.imageLimits
        );
      } else {
        const payload = {
          businessId,
          promotionId:
            promotion.id,
          title:
            promotion.title.trim(),
          description:
            promotion.description ||
            "",
          price:
            promotion.price === ""
              ? null
              : promotion.price,
          currency:
            promotion.currency ||
            "AED",
          promotion_type:
            promotion.promotion_type ||
            "promotion",
          valid_from:
            validFromISO,
          valid_until:
            validUntilISO,
          active:
            promotion.active !==
            false,
        };

        const response =
          await fetch(
            "/api/business-promotions",
            {
              method: "PATCH",
              credentials: "include",
              headers: {
                "Content-Type":
                  "application/json",
                ...headers,
              },
              body: JSON.stringify(
                payload
              ),
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (
          !response.ok ||
          data?.success !== true
        ) {
          throw new Error(
            data?.error ||
              "Promotion could not be updated."
          );
        }

        if (
          newImages.length > 0
        ) {
          const imageFormData =
            new FormData();

          imageFormData.append(
            "businessId",
            businessId
          );

          imageFormData.append(
            "promotionId",
            promotion.id
          );

          newImages.forEach(
            (file) =>
              imageFormData.append(
                "images",
                file
              )
          );

          const imageResponse =
            await fetch(
              "/api/business-promotions",
              {
                method: "POST",
                credentials:
                  "include",
                headers,
                body: imageFormData,
              }
            );

          const imageData =
            await imageResponse
              .json()
              .catch(() => null);

          if (
            !imageResponse.ok ||
            imageData?.success !== true
          ) {
            throw new Error(
              imageData?.error ||
                "Promotion images could not be uploaded."
            );
          }

          updatePromotionImageSubscription(
            imageData.subscription ||
              imageData.imageLimits
          );
        }
      }

      await loadPromotions();

      setEditingPromotion(null);

      setNotice(
        isEdit
          ? newImages.length > 0
            ? "Promotion updated and images attached successfully."
            : "Promotion updated successfully."
          : newImages.length > 0
            ? "Promotion created with images successfully."
            : "Promotion created successfully."
      );
    } catch (promotionError) {
      console.error(
        "[Voice Settings] Promotion save failed:",
        promotionError
      );

      setError(
        promotionError?.message ||
          "Promotion could not be saved."
      );
    } finally {
      setPromotionSaving(false);
    }
  }

  async function togglePromotion(
    promotion
  ) {
    if (!promotion?.id) return;

    setError("");
    setNotice("");

    try {
      const headers =
        await getAuthHeaders();

      const response =
        await fetch(
          "/api/business-promotions",
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
              ...headers,
            },
            body: JSON.stringify({
              businessId,
              promotionId:
                promotion.id,
              active:
                promotion.active ===
                false,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Promotion status could not be changed."
        );
      }

      await loadPromotions();

      setNotice(
        promotion.active === false
          ? "Promotion activated."
          : "Promotion paused."
      );
    } catch (promotionError) {
      setError(
        promotionError?.message ||
          "Promotion status could not be changed."
      );
    }
  }

  async function deletePromotion(
    promotionId
  ) {
    if (
      !promotionId ||
      promotionDeleting
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this promotion and all of its flyers?"
      );

    if (!confirmed) return;

    setPromotionDeleting(
      promotionId
    );

    setError("");
    setNotice("");

    try {
      const headers =
        await getAuthHeaders();

      const response =
        await fetch(
          `/api/business-promotions?businessId=${encodeURIComponent(
            businessId
          )}&promotionId=${encodeURIComponent(
            promotionId
          )}`,
          {
            method: "DELETE",
            credentials: "include",
            headers,
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Promotion could not be deleted."
        );
      }

      updatePromotionImageSubscription(
        data.subscription ||
          data.imageLimits
      );

      await loadPromotions();

      setNotice(
        "Promotion deleted successfully."
      );
    } catch (promotionError) {
      setError(
        promotionError?.message ||
          "Promotion could not be deleted."
      );
    } finally {
      setPromotionDeleting("");
    }
  }

  async function uploadPromotionImages(
    promotionId,
    event
  ) {
    const files = Array.from(
      event.target.files || []
    );

    setPromotionImageInputKey(
      (value) => value + 1
    );

    if (
      !files.length ||
      !promotionId
    ) {
      return;
    }

    if (
      promotionImageRemaining <= 0
    ) {
      setError(
        `Your ${formatPlanName(
          promotionSubscriptionPlan
        )} plan has reached its promotion image limit of ${promotionImageLimit}.`
      );

      return;
    }

    const maximumAllowed =
      Math.min(
        MAX_IMAGES_PER_UPLOAD,
        promotionImageRemaining
      );

    const selectedFiles =
      files.slice(
        0,
        maximumAllowed
      );

    for (const file of selectedFiles) {
      if (
        !ALLOWED_IMAGE_TYPES.includes(
          file.type
        )
      ) {
        setError(
          `"${file.name}" is not supported. Use JPG, PNG, WEBP or GIF.`
        );

        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError(
          `"${file.name}" is too large. Each image must be 10 MB or smaller.`
        );

        return;
      }
    }

    setPromotionUploading(true);
    setError("");
    setNotice("");

    try {
      const headers =
        await getAuthHeaders();

      const formData =
        new FormData();

      formData.append(
        "businessId",
        businessId
      );

      formData.append(
        "promotionId",
        promotionId
      );

      selectedFiles.forEach(
        (file) =>
          formData.append(
            "images",
            file
          )
      );

      const response =
        await fetch(
          "/api/business-promotions",
          {
            method: "POST",
            credentials: "include",
            headers,
            body: formData,
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Promotion flyer could not be uploaded."
        );
      }

      updatePromotionImageSubscription(
        data.subscription ||
          data.imageLimits
      );

      await loadPromotions();

      setNotice(
        `${selectedFiles.length} flyer${
          selectedFiles.length === 1
            ? ""
            : "s"
        } uploaded successfully.`
      );
    } catch (uploadError) {
      setError(
        uploadError?.message ||
          "Promotion flyer could not be uploaded."
      );
    } finally {
      setPromotionUploading(false);
    }
  }

  async function deletePromotionImage(
    promotionId,
    imageId
  ) {
    if (
      !promotionId ||
      !imageId
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const headers =
        await getAuthHeaders();

      const response =
        await fetch(
          `/api/business-promotions?businessId=${encodeURIComponent(
            businessId
          )}&promotionId=${encodeURIComponent(
            promotionId
          )}&imageId=${encodeURIComponent(
            imageId
          )}`,
          {
            method: "DELETE",
            credentials: "include",
            headers,
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Promotion flyer could not be deleted."
        );
      }

      updatePromotionImageSubscription(
        data.subscription ||
          data.imageLimits
      );

      await loadPromotions();

      setNotice(
        "Promotion flyer removed successfully."
      );
    } catch (imageError) {
      setError(
        imageError?.message ||
          "Promotion flyer could not be deleted."
      );
    }
  }

  /* ============================================================
     VOICE SETTINGS
  ============================================================ */

  async function save(
    nextGender = gender,
    nextAccent = accent
  ) {
    if (!voiceChangeAllowed) {
      setNotice("");
      setError("Voice customization is available on the Business and Pro plans. Upgrade your plan to change the voice.");
      return;
    }

    if (!connected) {
      setNotice("");
      setError(
        "Connect WhatsApp first before changing voice settings."
      );

      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response =
        await fetch(
          "/api/voice-settings",
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
              ...(await getAuthHeaders()),
            },
            body: JSON.stringify({
              businessId,
              voice_gender:
                nextGender,
              voice_accent:
                nextAccent,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        if (
          data?.code ===
          "WHATSAPP_NOT_CONNECTED"
        ) {
          setConnected(false);
        }

        throw new Error(
          data?.error ||
            "Voice settings could not be saved."
        );
      }

      setGender(
        data.settings?.voice_gender ||
          nextGender
      );

      setAccent(
        data.settings?.voice_accent ||
          nextAccent
      );

      setNotice(
        "Voice settings saved. New WhatsApp voice replies will use this profile."
      );
    } catch (saveError) {
      setError(
        saveError?.message ||
          "Voice settings could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  function chooseGender(value) {
    if (!voiceChangeAllowed) {
      setError("Voice customization is available on the Business and Pro plans. Upgrade your plan to change the voice.");
      return;
    }

    if (!connected) {
      setError(
        "Connect WhatsApp first before selecting a voice."
      );

      return;
    }

    setGender(value);
    save(value, accent);
  }

  function chooseAccent(value) {
    if (!voiceChangeAllowed) {
      setError("Voice customization is available on the Business and Pro plans. Upgrade your plan to change the accent.");
      return;
    }

    if (!connected) {
      setError(
        "Connect WhatsApp first before selecting an accent."
      );

      return;
    }

    setAccent(value);
    save(gender, value);
  }

  function goBackToChannels() {
    if (businessId) {
      router.push(
        `/channels?businessId=${encodeURIComponent(
          businessId
        )}`
      );
    } else {
      router.push("/channels");
    }
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-black">

      {/* ========================================================
          BACKGROUND DECORATION
      ======================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-60">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-[420px] w-[420px] rounded-full bg-cyan-200/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-lime-100/20 blur-3xl" />
      </div>

      <div className="mx-auto min-h-screen max-w-[1540px] bg-white px-4 py-4 sm:px-6 lg:px-8 lg:py-5">

        <header className="mb-4 flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-100 sm:px-6">
          <div className="flex items-center gap-2 text-2xl font-black tracking-tight text-[#0b2530]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-xl text-white">S</span>
            <span>Sodah<span className="text-emerald-500">.io</span></span>
          </div>
          <div className="hidden items-center gap-2 text-xs font-semibold text-slate-500 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> AI Assistant · Voice Settings
          </div>
        </header>

        {/* ======================================================
            HERO
        ====================================================== */}

        <section className="relative mb-3 overflow-hidden rounded-[28px] border border-emerald-800 bg-gradient-to-br from-[#032f25] via-[#004b38] to-[#006b4d] text-white shadow-[0_18px_42px_rgba(0,55,39,0.24)]">

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_20%,rgba(16,185,129,0.24),transparent_30%),radial-gradient(circle_at_20%_100%,rgba(52,211,153,0.14),transparent_35%)]" />

          <div className="relative px-6 py-5 sm:px-8 lg:px-10 lg:py-6">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <button
                  type="button"
                  onClick={goBackToChannels}
                  className="mb-3 rounded-xl border border-emerald-900/10 bg-white/70 px-4 py-2 text-xs font-black text-emerald-900 backdrop-blur transition hover:bg-white"
                >
                  ← &nbsp; Back to Channels
                </button>

                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                  WhatsApp AI · Voice Studio
                </div>

                <h1 className="mt-2 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                  Voice Settings
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                  Give your AI assistant a natural voice,
                  manage the real products it can recommend,
                  and keep your offers ready for customers.
                </p>
              </div>

              <div className="flex min-w-0 items-center justify-center gap-4 lg:gap-6">
                <div className="hidden h-20 w-20 items-center justify-center rounded-full bg-[#20c967] text-5xl text-white shadow-lg sm:flex" aria-label="WhatsApp">☎</div>
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-[34px] border border-emerald-200/30 bg-white/95 shadow-[0_12px_35px_rgba(0,0,0,0.22)] sm:h-36 sm:w-36">
                  <div className="text-5xl" role="img" aria-label="AI assistant">🤖</div>
                  <div className="mt-1 flex gap-1"><span className="h-1.5 w-4 rounded-full bg-emerald-400"/><span className="h-1.5 w-4 rounded-full bg-emerald-300"/><span className="h-1.5 w-4 rounded-full bg-emerald-200"/></div>
                </div>
                <div className="hidden max-w-[190px] rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-5 text-slate-950 shadow-md md:block">Hello! 👋<br/>How can I help you today?</div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">

                {!connected &&
                  !loading && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/connect-whatsapp/load?businessId=${encodeURIComponent(
                            businessId
                          )}`
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-3.5 text-xs font-black text-[#053b2d] shadow-[0_12px_30px_rgba(52,211,153,0.22)] transition hover:-translate-y-0.5 hover:bg-emerald-300"
                    >
                      <span>◉</span>
                      Connect WhatsApp
                      <span>→</span>
                    </button>
                  )}

                <div
                  className={`inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-xs font-black backdrop-blur ${
                    connected
                      ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                      : "border-amber-300/30 bg-amber-400/15 text-amber-100"
                  }`}
                >
                  <span
                    className={`mr-2.5 h-2.5 w-2.5 rounded-full ${
                      connected
                        ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]"
                        : "bg-amber-400"
                    }`}
                  />
                  WhatsApp{" "}
                  {connected
                    ? "Connected"
                    : "Not Connected"}
                </div>

              </div>
            </div>

            {/* Hero mini stats */}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">

              <button
                type="button"
                onClick={() => document.getElementById("voice-products-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="group relative flex min-h-[112px] items-center gap-4 overflow-hidden rounded-2xl border border-cyan-300/80 bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700 p-4 text-left text-white shadow-[0_12px_28px_rgba(14,165,233,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(14,165,233,0.32)] focus:outline-none focus:ring-2 focus:ring-cyan-200"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-300/25 text-3xl ring-1 ring-white/25">▣</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">Products</span>
                  <span className="mt-1 block text-2xl font-black">{products.length}</span>
                  <span className="mt-1 block text-xs font-medium text-blue-100">{activeProducts.length} active</span>
                </span>
                <span aria-hidden="true" className="text-3xl font-light text-white transition-transform group-hover:translate-x-1">›</span>
              </button>

              <button
                type="button"
                onClick={() => document.getElementById("voice-knowledge-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="group relative flex min-h-[112px] items-center gap-4 overflow-hidden rounded-2xl border border-amber-300/90 bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 p-4 text-left text-white shadow-[0_12px_28px_rgba(249,115,22,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(249,115,22,0.32)] focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-200/30 text-3xl ring-1 ring-white/25">◇</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-amber-50">Offers</span>
                  <span className="mt-1 block text-2xl font-black">{promotions.length}</span>
                  <span className="mt-1 block text-xs font-medium text-orange-50">{activePromotions.length} active</span>
                </span>
                <span aria-hidden="true" className="text-3xl font-light text-white transition-transform group-hover:translate-x-1">›</span>
              </button>

              <button
                type="button"
                onClick={() => document.getElementById("voice-profile-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="group relative flex min-h-[112px] items-center gap-4 overflow-hidden rounded-2xl border border-fuchsia-300/80 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-violet-700 p-4 text-left text-white shadow-[0_12px_28px_rgba(168,85,247,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(168,85,247,0.34)] focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-fuchsia-200/25 text-3xl ring-1 ring-white/25">〽</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-purple-100">Voice</span>
                  <span className="mt-1 block text-2xl font-black">{selectedGender.title}</span>
                  <span className="mt-1 block text-xs font-medium text-purple-100">{selectedAccent.title}</span>
                </span>
                <span aria-hidden="true" className="text-3xl font-light text-white transition-transform group-hover:translate-x-1">›</span>
              </button>

            </div>
          </div>
        </section>

        {/* ======================================================
            NOTICES
        ====================================================== */}

        {notice && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                ✓
              </span>
              {notice}
            </div>
          </div>
        )}

        {error && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="voice-settings-error-title"
            aria-describedby="voice-settings-error-message"
            onClick={() => setError("")}
          >
            <div
              className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl font-black text-red-600">!</div>
              <h2 id="voice-settings-error-title" className="mt-4 text-center text-lg font-black text-slate-900">Something needs your attention</h2>
              <p id="voice-settings-error-message" className="mt-2 whitespace-pre-wrap text-center text-sm leading-6 text-slate-600">{error}</p>
              <button
                type="button"
                autoFocus
                onClick={() => setError("")}
                className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300"
              >
                Okay, got it
              </button>
            </div>
          </div>
        )}

        {/* ======================================================
            VOICE PROFILE
        ====================================================== */}

        <section id="voice-profile-section" className="mb-6 overflow-hidden rounded-[30px] border border-emerald-900/15 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">

          <div className="border-b border-emerald-900/5 bg-[linear-gradient(135deg,#ffffff,#eafbf3)] px-6 py-6 sm:px-8">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">
                  01 · AI Voice Profile
                </div>

                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Make Sodah sound human.
                </h2>

                <p className="mt-1 text-sm text-slate-700">
                  Choose the voice and accent used for
                  WhatsApp voice replies.
                </p>
                {!voiceChangeAllowed && (
                  <div className="mt-3 flex max-w-2xl items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 shadow-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-950" aria-hidden="true">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                    </span>
                    <span>
                      <span className="block font-black">Voice customization is locked on your current plan.</span>
                      <span className="mt-1 block text-amber-900">Upgrade to Business or Pro to change the voice and accent. Your current voice remains active.</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
                <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                  Current
                </div>
                <div className="mt-1 text-sm font-black text-emerald-800">
                  {selectedGender.title} ·{" "}
                  {selectedAccent.title}
                </div>
              </div>

            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2">

            {/* Gender */}

            <div>
              <div className="mb-4">
                <div className="text-xs font-black text-slate-700">
                  VOICE
                </div>

                <div className="mt-1 text-sm font-bold">
                  Choose a voice
                </div>
              </div>

              <div className="grid gap-3">
                {GENDERS.map(
                  (item) => {
                    const selected =
                      gender ===
                      item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={
                          !connected ||
                          !voiceChangeAllowed ||
                          saving
                        }
                        onClick={() =>
                          chooseGender(
                            item.id
                          )
                        }
                        className={`group flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-emerald-400 bg-emerald-50 shadow-[0_10px_30px_rgba(16,185,129,0.08)]"
                            : "border-emerald-900/15 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"
                        } ${
                          !connected || !voiceChangeAllowed
                            ? "cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
                              selected
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {item.icon}
                          </div>

                          <div>
                            <div className="font-black">
                              {item.title}
                            </div>

                            <div className="mt-1 text-xs text-slate-700">
                              {
                                item.description
                              }
                            </div>
                          </div>
                        </div>

                        {!voiceChangeAllowed ? (
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300 bg-amber-100 text-amber-950" title="Upgrade to unlock voice selection" aria-label="Locked: upgrade plan">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                          </span>
                        ) : (
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                              selected
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-black/15"
                            }`}
                          >
                            {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Accent */}

            <div>
              <div className="mb-4">
                <div className="text-xs font-black text-slate-700">
                  ACCENT
                </div>

                <div className="mt-1 text-sm font-bold">
                  Choose an accent
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {ACCENTS.map(
                  (item) => {
                    const selected =
                      accent ===
                      item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={
                          !connected ||
                          !voiceChangeAllowed ||
                          saving
                        }
                        onClick={() =>
                          chooseAccent(
                            item.id
                          )
                        }
                        className={`rounded-2xl border p-3 text-center transition ${
                          selected
                            ? "border-emerald-400 bg-emerald-50 shadow-sm"
                            : "border-emerald-900/15 bg-white hover:border-emerald-300"
                        } ${
                          !connected || !voiceChangeAllowed
                            ? "cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center gap-1 text-center">
                          <div className="text-3xl leading-none" aria-hidden="true">{item.flag}</div>
                          <div className="font-black">
                            {item.title}
                          </div>

                          {!voiceChangeAllowed ? (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-950">
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
                              Upgrade to unlock
                            </span>
                          ) : (
                            <span
                              className={`h-3 w-3 rounded-full border-2 ${
                                selected
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-black/15"
                              }`}
                            />
                          )}
                        </div>

                        <div className="mt-2 text-xs leading-5 text-slate-700">
                          {
                            item.description
                          }
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

          </div>
        </section>

        {/* ======================================================
            VOICE PREVIEW
        ====================================================== */}
        <section className="mb-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5" aria-label="Voice preview">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700" aria-hidden="true">🎧</span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Voice test</p>
                <h2 className="mt-1 text-base font-black text-[#092f28]">Hear the selected voice</h2>
                <p className="text-sm text-slate-500">Preview how your selected voice and accent sound before saving.</p>
              </div>
            </div>
            <button type="button" onClick={playVoicePreview} disabled={previewPlaying} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
              {previewPlaying ? "▶ Playing preview…" : "▶ Play selected voice"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-700">Preview uses your browser’s available speech voice; the final WhatsApp voice may sound different.</p>
        </section>

        {/* ======================================================
            AI MEDIA
        ====================================================== */}

        <section id="voice-knowledge-section" className="mb-6 overflow-hidden rounded-[30px] border border-emerald-900/15 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">

          <div className="border-b border-emerald-900/5 bg-[linear-gradient(135deg,#ffffff,#eafbf3)] px-6 py-7 sm:px-8">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">
                  03 · AI Knowledge
                </div>

                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  AI Media &amp; Content
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                  Give your WhatsApp AI the real products,
                  promotional offers it
                  can share with customers.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                  {products.length} products
                </div>

                <div className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700">
                  {activePromotions.length} active offers
                </div>
              </div>

            </div>
          </div>

          <div className="p-5 sm:p-8">

            {/* ==================================================
                SUBSCRIPTION IMAGE USAGE
            ================================================== */}

            <div className="mb-6 rounded-[24px] border-2 border-emerald-900/20 bg-[#dcebdc] p-3 shadow-[0_10px_28px_rgba(6,59,45,0.07)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1.5 block px-1 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-800">
                    Search product &amp; promotion images
                  </label>
                  <input
                    type="search"
                    value={mediaSearch}
                    onChange={(event) => {
                      setMediaSearch(event.target.value);
                      setMediaSearchOpen(true);
                    }}
                    onFocus={() => setMediaSearchOpen(true)}
                    placeholder="Search by product, offer or image name..."
                    className="h-12 w-full rounded-2xl border-2 border-emerald-900/15 bg-[#f4f0e6] px-4 text-sm font-bold text-[#073b2d] outline-none transition placeholder:text-emerald-950/35 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMediaSearchOpen(true)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-emerald-800 bg-[#075b43] px-6 text-xs font-black text-white shadow-[0_10px_25px_rgba(6,91,67,0.20)] transition hover:-translate-y-0.5 hover:bg-[#064c39]"
                >
                  🔎 Search
                </button>
              </div>
              {mediaSearchOpen && mediaSearch.trim() ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-900/10 bg-white px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-emerald-950">
                      Showing {mediaSearchResults.products.length} products and {mediaSearchResults.promotions.length} promotions matching “{mediaSearch}”
                    </div>

                    {mediaSearchResults.images?.length ? (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {mediaSearchResults.images.map((image, index) => (
                          <div
                            key={`${image.id || image.image_url || index}-search`}
                            className="w-24 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-900/10 bg-[#e8f2e8] shadow-sm"
                          >
                            <img
                              src={image.signed_url || image.image_url}
                              alt={image.mediaTitle || "Matched media"}
                              className="h-20 w-full object-cover"
                            />
                            <div className="truncate px-2 py-1.5 text-[8px] font-black text-emerald-950">
                              {image.mediaTitle}
                            </div>
                            <div className="px-2 pb-1.5 text-[7px] font-black uppercase tracking-wider text-emerald-600">
                              {image.mediaType}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaSearch("");
                      setMediaSearchOpen(false);
                    }}
                    className="rounded-xl border border-emerald-900/15 bg-[#e8f2e8] px-3 py-2 text-[10px] font-black text-emerald-900 hover:bg-[#dcebdc]"
                  >
                    Clear search
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">

              {/* Product usage */}

              <div className="rounded-[25px] border border-emerald-200/80 bg-[linear-gradient(135deg,#dcfce7,#f0fdf4_55%,#ffffff)] p-5 shadow-[0_12px_35px_rgba(16,185,129,0.08)]">

                <div className="flex items-start justify-between gap-4">

                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-lg text-white shadow-lg shadow-emerald-400/25">
                      🖼️
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        Product images
                      </div>

                      <div className="mt-1 text-sm font-black">
                        Catalog image capacity
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#f4f0e6] px-3 py-2 text-right shadow-sm">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-700">
                      {formatPlanName(
                        productSubscriptionPlan
                      )}
                    </div>

                    <div className="mt-0.5 text-xs font-black text-emerald-700">
                      {productImageUsage} /{" "}
                      {productImageLimit}
                    </div>
                  </div>

                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                    style={{
                      width: `${productUsagePercentage}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-700">
                    {productUsagePercentage}% used
                  </span>

                  <span
                    className={
                      productImageRemaining <= 0
                        ? "text-red-600"
                        : "text-emerald-700"
                    }
                  >
                    {productImageRemaining} remaining
                  </span>
                </div>

              </div>

              {/* Promotion usage */}

              <div className="rounded-[25px] border border-cyan-200/80 bg-[linear-gradient(135deg,#e0f7ff,#effcff_55%,#ffffff)] p-5 shadow-[0_12px_35px_rgba(14,165,233,0.08)]">

                <div className="flex items-start justify-between gap-4">

                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-lg text-white shadow-lg shadow-cyan-400/25">
                      ✨
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-cyan-600">
                        Promotion images
                      </div>

                      <div className="mt-1 text-sm font-black">
                        Offer image capacity
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#f4f0e6] px-3 py-2 text-right shadow-sm">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-700">
                      {formatPlanName(
                        promotionSubscriptionPlan
                      )}
                    </div>

                    <div className="mt-0.5 text-xs font-black text-cyan-700">
                      {promotionImageUsage} /{" "}
                      {promotionImageLimit}
                    </div>
                  </div>

                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-cyan-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-500 transition-all duration-500"
                    style={{
                      width: `${promotionUsagePercentage}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-700">
                    {promotionUsagePercentage}% used
                  </span>

                  <span
                    className={
                      promotionImageRemaining <= 0
                        ? "text-red-600"
                        : "text-cyan-700"
                    }
                  >
                    {promotionImageRemaining} remaining
                  </span>
                </div>

              </div>

            </div>

            {/* ==================================================
                TWO COLUMNS
            ================================================== */}

            <div className="grid items-stretch gap-5 xl:grid-cols-2">

              {/* =================================================
                  PRODUCT CATALOG
              ================================================= */}

              <div id="voice-products-section" className="flex h-[620px] min-h-0 flex-col overflow-hidden rounded-[27px] border border-emerald-200 bg-[#f4f0e6] shadow-[0_14px_45px_rgba(15,23,42,0.08)]">

                <div className="border-b border-emerald-900/5 bg-[#f4f0e6]/90 p-5">

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-xl">
                        🛍️
                      </div>

                      <div>
                        <h3 className="font-black">
                          Product Catalog
                        </h3>

                        <p className="mt-1 text-xs text-slate-700">
                          Real products your AI can recommend.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
                        <div className="text-lg font-black text-emerald-700">
                          {products.length}
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-wider text-emerald-600/70">
                          Products
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openNewProductModal}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-500 bg-emerald-500 px-4 py-2 text-[10px] font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-md"
                      >
                        <span>＋</span>
                        Add product
                      </button>
                    </div>

                  </div>

                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pr-3">

                  {productsLoading ? (
                    <div className="rounded-2xl border border-dashed border-emerald-200 bg-[#f4f0e6] p-8 text-center text-xs font-bold text-slate-700">
                      Loading product catalog…
                    </div>
                  ) : products.length ===
                    0 ? (
                    <div className="rounded-2xl border border-emerald-900/15 bg-[#e8f2e8] p-7 text-center shadow-inner">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-2xl shadow-sm">
                        🛍️
                      </div>

                      <div className="mt-4 text-sm font-black text-slate-900">
                        No products yet
                      </div>

                      <div className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500">
                        Choose one or more product photos from your computer.
                        Sodah will add the product to your catalog and attach the selected images automatically.
                      </div>


                    </div>
                  ) : (
                    (mediaSearch.trim()
                      ? mediaSearchResults.products
                      : products
                    ).map(
                      (product) => (
                        <div
                          key={
                            product.id
                          }
                          className="rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] p-4 shadow-[0_6px_22px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                        >

                          <div className="flex gap-3">

                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-emerald-50">
                              {product.images?.[0]
                                ?.signed_url ||
                              product.images?.[0]
                                ?.image_url ? (
                                <img
                                  src={
                                    product
                                      .images?.[0]
                                      ?.signed_url ||
                                    product
                                      .images?.[0]
                                      ?.image_url
                                  }
                                  alt={
                                    product.product_name
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-2xl">
                                  🛍️
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-2">

                                <div className="min-w-0">
                                  <h4 className="truncate font-black">
                                    {
                                      product.product_name
                                    }
                                  </h4>

                                  <div className="mt-1 text-sm font-black text-emerald-700">
                                    {formatPrice(
                                      product.price,
                                      product.currency
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${
                                    product.active !==
                                    false
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-black/5 text-slate-700"
                                  }`}
                                >
                                  {product.active !==
                                  false
                                    ? "ACTIVE"
                                    : "PAUSED"}
                                </span>

                              </div>

                              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-700">
                                <span>
                                  {product.availability ||
                                    "available"}
                                </span>

                                <span>
                                  •
                                </span>

                                <span>
                                  {product.images
                                    ?.length ||
                                    0}{" "}
                                  images
                                </span>
                              </div>

                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-emerald-900/15 bg-[#e8f2e8] p-2.5 shadow-inner">
                            <div className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-700">
                              Product actions
                            </div>

                            <div className="flex flex-wrap gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingProduct(
                                    {
                                      ...product,
                                      price:
                                        product.price ??
                                        "",
                                    }
                                  )
                                }
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-[11px] font-black text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                              >
                                ✎ Edit
                              </button>

                              <label
                                className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-[11px] font-black shadow-sm transition ${
                                  canUploadProductImages
                                    ? "cursor-pointer border-emerald-300 bg-emerald-100 text-emerald-800 hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-md"
                                    : "cursor-not-allowed border-emerald-900/15 bg-slate-100 text-slate-700"
                                }`}
                              >
                                {productUploading
                                  ? "Uploading…"
                                  : "🖼️ Change image"}

                                <input
                                  key={
                                    productImageInputKey
                                  }
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  multiple
                                  className="hidden"
                                  disabled={
                                    !canUploadProductImages
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    uploadProductImages(
                                      product.id,
                                      event
                                    )
                                  }
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingProduct(
                                    {
                                      ...product,
                                      active:
                                        product.active ===
                                        false,
                                    }
                                  )
                                }
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] font-black text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100"
                              >
                                {product.active !==
                                false
                                  ? "⏸ Pause"
                                  : "▶ Activate"}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  productDeleting ===
                                  product.id
                                }
                                onClick={() =>
                                  deleteProduct(
                                    product.id
                                  )
                                }
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-[11px] font-black text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100"
                              >
                                {productDeleting ===
                                product.id
                                  ? "Deleting…"
                                  : "⌫ Delete"}
                              </button>

                            </div>
                          </div>

                          {product.images
                            ?.length >
                            0 && (
                            <div className="mt-4 rounded-2xl border-2 border-emerald-900/10 bg-[#e8f2e8] p-3">
                              <div className="mb-3 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                                Product images
                              </div>
                              <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                                {product.images.map(
                                  (image) => (
                                    <div
                                      key={image.id}
                                      className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 shadow-sm"
                                    >
                                      <div className="relative h-full w-full overflow-hidden">
                                        <img
                                          src={
                                            image.signed_url ||
                                            image.image_url
                                          }
                                          alt={
                                            image.alt_text ||
                                            product.product_name
                                          }
                                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                        />
                                      </div>
                                      <div className="hidden p-2">
                                        <div className="truncate text-[9px] font-black text-emerald-950">
                                          {image.file_name ||
                                            image.filename ||
                                            image.name ||
                                            "Product image"}
                                        </div>
                                        <div className="hidden mt-2 grid grid-cols-2 gap-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingProduct({
                                                ...product,
                                                price: product.price ?? "",
                                              })
                                            }
                                            className="rounded-lg bg-[#dcebdc] px-2 py-1.5 text-[8px] font-black text-emerald-900"
                                          >
                                            ✎ Edit
                                          </button>
                                          <label className="cursor-pointer rounded-lg bg-emerald-600 px-2 py-1.5 text-center text-[8px] font-black text-white">
                                            ↻ Change
                                            <input
                                              key={`${productImageInputKey}-${image.id}`}
                                              type="file"
                                              className="hidden"
                                              accept="image/jpeg,image/png,image/webp,image/gif"
                                              onChange={(event) =>
                                                uploadProductImages(
                                                  product.id,
                                                  event
                                                )
                                              }
                                            />
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => toggleProduct(product)}
                                            className="rounded-lg bg-[#f3ead0] px-2 py-1.5 text-[8px] font-black text-amber-900"
                                          >
                                            {product.active !== false ? "⏸ Pause" : "▶ Play"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              deleteProductImage(
                                                product.id,
                                                image.id
                                              )
                                            }
                                            className="rounded-lg bg-[#f1dfda] px-2 py-1.5 text-[8px] font-black text-red-800"
                                          >
                                            ⌫ Delete
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        </div>
                      )
                    )
                  )}

                </div>
              </div>

              {/* =================================================
                  PROMOTIONS
              ================================================= */}

              <div className="flex h-[620px] min-h-0 flex-col overflow-hidden rounded-[27px] border border-cyan-200 bg-[#f4f0e6] shadow-[0_12px_40px_rgba(15,23,42,0.04)]">

                <div className="border-b border-cyan-900/5 bg-[#f4f0e6]/90 p-5">

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-xl">
                        ✨
                      </div>

                      <div>
                        <h3 className="font-black">
                          Promotions &amp; Packages
                        </h3>

                        <p className="mt-1 text-xs text-slate-700">
                          Time-sensitive offers for your AI.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        openNewPromotion
                      }
                      className="rounded-xl bg-emerald-500 px-4 py-2.5 text-[11px] font-black text-white shadow-lg shadow-emerald-500/15 transition hover:-translate-y-0.5 hover:bg-emerald-600"
                    >
                      + New offer
                    </button>

                  </div>

                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pr-3">

                  {promotionsLoading ? (
                    <div className="rounded-2xl border border-dashed border-cyan-200 bg-[#f4f0e6] p-8 text-center text-xs font-bold text-slate-700">
                      Loading promotions…
                    </div>
                  ) : promotions.length ===
                    0 ? (
                    <div className="rounded-2xl border border-dashed border-cyan-200 bg-[#f4f0e6] p-8 text-center">
                      <div className="text-3xl">
                        ✨
                      </div>

                      <div className="mt-3 text-sm font-black">
                        No promotions yet
                      </div>

                      <div className="mt-1 text-xs leading-5 text-slate-700">
                        Create your first package,
                        discount or special offer.
                      </div>

                      <button
                        type="button"
                        onClick={
                          openNewPromotion
                        }
                        className="mt-4 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-white"
                      >
                        Create promotion
                      </button>
                    </div>
                  ) : (
                    (mediaSearch.trim()
                      ? mediaSearchResults.promotions
                      : promotions
                    ).map(
                      (promotion) => {
                        const expired =
                          promotion.currently_valid ===
                            false &&
                          promotion.valid_until &&
                          new Date(
                            promotion.valid_until
                          ) <
                            new Date();

                        return (
                          <div
                            key={
                              promotion.id
                            }
                            className="rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] p-4 shadow-[0_6px_22px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                          >

                            <div className="flex gap-3">

                              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-cyan-50">
                                {promotion.images?.[0]
                                  ?.signed_url ||
                                promotion.images?.[0]
                                  ?.image_url ? (
                                  <img
                                    src={
                                      promotion
                                        .images?.[0]
                                        ?.signed_url ||
                                      promotion
                                        .images?.[0]
                                        ?.image_url
                                    }
                                    alt={
                                      promotion.title
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-2xl">
                                    ✨
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">

                                <div className="flex items-start justify-between gap-2">

                                  <div className="min-w-0">
                                    <h4 className="truncate font-black">
                                      {
                                        promotion.title
                                      }
                                    </h4>

                                    <div className="mt-1 text-sm font-black text-emerald-700">
                                      {formatPrice(
                                        promotion.price,
                                        promotion.currency
                                      )}
                                    </div>
                                  </div>

                                  <span
                                    className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${
                                      expired
                                        ? "bg-red-50 text-red-600"
                                        : promotion.active !==
                                            false
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-black/5 text-slate-700"
                                    }`}
                                  >
                                    {expired
                                      ? "EXPIRED"
                                      : promotion.active !==
                                          false
                                        ? "ACTIVE"
                                        : "PAUSED"}
                                  </span>

                                </div>

                                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-700">

                                  <span>
                                    {promotion.valid_until
                                      ? `Expires ${formatDate(
                                          promotion.valid_until
                                        )}`
                                      : "No expiry"}
                                  </span>

                                  <span>
                                    •
                                  </span>

                                  <span>
                                    {promotion.images
                                      ?.length ||
                                      0}{" "}
                                    flyers
                                  </span>

                                </div>

                              </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-emerald-900/15 bg-[#e8f2e8] p-2.5 shadow-inner">
                              <div className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-700">
                                Offer actions
                              </div>

                              <div className="flex flex-wrap gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditPromotion(
                                      promotion
                                    )
                                  }
                                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-[11px] font-black text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                                >
                                  ✎ Edit
                                </button>

                                <label
                                  className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-[11px] font-black shadow-sm transition ${
                                    canUploadPromotionImages
                                      ? "cursor-pointer border-cyan-200 bg-cyan-50 text-cyan-700 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-100"
                                      : "cursor-not-allowed border-emerald-900/15 bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  <span className="text-base leading-none">🖼️</span>
                                  {promotionUploading
                                    ? "Uploading…"
                                    : "Offer image"}

                                  <input
                                    key={
                                      promotionImageInputKey
                                    }
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    multiple
                                    className="hidden"
                                    disabled={
                                      !canUploadPromotionImages
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      uploadPromotionImages(
                                        promotion.id,
                                        event
                                      )
                                    }
                                  />
                                </label>

                                <button
                                  type="button"
                                  onClick={() =>
                                    togglePromotion(
                                      promotion
                                    )
                                  }
                                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-[11px] font-black text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100"
                                >
                                  {promotion.active !==
                                  false
                                    ? "⏸ Pause"
                                    : "▶ Activate"}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    promotionDeleting ===
                                    promotion.id
                                  }
                                  onClick={() =>
                                    deletePromotion(
                                      promotion.id
                                    )
                                  }
                                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-[11px] font-black text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100"
                                >
                                  {promotionDeleting ===
                                  promotion.id
                                    ? "Deleting…"
                                    : "⌫ Delete"}
                                </button>

                              </div>
                            </div>

                            {promotion.images
                              ?.length >
                              0 && (
                              <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
                                {promotion.images.map(
                                  (
                                    image
                                  ) => (
                                    <div
                                      key={
                                        image.id
                                      }
                                      className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-cyan-200 bg-cyan-50"
                                    >
                                      <img
                                        src={
                                          image.signed_url ||
                                          image.image_url
                                        }
                                        alt={
                                          image.alt_text ||
                                          promotion.title
                                        }
                                        className="h-full w-full object-cover"
                                      />

                                      <div className="mt-2 grid grid-cols-2 gap-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openEditPromotion(promotion)
                                          }
                                          className="rounded-lg bg-[#dcebed] px-2 py-1.5 text-[8px] font-black text-cyan-900"
                                        >
                                          ✎ Edit
                                        </button>
                                        <label className="cursor-pointer rounded-lg bg-cyan-600 px-2 py-1.5 text-center text-[8px] font-black text-white">
                                          ↻ Change
                                          <input
                                            key={`${promotionImageInputKey}-${image.id}`}
                                            type="file"
                                            className="hidden"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            onChange={(event) =>
                                              uploadPromotionImages(
                                                promotion.id,
                                                event
                                              )
                                            }
                                          />
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            togglePromotion(promotion)
                                          }
                                          className="rounded-lg bg-[#f3ead0] px-2 py-1.5 text-[8px] font-black text-amber-900"
                                        >
                                          {promotion.active !== false ? "⏸ Pause" : "▶ Play"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            deletePromotionImage(
                                              promotion.id,
                                              image.id
                                            )
                                          }
                                          className="rounded-lg bg-[#f1dfda] px-2 py-1.5 text-[8px] font-black text-red-800"
                                        >
                                          ⌫ Delete
                                        </button>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                          </div>
                        );
                      }
                    )
                  )}

                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ======================================================
            CURRENT PROFILE
        ====================================================== */}

        <section className="mb-6 overflow-hidden rounded-[30px] bg-[#063b2d] text-white shadow-[0_25px_80px_rgba(4,72,54,0.18)]">

          <div className="relative p-6 sm:p-8">

            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Current Voice Profile
                </div>

                <h2 className="mt-3 text-2xl font-black">
                  {selectedGender.title} ·{" "}
                  {selectedAccent.title}
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
                  New AI voice replies will use this
                  profile. Existing messages are not changed.
                </p>

              </div>

              <div className="rounded-2xl border border-emerald-300/10 bg-[#f4f0e6]/[0.06] px-5 py-4 backdrop-blur">

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-lg">
                    🎙️
                  </div>

                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/35">
                      WhatsApp voice replies
                    </div>

                    <div className="mt-1 text-sm font-black text-emerald-300">
                      {connected
                        ? "Enabled"
                        : "Waiting for connection"}
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* ======================================================
            NEW PRODUCT MODAL
        ====================================================== */}

        {newProductModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-emerald-900/15 bg-[#f4f0e6] shadow-[0_40px_120px_rgba(15,23,42,0.30)]">

              <div className="sticky top-0 z-10 border-b border-emerald-900/15 bg-[#f4f0e6]/95 px-6 py-5 backdrop-blur sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">
                      Product Catalog
                    </div>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">
                      Add Product
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Add the basic product information customers should see.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeNewProductModal}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleNewProductSubmit}
                className="p-6 sm:p-8"
              >
                <div className="grid gap-4 sm:grid-cols-2">

                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-black text-slate-800">
                      Product name *
                    </span>
                    <input
                      autoFocus
                      value={newProductDraft.product_name}
                      onChange={(event) =>
                        setNewProductDraft((current) => ({
                          ...current,
                          product_name: event.target.value,
                        }))
                      }
                      placeholder="e.g. Premium Car Service"
                      className="w-full rounded-2xl border border-emerald-900/15 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-emerald-400 focus:bg-[#f4f0e6] focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black text-slate-800">
                      Price
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newProductDraft.price}
                      onChange={(event) =>
                        setNewProductDraft((current) => ({
                          ...current,
                          price: event.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="w-full rounded-2xl border border-emerald-900/15 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-emerald-400 focus:bg-[#f4f0e6] focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black text-slate-800">
                      Currency
                    </span>
                    <select
                      value={newProductDraft.currency || "AED"}
                      onChange={(event) => setNewProductDraft((current) => ({ ...current, currency: event.target.value }))}
                      className="w-full rounded-2xl border border-emerald-900/15 bg-white px-4 py-3.5 text-sm font-medium outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    >
                      {CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.label}</option>)}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black text-slate-800">
                      Category
                    </span>
                    <input
                      value={newProductDraft.category}
                      onChange={(event) =>
                        setNewProductDraft((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      placeholder="e.g. Services"
                      className="w-full rounded-2xl border border-emerald-900/15 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-emerald-400 focus:bg-[#f4f0e6] focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black text-slate-800">
                      Availability
                    </span>
                    <input
                      value={newProductDraft.availability}
                      onChange={(event) =>
                        setNewProductDraft((current) => ({
                          ...current,
                          availability: event.target.value,
                        }))
                      }
                      placeholder="available"
                      className="w-full rounded-2xl border border-emerald-900/15 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-emerald-400 focus:bg-[#f4f0e6] focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-black text-slate-800">
                      SKU <span className="font-medium text-slate-700">(optional)</span>
                    </span>
                    <input
                      value={newProductDraft.sku}
                      onChange={(event) =>
                        setNewProductDraft((current) => ({
                          ...current,
                          sku: event.target.value,
                        }))
                      }
                      placeholder="Optional product code"
                      className="w-full rounded-2xl border border-emerald-900/15 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-emerald-400 focus:bg-[#f4f0e6] focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-black text-slate-800">
                      Description
                    </span>
                    <textarea
                      rows={4}
                      value={newProductDraft.description}
                      onChange={(event) =>
                        setNewProductDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Short description, features, or anything the AI should know..."
                      className="w-full resize-none rounded-2xl border border-emerald-900/15 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-emerald-400 focus:bg-[#f4f0e6] focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <div className="sm:col-span-2 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-950">
                          Product images
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          Add photos customers can see when the AI recommends this product.
                        </div>
                      </div>

                      <label
                        className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black shadow-sm transition ${
                          productImageRemaining > 0
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "cursor-not-allowed bg-slate-200 text-slate-700"
                        }`}
                      >
                        🖼️ Choose images
                        <input
                          key={newProductImagePickerKey}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          multiple
                          className="hidden"
                          disabled={productImageRemaining <= 0}
                          onChange={handleNewProductImages}
                        />
                      </label>
                    </div>

                    {newProductImagePreviews.length > 0 ? (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {newProductImagePreviews.map((image, index) => (
                          <div
                            key={`${image.name}-${index}`}
                            className="group relative aspect-square overflow-hidden rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] shadow-sm"
                          >
                            <img
                              src={image.url}
                              alt={image.name}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeNewProductImage(index)}
                              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/75 text-sm font-black text-white shadow-lg transition hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-[#f4f0e6] p-6 text-center">
                        <div className="text-2xl">🖼️</div>
                        <div className="mt-2 text-xs font-black text-slate-700">
                          No images selected
                        </div>
                        <div className="mt-1 text-[11px] text-slate-700">
                          You can add product images now or later.
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeNewProductModal}
                    className="rounded-xl border border-emerald-900/15 bg-[#f4f0e6] px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={newProductSaving || !newProductDraft.product_name.trim()}
                    className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-[0_10px_25px_rgba(16,185,129,0.20)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {newProductSaving ? "Preparing…" : "Save product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================
            PRODUCT EDIT MODAL
        ====================================================== */}

        {editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#032019]/70 p-4 backdrop-blur-md">

            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-emerald-900/10 bg-[#f8fcfa] shadow-[0_40px_120px_rgba(0,0,0,0.28)]">

              <div className="sticky top-0 z-10 border-b border-black/5 bg-[#f4f0e6]/95 px-6 py-5 backdrop-blur sm:px-8">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">
                      Product Catalog
                    </div>

                    <h3 className="mt-2 text-2xl font-black">
                      Edit Product
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct(
                        null
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-xl font-black transition hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>

                </div>

              </div>

              <div className="p-6 sm:p-8">

                <div className="grid gap-4 sm:grid-cols-2">

                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-black">
                      Product name
                    </span>

                    <input
                      value={
                        editingProduct.product_name ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingProduct(
                          (current) => ({
                            ...current,
                            product_name:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black">
                      Price
                    </span>

                    <input
                      type="number"
                      value={
                        editingProduct.price ??
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingProduct(
                          (current) => ({
                            ...current,
                            price:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black">
                      Currency
                    </span>

                    <select
                      value={editingProduct.currency || "AED"}
                      onChange={(event) => setEditingProduct((current) => ({ ...current, currency: event.target.value }))}
                      className="w-full rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    >
                      {CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.label}</option>)}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black">
                      Availability
                    </span>

                    <input
                      value={
                        editingProduct.availability ||
                        "available"
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingProduct(
                          (current) => ({
                            ...current,
                            availability:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black">
                      SKU
                    </span>

                    <input
                      value={
                        editingProduct.sku ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingProduct(
                          (current) => ({
                            ...current,
                            sku:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-black">
                      Description
                    </span>

                    <textarea
                      rows={4}
                      value={
                        editingProduct.description ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingProduct(
                          (current) => ({
                            ...current,
                            description:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full resize-none rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <div className="sm:col-span-2 rounded-3xl border border-emerald-200 bg-[#f4f0e6] p-5 shadow-sm">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">Product images</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          Add photos customers should see when the AI recommends this product.
                        </div>
                      </div>

                      <label className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black shadow-sm transition ${
                        canUploadProductImages
                          ? "cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600"
                          : "cursor-not-allowed bg-slate-200 text-slate-700"
                      }`}>
                        {productUploading ? "Uploading…" : "🖼️ Add product image"}
                        <input
                          key={productImageInputKey}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          multiple
                          className="hidden"
                          disabled={!canUploadProductImages}
                          onChange={(event) =>
                            uploadProductImages(editingProduct.id, event)
                          }
                        />
                      </label>
                    </div>

                    {editingProduct.images?.length > 0 ? (
                      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                        {editingProduct.images.map((image) => (
                          <div key={image.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-emerald-900/15 bg-slate-100">
                            <img
                              src={image.signed_url || image.image_url}
                              alt={image.alt_text || editingProduct.product_name || "Product image"}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => deleteProductImage(editingProduct.id, image.id)}
                              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-sm font-black text-white opacity-0 transition group-hover:opacity-100"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs font-bold text-slate-700">
                        No product images added yet.
                      </div>
                    )}

                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={
                        editingProduct.active !==
                        false
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingProduct(
                          (current) => ({
                            ...current,
                            active:
                              event.target
                                .checked,
                          })
                        )
                      }
                      className="h-4 w-4 accent-emerald-500"
                    />

                    <div>
                      <div className="text-sm font-black">
                        Product is active
                      </div>

                      <div className="mt-1 text-xs text-slate-700">
                        The AI can recommend this
                        product to customers.
                      </div>
                    </div>
                  </label>

                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <button
                    type="button"
                    disabled={productDeleting === editingProduct.id}
                    onClick={async () => {
                      await deleteProduct(editingProduct.id);
                      setEditingProduct(null);
                    }}
                    className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {productDeleting === editingProduct.id
                      ? "Deleting…"
                      : "⌫ Delete product"}
                  </button>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProduct(
                          null
                        )
                      }
                      className="rounded-xl border border-emerald-900/15 bg-[#f4f0e6] px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={
                        productSaving
                      }
                      onClick={() =>
                        saveProductChanges(
                          editingProduct
                        )
                      }
                      className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-[0_10px_25px_rgba(16,185,129,0.20)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {productSaving
                        ? "Saving…"
                        : "Save changes"}
                    </button>
                  </div>

                </div>

              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            PROMOTION MODAL
        ====================================================== */}

        {editingPromotion && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#032019]/70 p-4 backdrop-blur-md">

            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-cyan-900/10 bg-[#f8fcfc] shadow-[0_40px_120px_rgba(0,0,0,0.28)]">

              <div className="sticky top-0 z-10 border-b border-black/5 bg-[#f4f0e6]/95 px-6 py-5 backdrop-blur sm:px-8">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-600">
                      Promotions &amp; Packages
                    </div>

                    <h3 className="mt-2 text-2xl font-black">
                      {editingPromotion.id
                        ? "Edit Promotion"
                        : "New Promotion"}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingPromotion(
                        null
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-xl font-black transition hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>

                </div>

              </div>

              <div className="p-6 sm:p-8">

                <div className="grid gap-4 sm:grid-cols-2">

                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-black">
                      Promotion title
                    </span>

                    <input
                      value={
                        editingPromotion.title ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingPromotion(
                          (current) => ({
                            ...current,
                            title:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Summer Package"
                      className="w-full rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black">
                      Price
                    </span>

                    <input
                      type="number"
                      value={
                        editingPromotion.price ??
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingPromotion(
                          (current) => ({
                            ...current,
                            price:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black">
                      Currency
                    </span>

                    <select
                      value={editingPromotion.currency || "AED"}
                      onChange={(event) => setEditingPromotion((current) => ({ ...current, currency: event.target.value }))}
                      className="w-full rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    >
                      {CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.label}</option>)}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black">
                      Starts
                    </span>

                    <input
                      type="date"
                      value={
                        editingPromotion.valid_from ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingPromotion(
                          (current) => ({
                            ...current,
                            valid_from:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-xs font-black">
                      Expires
                    </span>

                    <input
                      type="date"
                      value={
                        editingPromotion.valid_until ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingPromotion(
                          (current) => ({
                            ...current,
                            valid_until:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-black">
                      Description
                    </span>

                    <textarea
                      rows={4}
                      value={
                        editingPromotion.description ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingPromotion(
                          (current) => ({
                            ...current,
                            description:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Describe what the customer gets..."
                      className="w-full resize-none rounded-2xl border border-emerald-900/15 bg-[#f4f0e6] px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  {/* ==================================================
                      IMAGE MANAGEMENT
                  ================================================== */}

                  <div className="rounded-[25px] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)] p-5 sm:col-span-2">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
                            ✨
                          </div>

                          <div>
                            <div className="text-sm font-black">
                              Promotion images
                            </div>

                            <div className="text-[10px] font-bold text-emerald-700">
                              {promotionImageUsage} /{" "}
                              {promotionImageLimit} used
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 max-w-xl text-xs leading-5 text-slate-700">
                          Attach real flyers, package
                          images or product photos that
                          Sodah can share with customers.
                        </p>
                      </div>

                      <label
                        className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black shadow-sm transition ${
                          promotionImageRemaining >
                          0
                            ? "cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600"
                            : "pointer-events-none bg-black/10 text-slate-700"
                        }`}
                      >
                        {promotionImageRemaining >
                        0
                          ? "+ Attach images"
                          : "Image limit reached"}

                        <input
                          key={
                            promotionImageInputKey
                          }
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          multiple
                          className="hidden"
                          disabled={
                            promotionImageRemaining <=
                            0
                          }
                          onChange={(
                            event
                          ) => {
                            const selectedFiles =
                              Array.from(
                                event
                                  .target
                                  .files ||
                                  []
                              );

                            setPromotionImageInputKey(
                              (
                                value
                              ) =>
                                value +
                                1
                            );

                            if (
                              !selectedFiles.length
                            ) {
                              return;
                            }

                            for (const file of selectedFiles) {
                              if (
                                !ALLOWED_IMAGE_TYPES.includes(
                                  file.type
                                )
                              ) {
                                setError(
                                  `"${file.name}" is not supported. Use JPG, PNG, WEBP or GIF.`
                                );

                                return;
                              }

                              if (
                                file.size >
                                MAX_IMAGE_SIZE
                              ) {
                                setError(
                                  `"${file.name}" is too large. Each image must be 10 MB or smaller.`
                                );

                                return;
                              }
                            }

                            const currentImages =
                              Array.isArray(
                                editingPromotion?.newImages
                              )
                                ? editingPromotion.newImages
                                : [];

                            const available =
                              Math.min(
                                MAX_IMAGES_PER_UPLOAD -
                                  currentImages.length,
                                promotionImageRemaining
                              );

                            if (
                              available <=
                              0
                            ) {
                              setError(
                                "You have reached the image capacity available for this promotion upload."
                              );

                              return;
                            }

                            const combinedImages =
                              [
                                ...currentImages,
                                ...selectedFiles.slice(
                                  0,
                                  available
                                ),
                              ];

                            if (
                              selectedFiles.length >
                              available
                            ) {
                              setNotice(
                                `Only ${available} more image${
                                  available ===
                                  1
                                    ? ""
                                    : "s"
                                } can be attached with your current image capacity.`
                              );
                            }

                            setError("");

                            setEditingPromotion(
                              (
                                current
                              ) => ({
                                ...current,
                                newImages:
                                  combinedImages,
                              })
                            );
                          }}
                        />
                      </label>

                    </div>

                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                        style={{
                          width: `${promotionUsagePercentage}%`,
                        }}
                      />
                    </div>

                    {/* Existing */}

                    {Array.isArray(
                      editingPromotion.images
                    ) &&
                      editingPromotion
                        .images.length >
                        0 && (
                        <div className="mt-5">

                          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-700">
                            Saved images
                          </div>

                          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                            {editingPromotion.images.map(
                              (
                                image
                              ) => (
                                <div
                                  key={
                                    image.id
                                  }
                                  className="relative aspect-square overflow-hidden rounded-xl border border-emerald-900/15 bg-[#f4f0e6]"
                                >
                                  <img
                                    src={
                                      image.signed_url ||
                                      image.image_url
                                    }
                                    alt={
                                      image.alt_text ||
                                      editingPromotion.title ||
                                      "Promotion image"
                                    }
                                    className="h-full w-full object-cover"
                                  />

                                  <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[8px] font-black text-white">
                                    SAVED
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                        </div>
                      )}

                    {/* New */}

                    {Array.isArray(
                      editingPromotion.newImages
                    ) &&
                      editingPromotion
                        .newImages.length >
                        0 && (
                        <div className="mt-5">

                          <div className="mb-2 flex items-center justify-between">

                            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                              Images to attach
                            </div>

                            <div className="rounded-full bg-[#f4f0e6] px-2.5 py-1 text-[9px] font-black text-slate-700">
                              {
                                editingPromotion
                                  .newImages
                                  .length
                              }{" "}
                              selected
                            </div>

                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                            {editingPromotion.newImages.map(
                              (
                                file,
                                index
                              ) => (
                                <div
                                  key={`${file.name}-${file.lastModified}-${index}`}
                                  className="relative overflow-hidden rounded-xl border border-emerald-200 bg-[#f4f0e6]"
                                >
                                  <div className="aspect-square bg-black/[0.03]">
                                    {promotionPreviewUrls[
                                      index
                                    ] ? (
                                      <img
                                        src={
                                          promotionPreviewUrls[
                                            index
                                          ]
                                        }
                                        alt={
                                          file.name
                                        }
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center text-2xl">
                                        🖼️
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPromotion(
                                        (
                                          current
                                        ) => ({
                                          ...current,
                                          newImages:
                                            current.newImages.filter(
                                              (
                                                _,
                                                imageIndex
                                              ) =>
                                                imageIndex !==
                                                index
                                            ),
                                        })
                                      );
                                    }}
                                    className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white transition hover:bg-red-600"
                                  >
                                    ×
                                  </button>

                                  <div className="truncate px-2 py-2 text-[9px] font-bold text-slate-700">
                                    {file.name}
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                        </div>
                      )}

                    {!editingPromotion.images
                      ?.length &&
                      !editingPromotion.newImages
                        ?.length && (
                        <div className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-[#f4f0e6] p-5 text-center text-xs font-bold text-slate-700">
                          No images attached yet.
                        </div>
                      )}

                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">

                    <input
                      type="checkbox"
                      checked={
                        editingPromotion.active !==
                        false
                      }
                      onChange={(
                        event
                      ) =>
                        setEditingPromotion(
                          (current) => ({
                            ...current,
                            active:
                              event.target
                                .checked,
                          })
                        )
                      }
                      className="h-4 w-4 accent-emerald-500"
                    />

                    <div>
                      <div className="text-sm font-black">
                        Promotion is active
                      </div>

                      <div className="mt-1 text-xs text-slate-700">
                        Active promotions can be used by
                        the customer AI when relevant.
                      </div>
                    </div>

                  </label>

                </div>

                <div className="mt-7 flex justify-end gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      setEditingPromotion(
                        null
                      )
                    }
                    className="rounded-xl border border-emerald-900/15 bg-[#f4f0e6] px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      promotionSaving
                    }
                    onClick={() =>
                      savePromotion(
                        editingPromotion
                      )
                    }
                    className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-[0_10px_25px_rgba(16,185,129,0.20)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {promotionSaving
                      ? "Saving…"
                      : editingPromotion.id
                        ? "Save promotion"
                        : "Create promotion"}
                  </button>

                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

/* ============================================================
   NEXT.JS 15 SUSPENSE BOUNDARY
============================================================ */

export default function VoiceSettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f4fbf8] text-[#10201b]">
          <div className="flex min-h-screen items-center justify-center px-6">

            <div className="w-full max-w-sm rounded-[30px] border border-emerald-900/10 bg-white p-8 text-center shadow-[0_25px_80px_rgba(7,63,45,0.12)]">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl shadow-sm">
                🎙️
              </div>

              <h2 className="mt-5 text-lg font-black">
                Loading Voice Studio…
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                Checking your WhatsApp connection
                and loading your AI settings.
              </p>

              <div className="mx-auto mt-6 h-1.5 w-32 overflow-hidden rounded-full bg-emerald-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
              </div>

            </div>

          </div>
        </main>
      }
    >
      <VoiceSettingsContent />
    </Suspense>
  );
}