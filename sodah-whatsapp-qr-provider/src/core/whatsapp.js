module.exports = function createCore(ctx) {
  const {
    AI_ENABLED,
    API_KEY,
    APPOINTMENTS_TABLE,
    APPOINTMENT_DURATION_MINUTES,
    AUTH_DIR,
    BUSINESSES_TABLE,
    CONVERSATIONS_TABLE,
    CUSTOMERS_TABLE,
    DATABASE_URL,
    DATA_DIR,
    DEFAULT_AI_PROMPT,
    DEFAULT_VOICE_PROFILE,
    DisconnectReason,
    FALLBACK_REPLY,
    FOLLOWUP_DELAY_MINUTES,
    FOLLOWUP_ENABLED,
    HANDOVER_FILE,
    HISTORY_LIMIT,
    HOST,
    IGNORE_GROUPS,
    IGNORE_STATUS,
    MEMORY_SCHEMA,
    MESSAGE_DEDUP_TTL_SECONDS,
    OPENAI_API_KEY,
    OPENAI_MAX_TOKENS,
    OPENAI_MODEL,
    OPENAI_STT_MODEL,
    OPENAI_TEMPERATURE,
    OPENAI_TTS_FORMAT,
    OPENAI_TTS_MODEL,
    OPENAI_TTS_VOICE,
    PORT,
    PRODUCTS_TABLE,
    PRODUCT_CATALOG_LIMIT,
    PRODUCT_IMAGES_TABLE,
    PRODUCT_IMAGE_BUCKET,
    QRCode,
    REMINDERS_ENABLED,
    REMINDER_HOURS_BEFORE,
    SLOT_MINUTES,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
    TIMEZONE,
    INCOMPLETE_REMINDER_DELAY_MINUTES,
    INCOMPLETE_CHAT_REMINDER_DELAY_MINUTES,
    AUTOMATION_REMINDER_COOLDOWN_HOURS,
    MAX_INCOMPLETE_REMINDERS,
    MAX_APPOINTMENT_FOLLOWUPS,
    VOICE_ACCENT_INSTRUCTIONS,
    VOICE_AUTO_REPLY,
    VOICE_ENABLED,
    VOICE_GENDER_TO_TTS,
    VOICE_MAX_SECONDS,
    activeAppointmentStatus,
    aiMessageIds,
    app,
    appointmentId,
    auth,
    authFolder,
    availability,
    bookedTimes,
    bool,
    businessContext,
    businessWelcomeReply,
    callOpenAI,
    catalogForAI,
    catalogTokens,
    clean,
    cleanDecision,
    cleanupMaps,
    clearAppointmentDraft,
    conversationKey,
    conversationMemory,
    cors,
    createAppointment,
    customerFacingReply,
    datePartsInTimezone,
    decideNextAction,
    downloadMediaMessage,
    encodeEq,
    enforceBusinessName,
    ensureConversationHistory,
    express,
    extractAudioMessage,
    extractCustomerName,
    extractPhoneNumberFromText,
    extractText,
    fallbackDecision,
    fetchLatestBaileysVersion,
    findCustomerAppointments,
    findRelevantCatalogProducts,
    findSavedWhatsAppPhone,
    formatAppointmentDate,
    formatMinutes,
    fs,
    generateSlots,
    getAppointmentsForDate,
    getHistory,
    getPrimaryCatalogImage,
    handleAvailability,
    handoverMemory,
    hasBusinessBrandedWelcome,
    initPersistentMemory,
    isCatalogQuestion,
    isExactControlCommand,
    isGreetingText,
    isIncomingVoiceMessage,
    isLidJid,
    isPnJid,
    isoDate,
    jidPhone,
    loadAppointmentDraft,
    loadBusiness,
    loadBusinessCatalog,
    loadHandoverFile,
    loadPersistentHistory,
    logger,
    makeWASocket,
    memoryPool,
    memoryQuery,
    nearestAvailableText,
    normalizeAppointmentTime,
    normalizeCatalogText,
    normalizeCustomerName,
    normalizePhone,
    normalizeResolvedPhone,
    parseDateFromAI,
    parseDays,
    parseJsonMaybe,
    parseMinutes,
    parseTimeRange,
    path,
    pendingAiKey,
    pendingAiMessages,
    pendingVoiceReplies,
    persistMessage,
    phoneFromJid,
    pino,
    plannerPrompt,
    processBooking,
    processCancel,
    processReschedule,
    processedMessages,
    publicSession,
    readConversationState,
    rememberMessage,
    resolveDateFromCustomerText,
    resolveTimeFromCustomerText,
    resolveVoiceProfile,
    resolveWhatsAppCustomerIdentity,
    safeId,
    saveAppointmentDraft,
    saveHandoverFile,
    saveWhatsAppIdentity,
    selectProductForImage,
    sendAndRemember,
    sendWhatsAppVoiceReply,
    sessions,
    setBusinessWhatsAppConnected,
    setHumanHandover,
    setPendingVoiceReply,
    shiftDate,
    shouldReplyWithVoice,
    signProductImage,
    slotIsAvailable,
    staffBookingReply,
    supabaseConfigured,
    supabaseRequest,
    synthesizeWhatsAppVoice,
    timeToComparable,
    todayDate,
    transcribeWhatsAppAudio,
    unwrapWhatsAppMessage,
    updateAppointmentById,
    upsertCustomer,
    useMultiFileAuthState,
    wasAiGenerated,
    weekdayForDate,
  } = ctx;

async function sendSafeWhatsAppReply(session, to, text, source = "ai", product = null) {
  const reply = String(text || "").trim();
  if (!session?.socket) throw new Error("WhatsApp socket is not available.");
  if (!to || !reply) throw new Error("WhatsApp reply recipient or text is missing.");
  if (session.status !== "connected") throw new Error(`WhatsApp session is not connected. Current status: ${session.status}`);

  const state = await readConversationState(session.businessId, jidPhone(to));
  if (state.active) {
    logger.info({ businessId: session.businessId, to }, "Human takeover active. Suppressing outgoing AI message.");
    return null;
  }

  const pendingKey = pendingAiKey(session.sessionId, to);

  // Product images are always the real uploaded business image. The private
  // Supabase storage path is signed just before sending and is never exposed
  // to the AI/customer. Only attach an image when there is one clear product
  // match and a real image exists.
  if (product) {
    try {
      const productImageUrl = await getPrimaryCatalogImage(product);
      if (productImageUrl) {
        const imageResult = await session.socket.sendMessage(to, {
          image: { url: productImageUrl },
          caption: reply,
        });
        const imageMessageId = imageResult?.key?.id;
        if (imageMessageId) aiMessageIds.set(imageMessageId, Date.now());
        logger.info({ sessionId: session.sessionId, businessId: session.businessId, to, source, productName: product.product_name, messageId: imageMessageId || null }, "WhatsApp product image + reply sent.");

        // If this customer sent a voice message, keep the existing voice
        // response behaviour after the real product image. Otherwise the
        // caption above is already the complete customer response.
        if (!shouldReplyWithVoice(session, to)) {
          pendingAiMessages.delete(pendingKey);
          return imageResult;
        }
      }
    } catch (error) {
      logger.warn({ sessionId: session.sessionId, businessId: session.businessId, to, productName: product.product_name, error: error.message }, "Product image send failed; falling back to normal AI reply.");
    }
  }

  const replyAsVoice = shouldReplyWithVoice(session, to);
  if (replyAsVoice) {
    try {
      const result = await sendWhatsAppVoiceReply(session, to, reply, source);
      pendingVoiceReplies.delete(pendingKey);
      return result;
    } catch (error) {
      // Never lose the customer's answer because TTS failed. Fall back to text.
      logger.warn({ sessionId: session.sessionId, businessId: session.businessId, to, error: error.message }, "Voice reply failed; falling back to WhatsApp text.");
      pendingVoiceReplies.delete(pendingKey);
    }
  }
  pendingAiMessages.set(pendingKey, { text: reply, timestamp: Date.now() });
  const result = await session.socket.sendMessage(to, { text: reply });
  const messageId = result?.key?.id;
  if (messageId) aiMessageIds.set(messageId, Date.now());
  pendingAiMessages.delete(pendingKey);
  logger.info({ sessionId: session.sessionId, businessId: session.businessId, to, source, messageId: messageId || null }, "WhatsApp AI reply sent.");
  return result;
}

async function handleIncomingMessage(session, message) {
  const from = message?.key?.remoteJid || "";
  const messageId = message?.key?.id || "";
  if (!from || !messageId) return;

  const incomingVoice = isIncomingVoiceMessage(message);
  let text = extractText(message);
  if (!text && incomingVoice) {
    try {
      text = await transcribeWhatsAppAudio(message);
      logger.info({ sessionId: session.sessionId, businessId: session.businessId, from, messageId, transcript: text }, "Incoming WhatsApp voice transcribed.");
    } catch (error) {
      logger.error({ sessionId: session.sessionId, businessId: session.businessId, from, messageId, error: error.message }, "Incoming WhatsApp voice transcription failed.");
      await sendSafeWhatsAppReply(session, from, "Sorry, I couldn't understand that voice message. Could you please send it again or type your request?", "voice-transcription-error");
      return;
    }
  }
  if (!from || !text) return;
  setPendingVoiceReply(session, from, incomingVoice);

  const identity = await resolveWhatsAppCustomerIdentity(session, message, session.businessId);
  const customerId = identity.customerId || identity.primaryJid;
  let customerPhone = identity.phone;
  const suppliedPhone = extractPhoneNumberFromText(text);

  // If WhatsApp did not expose the PN on this message, allow the customer
  // to provide it explicitly. Never use a LID's numeric identifier as a phone.
  if (!customerPhone && suppliedPhone) {
    customerPhone = suppliedPhone;
    if (identity.lidJid) {
      await saveWhatsAppIdentity(session.businessId, identity.lidJid, customerPhone, extractCustomerName(message));
    }
  }

  const key = conversationKey(session.businessId, customerId);

  logger.info({
    sessionId: session.sessionId,
    businessId: session.businessId,
    from,
    remoteJidAlt: message?.key?.remoteJidAlt || null,
    participant: message?.key?.participant || null,
    participantAlt: message?.key?.participantAlt || null,
    customerId,
    customerPhone: customerPhone || null,
    phoneResolved: Boolean(customerPhone),
    phoneSource: identity.source,
    text,
    messageId
  }, "Incoming WhatsApp message received.");

  const currentState = await readConversationState(session.businessId, customerId);
  if (currentState.active) {
    logger.info({ businessId: session.businessId, customerId }, "AI paused because human takeover is active.");
    return;
  }

  if (!AI_ENABLED) {
    logger.warn({ businessId: session.businessId }, "AI_ENABLED is false. No AI reply will be sent.");
    return;
  }

  let business;
  try {
    business = await loadBusiness(session.businessId);
  } catch (error) {
    logger.error({ businessId: session.businessId, error: error.message }, "Business lookup failed.");
    await sendSafeWhatsAppReply(session, from, FALLBACK_REPLY, "fallback-business-error");
    return;
  }

  // The businesses table is the source of truth for whether this WhatsApp
  // connection is allowed to answer. A restart/deployment must never require
  // the customer or owner to reconnect if the business is still marked true.
  // If the optional whatsapp_connected column exists, false is authoritative.
  // If an older production schema does not have the column, undefined means
  // the connected Baileys session is allowed to answer rather than suppressing AI.
  if (business.whatsapp_connected === false) {
    logger.info({ businessId: session.businessId, whatsappConnected: business.whatsapp_connected }, "WhatsApp is not marked connected for this business; AI reply suppressed.");
    return;
  }

  if (business.ai_enabled === false || business.automation_enabled === false) {
    logger.info({ businessId: session.businessId, aiEnabled: business.ai_enabled, automationEnabled: business.automation_enabled }, "Business AI/automation disabled.");
    return;
  }

  const catalog = await loadBusinessCatalog(business.business_id);
  const relevantCatalogProducts = findRelevantCatalogProducts(catalog, text);
  logger.info({
    businessId: business.business_id,
    catalogCount: catalog.length,
    relevantProducts: relevantCatalogProducts.map((product) => product.product_name),
  }, "Business product catalog loaded for AI.");

  const customerNameFromWhatsApp = extractCustomerName(message);
  let customer = await upsertCustomer(
    business,
    customerId,
    customerNameFromWhatsApp,
    customerPhone
  );

  // If the customer just supplied their number after an unresolved LID,
  // immediately bind that real phone to the same WhatsApp customer record.
  if (!customerPhone && suppliedPhone) {
    customerPhone = suppliedPhone;
    customer = await upsertCustomer(
      business,
      customerId,
      customerNameFromWhatsApp,
      customerPhone
    );
  }
  await ensureConversationHistory(business.business_id, customerId);
  if (!customerPhone) {
    customerPhone = normalizeResolvedPhone(customer?.phone);
  }

  const draft = await loadAppointmentDraft(business.business_id, customerPhone || customerId);
  const historyBeforeMessage = getHistory(key);
  const firstContact = historyBeforeMessage.filter(m => m.role === "user" || m.role === "assistant").length === 0;
  rememberMessage(key, "user", text, business.business_id, customerId, messageId);

  // Deterministic greeting handling. Do NOT depend on firstContact alone:
  // old test messages or generic AI greetings can already exist in memory.
  // If the customer sends a greeting and we have not previously sent a
  // correctly business-branded welcome, send the deterministic welcome now.
  // This prevents replies such as "Hello! How can I assist you with Sodah.io today?"
  // even when conversation memory already exists.
  const brandedWelcomeAlreadySent = hasBusinessBrandedWelcome(historyBeforeMessage, business);
  const greetingDetected = isGreetingText(text);
  logger.info({
    businessId: business.business_id,
    customerId,
    text,
    customerNameFromWhatsApp,
    businessName: business.business_name,
    greetingDetected,
    brandedWelcomeAlreadySent,
    hasDraft: Boolean(draft),
  }, "Greeting/business welcome check.");

  if (greetingDetected && !draft) {
    // Greetings are deterministic. Never let the generic AI chat reply
    // replace the branded Sodah welcome. This also prevents an older
    // generic greeting stored in conversation history from taking over.
    const welcome = businessWelcomeReply(
      business,
      customerNameFromWhatsApp || customer?.name || ""
    );
    await sendSafeWhatsAppReply(session, from, welcome, "business-branded-welcome");
    rememberMessage(key, "assistant", welcome, session.businessId, customerId);
    return;
  }

  let decision;
  try {
    decision = cleanDecision(await decideNextAction(business, key, text, draft, relevantCatalogProducts));
  } catch (error) {
    logger.error({ businessId: session.businessId, error: error.message }, "AI decision failed.");
    decision = fallbackDecision(text);
  }

  // Appointment memory has priority over generic chat when the customer is
  // completing a saved booking. This lets messages such as "Solomon",
  // "10 am", or "27/09/2026" continue the same appointment without making
  // the customer repeat information already stored in the draft.
  if (draft?.status === "awaiting_customer_name" && !normalizeCustomerName(draft.customer_name)) {
    const suppliedName = normalizeCustomerName(text);
    if (suppliedName && !isGreetingText(text)) {
      decision.intent = "booking";
      decision.customer_name = suppliedName;
      decision.service = decision.service || draft.service || "";
      decision.date = decision.date || parseDateFromAI(draft.appointment_date) || resolveDateFromCustomerText(text) || "";
      decision.time = decision.time || normalizeAppointmentTime(draft.appointment_time) || resolveTimeFromCustomerText(text) || "";
    }
  }

  if (draft && (draft.status === "incomplete" || draft.status === "awaiting_time" || draft.status === "awaiting_customer_name")) {
    const detectedDate = resolveDateFromCustomerText(text);
    const detectedTime = resolveTimeFromCustomerText(text);
    if (detectedDate || detectedTime) {
      decision.intent = "booking";
      decision.date = decision.date || detectedDate || parseDateFromAI(draft.appointment_date) || "";
      decision.time = decision.time || detectedTime || normalizeAppointmentTime(draft.appointment_time) || "";
      decision.service = decision.service || draft.service || "";
      decision.customer_name = decision.customer_name || normalizeCustomerName(draft.customer_name) || normalizeCustomerName(customer?.name) || customerNameFromWhatsApp || "";
    }
  }

  logger.info({ businessId: session.business_id || session.businessId, from, intent: decision.intent, date: decision.date, time: decision.time, service: decision.service, customerName: decision.customer_name || customer?.name || customerNameFromWhatsApp || null, customerPhone: customerId }, "AI intent selected.");

  if (decision.intent === "stop") {
    await setHumanHandover(session.businessId, customerId, true, "customer_opt_out");
    logger.info({ businessId: session.businessId, customerId }, "AI stopped because customer opted out.");
    return;
  }

  if (decision.intent === "human") {
    await setHumanHandover(session.businessId, customerId, true, "customer_requested_human");
    logger.info({ businessId: session.businessId, customerId }, "Human handover activated by customer request.");
    if (decision.reply) await sendSafeWhatsAppReply(session, from, decision.reply, "handover");
    return;
  }

  try {
    if (decision.intent === "availability") {
      const result = await handleAvailability(business, decision);
      await sendSafeWhatsAppReply(session, from, result.reply, "availability");
      rememberMessage(key, "assistant", result.reply, session.businessId, customerId);
      return;
    }
    if (decision.intent === "booking") {
      await processBooking(session, from, text, business, customer, decision, key, draft, customerPhone);
      return;
    }
    if (decision.intent === "reschedule") {
      await processReschedule(session, from, text, business, customer, decision, key);
      return;
    }
    if (decision.intent === "cancel") {
      await processCancel(session, from, text, business, customer, key);
      return;
    }

    const reply = await customerFacingReply(business, getHistory(key), text, decision, decision.reply ? `The internal planner suggested this response, but you must independently verify it against the business context and product catalog before replying: ${decision.reply}` : "", relevantCatalogProducts);
    const productForImage = selectProductForImage(catalog, text);
    await sendSafeWhatsAppReply(session, from, reply, "ai", productForImage);
    rememberMessage(key, "assistant", reply, session.businessId, customerId);
  } catch (error) {
    logger.error({ businessId: session.businessId, from, intent: decision.intent, error: error.message, stack: error.stack }, "AI action failed. Using fallback reply.");
    try {
      await sendSafeWhatsAppReply(session, from, FALLBACK_REPLY, "fallback-action-error");
      rememberMessage(key, "assistant", FALLBACK_REPLY, session.businessId, customerId);
    } catch (sendError) {
      logger.error({ businessId: session.businessId, error: sendError.message }, "Fallback reply failed.");
    }
  }
}

async function createSession(sessionId, businessId) {
  const id = safeId(sessionId);
  if (!id) throw new Error("sessionId is required.");
  if (!businessId) throw new Error("businessId is required.");
  if (sessions.has(id)) return sessions.get(id);

  const authPath = authFolder(id);
  fs.mkdirSync(authPath, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  let version;
  try { version = (await fetchLatestBaileysVersion()).version; } catch (error) { logger.warn({ error: error.message }, "Could not fetch latest Baileys version."); }

  const registered = Boolean(state.creds.registered);
  const session = {
    sessionId: id,
    businessId: String(businessId),
    status: registered ? "connecting" : "qr_pending",
    phoneNumber: state.creds.me?.id?.split(":")[0] || null,
    qrCode: null,
    lastError: null,
    updatedAt: new Date().toISOString(),
    socket: null,
    starting: true,
  };
  sessions.set(id, session);

  const socket = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Sodah", "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  session.socket = socket;
  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    session.updatedAt = new Date().toISOString();
    if (qr) {
      try {
        session.qrCode = await QRCode.toDataURL(qr, { width: 420, margin: 2, errorCorrectionLevel: "M" });
        session.status = "qr_pending";
        session.lastError = null;
        logger.info({ sessionId: id, businessId }, "WhatsApp QR code generated.");
      } catch (error) {
        session.status = "error";
        session.lastError = error.message;
        logger.error({ sessionId: id, error: error.message }, "QR generation failed.");
      }
    }
    if (connection === "connecting") {
      session.status = session.qrCode ? "qr_pending" : "connecting";
      logger.info({ sessionId: id, businessId }, "WhatsApp connecting.");
    }
    if (connection === "open") {
      session.status = "connected";
      session.qrCode = null;
      session.lastError = null;
      session.starting = false;
      session.phoneNumber = normalizeResolvedPhone((socket.user?.id || "").split(":")[0]) || null;
      await setBusinessWhatsAppConnected(businessId, true);
      logger.info({ sessionId: id, businessId, phoneNumber: session.phoneNumber }, "WhatsApp connected and business connection state is active.");
    }
    if (connection === "close") {
      session.starting = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      logger.warn({ sessionId: id, businessId, code }, "WhatsApp connection closed.");
      if (code === DisconnectReason.loggedOut) {
        session.status = "disconnected";
        session.qrCode = null;
        session.lastError = "WhatsApp session was logged out.";
        await setBusinessWhatsAppConnected(businessId, false);
        return;
      }
      session.status = "reconnecting";
      session.qrCode = null;
      session.lastError = lastDisconnect?.error?.message || "WhatsApp connection closed.";
      setTimeout(() => {
        if (sessions.get(id) === session) {
          sessions.delete(id);
          createSession(id, businessId).catch(error => logger.error({ sessionId: id, businessId, error: error.message }, "Reconnect failed."));
        }
      }, 3000);
    }
  });

  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const message of messages) {
      try {
        if (!message?.message) continue;
        const from = message.key?.remoteJid || "";
        const text = extractText(message);
        const incomingVoice = isIncomingVoiceMessage(message);
        const messageId = message.key?.id || "";
        if (!from || !messageId) continue;
        if (IGNORE_STATUS && from === "status@broadcast") continue;
        if (IGNORE_GROUPS && from.endsWith("@g.us")) continue;
        if (processedMessages.has(messageId)) continue;
        processedMessages.set(messageId, Date.now());

        if (message.key?.fromMe) {
          if (wasAiGenerated(session.sessionId, message)) {
            logger.info({ sessionId: id, businessId, to: from, messageId }, "AI outgoing message observed; not a human takeover.");
            continue;
          }
          if (isExactControlCommand(text)) {
            const command = text.toUpperCase();
            const customerId = jidPhone(from) || from;
            if (["AI ON", "AI RESUME", "HUMAN OFF"].includes(command)) {
              await setHumanHandover(businessId, customerId, false, "owner_resume_ai");
              logger.info({ businessId, customerId }, "AI resumed by owner control command.");
            } else {
              await setHumanHandover(businessId, customerId, true, "owner_control_command");
              logger.info({ businessId, customerId }, "AI paused by owner control command.");
            }
            continue;
          }
          if (text) {
            const customerId = jidPhone(from) || from;
            await setHumanHandover(businessId, customerId, true, "owner_message");
            logger.info({ sessionId: id, businessId, customerId, messageId }, "Human takeover automatically activated by owner message.");
          }
          continue;
        }

        if (!text && !incomingVoice) continue;
        await handleIncomingMessage(session, message);
      } catch (error) {
        logger.error({ sessionId: id, businessId, error: error.message }, "Incoming message processing failed.");
      }
    }
  });

  return session;
}


