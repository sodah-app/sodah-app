"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ================================================================
   HELPERS
================================================================ */

function timeLabel(date) {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return date;

  const now = new Date();
  const sameDay =
    d.toDateString() === now.toDateString();

  return sameDay
    ? d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
}

function fullDateLabel(date) {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return date;

  return d.toLocaleString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSender(message) {
  return (
    message?.from ||
    message?.sender ||
    message?.sender_name ||
    message?.sender_email ||
    "Unknown sender"
  );
}

function getSenderEmail(message) {
  return (
    message?.from_email ||
    message?.sender_email ||
    message?.email ||
    ""
  );
}

function getInitials(name) {
  if (!name) return "?";

  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "?";

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function messagePreview(message) {
  return (
    message?.snippet ||
    message?.preview ||
    message?.text ||
    message?.body ||
    "No preview available."
  );
}

function getMessageId(message) {
  return (
    message?.id ||
    message?.messageId ||
    message?.message_id ||
    message?.gmail_message_id ||
    message?.gmailMessageId ||
    null
  );
}

function normalizeMessage(message) {
  if (!message) return null;

  const id = getMessageId(message);

  return {
    ...message,
    id: id ? String(id) : null,
  };
}

/* ================================================================
   PAGE
================================================================ */

function InboxPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [businessId, setBusinessId] =
    useState("");

  const [businessName, setBusinessName] =
    useState("");

  const [account, setAccount] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [folder, setFolder] =
    useState("inbox");

  const [query, setQuery] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [reply, setReply] =
    useState("");

  const [aiLoading, setAiLoading] =
    useState(false);

  const [aiMode, setAiMode] =
    useState("");

  const [mobileDetail, setMobileDetail] =
    useState(false);

  const [selectedMessageIds, setSelectedMessageIds] =
    useState([]);

  const [bulkDeleting, setBulkDeleting] =
    useState(false);

  /* ==============================================================
     BUSINESS CONTEXT
  ============================================================== */

  const loadBusinessContext =
    useCallback(async () => {
      try {
        const auth =
          await getCurrentUser();

        if (!auth?.authenticated) {
          router.push("/");
          return null;
        }

        const authenticatedBusinessId =
          auth?.business?.business_id || "";

        const authenticatedBusinessName =
          auth?.business?.business_name || "";

        const urlBusinessId =
          searchParams?.get("business_id") ||
          searchParams?.get("businessId") ||
          "";

        let storedBusinessId = "";

        try {
          storedBusinessId =
            localStorage
              .getItem("business_id")
              ?.trim() || "";
        } catch (storageError) {
          console.error(
            "[Inbox] Failed to read stored business ID:",
            storageError
          );
        }

        /*
         * Authenticated business is always authoritative.
         */
        if (
          urlBusinessId &&
          authenticatedBusinessId &&
          urlBusinessId !==
            authenticatedBusinessId
        ) {
          console.error(
            "[Inbox] Business ID mismatch:",
            {
              urlBusinessId,
              authenticatedBusinessId,
            }
          );

          throw new Error(
            "The requested business does not match your authenticated Sodah business."
          );
        }

        const activeBusinessId =
          authenticatedBusinessId ||
          urlBusinessId ||
          storedBusinessId;

        if (!activeBusinessId) {
          throw new Error(
            "Unable to determine the active Sodah business."
          );
        }

        const activeBusinessName =
          authenticatedBusinessName || "";

        setBusinessId(activeBusinessId);
        setBusinessName(activeBusinessName);

        try {
          localStorage.setItem(
            "business_id",
            activeBusinessId
          );
        } catch (storageError) {
          console.error(
            "[Inbox] Failed to store business ID:",
            storageError
          );
        }

        try {
          sessionStorage.setItem(
            "business_id",
            activeBusinessId
          );
        } catch (storageError) {
          console.error(
            "[Inbox] Failed to store session business ID:",
            storageError
          );
        }

        return {
          businessId:
            activeBusinessId,
          businessName:
            activeBusinessName,
        };
      } catch (error) {
        console.error(
          "[Inbox] Business context failed:",
          error
        );

        setError(
          error?.message ||
            "Unable to determine your Sodah business."
        );

        return null;
      }
    }, [
      router,
      searchParams,
    ]);

  /* ==============================================================
     AUTH TOKEN
  ============================================================== */

  const token = useCallback(
    async () => {
      const {
        data,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          sessionError.message ||
            "Unable to read your session."
        );
      }

      const accessToken =
        data?.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      return accessToken;
    },
    []
  );

  /* ==============================================================
     API HELPER
  ============================================================== */

  const api = useCallback(
    async (
      url,
      options = {}
    ) => {
      const accessToken =
        await token();

      const response =
        await fetch(url, {
          ...options,
          cache: "no-store",
          headers: {
            ...(options.headers || {}),
            Authorization:
              `Bearer ${accessToken}`,
          },
        });

      let data = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (
        !response.ok ||
        data?.success === false
      ) {
        const apiError =
          new Error(
            data?.message ||
              `Request failed with status ${response.status}.`
          );

        apiError.code =
          data?.code;

        apiError.status =
          response.status;

        apiError.data =
          data;

        throw apiError;
      }

      return data;
    },
    [token]
  );

  /* ==============================================================
     LOAD INBOX
  ============================================================== */

  const load = useCallback(
    async ({
      silent = false,
    } = {}) => {
      try {
        /*
         * Silent refreshes NEVER replace the
         * current page with a loading screen.
         */
        if (!silent) {
          setLoading(true);
        }

        setError("");
        setNotice("");

        const context =
          await loadBusinessContext();

        if (!context?.businessId) {
          return;
        }

        /*
         * Load connected Gmail account.
         */
        const accountParams =
          new URLSearchParams();

        accountParams.set(
          "business_id",
          context.businessId
        );

        const accountData =
          await api(
            `/api/email-ai/account?${accountParams.toString()}`
          );

        const connectedAccount =
          accountData?.account ||
          null;

        setAccount(
          connectedAccount
        );

        if (!connectedAccount) {
          setMessages([]);
          setSelected(null);

          throw new Error(
            "Connect Gmail before using Inbox."
          );
        }

        /*
         * Load Gmail messages.
         */
        const params =
          new URLSearchParams();

        params.set(
          "business_id",
          context.businessId
        );

        params.set(
          "limit",
          "40"
        );

        const cleanQuery =
          query.trim();

        if (folder === "inbox") {
          if (cleanQuery) {
            params.set(
              "q",
              cleanQuery
            );
          }
        }

        if (folder === "unread") {
          params.set(
            "q",
            `${cleanQuery} is:unread`.trim()
          );
        }

        if (folder === "starred") {
          params.set(
            "q",
            `${cleanQuery} is:starred`.trim()
          );
        }

        if (folder === "important") {
          params.set(
            "q",
            `${cleanQuery} is:important`.trim()
          );
        }

        if (folder === "attachments") {
          params.set(
            "q",
            `${cleanQuery} has:attachment`.trim()
          );
        }

        if (folder === "trash") {
          params.set(
            "q",
            `${cleanQuery} in:trash`.trim()
          );
        }

        if (folder === "archive") {
          params.set(
            "q",
            `${cleanQuery} -in:inbox`.trim()
          );
        }

        const data =
          await api(
            `/api/inbox-email-ai/messages?${params.toString()}`
          );

        const normalizedMessages = (
          data?.messages || []
        )
          .map(normalizeMessage)
          .filter(Boolean);

        setMessages(
          normalizedMessages
        );

        setSelectedMessageIds(
          (current) => {
            const validIds =
              new Set(
                normalizedMessages
                  .map(
                    (item) =>
                      getMessageId(item)
                  )
                  .filter(Boolean)
                  .map((id) =>
                    String(id)
                  )
              );

            return current.filter(
              (id) =>
                validIds.has(
                  String(id)
                )
            );
          }
        );

        /*
         * Preserve selected email when it
         * still exists after refresh.
         */
        setSelected(
          (current) => {
            if (!current) {
              return null;
            }

            const currentId =
              getMessageId(
                current
              );

            if (!currentId) {
              return null;
            }

            const refreshed =
              normalizedMessages.find(
                (item) =>
                  String(
                    getMessageId(item)
                  ) ===
                  String(currentId)
              );

            return (
              refreshed ||
              current
            );
          }
        );
      } catch (e) {
        console.error(
          "[Inbox] Load failed:",
          e
        );

        const message =
          e?.message ||
          "Unable to load Inbox.";

        if (
          e?.code ===
            "GMAIL_REAUTH_REQUIRED" ||
          /invalid_grant/i.test(
            message
          ) ||
          /authorization.*expired/i.test(
            message
          ) ||
          /authorization.*revoked/i.test(
            message
          ) ||
          /re-authorized/i.test(
            message
          )
        ) {
          setError(
            "Your connected Gmail account needs to be re-authorized so Inbox can read received messages."
          );

          return;
        }

        if (
          e?.code ===
            "GMAIL_READ_PERMISSION_REQUIRED" ||
          /permission/i.test(
            message
          ) ||
          /readonly/i.test(
            message
          ) ||
          /read access/i.test(
            message
          )
        ) {
          setError(
            "Inbox needs Gmail read permission. Reconnect Gmail to grant Inbox access to received messages."
          );

          return;
        }

        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [
      api,
      folder,
      loadBusinessContext,
      query,
    ]
  );

  useEffect(() => {
    load();
  }, [load]);

  /* ==============================================================
     MESSAGE SELECTION
  ============================================================== */

  const toggleMessageSelection =
    (item) => {
      const messageId =
        getMessageId(item);

      if (!messageId) {
        console.warn(
          "[Inbox] Cannot select message without Gmail ID:",
          item
        );

        return;
      }

      const id =
        String(messageId);

      setSelectedMessageIds(
        (current) =>
          current.includes(id)
            ? current.filter(
                (value) =>
                  value !== id
              )
            : [
                ...current,
                id,
              ]
      );
    };

  const selectAllVisibleMessages =
    () => {
      const visibleIds =
        filteredMessages
          .map((item) =>
            getMessageId(item)
          )
          .filter(Boolean)
          .map((id) =>
            String(id)
          );

      if (!visibleIds.length) {
        setSelectedMessageIds(
          []
        );

        return;
      }

      setSelectedMessageIds(
        (current) => {
          const allSelected =
            visibleIds.every(
              (id) =>
                current.includes(id)
            );

          if (allSelected) {
            return current.filter(
              (id) =>
                !visibleIds.includes(
                  id
                )
            );
          }

          return Array.from(
            new Set([
              ...current,
              ...visibleIds,
            ])
          );
        }
      );
    };

  const clearMessageSelection =
    () => {
      setSelectedMessageIds([]);
    };

  /* ==============================================================
     BULK DELETE
  ============================================================== */

  const bulkDeleteSelected =
    async () => {
      if (
        !selectedMessageIds.length ||
        bulkDeleting
      ) {
        return;
      }

      try {
        setBulkDeleting(true);
        setError("");
        setNotice("");

        const ids = [
          ...selectedMessageIds,
        ];

        const results =
          await Promise.allSettled(
            ids.map((id) =>
              api(
                "/api/inbox-email-ai/action",
                {
                  method:
                    "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body:
                    JSON.stringify({
                      id,
                      action:
                        "trash",
                      business_id:
                        businessId ||
                        undefined,
                    }),
                }
              )
            )
          );

        const failed =
          results.filter(
            (result) =>
              result.status ===
              "rejected"
          ).length;

        if (failed === 0) {
          setNotice(
            `${ids.length} ${
              ids.length === 1
                ? "email"
                : "emails"
            } moved to Trash.`
          );
        } else {
          const completed =
            ids.length -
            failed;

          if (completed > 0) {
            setNotice(
              `${completed} ${
                completed === 1
                  ? "email"
                  : "emails"
              } moved to Trash.`
            );
          }

          setError(
            `${failed} ${
              failed === 1
                ? "email"
                : "emails"
            } could not be moved to Trash.`
          );
        }

        setSelectedMessageIds(
          []
        );

        const currentSelectedId =
          getMessageId(
            selected
          );

        if (
          currentSelectedId &&
          ids.includes(
            String(
              currentSelectedId
            )
          )
        ) {
          setSelected(null);
          setMobileDetail(
            false
          );
        }

        await load({
          silent: true,
        });
      } catch (e) {
        console.error(
          "[Inbox] Bulk delete failed:",
          e
        );

        setError(
          e?.message ||
            "Unable to delete the selected emails."
        );
      } finally {
        setBulkDeleting(false);
      }
    };

  /* ==============================================================
     OPEN MESSAGE
  ============================================================== */

  const openMessage =
    async (item) => {
      try {
        const messageId =
          getMessageId(item);

        if (!messageId) {
          setError(
            "This email does not contain a valid Gmail message ID. Refresh the Inbox and try again."
          );

          return;
        }

        /*
         * The list endpoint already returns
         * the complete message.
         *
         * Do NOT make another detail request.
         */
        const normalized =
          normalizeMessage(item);

        setSelected(
          normalized
        );

        setMobileDetail(
          true
        );

        setDetailLoading(
          false
        );

        setError("");
        setNotice("");

        /*
         * Mark unread message as read.
         *
         * This never blocks opening the email.
         */
        if (item?.unread) {
          try {
            await api(
              "/api/inbox-email-ai/action",
              {
                method:
                  "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify({
                    id: String(
                      messageId
                    ),
                    action:
                      "read",
                    business_id:
                      businessId ||
                      undefined,
                  }),
              }
            );

            setMessages(
              (current) =>
                current.map(
                  (x) =>
                    String(
                      getMessageId(
                        x
                      )
                    ) ===
                    String(
                      messageId
                    )
                      ? {
                          ...x,
                          unread:
                            false,
                        }
                      : x
                )
            );

            setSelected(
              (current) =>
                current
                  ? {
                      ...current,
                      unread:
                        false,
                    }
                  : current
            );
          } catch (
            readError
          ) {
            console.warn(
              "[Inbox] Email opened successfully, but marking it as read failed:",
              readError
            );
          }
        }
      } catch (e) {
        console.error(
          "[Inbox] Open message failed:",
          e
        );

        const message =
          e?.message ||
          "Unable to open email.";

        if (
          e?.code ===
            "GMAIL_REAUTH_REQUIRED" ||
          /invalid_grant/i.test(
            message
          ) ||
          /authorization.*expired/i.test(
            message
          ) ||
          /authorization.*revoked/i.test(
            message
          )
        ) {
          setError(
            "Your connected Gmail account needs to be re-authorized so Inbox can read received messages."
          );
        } else {
          setError(message);
        }
      } finally {
        setDetailLoading(
          false
        );
      }
    };

  /* ==============================================================
     MESSAGE ACTION
  ============================================================== */

  const action = async (
    name
  ) => {
    const messageId =
      getMessageId(selected);

    if (!messageId) {
      setError(
        "A valid Gmail message ID is required for this action."
      );

      return;
    }

    try {
      setError("");
      setNotice("");

      await api(
        "/api/inbox-email-ai/action",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              id: String(
                messageId
              ),
              action: name,
              business_id:
                businessId ||
                undefined,
            }),
        }
      );

      setNotice(
        name === "trash"
          ? "Email moved to Trash."
          : name === "archive"
          ? "Email archived."
          : name === "read"
          ? "Email marked as read."
          : name === "unread"
          ? "Email marked as unread."
          : name === "star"
          ? "Email starred."
          : name === "unstar"
          ? "Email unstarred."
          : "Email updated."
      );

      /*
       * Update UI immediately.
       */
      if (
        name === "trash" ||
        name === "archive"
      ) {
        setSelected(null);
        setMobileDetail(
          false
        );
      } else {
        setSelected(
          (current) =>
            current
              ? {
                  ...current,
                  unread:
                    name ===
                    "unread"
                      ? true
                      : name ===
                        "read"
                      ? false
                      : current.unread,
                  starred:
                    name ===
                    "star"
                      ? true
                      : name ===
                        "unstar"
                      ? false
                      : current.starred,
                }
              : current
        );
      }

      if (
        name === "trash"
      ) {
        setSelectedMessageIds(
          (current) =>
            current.filter(
              (id) =>
                String(id) !==
                String(
                  messageId
                )
            )
        );
      }

      /*
       * Silent refresh.
       */
      await load({
        silent: true,
      });
    } catch (e) {
      console.error(
        "[Inbox] Action failed:",
        e
      );

      setError(
        e?.message ||
          "Unable to update email."
      );
    }
  };

  /* ==============================================================
     SEND REPLY
  ============================================================== */

  const sendReply =
    async () => {
      const messageId =
        getMessageId(selected);

      if (!messageId) {
        setError(
          "A valid Gmail message ID is required before sending a reply."
        );

        return;
      }

      if (!reply.trim()) {
        setError(
          "Write a reply before sending."
        );

        return;
      }

      try {
        setSending(true);
        setError("");
        setNotice("");

        const data =
          await api(
            "/api/inbox-email-ai/reply",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  id: String(
                    messageId
                  ),
                  message:
                    reply.trim(),
                  business_id:
                    businessId ||
                    undefined,
                }),
            }
          );

        setNotice(
          data?.message ||
            "Reply sent successfully."
        );

        setReply("");
      } catch (e) {
        console.error(
          "[Inbox] Reply failed:",
          e
        );

        setError(
          e?.message ||
            "Unable to send reply."
        );
      } finally {
        setSending(false);
      }
    };

  /* ==============================================================
     AI REPLY
  ============================================================== */

  const runAiReply =
    async (
      mode = "reply",
      intent = null
    ) => {
      const messageId =
        getMessageId(selected);

      if (!messageId) {
        setError(
          "A valid Gmail message ID is required before using AI reply."
        );

        return;
      }

      const cleanDraft =
        String(
          reply || ""
        ).trim();

      if (
        mode === "improve" &&
        !cleanDraft
      ) {
        setError(
          "Write a reply first, then choose Improve with AI."
        );

        return;
      }

      try {
        setAiLoading(true);

        setAiMode(
          intent ===
            "interested"
            ? "interested"
            : intent ===
              "not_interested"
            ? "not_interested"
            : mode
        );

        setError("");
        setNotice("");

        const data =
          await api(
            "/api/inbox-email-ai/ai-reply",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  id: String(
                    messageId
                  ),
                  business_id:
                    businessId ||
                    undefined,
                  mode:
                    mode ===
                    "improve"
                      ? "improve"
                      : "generate",
                  intent:
                    intent ||
                    null,
                  draft:
                    mode ===
                    "improve"
                      ? cleanDraft
                      : "",
                  emailBody:
                    selected?.body ||
                    selected?.text ||
                    selected?.snippet ||
                    "",
                  sender:
                    getSender(
                      selected
                    ),
                  senderEmail:
                    getSenderEmail(
                      selected
                    ),
                  subject:
                    selected?.subject ||
                    "",
                }),
            }
          );

        const generated =
          data?.reply ||
          data?.message ||
          "";

        if (!generated) {
          throw new Error(
            "AI did not generate a reply."
          );
        }

        setReply(
          generated
        );

        setNotice(
          mode === "improve"
            ? "Your draft was improved with AI. Review it before sending."
            : intent ===
              "interested"
            ? "AI prepared an interested reply. Review it before sending."
            : intent ===
              "not_interested"
            ? "AI prepared a polite decline. Review it before sending."
            : "AI prepared a reply. Review it before sending."
        );
      } catch (e) {
        console.error(
          "[Inbox] AI reply failed:",
          e
        );

        setError(
          e?.message ||
            "Unable to prepare an AI reply."
        );
      } finally {
        setAiLoading(false);
        setAiMode("");
      }
    };

  const generateInterestedReply =
    () =>
      runAiReply(
        "generate",
        "interested"
      );

  const generateNotInterestedReply =
    () =>
      runAiReply(
        "generate",
        "not_interested"
      );

  const improveWithAI =
    () =>
      runAiReply(
        "improve"
      );

  /* ==============================================================
     RECONNECT GMAIL
  ============================================================== */

  const reconnectGmail =
    async () => {
      try {
        setError("");
        setNotice("");

        const params =
          new URLSearchParams();

        if (businessId) {
          params.set(
            "business_id",
            businessId
          );
        }

        const response =
          await fetch(
            `/api/inbox-email-ai/google/connect?${params.toString()}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Unable to reconnect Gmail."
          );
        }

        if (!data?.url) {
          throw new Error(
            "Google authorization URL was not returned."
          );
        }

        window.location.href =
          data.url;
      } catch (e) {
        console.error(
          "[Inbox] Gmail reconnect failed:",
          e
        );

        setError(
          e?.message ||
            "Unable to reconnect Gmail."
        );
      }
    };

  /* ==============================================================
     SEND EMAIL — NEW TOP BAR BUTTON
  ============================================================== */

  const openSendEmail =
    () => {
      const params =
        new URLSearchParams();

      if (businessId) {
        params.set(
          "business_id",
          businessId
        );
      }

      router.push(
        `/email-ai/new-campaign${
          params.toString()
            ? `?${params.toString()}`
            : ""
        }`
      );
    };

  /* ==============================================================
     NAVIGATION
  ============================================================== */

  const backToEmailAI =
    () => {
      const params =
        new URLSearchParams();

      if (businessId) {
        params.set(
          "business_id",
          businessId
        );
      }

      router.push(
        `/email-ai${
          params.toString()
            ? `?${params.toString()}`
            : ""
        }`
      );
    };

  /* ==============================================================
     FILTERING
  ============================================================== */

  const filteredMessages =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase();

      if (!normalizedQuery) {
        return messages;
      }

      return messages.filter(
        (message) => {
          const sender =
            getSender(
              message
            ).toLowerCase();

          const email =
            getSenderEmail(
              message
            ).toLowerCase();

          const subject =
            String(
              message?.subject ||
                ""
            ).toLowerCase();

          const preview =
            messagePreview(
              message
            ).toLowerCase();

          return (
            sender.includes(
              normalizedQuery
            ) ||
            email.includes(
              normalizedQuery
            ) ||
            subject.includes(
              normalizedQuery
            ) ||
            preview.includes(
              normalizedQuery
            )
          );
        }
      );
    }, [messages, query]);

  /* ==============================================================
     STATS
  ============================================================== */

  const unreadCount =
    messages.filter(
      (item) =>
        item?.unread
    ).length;

  const starredCount =
    messages.filter(
      (item) =>
        item?.starred
    ).length;

  const importantCount =
    messages.filter(
      (item) =>
        item?.important
    ).length;

  /* ==============================================================
     MAIN UI
  ============================================================== */

  return (
    <main className="inbox-page">
      <div className="inbox-shell">

        {/* ========================================================
            TOP BAR
        ========================================================= */}

        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              onClick={
                backToEmailAI
              }
              className="back-button"
            >
              ← Back to Email AI
            </button>

            <div className="title-area">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                SODAH INBOX EMAIL AI
              </div>

              <h1>
                Inbox
              </h1>

              <p>
                All received emails from your connected Gmail.
              </p>
            </div>
          </div>

          <div className="topbar-right">

            <div className="business-context">
              <span className="context-label">
                BUSINESS
              </span>

              <span className="context-value">
                {businessName ||
                  "Active Business"}
              </span>

              <span className="context-id">
                {businessId ||
                  "Business ID unavailable"}
              </span>
            </div>

            {/* ==================================================
                SEND EMAIL BUTTON
            ================================================== */}

            <button
              type="button"
              onClick={
                openSendEmail
              }
              className="send-email-button"
              title="Compose and send a new email"
              aria-label="Send Email"
            >
              <span className="send-email-icon">
                ✉
              </span>

              <span>
                Send Email
              </span>
            </button>

            <div className="gmail-context">
              <div className="gmail-icon">
                ✉
              </div>

              <div className="gmail-details">
                <span>
                  Connected Gmail
                </span>

                <strong>
                  {account?.gmail_email ||
                    account?.email ||
                    account?.google_email ||
                    "Not connected"}
                </strong>
              </div>

              <button
                type="button"
                onClick={
                  reconnectGmail
                }
                className="reconnect-button"
              >
                Reconnect
              </button>
            </div>
          </div>
        </header>

        {/* ========================================================
            ERROR / NOTICE
        ========================================================= */}

        {(error || notice) && (
          <div className="message-banner-wrap">

            {error && (
              <div className="message-banner error-banner">
                <span className="banner-icon">
                  ⚠
                </span>

                <span>
                  {error}
                </span>

                {(error.includes(
                  "re-authorized"
                ) ||
                  error.includes(
                    "authorization"
                  ) ||
                  error.includes(
                    "read permission"
                  )) && (
                  <button
                    type="button"
                    onClick={
                      reconnectGmail
                    }
                    className="banner-action"
                  >
                    Reconnect Gmail
                  </button>
                )}
              </div>
            )}

            {!error && notice && (
              <div className="message-banner notice-banner">
                <span className="banner-icon">
                  ✓
                </span>

                <span>
                  {notice}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            WORKSPACE
        ========================================================= */}

        <section className="workspace">

          {/* ======================================================
              LEFT MAILBOX SIDEBAR
          ====================================================== */}

          <aside className="mailbox-sidebar">

            <div className="sidebar-heading">
              <div>
                <span className="sidebar-title">
                  Mailbox
                </span>

                <span className="sidebar-subtitle">
                  {account?.gmail_email ||
                    account?.email ||
                    "Gmail"}
                </span>
              </div>
            </div>

            <div className="folder-list">

              <button
                type="button"
                className={
                  folder ===
                  "inbox"
                    ? "folder-button active"
                    : "folder-button"
                }
                onClick={() => {
                  setFolder(
                    "inbox"
                  );
                  setSelected(
                    null
                  );
                  setMobileDetail(
                    false
                  );
                  setSelectedMessageIds(
                    []
                  );
                }}
              >
                <span className="folder-icon">
                  📥
                </span>

                <span className="folder-label">
                  Inbox
                </span>

                <span className="folder-count">
                  {messages.length}
                </span>
              </button>

              <button
                type="button"
                className={
                  folder ===
                  "unread"
                    ? "folder-button active"
                    : "folder-button"
                }
                onClick={() => {
                  setFolder(
                    "unread"
                  );
                  setSelected(
                    null
                  );
                  setMobileDetail(
                    false
                  );
                  setSelectedMessageIds(
                    []
                  );
                }}
              >
                <span className="folder-icon">
                  🔵
                </span>

                <span className="folder-label">
                  Unread
                </span>

                <span className="folder-count">
                  {unreadCount}
                </span>
              </button>

              <button
                type="button"
                className={
                  folder ===
                  "starred"
                    ? "folder-button active"
                    : "folder-button"
                }
                onClick={() => {
                  setFolder(
                    "starred"
                  );
                  setSelected(
                    null
                  );
                  setMobileDetail(
                    false
                  );
                  setSelectedMessageIds(
                    []
                  );
                }}
              >
                <span className="folder-icon">
                  ★
                </span>

                <span className="folder-label">
                  Starred
                </span>

                <span className="folder-count">
                  {starredCount}
                </span>
              </button>

              <button
                type="button"
                className={
                  folder ===
                  "important"
                    ? "folder-button active"
                    : "folder-button"
                }
                onClick={() => {
                  setFolder(
                    "important"
                  );
                  setSelected(
                    null
                  );
                  setMobileDetail(
                    false
                  );
                  setSelectedMessageIds(
                    []
                  );
                }}
              >
                <span className="folder-icon">
                  ❗
                </span>

                <span className="folder-label">
                  Important
                </span>

                <span className="folder-count">
                  {importantCount}
                </span>
              </button>

              <button
                type="button"
                className={
                  folder ===
                  "attachments"
                    ? "folder-button active"
                    : "folder-button"
                }
                onClick={() => {
                  setFolder(
                    "attachments"
                  );
                  setSelected(
                    null
                  );
                  setMobileDetail(
                    false
                  );
                  setSelectedMessageIds(
                    []
                  );
                }}
              >
                <span className="folder-icon">
                  📎
                </span>

                <span className="folder-label">
                  Attachments
                </span>
              </button>

              <button
                type="button"
                className={
                  folder ===
                  "archive"
                    ? "folder-button active"
                    : "folder-button"
                }
                onClick={() => {
                  setFolder(
                    "archive"
                  );
                  setSelected(
                    null
                  );
                  setMobileDetail(
                    false
                  );
                  setSelectedMessageIds(
                    []
                  );
                }}
              >
                <span className="folder-icon">
                  🗄
                </span>

                <span className="folder-label">
                  Archive
                </span>
              </button>

              <button
                type="button"
                className={
                  folder ===
                  "trash"
                    ? "folder-button active"
                    : "folder-button"
                }
                onClick={() => {
                  setFolder(
                    "trash"
                  );
                  setSelected(
                    null
                  );
                  setMobileDetail(
                    false
                  );
                  setSelectedMessageIds(
                    []
                  );
                }}
              >
                <span className="folder-icon">
                  🗑
                </span>

                <span className="folder-label">
                  Trash
                </span>
              </button>
            </div>

            <div className="sidebar-bottom">
              <div className="connected-card">

                <div className="connected-status">
                  <span className="status-dot" />
                  Gmail connected
                </div>

                <div className="connected-email">
                  {account?.gmail_email ||
                    account?.email ||
                    "Gmail"}
                </div>

                <div className="connected-business">
                  Business ID

                  <strong>
                    {businessId ||
                      "Unavailable"}
                  </strong>
                </div>
              </div>
            </div>
          </aside>

          {/* ======================================================
              MESSAGE LIST
          ====================================================== */}

          <section
            className={
              mobileDetail
                ? "message-list-pane mobile-hidden"
                : "message-list-pane"
            }
          >
            <div className="list-header">

              <div className="list-heading-row">
                <div>
                  <h2>
                    {folder ===
                    "inbox"
                      ? "Inbox"
                      : folder
                          .charAt(
                            0
                          )
                          .toUpperCase() +
                        folder.slice(
                          1
                        )}
                  </h2>

                  <span>
                    {
                      filteredMessages.length
                    }{" "}
                    conversations
                  </span>
                </div>

                <div className="list-header-actions">

                  <button
                    type="button"
                    onClick={
                      selectAllVisibleMessages
                    }
                    className="select-all-button"
                    title="Select all visible emails"
                    aria-label="Select all visible emails"
                  >
                    {filteredMessages.length >
                      0 &&
                    filteredMessages.every(
                      (item) =>
                        selectedMessageIds.includes(
                          String(
                            getMessageId(
                              item
                            )
                          )
                        )
                    )
                      ? "✓"
                      : "□"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      load({
                        silent: true,
                      })
                    }
                    className="refresh-button"
                    title="Refresh Inbox"
                    aria-label="Refresh Inbox"
                  >
                    ↻
                  </button>
                </div>
              </div>

              {selectedMessageIds.length >
                0 && (
                <div className="selection-toolbar">

                  <div className="selection-summary">
                    <span className="selection-check">
                      ✓
                    </span>

                    <strong>
                      {
                        selectedMessageIds.length
                      }
                    </strong>

                    <span>
                      selected
                    </span>
                  </div>

                  <div className="selection-actions">

                    <button
                      type="button"
                      onClick={
                        clearMessageSelection
                      }
                      className="selection-clear"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={
                        bulkDeleteSelected
                      }
                      disabled={
                        bulkDeleting
                      }
                      className="selection-delete"
                    >
                      {bulkDeleting
                        ? "Deleting..."
                        : "🗑 Delete"}
                    </button>
                  </div>
                </div>
              )}

              <div className="search-box">
                <span>
                  🔎
                </span>

                <input
                  type="text"
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  placeholder="Search sender, subject or email..."
                />

                {query && (
                  <button
                    type="button"
                    onClick={() =>
                      setQuery("")
                    }
                    className="clear-search"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="message-items">

              {!filteredMessages.length && (
                <div className="empty-list">

                  <div className="empty-icon">
                    📭
                  </div>

                  <h3>
                    No conversations loaded
                  </h3>

                  <p>
                    {error
                      ? "Resolve the connection issue above and refresh the Inbox."
                      : "There are no emails matching this view."}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      load({
                        silent: true,
                      })
                    }
                    className="empty-refresh"
                  >
                    Refresh Inbox
                  </button>
                </div>
              )}

              {filteredMessages.map(
                (
                  item,
                  index
                ) => {
                  const itemId =
                    getMessageId(
                      item
                    );

                  const sender =
                    getSender(
                      item
                    );

                  const senderEmail =
                    getSenderEmail(
                      item
                    );

                  const subject =
                    item?.subject ||
                    "(No subject)";

                  const preview =
                    messagePreview(
                      item
                    );

                  const isSelected =
                    selected &&
                    itemId &&
                    String(
                      getMessageId(
                        selected
                      )
                    ) ===
                      String(
                        itemId
                      );

                  const isChecked =
                    selectedMessageIds.includes(
                      String(
                        itemId
                      )
                    );

                  return (
                    <button
                      type="button"
                      key={
                        itemId ||
                        `${senderEmail}-${index}`
                      }
                      onClick={() =>
                        openMessage(
                          item
                        )
                      }
                      className={
                        isSelected
                          ? "message-row selected"
                          : item?.unread
                          ? "message-row unread"
                          : "message-row"
                      }
                    >
                      <span
                        role="checkbox"
                        aria-checked={
                          isChecked
                        }
                        tabIndex={0}
                        className={
                          isChecked
                            ? "message-select selected"
                            : "message-select"
                        }
                        title="Select email"
                        onClick={(
                          event
                        ) => {
                          event.preventDefault();
                          event.stopPropagation();

                          toggleMessageSelection(
                            item
                          );
                        }}
                        onKeyDown={(
                          event
                        ) => {
                          if (
                            event.key ===
                              "Enter" ||
                            event.key ===
                              " "
                          ) {
                            event.preventDefault();
                            event.stopPropagation();

                            toggleMessageSelection(
                              item
                            );
                          }
                        }}
                      >
                        {isChecked
                          ? "✓"
                          : ""}
                      </span>

                      <div className="avatar">
                        {getInitials(
                          sender
                        )}
                      </div>

                      <div className="message-row-content">

                        <div className="message-row-top">

                          <div className="sender-name">
                            {sender}
                          </div>

                          <div className="message-time">
                            {timeLabel(
                              item?.date ||
                                item?.internalDate
                            )}
                          </div>
                        </div>

                        <div className="sender-email">
                          {senderEmail}
                        </div>

                        <div className="message-subject">
                          {subject}
                        </div>

                        <div className="message-preview">
                          {preview}
                        </div>

                        <div className="message-meta">

                          {item?.unread && (
                            <span className="meta-badge unread-badge">
                              Unread
                            </span>
                          )}

                          {item?.starred && (
                            <span className="star-indicator">
                              ★
                            </span>
                          )}

                          {item?.important && (
                            <span className="important-indicator">
                              ❗
                            </span>
                          )}

                          {item?.hasAttachments && (
                            <span className="attachment-indicator">
                              📎
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* ======================================================
              EMAIL DETAIL
          ====================================================== */}

          <section
            className={
              mobileDetail
                ? "email-detail-pane mobile-visible"
                : "email-detail-pane"
            }
          >

            {detailLoading && (
              <div className="detail-loading">
                <div className="detail-loading-icon">
                  ✉
                </div>

                <p>
                  Loading email...
                </p>
              </div>
            )}

            {!detailLoading &&
              !selected && (
                <div className="no-selection">

                  <div className="no-selection-icon">
                    ✉
                  </div>

                  <h2>
                    Select an email
                  </h2>

                  <p>
                    Choose a conversation from your Inbox to read it here.
                  </p>
                </div>
              )}

            {!detailLoading &&
              selected && (
                <>
                  <div className="detail-header">

                    <button
                      type="button"
                      onClick={() => {
                        setSelected(
                          null
                        );
                        setMobileDetail(
                          false
                        );
                      }}
                      className="mobile-back"
                    >
                      ← Inbox
                    </button>

                    <div className="detail-header-actions">

                      <button
                        type="button"
                        onClick={() =>
                          action(
                            selected?.unread
                              ? "read"
                              : "unread"
                          )
                        }
                        title={
                          selected?.unread
                            ? "Mark as read"
                            : "Mark as unread"
                        }
                      >
                        {selected?.unread
                          ? "✓"
                          : "●"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          action(
                            selected?.starred
                              ? "unstar"
                              : "star"
                          )
                        }
                        title={
                          selected?.starred
                            ? "Unstar"
                            : "Star"
                        }
                      >
                        {selected?.starred
                          ? "★"
                          : "☆"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          action(
                            "archive"
                          )
                        }
                        title="Archive"
                      >
                        🗄
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          action(
                            "trash"
                          )
                        }
                        title="Trash"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  <div className="detail-content">

                    <div className="email-heading">

                      <div className="large-avatar">
                        {getInitials(
                          getSender(
                            selected
                          )
                        )}
                      </div>

                      <div className="email-heading-text">

                        <h2>
                          {selected?.subject ||
                            "(No subject)"}
                        </h2>

                        <div className="from-line">

                          <strong>
                            {getSender(
                              selected
                            )}
                          </strong>

                          <span>
                            &lt;
                            {getSenderEmail(
                              selected
                            )}
                            &gt;
                          </span>
                        </div>

                        <div className="to-line">
                          To:{" "}
                          {selected?.to ||
                            account?.gmail_email ||
                            account?.email ||
                            "me"}
                        </div>
                      </div>

                      <div className="email-date">
                        {fullDateLabel(
                          selected?.date ||
                            selected?.internalDate
                        )}
                      </div>
                    </div>

                    <div className="email-actions">

                      <button
                        type="button"
                        onClick={() =>
                          action(
                            selected?.starred
                              ? "unstar"
                              : "star"
                          )
                        }
                        className="email-action"
                      >
                        {selected?.starred
                          ? "★ Starred"
                          : "☆ Star"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setReply("")
                        }
                        className="email-action"
                      >
                        Clear Reply
                      </button>
                    </div>

                    <article className="email-body">

                      {selected?.html ? (
                        <div
                          className="html-email-body"
                          dangerouslySetInnerHTML={{
                            __html:
                              selected.html,
                          }}
                        />
                      ) : selected?.body_html ? (
                        <div
                          className="html-email-body"
                          dangerouslySetInnerHTML={{
                            __html:
                              selected.body_html,
                          }}
                        />
                      ) : selected?.body ? (
                        <div className="plain-email-body">
                          {selected.body}
                        </div>
                      ) : selected?.text ? (
                        <div className="plain-email-body">
                          {selected.text}
                        </div>
                      ) : selected?.snippet ? (
                        <div className="plain-email-body">
                          {selected.snippet}
                        </div>
                      ) : (
                        <div className="empty-body">
                          (This email does not contain readable text.)
                        </div>
                      )}
                    </article>

                    {selected?.attachments?.length >
                      0 && (
                      <div className="attachments">

                        <div className="attachments-title">
                          📎 Attachments
                        </div>

                        <div className="attachment-list">

                          {selected.attachments.map(
                            (
                              attachment,
                              index
                            ) => (
                              <div
                                key={
                                  attachment?.id ||
                                  attachment?.attachmentId ||
                                  index
                                }
                                className="attachment-item"
                              >
                                <span>
                                  📄
                                </span>

                                <div>
                                  <strong>
                                    {attachment?.filename ||
                                      "Attachment"}
                                  </strong>

                                  <small>
                                    {attachment?.mimeType ||
                                      "File"}
                                  </small>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* ==================================================
                        REPLY / AI
                    ================================================== */}

                    <div className="reply-section">

                      <div className="reply-header">

                        <div>
                          <span className="reply-title">
                            Reply
                          </span>

                          <span className="reply-subtitle">
                            Send Gmail Directly
                          </span>
                        </div>

                        <div className="ai-buttons">

                          <button
                            type="button"
                            onClick={
                              improveWithAI
                            }
                            disabled={
                              aiLoading
                            }
                            className="generate-button improve-button"
                          >
                            {aiLoading &&
                            aiMode ===
                              "improve"
                              ? "✨ Improving..."
                              : "✨ Improve with AI"}
                          </button>

                          <button
                            type="button"
                            onClick={
                              generateInterestedReply
                            }
                            disabled={
                              aiLoading
                            }
                            className="generate-button interested-button"
                          >
                            {aiLoading &&
                            aiMode ===
                              "interested"
                              ? "🟢 Preparing..."
                              : "🟢 Interested"}
                          </button>

                          <button
                            type="button"
                            onClick={
                              generateNotInterestedReply
                            }
                            disabled={
                              aiLoading
                            }
                            className="generate-button not-interested-button"
                          >
                            {aiLoading &&
                            aiMode ===
                              "not_interested"
                              ? "🔴 Preparing..."
                              : "🔴 Not Interested"}
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={
                          reply
                        }
                        onChange={(
                          event
                        ) =>
                          setReply(
                            event.target
                              .value
                          )
                        }
                        placeholder="Write your reply..."
                        className="reply-input"
                      />

                      <div className="reply-footer">

                        <span className="reply-hint">
                          Review AI-generated replies before sending.
                        </span>

                        <button
                          type="button"
                          onClick={
                            sendReply
                          }
                          disabled={
                            sending ||
                            !reply.trim()
                          }
                          className="send-reply"
                        >
                          {sending
                            ? "Sending…"
                            : "Send Reply →"}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
          </section>
        </section>
      </div>

      {/* ==========================================================
          PAGE LOADING OVERLAY
          Existing page remains visible underneath.
      ========================================================== */}

      {loading && (
        <div
          className="loading-overlay"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="loading-overlay-content">
            <span className="loading-spinner" />
            <span>
              Loading Inbox...
            </span>
          </div>
        </div>
      )}

      <style jsx>{`

        /* ========================================================
           PAGE
        ======================================================== */

        .inbox-page {
          width: 100%;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;

          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(
                37,
                211,
                102,
                0.08
              ),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 10%,
              rgba(
                59,
                130,
                246,
                0.08
              ),
              transparent 28%
            ),
            #020617;

          color: #fff;
        }

        .inbox-shell {
          width: 100%;
          height: 100vh;

          display: flex;
          flex-direction: column;

          overflow: hidden;
        }

        /* ========================================================
           TOP BAR
        ======================================================== */

        .topbar {
          flex: 0 0 auto;

          min-height: 88px;
          width: 100%;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;
          padding: 15px 24px;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          background:
            rgba(
              3,
              9,
              18,
              0.94
            );

          backdrop-filter:
            blur(22px);

          position: relative;
          z-index: 20;
        }

        .topbar-left {
          display: flex;
          align-items: center;

          gap: 18px;
          min-width: 0;
        }

        .back-button {
          flex: 0 0 auto;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.1
            );

          background:
            rgba(
              255,
              255,
              255,
              0.045
            );

          color: #cbd5e1;

          border-radius: 12px;

          padding: 10px 13px;

          font-size: 12px;
          font-weight: 700;

          cursor: pointer;

          transition:
            0.2s ease;
        }

        .back-button:hover {
          color: #fff;

          background:
            rgba(
              255,
              255,
              255,
              0.08
            );

          border-color:
            rgba(
              37,
              211,
              102,
              0.25
            );
        }

        .title-area {
          min-width: 0;
        }

        .eyebrow {
          display: flex;
          align-items: center;

          gap: 7px;

          color: #64748b;

          font-size: 9px;
          font-weight: 900;

          letter-spacing: 1.8px;
          text-transform: uppercase;
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;

          border-radius: 999px;

          background: #25d366;

          box-shadow:
            0 0 12px
            rgba(
              37,
              211,
              102,
              0.55
            );
        }

        .title-area h1 {
          margin: 4px 0 0;

          font-size: 23px;
          line-height: 1.1;

          font-weight: 900;

          letter-spacing: -0.6px;
        }

        .title-area p {
          margin: 4px 0 0;

          color: #64748b;

          font-size: 11px;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;

          gap: 12px;

          min-width: 0;
        }

        .business-context {
          display: flex;
          flex-direction: column;

          min-width: 150px;
          max-width: 220px;

          padding: 8px 11px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          border-radius: 12px;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );
        }

        .context-label {
          color: #475569;

          font-size: 9px;
          font-weight: 900;

          letter-spacing: 1.5px;
        }

        .context-value {
          margin-top: 2px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #e2e8f0;

          font-size: 13px;
          font-weight: 800;
        }

        .context-id {
          margin-top: 2px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #25d366;

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;

          font-size: 9px;
        }

        /* ========================================================
           SEND EMAIL BUTTON
        ======================================================== */

        .send-email-button {
          flex: 0 0 auto;

          min-height: 42px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 8px;

          padding: 0 15px;

          border:
            1px solid
            rgba(
              37,
              211,
              102,
              0.28
            );

          border-radius: 12px;

          background:
            rgba(
              37,
              211,
              102,
              0.1
            );

          color: #86efac;

          font-size: 12px;
          font-weight: 800;

          white-space: nowrap;

          cursor: pointer;

          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .send-email-button:hover {
          background:
            rgba(
              37,
              211,
              102,
              0.17
            );

          border-color:
            rgba(
              37,
              211,
              102,
              0.48
            );

          box-shadow:
            0 8px 24px
            rgba(
              37,
              211,
              102,
              0.08
            );

          transform:
            translateY(-1px);
        }

        .send-email-button:active {
          transform:
            translateY(0);
        }

        .send-email-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          width: 22px;
          height: 22px;

          border-radius: 7px;

          background:
            rgba(
              37,
              211,
              102,
              0.13
            );

          font-size: 14px;
          line-height: 1;
        }

        /* ========================================================
           GMAIL
        ======================================================== */

        .gmail-context {
          display: flex;
          align-items: center;

          gap: 9px;

          padding: 7px 8px;

          border:
            1px solid
            rgba(
              37,
              211,
              102,
              0.12
            );

          border-radius: 14px;

          background:
            rgba(
              37,
              211,
              102,
              0.035
            );
        }

        .gmail-icon {
          width: 34px;
          height: 34px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background:
            rgba(
              239,
              68,
              68,
              0.12
            );

          color: #f87171;

          font-size: 16px;
        }

        .gmail-details {
          display: flex;
          flex-direction: column;

          min-width: 0;
        }

        .gmail-details span {
          color: #64748b;

          font-size: 10px;
          font-weight: 700;
        }

        .gmail-details strong {
          max-width: 190px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          margin-top: 2px;

          color: #e2e8f0;

          font-size: 12px;
        }

        .reconnect-button {
          border:
            1px solid
            rgba(
              37,
              211,
              102,
              0.2
            );

          background:
            rgba(
              37,
              211,
              102,
              0.09
            );

          color: #86efac;

          border-radius: 9px;

          padding: 8px 10px;

          font-size: 11px;
          font-weight: 800;

          cursor: pointer;

          transition:
            0.2s ease;
        }

        .reconnect-button:hover {
          background:
            rgba(
              37,
              211,
              102,
              0.16
            );

          border-color:
            rgba(
              37,
              211,
              102,
              0.35
            );
        }

        /* ========================================================
           BANNERS
        ======================================================== */

        .message-banner-wrap {
          flex: 0 0 auto;

          padding: 9px 16px;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.05
            );

          background:
            rgba(
              2,
              6,
              23,
              0.85
            );

          position: relative;
          z-index: 15;
        }

        .message-banner {
          display: flex;
          align-items: center;

          gap: 9px;

          min-height: 38px;

          padding: 8px 12px;

          border-radius: 10px;

          font-size: 13px;
          font-weight: 700;
        }

        .error-banner {
          border:
            1px solid
            rgba(
              248,
              113,
              113,
              0.18
            );

          background:
            rgba(
              127,
              29,
              29,
              0.18
            );

          color: #fca5a5;
        }

        .notice-banner {
          border:
            1px solid
            rgba(
              37,
              211,
              102,
              0.18
            );

          background:
            rgba(
              20,
              83,
              45,
              0.18
            );

          color: #86efac;
        }

        .banner-icon {
          font-size: 14px;
        }

        .banner-action {
          margin-left: auto;

          border:
            1px solid
            rgba(
              248,
              113,
              113,
              0.2
            );

          background:
            rgba(
              248,
              113,
              113,
              0.08
            );

          color: #fecaca;

          border-radius: 8px;

          padding: 6px 9px;

          font-size: 11px;
          font-weight: 800;

          cursor: pointer;
        }

        /* ========================================================
           WORKSPACE
        ======================================================== */

        .workspace {
          flex: 1 1 auto;

          min-height: 0;

          width: 100%;

          display: grid;

          grid-template-columns:
            215px
            minmax(320px, 420px)
            minmax(0, 1fr);

          overflow: hidden;
        }

        /* ========================================================
           SIDEBAR
        ======================================================== */

        .mailbox-sidebar {
          min-height: 0;

          display: flex;
          flex-direction: column;

          overflow: hidden;

          border-right:
            1px solid
            rgba(
              37,
              211,
              102,
              0.11
            );

          background:
            linear-gradient(
              180deg,
              rgba(
                9,
                35,
                29,
                0.72
              )
              0%,
              rgba(
                4,
                18,
                18,
                0.84
              )
              42%,
              rgba(
                3,
                10,
                18,
                0.9
              )
              100%
            );
        }

        .sidebar-heading {
          flex: 0 0 auto;

          padding:
            18px
            15px
            13px;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.055
            );
        }

        .sidebar-title {
          display: block;

          font-size: 15px;
          font-weight: 900;

          color: #f8fafc;
        }

        .sidebar-subtitle {
          display: block;

          margin-top: 3px;

          max-width: 180px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #475569;

          font-size: 10px;
        }

        .folder-list {
          flex: 1 1 auto;

          min-height: 0;

          overflow-y: auto;

          padding: 10px;
        }

        .folder-button {
          width: 100%;

          display: flex;
          align-items: center;

          gap: 10px;

          border:
            1px solid
            transparent;

          background:
            transparent;

          color: #64748b;

          border-radius: 10px;

          padding: 10px;

          margin-bottom: 3px;

          text-align: left;

          cursor: pointer;

          transition:
            0.18s ease;
        }

        .folder-button:hover {
          background:
            rgba(
              255,
              255,
              255,
              0.045
            );

          color: #cbd5e1;
        }

        .folder-button.active {
          border-color:
            rgba(
              37,
              211,
              102,
              0.13
            );

          background:
            rgba(
              37,
              211,
              102,
              0.08
            );

          color: #d1fae5;
        }

        .folder-icon {
          width: 20px;

          flex: 0 0 20px;

          text-align: center;

          font-size: 12px;
        }

        .folder-label {
          flex: 1;

          font-size: 13px;
          font-weight: 800;
        }

        .folder-count {
          min-width: 20px;

          color: #475569;

          font-size: 11px;

          text-align: right;
        }

        .folder-button.active
          .folder-count {
          color: #86efac;
        }

        .sidebar-bottom {
          flex: 0 0 auto;

          padding: 10px;

          border-top:
            1px solid
            rgba(
              255,
              255,
              255,
              0.055
            );
        }

        .connected-card {
          padding: 11px;

          border:
            1px solid
            rgba(
              37,
              211,
              102,
              0.1
            );

          border-radius: 12px;

          background:
            rgba(
              37,
              211,
              102,
              0.035
            );
        }

        .connected-status {
          display: flex;
          align-items: center;

          gap: 6px;

          color: #86efac;

          font-size: 10px;
          font-weight: 800;
        }

        .status-dot {
          width: 6px;
          height: 6px;

          border-radius: 999px;

          background: #25d366;

          box-shadow:
            0 0 9px
            rgba(
              37,
              211,
              102,
              0.5
            );
        }

        .connected-email {
          margin-top: 7px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #cbd5e1;

          font-size: 11px;
          font-weight: 700;
        }

        .connected-business {
          display: flex;
          flex-direction: column;

          gap: 2px;

          margin-top: 8px;

          color: #475569;

          font-size: 9px;
          font-weight: 700;

          text-transform: uppercase;

          letter-spacing: 0.7px;
        }

        .connected-business strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #64748b;

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;

          font-size: 9px;

          text-transform: none;

          letter-spacing: 0;
        }

        /* ========================================================
           MESSAGE LIST
        ======================================================== */

        .message-list-pane {
          min-width: 0;
          min-height: 0;

          display: flex;
          flex-direction: column;

          overflow: hidden;

          border-right:
            1px solid
            rgba(
              37,
              211,
              102,
              0.08
            );

          background:
            linear-gradient(
              180deg,
              rgba(
                4,
                13,
                27,
                0.9
              )
              0%,
              rgba(
                2,
                9,
                20,
                0.88
              )
              100%
            );
        }

        .list-header {
          flex: 0 0 auto;

          padding: 15px;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          background:
            rgba(
              2,
              6,
              23,
              0.82
            );

          position: relative;

          z-index: 5;
        }

        .list-heading-row {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 10px;

          margin-bottom: 12px;
        }

        .list-heading-row h2 {
          margin: 0;

          color: #f8fafc;

          font-size: 15px;
          font-weight: 900;
        }

        .list-heading-row span {
          display: block;

          margin-top: 3px;

          color: #475569;

          font-size: 10px;
        }

        .list-header-actions {
          display: flex;
          align-items: center;

          gap: 6px;

          flex: 0 0 auto;
        }

        .select-all-button,
        .refresh-button {
          width: 31px;
          height: 31px;

          border-radius: 9px;

          cursor: pointer;

          transition:
            0.18s ease;
        }

        .select-all-button {
          border:
            1px solid
            rgba(
              37,
              211,
              102,
              0.16
            );

          background:
            rgba(
              37,
              211,
              102,
              0.045
            );

          color: #86efac;

          font-size: 15px;
          font-weight: 900;
        }

        .select-all-button:hover {
          background:
            rgba(
              37,
              211,
              102,
              0.12
            );

          border-color:
            rgba(
              37,
              211,
              102,
              0.3
            );
        }

        .refresh-button {
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          background:
            rgba(
              255,
              255,
              255,
              0.04
            );

          color: #94a3b8;

          font-size: 16px;
        }

        .refresh-button:hover {
          color: #fff;

          background:
            rgba(
              255,
              255,
              255,
              0.08
            );
        }

        .search-box {
          height: 37px;

          display: flex;
          align-items: center;

          gap: 8px;

          padding: 0 10px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          border-radius: 10px;

          background:
            rgba(
              255,
              255,
              255,
              0.035
            );
        }

        .search-box > span {
          color: #475569;

          font-size: 12px;
        }

        .search-box input {
          min-width: 0;

          flex: 1;

          border: 0;
          outline: none;

          background:
            transparent;

          color: #e2e8f0;

          font-size: 12px;
        }

        .search-box input::placeholder {
          color: #475569;
        }

        .clear-search {
          width: 22px;
          height: 22px;

          border: 0;

          border-radius: 7px;

          background:
            rgba(
              255,
              255,
              255,
              0.05
            );

          color: #64748b;

          cursor: pointer;
        }

        .message-items {
          flex: 1 1 auto;

          min-height: 0;

          overflow-y: auto;
          overflow-x: hidden;
        }

        .message-row {
          width: 100%;

          display: flex;
          align-items: flex-start;

          gap: 9px;

          padding: 14px;

          border: 0;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.045
            );

          background:
            transparent;

          color: #fff;

          text-align: left;

          cursor: pointer;

          transition:
            0.16s ease;
        }

        .message-row:hover {
          background:
            rgba(
              255,
              255,
              255,
              0.035
            );
        }

        .message-row.selected {
          background:
            rgba(
              37,
              211,
              102,
              0.075
            );

          box-shadow:
            inset 2px 0 0
            #25d366;
        }

        .message-row.unread {
          background:
            rgba(
              255,
              255,
              255,
              0.018
            );
        }

        .message-select {
          flex: 0 0 19px;

          width: 19px;
          height: 19px;

          margin-top: 7px;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            1px solid
            rgba(
              148,
              163,
              184,
              0.28
            );

          border-radius: 5px;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );

          color: #86efac;

          font-size: 11px;
          font-weight: 900;

          cursor: pointer;

          outline: none;

          transition:
            0.18s ease;
        }

        .message-select:hover,
        .message-select:focus-visible {
          border-color:
            rgba(
              37,
              211,
              102,
              0.42
            );

          background:
            rgba(
              37,
              211,
              102,
              0.08
            );
        }

        .message-select.selected {
          border-color:
            rgba(
              37,
              211,
              102,
              0.5
            );

          background:
            rgba(
              37,
              211,
              102,
              0.16
            );
        }

        .avatar {
          flex: 0 0 34px;

          width: 34px;
          height: 34px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background:
            linear-gradient(
              135deg,
              rgba(
                37,
                211,
                102,
                0.22
              ),
              rgba(
                6,
                182,
                212,
                0.17
              )
            );

          color: #d1fae5;

          font-size: 10px;
          font-weight: 900;
        }

        .message-row-content {
          min-width: 0;
          flex: 1;
        }

        .message-row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 8px;
        }

        .sender-name {
          min-width: 0;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #cbd5e1;

          font-size: 13px;
          font-weight: 800;
        }

        .message-row.unread
          .sender-name {
          color: #fff;
          font-weight: 900;
        }

        .message-time {
          flex: 0 0 auto;

          color: #475569;

          font-size: 10px;
        }

        .sender-email {
          margin-top: 2px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #475569;

          font-size: 10px;
        }

        .message-subject {
          margin-top: 7px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #94a3b8;

          font-size: 12px;
          font-weight: 700;
        }

        .message-row.unread
          .message-subject {
          color: #e2e8f0;
          font-weight: 800;
        }

        .message-preview {
          margin-top: 4px;

          display: -webkit-box;

          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;

          overflow: hidden;

          color: #475569;

          font-size: 11px;
          line-height: 1.5;
        }

        .message-meta {
          display: flex;
          align-items: center;

          gap: 6px;

          margin-top: 6px;
        }

        .meta-badge {
          border-radius: 999px;

          padding: 2px 6px;

          font-size: 9px;
          font-weight: 800;
        }

        .unread-badge {
          background:
            rgba(
              59,
              130,
              246,
              0.12
            );

          color: #93c5fd;
        }

        .star-indicator {
          color: #facc15;
          font-size: 10px;
        }

        .important-indicator {
          color: #fb923c;
          font-size: 8px;
        }

        .attachment-indicator {
          color: #94a3b8;
          font-size: 9px;
        }

        /* ========================================================
           SELECTION
        ======================================================== */

        .selection-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 10px;

          margin-bottom: 10px;

          padding: 8px 9px;

          border:
            1px solid
            rgba(
              37,
              211,
              102,
              0.18
            );

          border-radius: 10px;

          background:
            rgba(
              37,
              211,
              102,
              0.07
            );
        }

        .selection-summary {
          display: flex;
          align-items: center;

          gap: 6px;

          color: #cbd5e1;

          font-size: 11px;
          font-weight: 700;
        }

        .selection-summary strong {
          color: #86efac;
          font-size: 12px;
        }

        .selection-check {
          width: 20px;
          height: 20px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 6px;

          background:
            rgba(
              37,
              211,
              102,
              0.15
            );

          color: #86efac;

          font-size: 12px;
          font-weight: 900;
        }

        .selection-actions {
          display: flex;
          align-items: center;

          gap: 6px;
        }

        .selection-clear,
        .selection-delete {
          border-radius: 8px;

          padding: 6px 9px;

          font-size: 10px;
          font-weight: 800;

          cursor: pointer;

          transition:
            0.18s ease;
        }

        .selection-clear {
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          background:
            rgba(
              255,
              255,
              255,
              0.04
            );

          color: #94a3b8;
        }

        .selection-clear:hover {
          color: #fff;

          background:
            rgba(
              255,
              255,
              255,
              0.08
            );
        }

        .selection-delete {
          border:
            1px solid
            rgba(
              248,
              113,
              113,
              0.22
            );

          background:
            rgba(
              127,
              29,
              29,
              0.16
            );

          color: #fca5a5;
        }

        .selection-delete:hover {
          background:
            rgba(
              127,
              29,
              29,
              0.28
            );
        }

        .selection-delete:disabled {
          opacity: 0.55;

          cursor:
            not-allowed;
        }

        /* ========================================================
           EMPTY
        ======================================================== */

        .empty-list {
          min-height: 100%;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          padding: 35px 20px;

          text-align: center;
        }

        .empty-icon {
          font-size: 34px;

          margin-bottom: 13px;

          opacity: 0.7;
        }

        .empty-list h3 {
          margin: 0;

          color: #cbd5e1;

          font-size: 15px;
          font-weight: 900;
        }

        .empty-list p {
          max-width: 260px;

          margin: 7px 0 14px;

          color: #475569;

          font-size: 11px;

          line-height: 1.6;
        }

        .empty-refresh {
          border:
            1px solid
            rgba(
              37,
              211,
              102,
              0.18
            );

          background:
            rgba(
              37,
              211,
              102,
              0.08
            );

          color: #86efac;

          border-radius: 9px;

          padding: 8px 11px;

          font-size: 11px;
          font-weight: 800;

          cursor: pointer;
        }

        /* ========================================================
           EMAIL DETAIL
        ======================================================== */

        .email-detail-pane {
          min-width: 0;
          min-height: 0;

          display: flex;
          flex-direction: column;

          overflow: hidden;

          background:
            rgba(
              2,
              6,
              23,
              0.48
            );
        }

        .detail-loading,
        .no-selection {
          flex: 1;

          min-height: 0;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          padding: 30px;

          text-align: center;
        }

        .detail-loading {
          background:
            radial-gradient(
              circle at 50% 42%,
              rgba(
                37,
                211,
                102,
                0.055
              ),
              transparent 30%
            );
        }

        .detail-loading-icon,
        .no-selection-icon {
          width: 54px;
          height: 54px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 17px;

          background:
            rgba(
              255,
              255,
              255,
              0.04
            );

          font-size: 24px;

          margin-bottom: 14px;
        }

        .detail-loading-icon {
          animation:
            inboxPulse
            0.9s
            ease-in-out
            infinite;
        }

        @keyframes inboxPulse {
          0%,
          100% {
            opacity: 0.55;
            transform:
              scale(0.96);
          }

          50% {
            opacity: 1;
            transform:
              scale(1);
          }
        }

        .detail-loading p,
        .no-selection p {
          max-width: 300px;

          margin: 6px 0 0;

          color: #475569;

          font-size: 12px;

          line-height: 1.6;
        }

        .no-selection h2 {
          margin: 0;

          color: #cbd5e1;

          font-size: 18px;
          font-weight: 900;
        }

        .detail-header {
          flex: 0 0 auto;

          min-height: 58px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;

          padding: 10px 17px;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          background:
            rgba(
              2,
              6,
              23,
              0.84
            );

          position: relative;

          z-index: 5;
        }

        .mobile-back {
          display: none;

          border: 0;

          background:
            transparent;

          color: #94a3b8;

          font-size: 12px;
          font-weight: 800;

          cursor: pointer;
        }

        .detail-header-actions {
          display: flex;
          align-items: center;

          gap: 5px;

          margin-left: auto;
        }

        .detail-header-actions button {
          width: 31px;
          height: 31px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          border-radius: 9px;

          background:
            rgba(
              255,
              255,
              255,
              0.035
            );

          color: #94a3b8;

          font-size: 12px;

          cursor: pointer;

          transition:
            0.18s ease;
        }

        .detail-header-actions button:hover {
          color: #fff;

          background:
            rgba(
              255,
              255,
              255,
              0.08
            );
        }

        .detail-content {
          flex: 1 1 auto;

          min-height: 0;

          overflow-y: auto;
          overflow-x: hidden;

          padding:
            20px
            24px
            35px;
        }

        .email-heading {
          display: flex;
          align-items: flex-start;

          gap: 13px;
        }

        .large-avatar {
          flex: 0 0 44px;

          width: 44px;
          height: 44px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 14px;

          background:
            linear-gradient(
              135deg,
              rgba(
                37,
                211,
                102,
                0.22
              ),
              rgba(
                6,
                182,
                212,
                0.17
              )
            );

          color: #d1fae5;

          font-size: 13px;
          font-weight: 900;
        }

        .email-heading-text {
          min-width: 0;

          flex: 1;
        }

        .email-heading-text h2 {
          margin: 0;

          color: #f8fafc;

          font-size: 20px;

          line-height: 1.3;

          font-weight: 900;

          letter-spacing: -0.3px;
        }

        .from-line {
          display: flex;
          flex-wrap: wrap;
          align-items: center;

          gap: 5px;

          margin-top: 8px;

          color: #64748b;

          font-size: 12px;
        }

        .from-line strong {
          color: #cbd5e1;
          font-weight: 800;
        }

        .to-line {
          margin-top: 5px;

          color: #475569;

          font-size: 10px;
        }

        .email-date {
          flex: 0 0 auto;

          max-width: 180px;

          color: #475569;

          font-size: 10px;

          line-height: 1.5;

          text-align: right;
        }

        .email-actions {
          display: flex;
          align-items: center;

          flex-wrap: wrap;

          gap: 6px;

          margin-top: 17px;

          padding-bottom: 14px;

          border-bottom:
            1px solid
            rgba(
              255,
              255,
              255,
              0.06
            );
        }

        .email-action {
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          border-radius: 8px;

          background:
            rgba(
              255,
              255,
              255,
              0.035
            );

          color: #94a3b8;

          padding: 7px 9px;

          font-size: 11px;
          font-weight: 800;

          cursor: pointer;

          transition:
            0.18s ease;
        }

        .email-action:hover {
          color: #fff;

          background:
            rgba(
              255,
              255,
              255,
              0.075
            );
        }

        .email-body {
          margin-top: 20px;

          min-height: 120px;

          color: #cbd5e1;

          font-size: 14px;

          line-height: 1.8;

          word-break:
            break-word;
        }

        .html-email-body {
          width: 100%;

          overflow-x: auto;
        }

        .html-email-body :global(img) {
          max-width: 100%;
          height: auto;
        }

        .html-email-body :global(table) {
          max-width: 100%;
        }

        .html-email-body :global(a) {
          color: #67e8f9;
        }

        .plain-email-body {
          white-space: pre-wrap;
        }

        .empty-body {
          padding: 25px;

          border:
            1px dashed
            rgba(
              255,
              255,
              255,
              0.08
            );

          border-radius: 12px;

          background:
            rgba(
              255,
              255,
              255,
              0.018
            );

          color: #475569;

          text-align: center;

          font-size: 12px;
        }

        /* ========================================================
           ATTACHMENTS
        ======================================================== */

        .attachments {
          margin-top: 20px;

          padding: 13px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          border-radius: 12px;

          background:
            rgba(
              255,
              255,
              255,
              0.02
            );
        }

        .attachments-title {
          color: #cbd5e1;

          font-size: 12px;
          font-weight: 900;
        }

        .attachment-list {
          display: flex;
          flex-wrap: wrap;

          gap: 7px;

          margin-top: 10px;
        }

        .attachment-item {
          display: flex;
          align-items: center;

          gap: 8px;

          padding: 8px 9px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          border-radius: 9px;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );
        }

        .attachment-item strong {
          display: block;

          max-width: 180px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #cbd5e1;

          font-size: 11px;
        }

        .attachment-item small {
          display: block;

          margin-top: 2px;

          color: #475569;

          font-size: 9px;
        }

        /* ========================================================
           REPLY
        ======================================================== */

        .reply-section {
          margin-top: 25px;

          padding: 15px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          border-radius: 14px;

          background:
            rgba(
              255,
              255,
              255,
              0.025
            );
        }

        .reply-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 10px;
        }

        .reply-title {
          display: block;

          color: #e2e8f0;

          font-size: 13px;
          font-weight: 900;
        }

        .reply-subtitle {
          display: block;

          margin-top: 3px;

          color: #475569;

          font-size: 10px;
        }

        .ai-buttons {
          display: flex;

          flex-wrap: wrap;

          align-items: center;

          justify-content: flex-end;

          gap: 8px;
        }

        .generate-button {
          border:
            1px solid
            rgba(
              139,
              92,
              246,
              0.22
            );

          background:
            rgba(
              139,
              92,
              246,
              0.08
            );

          color: #c4b5fd;

          border-radius: 8px;

          padding: 7px 9px;

          font-size: 11px;
          font-weight: 800;

          cursor: pointer;

          transition:
            0.18s ease;
        }

        .generate-button:hover {
          filter: brightness(
            1.12
          );
        }

        .improve-button {
          background:
            rgba(
              59,
              130,
              246,
              0.12
            );

          border-color:
            rgba(
              96,
              165,
              250,
              0.35
            );
        }

        .interested-button {
          background:
            rgba(
              34,
              197,
              94,
              0.14
            );

          border-color:
            rgba(
              74,
              222,
              128,
              0.38
            );
        }

        .not-interested-button {
          background:
            rgba(
              239,
              68,
              68,
              0.14
            );

          border-color:
            rgba(
              248,
              113,
              113,
              0.38
            );
        }

        .generate-button:disabled {
          opacity: 0.5;

          cursor:
            not-allowed;
        }

        .reply-input {
          width: 100%;

          min-height: 115px;

          resize: vertical;

          margin-top: 12px;

          padding: 11px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );

          border-radius: 10px;

          outline: none;

          background:
            rgba(
              0,
              0,
              0,
              0.18
            );

          color: #e2e8f0;

          font-family: inherit;

          font-size: 13px;

          line-height: 1.6;
        }

        .reply-input:focus {
          border-color:
            rgba(
              37,
              211,
              102,
              0.25
            );
        }

        .reply-input::placeholder {
          color: #475569;
        }

        .reply-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 10px;

          margin-top: 9px;
        }

        .reply-hint {
          color: #475569;

          font-size: 10px;
        }

        .send-reply {
          border:
            1px solid
            rgba(
              37,
              211,
              102,
              0.25
            );

          background:
            rgba(
              37,
              211,
              102,
              0.11
            );

          color: #86efac;

          border-radius: 9px;

          padding: 8px 11px;

          font-size: 11px;
          font-weight: 900;

          cursor: pointer;
        }

        .send-reply:hover {
          background:
            rgba(
              37,
              211,
              102,
              0.18
            );
        }

        .send-reply:disabled {
          opacity: 0.35;

          cursor:
            not-allowed;
        }

        /* ========================================================
           LOADING OVERLAY
        ======================================================== */

        .loading-overlay {
          position: fixed;

          inset: 0;

          z-index: 100;

          display: flex;

          align-items: center;
          justify-content: center;

          pointer-events: none;

          background:
            rgba(
              2,
              6,
              23,
              0.16
            );

          backdrop-filter:
            blur(1px);
        }

        .loading-overlay-content {
          display: inline-flex;

          align-items: center;

          gap: 10px;

          padding: 10px 15px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );

          border-radius: 999px;

          background:
            rgba(
              2,
              6,
              23,
              0.48
            );

          color: rgba(
            226,
            232,
            240,
            0.9
          );

          box-shadow:
            0 10px 35px
            rgba(
              0,
              0,
              0,
              0.16
            );

          font-size: 12px;

          font-weight: 700;
        }

        .loading-spinner {
          width: 14px;
          height: 14px;

          border:
            2px solid
            rgba(
              255,
              255,
              255,
              0.16
            );

          border-top-color:
            rgba(
              134,
              239,
              172,
              0.95
            );

          border-radius: 999px;

          animation:
            loadingSpin
            0.7s
            linear
            infinite;
        }

        @keyframes loadingSpin {
          to {
            transform:
              rotate(360deg);
          }
        }

        /* ========================================================
           SCROLLBARS
        ======================================================== */

        .folder-list::-webkit-scrollbar,
        .message-items::-webkit-scrollbar,
        .detail-content::-webkit-scrollbar {
          width: 5px;
        }

        .folder-list::-webkit-scrollbar-track,
        .message-items::-webkit-scrollbar-track,
        .detail-content::-webkit-scrollbar-track {
          background:
            transparent;
        }

        .folder-list::-webkit-scrollbar-thumb,
        .message-items::-webkit-scrollbar-thumb,
        .detail-content::-webkit-scrollbar-thumb {
          border-radius: 999px;

          background:
            rgba(
              255,
              255,
              255,
              0.09
            );
        }

        /* ========================================================
           RESPONSIVE
        ======================================================== */

        @media (max-width: 1150px) {
          .workspace {
            grid-template-columns:
              190px
              minmax(290px, 370px)
              minmax(0, 1fr);
          }

          .business-context {
            display: none;
          }

          .email-date {
            display: none;
          }
        }

        @media (max-width: 1000px) {
          .send-email-button {
            padding: 0 11px;
          }

          .send-email-button span:last-child {
            display: none;
          }
        }

        @media (max-width: 900px) {
          .topbar {
            padding:
              12px
              15px;
          }

          .topbar-left {
            gap: 10px;
          }

          .title-area p {
            display: none;
          }

          .gmail-details {
            display: none;
          }

          .workspace {
            grid-template-columns:
              175px
              minmax(280px, 1fr);
          }

          .email-detail-pane {
            display: none;
          }

          .message-list-pane {
            border-right: 0;
          }

          .mailbox-sidebar {
            border-right:
              1px solid
              rgba(
                255,
                255,
                255,
                0.07
              );
          }
        }

        @media (max-width: 680px) {
          .inbox-page,
          .inbox-shell {
            height: 100dvh;
            max-height: 100dvh;
          }

          .topbar {
            min-height: 66px;

            padding:
              9px 11px;
          }

          .back-button {
            padding:
              8px 9px;

            font-size: 9px;
          }

          .eyebrow {
            display: none;
          }

          .title-area h1 {
            font-size: 18px;
          }

          .topbar-right {
            gap: 5px;
          }

          .send-email-button {
            min-height: 34px;

            width: 34px;
            height: 34px;

            padding: 0;

            border-radius: 10px;
          }

          .send-email-icon {
            width: 20px;
            height: 20px;

            font-size: 13px;
          }

          .gmail-context {
            padding: 4px;

            border: 0;

            background:
              transparent;
          }

          .gmail-icon {
            width: 30px;
            height: 30px;
          }

          .reconnect-button {
            padding:
              7px 8px;
          }

          .message-banner-wrap {
            padding:
              6px 8px;
          }

          .message-banner {
            align-items:
              flex-start;

            flex-wrap: wrap;

            font-size: 9px;
          }

          .banner-action {
            margin-left: 0;
          }

          .workspace {
            display: block;
          }

          .mailbox-sidebar {
            display: none;
          }

          .message-list-pane {
            width: 100%;
            height: 100%;
          }

          .message-list-pane.mobile-hidden {
            display: none;
          }

          .email-detail-pane {
            width: 100%;
            height: 100%;
          }

          .email-detail-pane.mobile-visible {
            display: flex;
          }

          .mobile-back {
            display: block;
          }

          .detail-content {
            padding:
              16px
              13px
              28px;
          }

          .email-heading-text h2 {
            font-size: 16px;
          }

          .email-body {
            font-size: 13px;
          }

          .reply-header {
            align-items:
              flex-start;

            flex-direction:
              column;
          }

          .ai-buttons {
            width: 100%;

            justify-content:
              flex-start;
          }

          .reply-footer {
            align-items:
              flex-start;

            flex-direction:
              column;
          }

          .send-reply {
            width: 100%;
          }
        }

      `}</style>
    </main>
  );
}

/* ================================================================
   SUSPENSE WRAPPER
   Prevents useSearchParams build/prerender errors.
================================================================ */

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <main className="inbox-page-fallback">
          <div className="fallback-loading">
            <span className="fallback-spinner" />
            <span>
              Loading Inbox...
            </span>
          </div>

          <style jsx>{`
            .inbox-page-fallback {
              width: 100%;
              height: 100vh;

              display: flex;
              align-items: center;
              justify-content: center;

              background: #020617;
              color: #cbd5e1;
            }

            .fallback-loading {
              display: flex;
              align-items: center;

              gap: 10px;

              font-size: 13px;
              font-weight: 700;
            }

            .fallback-spinner {
              width: 15px;
              height: 15px;

              border:
                2px solid
                rgba(
                  255,
                  255,
                  255,
                  0.15
                );

              border-top-color:
                #86efac;

              border-radius: 999px;

              animation:
                fallbackSpin
                0.7s
                linear
                infinite;
            }

            @keyframes fallbackSpin {
              to {
                transform:
                  rotate(360deg);
              }
            }
          `}</style>
        </main>
      }
    >
      <InboxPageContent />
    </Suspense>
  );
}

/* ================================================================
   CURRENT USER
================================================================ */

async function getCurrentUser() {
  const {
    data,
    error,
  } =
    await supabase.auth.getUser();

  if (error) {
    throw new Error(
      error.message ||
        "Unable to authenticate the current user."
    );
  }

  const authUser =
    data?.user || null;

  if (!authUser) {
    return {
      authenticated: false,
    };
  }

  let business = null;

  /*
   * Resolve from Supabase auth metadata first.
   */
  const metadata =
    authUser?.user_metadata ||
    {};

  const metadataBusinessId =
    metadata?.business_id ||
    metadata?.businessId ||
    "";

  const metadataBusinessName =
    metadata?.business_name ||
    metadata?.businessName ||
    "";

  if (metadataBusinessId) {
    business = {
      business_id:
        metadataBusinessId,

      business_name:
        metadataBusinessName,
    };
  }

  /*
   * Resolve authoritative business
   * from businesses table.
   */
  try {
    const {
      data: businessByUser,
      error: businessError,
    } =
      await supabase
        .from("businesses")
        .select(
          "business_id, business_name, user_id"
        )
        .eq(
          "user_id",
          authUser.id
        )
        .maybeSingle();

    if (
      !businessError &&
      businessByUser
    ) {
      business = {
        business_id:
          businessByUser.business_id ||
          business?.business_id ||
          "",

        business_name:
          businessByUser.business_name ||
          business?.business_name ||
          "",
      };
    }
  } catch (error) {
    console.error(
      "[Inbox] Business table lookup failed:",
      error
    );
  }

  return {
    authenticated: true,

    user: {
      id: authUser.id,
      email:
        authUser.email ||
        "",
    },

    profile: {
      email:
        authUser.email ||
        "",
    },

    business,

    isSuperAdmin:
      authUser.email ===
      "solomondagbahz@gmail.com",
  };
}