/*
 * FOLLOW-UP + REMINDER ENGINE
 * ---------------------------
 * The existing appointments table already exposes follow_up_count and
 * next_follow_up_at. We use those fields rather than creating a second
 * appointment system. Reminder delivery is recorded in the notes field with
 * a small internal marker, so no new database column is required.
 */
function appointmentDateTime(dateString, timeString) {
  const minutes = timeToComparable(timeString);
  if (!dateString || minutes === null) return null;
  const [year, month, day] = String(dateString).split("-").map(Number);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  return utcGuess;
}

function notesHasMarker(notes, marker) {
  return String(notes || "").includes(marker);
}
function addMarker(notes, marker) {
  const base = String(notes || "").trim();
  return base ? `${base} ${marker}` : marker;
}

function customerJid(phone) {
  return `${normalizePhone(phone)}@s.whatsapp.net`;
}

async function automationCanSend(businessId, phone, kind, nowMs) {
  const state = await getAutomationState(businessId, phone, kind);
  if (!state) return { allowed: true, state: null };
  const count = Number(state.count || 0);
  if (kind === "incomplete_appointment" || kind === "incomplete_chat") {
    if (count >= MAX_INCOMPLETE_REMINDERS) return { allowed: false, state };
  }
  if (state.next_allowed_at && new Date(state.next_allowed_at).getTime() > nowMs) {
    return { allowed: false, state };
  }
  return { allowed: true, state };
}

async function markAutomationSent(businessId, phone, kind, nowMs, nextMinutes, count) {
  const nextAllowedAt = new Date(nowMs + Math.max(1, nextMinutes) * 60 * 1000).toISOString();
  return setAutomationState(businessId, phone, kind, {
    count,
    last_sent_at: new Date(nowMs).toISOString(),
    next_allowed_at: nextAllowedAt,
  });
}

async function runAppointmentAutomationOnce() {
  if (!FOLLOWUP_ENABLED && !REMINDERS_ENABLED) return;
  const now = Date.now();

  try {
    // -----------------------------------------------------------------------
    // 1. Confirmed appointment reminders + post-appointment follow-ups
    // -----------------------------------------------------------------------
    if (supabaseConfigured()) {
      const query = [
        `select=${encodeURIComponent("appointment_id,business_id,customer_name,customer_phone,service,appointment_date,appointment_time,status,notes,follow_up_count,next_follow_up_at")}`,
        "limit=500",
        "order=appointment_date.asc",
      ].join("&");
      const appointments = await supabaseRequest(APPOINTMENTS_TABLE, query);

      for (const appointment of appointments || []) {
        if (!activeAppointmentStatus(appointment.status)) continue;
        const businessId = String(appointment.business_id || "");
        const phone = normalizePhone(appointment.customer_phone);
        if (!businessId || !phone) continue;

        const session = [...sessions.values()].find(
          s => s.businessId === businessId && s.status === "connected" && s.socket
        );
        if (!session) continue;

        const state = await readConversationState(businessId, phone);
        if (state.active) continue;

        const business = await loadBusiness(businessId);
        const appt = appointmentDateTime(appointment.appointment_date, appointment.appointment_time);
        if (!appt) continue;

        // 1A. Appointment reminder before the appointment.
        if (REMINDERS_ENABLED && appt.getTime() > now) {
          const hoursUntil = (appt.getTime() - now) / (60 * 60 * 1000);
          const marker = "[SODAH_REMINDER_SENT]";
          if (hoursUntil <= REMINDER_HOURS_BEFORE && !notesHasMarker(appointment.notes, marker)) {
            const reply = `Hi ${appointment.customer_name || "there"} 😊 Just a reminder that you have your ${appointment.service || "appointment"} with ${business.business_name || "us"} on ${appointment.appointment_date} at ${appointment.appointment_time}. We look forward to seeing you.`;
            await sendSafeWhatsAppReply(session, customerJid(phone), reply, "appointment-reminder");
            await updateAppointmentById(appointment.appointment_id, { notes: addMarker(appointment.notes, marker) });
          }
        }

        // 1B. Follow up after the appointment. The first follow-up is due
        // after APPOINTMENT_FOLLOWUP_DELAY_MINUTES; later follow-ups use the
        // existing next_follow_up_at field and FOLLOWUP_DELAY_MINUTES.
        if (FOLLOWUP_ENABLED && appt.getTime() <= now) {
          const count = Number(appointment.follow_up_count || 0);
          if (count < MAX_APPOINTMENT_FOLLOWUPS) {
            const computedFirstDue = appt.getTime() + Math.max(1, Number(process.env.APPOINTMENT_FOLLOWUP_DELAY_MINUTES || 120)) * 60 * 1000;
            const dueAt = appointment.next_follow_up_at
              ? new Date(appointment.next_follow_up_at).getTime()
              : computedFirstDue;

            if (dueAt <= now) {
              const reply = `Hi ${appointment.customer_name || "there"} 😊 Just following up after your ${appointment.service || "appointment"} with ${business.business_name || "us"}. I hope everything went well. If you need anything else, we're here to help.`;
              await sendSafeWhatsAppReply(session, customerJid(phone), reply, "appointment-followup");
              const nextCount = count + 1;
              await updateAppointmentById(appointment.appointment_id, {
                follow_up_count: nextCount,
                next_follow_up_at: nextCount >= MAX_APPOINTMENT_FOLLOWUPS
                  ? null
                  : new Date(now + FOLLOWUP_DELAY_MINUTES * 60 * 1000).toISOString(),
              });
            }
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // 2. Incomplete appointment reminder
    // -----------------------------------------------------------------------
    if (FOLLOWUP_ENABLED && memoryPool) {
      const staleDrafts = await listStaleAppointmentDrafts(
        new Date(now - INCOMPLETE_REMINDER_DELAY_MINUTES * 60 * 1000).toISOString(),
        200
      );

      for (const draft of staleDrafts) {
        const businessId = String(draft.business_id || "");
        const phone = normalizePhone(draft.customer_phone);
        if (!businessId || !phone) continue;

        const session = [...sessions.values()].find(
          s => s.businessId === businessId && s.status === "connected" && s.socket
        );
        if (!session) continue;

        const state = await readConversationState(businessId, phone);
        if (state.active) continue;

        const gate = await automationCanSend(businessId, phone, "incomplete_appointment", now);
        if (!gate.allowed) continue;

        const business = await loadBusiness(businessId);
        const name = normalizeCustomerName(draft.customer_name) || "there";
        const service = String(draft.service || "appointment").trim();
        let reply;
        if (draft.appointment_date && draft.appointment_time) {
          reply = `Hi ${name} 😊 Just checking in about your ${service}. You were arranging an appointment for ${formatAppointmentDate(String(draft.appointment_date))} at ${draft.appointment_time}. Would you like me to finish confirming it for you?`;
        } else if (draft.appointment_date) {
          reply = `Hi ${name} 😊 Just checking in about your ${service}. We still have your preferred date as ${formatAppointmentDate(String(draft.appointment_date))}. Would you like to continue and choose a time?`;
        } else if (draft.service) {
          reply = `Hi ${name} 😊 Just checking in about your ${service}. Would you still like to continue with your appointment? I can help you finish it.`;
        } else {
          reply = `Hi ${name} 😊 Just checking in. Would you still like to continue with your appointment? I can help you finish the booking.`;
        }

        await sendSafeWhatsAppReply(session, customerJid(phone), reply, "incomplete-appointment-reminder");
        const count = Number(gate.state?.count || 0) + 1;
        await markAutomationSent(
          businessId,
          phone,
          "incomplete_appointment",
          now,
          AUTOMATION_REMINDER_COOLDOWN_HOURS * 60,
          count
        );
        logger.info({ businessId, phone, count }, "Incomplete appointment reminder sent.");
      }

      // ---------------------------------------------------------------------
      // 3. Incomplete customer chat reminder
      // ---------------------------------------------------------------------
      const staleChats = await listStaleCustomerChats(
        new Date(now - INCOMPLETE_CHAT_REMINDER_DELAY_MINUTES * 60 * 1000).toISOString(),
        200
      );

      for (const chat of staleChats) {
        const businessId = String(chat.business_id || "");
        const phone = normalizePhone(chat.customer_phone);
        if (!businessId || !phone) continue;

        // If an appointment draft exists, let the appointment reminder own the
        // conversation so the customer does not receive two reminders.
        const draft = await loadAppointmentDraft(businessId, phone);
        if (draft) continue;

        const session = [...sessions.values()].find(
          s => s.businessId === businessId && s.status === "connected" && s.socket
        );
        if (!session) continue;

        const state = await readConversationState(businessId, phone);
        if (state.active) continue;

        const gate = await automationCanSend(businessId, phone, "incomplete_chat", now);
        if (!gate.allowed) continue;

        const name = "there";
        const reply = `Hi ${name} 😊 Just checking in to see if you still need any help. I'm here whenever you're ready.`;

        await sendSafeWhatsAppReply(session, customerJid(phone), reply, "incomplete-chat-reminder");
        const count = Number(gate.state?.count || 0) + 1;
        await markAutomationSent(
          businessId,
          phone,
          "incomplete_chat",
          now,
          AUTOMATION_REMINDER_COOLDOWN_HOURS * 60,
          count
        );
        logger.info({ businessId, phone, count }, "Incomplete customer chat reminder sent.");
      }
    }
  } catch (error) {
    logger.warn({ error: error.message, stack: error.stack }, "Appointment/follow-up automation cycle failed.");
  }
}
setInterval(runAppointmentAutomationOnce, 60000);


async function restorePersistedConnectedSessions() {
  try {
    if (!fs.existsSync(AUTH_DIR)) return;
    const entries = fs.readdirSync(AUTH_DIR, { withFileTypes: true });
    const candidates = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    if (!candidates.length) return;

    logger.info({ count: candidates.length }, "Checking persisted WhatsApp sessions for automatic restore.");

    for (const candidate of candidates) {
      const businessId = candidate;
      try {
        const business = await loadBusiness(businessId);
        // If the optional column exists and is explicitly false, do not restore.
        // If it is absent in an older schema, persisted credentials remain eligible
        // for automatic restore so deployments do not force a new QR scan.
        if (business.whatsapp_connected === false) {
          logger.info({ businessId }, "Persisted WhatsApp credentials found, but business is explicitly marked disconnected. Session will not be restored automatically.");
          continue;
        }
        const session = await createSession(candidate, businessId);
        logger.info({ sessionId: candidate, businessId, status: session.status }, "Persisted WhatsApp session restore started automatically.");
      } catch (error) {
        logger.warn({ sessionId: candidate, businessId, error: error.message }, "Persisted WhatsApp session could not be restored.");
      }
    }
  } catch (error) {
    logger.error({ error: error.message }, "Automatic WhatsApp session restore failed.");
  }
}

/* HEALTH */
app.get("/", (req, res) => res.json({ success: true, service: "sodah-whatsapp-qr-provider", message: "Sodah WhatsApp AI provider is running." }));
app.get("/health", (req, res) => res.json({
  success: true,
  service: "sodah-whatsapp-qr-provider",
  status: "ok",
  sessions: sessions.size,
  aiEnabled: AI_ENABLED,
  openaiConfigured: Boolean(OPENAI_API_KEY),
  openaiModel: OPENAI_MODEL,
  aiEngine: "openai-chat-completions",
  supabaseConfigured: supabaseConfigured(),
  persistentMemoryConfigured: Boolean(memoryPool),
  persistentMemoryReady: Boolean(ctx.memoryReady),
  timezone: TIMEZONE,
  port: PORT,
  time: new Date().toISOString(),
}));

/* CREATE / RESTORE SESSION */
app.post("/session/create", async (req, res) => {
  try {
    const { sessionId, businessId } = req.body || {};
    const session = await createSession(sessionId, businessId);
    if (session.status === "qr_pending" && !session.qrCode) await new Promise(resolve => setTimeout(resolve, 1200));
    res.json({ success: true, ...publicSession(session) });
  } catch (error) {
    logger.error({ error: error.message }, "Create session failed.");
    res.status(500).json({ success: false, message: error.message || "Unable to create WhatsApp session." });
  }
});

/* STATUS */
app.get("/session/:sessionId/status", async (req, res) => {
  try {
    const id = safeId(req.params.sessionId);
    let session = sessions.get(id);
    if (!session) session = await createSession(id, id);
    res.json({ success: true, ...publicSession(session) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Unable to get session status." });
  }
});

/* QR */
app.get("/session/:sessionId/qr", async (req, res) => {
  try {
    const id = safeId(req.params.sessionId);
    let session = sessions.get(id);
    if (!session) session = await createSession(id, id);
    if (!session.qrCode && session.status !== "connected") await new Promise(resolve => setTimeout(resolve, 1000));
    if (session.status === "connected") return res.json({ success: true, sessionId: id, status: "connected", connected: true, qrCode: null, phoneNumber: session.phoneNumber || null });
    if (session.qrCode) return res.json({ success: true, sessionId: id, status: "qr_pending", connected: false, qrCode: session.qrCode, phoneNumber: session.phoneNumber || null });
    return res.status(202).json({ success: true, sessionId: id, status: session.status || "connecting", connected: false, qrCode: null, phoneNumber: session.phoneNumber || null, message: "WhatsApp session is starting. Please try again shortly." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Unable to generate QR code." });
  }
});

/* ALIAS USED BY OLDER CLIENTS */
app.get("/qr/:sessionId", async (req, res) => {
  try {
    const id = safeId(req.params.sessionId);
    let session = sessions.get(id);
    if (!session) session = await createSession(id, id);
    if (!session.qrCode && session.status !== "connected") await new Promise(resolve => setTimeout(resolve, 1000));
    if (session.status === "connected") return res.json({ success: true, sessionId: id, status: "connected", connected: true, qrCode: null, phoneNumber: session.phoneNumber || null });
    if (session.qrCode) return res.json({ success: true, sessionId: id, status: "qr_pending", connected: false, qrCode: session.qrCode, phoneNumber: session.phoneNumber || null });
    return res.status(202).json({ success: true, sessionId: id, status: session.status || "connecting", connected: false, qrCode: null, phoneNumber: session.phoneNumber || null, message: "WhatsApp session is starting. Please try again shortly." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Unable to generate QR code." });
  }
});

/* SEND MESSAGE */
app.post("/session/:sessionId/send", async (req, res) => {
  try {
    const id = safeId(req.params.sessionId);
    const session = sessions.get(id);
    if (!session) return res.status(404).json({ success: false, message: "WhatsApp session not found." });
    if (session.status !== "connected") return res.status(409).json({ success: false, message: "WhatsApp is not connected.", status: session.status });
    const { to, message } = req.body || {};
    const phone = normalizePhone(to);
    if (!phone || !message) return res.status(400).json({ success: false, message: "Both 'to' and 'message' are required." });
    const result = await session.socket.sendMessage(`${phone}@s.whatsapp.net`, { text: String(message) });
    const messageId = result?.key?.id || null;
    if (messageId) aiMessageIds.set(messageId, Date.now());
    res.json({ success: true, messageId, to: phone });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Unable to send WhatsApp message." });
  }
});

/* VOICE — DIRECT SODAH VOICE API */
app.post("/session/:sessionId/send-voice", async (req, res) => {
  try {
    const id = safeId(req.params.sessionId);
    const session = sessions.get(id);
    if (!session) return res.status(404).json({ success: false, message: "WhatsApp session not found." });
    if (session.status !== "connected") return res.status(409).json({ success: false, message: "WhatsApp is not connected.", status: session.status });
    const phone = normalizePhone(req.body?.to);
    const message = String(req.body?.message || req.body?.text || "").trim();
    if (!phone || !message) return res.status(400).json({ success: false, message: "Both 'to' and 'message' are required." });
    const result = await sendWhatsAppVoiceReply(session, `${phone}@s.whatsapp.net`, message, "api-voice");
    res.json({ success: true, messageId: result?.key?.id || null, to: phone, type: "voice" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Unable to send WhatsApp voice message." });
  }
});

app.post("/session/:sessionId/transcribe-voice", async (req, res) => {
  res.status(501).json({ success: false, message: "Voice transcription is handled automatically when a customer sends a WhatsApp voice message. Use /send-voice to send an AI voice reply." });
});

/* HUMAN HANDOVER CONTROL */
app.get("/session/:sessionId/handover/:customer", async (req, res) => {
  const session = sessions.get(safeId(req.params.sessionId));
  if (!session) return res.status(404).json({ success: false, message: "Session not found." });
  const customerId = normalizePhone(req.params.customer) || req.params.customer;
  const state = await readConversationState(session.businessId, customerId);
  res.json({ success: true, businessId: session.businessId, customer: customerId, humanTakeover: Boolean(state.active), state });
});
app.post("/session/:sessionId/handover", async (req, res) => {
  try {
    const session = sessions.get(safeId(req.params.sessionId));
    if (!session) return res.status(404).json({ success: false, message: "Session not found." });
    const customerId = normalizePhone(req.body?.customer || req.body?.to) || String(req.body?.customer || req.body?.to || "");
    if (!customerId) return res.status(400).json({ success: false, message: "customer or to is required." });
    const active = bool(req.body?.active);
    const state = await setHumanHandover(session.businessId, customerId, active, active ? "dashboard" : "dashboard_resume");
    res.json({ success: true, businessId: session.businessId, customer: customerId, humanTakeover: active, state });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* AVAILABILITY */
app.get("/session/:sessionId/availability", async (req, res) => {
  try {
    const session = sessions.get(safeId(req.params.sessionId));
    if (!session) return res.status(404).json({ success: false, message: "Session not found." });
    const date = parseDateFromAI(req.query.date);
    if (!date) return res.status(400).json({ success: false, message: "date must be YYYY-MM-DD." });
    const business = await loadBusiness(session.businessId);
    const result = await availability(business, date);
    res.json({ success: true, date, workingDays: business.working_days, hours: business.hours, available: result.available.map(formatMinutes), booked: result.booked.map(formatMinutes) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* LOGOUT */
app.post("/session/:sessionId/logout", async (req, res) => {
  const id = safeId(req.params.sessionId);
  const session = sessions.get(id);
  if (!session) return res.json({ success: true, status: "disconnected" });
  try { await session.socket?.logout(); } catch {}
  await setBusinessWhatsAppConnected(session.businessId, false);
  session.status = "disconnected";
  session.qrCode = null;
  session.updatedAt = new Date().toISOString();
  res.json({ success: true, sessionId: id, status: "disconnected" });
});

/* DELETE SESSION */
app.delete("/session/:sessionId", async (req, res) => {
  const id = safeId(req.params.sessionId);
  const session = sessions.get(id);
  try {
    try { session?.socket?.end(undefined); } catch {}
    sessions.delete(id);
    const dir = authFolder(id);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    res.json({ success: true, sessionId: id, status: "deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Unable to delete session." });
  }
});

void initPersistentMemory()
  .catch(error => logger.error({error:error.message}, "Persistent memory initialization failed."));

const server = app.listen(PORT, HOST, () => {
  logger.info({ host: HOST, port: PORT, aiEnabled: AI_ENABLED, voiceEnabled: VOICE_ENABLED, voiceAutoReply: VOICE_AUTO_REPLY, sttModel: OPENAI_STT_MODEL, ttsModel: OPENAI_TTS_MODEL, ttsVoice: OPENAI_TTS_VOICE, openaiConfigured: Boolean(OPENAI_API_KEY), openaiModel: OPENAI_MODEL, supabaseConfigured: supabaseConfigured(), timezone: TIMEZONE }, "Sodah WhatsApp AI provider started.");
  // Do not wait for the frontend to call /session/create after a deployment.
  // Persisted Baileys credentials are restored from the mounted auth disk,
  // but only for businesses whose Supabase whatsapp_connected flag is true.
  void restorePersistedConnectedSessions();
});
  return {
    addMarker,
    appointmentDateTime,
    createSession,
    handleIncomingMessage,
    notesHasMarker,
    restorePersistedConnectedSessions,
    runAppointmentAutomationOnce,
    sendSafeWhatsAppReply,
    server,
  };
};
