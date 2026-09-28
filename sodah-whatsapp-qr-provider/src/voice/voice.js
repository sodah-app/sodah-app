module.exports = function createVoice(ctx) {
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
    VOICE_AUTO_REPLY,
    VOICE_ENABLED,
    VOICE_MAX_SECONDS,
    activeAppointmentStatus,
    addMarker,
    aiMessageIds,
    app,
    appointmentDateTime,
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
    createSession,
    customerFacingReply,
    datePartsInTimezone,
    decideNextAction,
    downloadMediaMessage,
    encodeEq,
    enforceBusinessName,
    ensureConversationHistory,
    express,
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
    handleIncomingMessage,
    handoverMemory,
    hasBusinessBrandedWelcome,
    initPersistentMemory,
    isCatalogQuestion,
    isExactControlCommand,
    isGreetingText,
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
    memoryReady,
    nearestAvailableText,
    normalizeAppointmentTime,
    normalizeCatalogText,
    normalizeCustomerName,
    normalizePhone,
    normalizeResolvedPhone,
    notesHasMarker,
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
    resolveWhatsAppCustomerIdentity,
    restorePersistedConnectedSessions,
    runAppointmentAutomationOnce,
    safeId,
    saveAppointmentDraft,
    saveHandoverFile,
    saveWhatsAppIdentity,
    selectProductForImage,
    sendAndRemember,
    sendSafeWhatsAppReply,
    server,
    sessions,
    setBusinessWhatsAppConnected,
    setHumanHandover,
    shiftDate,
    signProductImage,
    slotIsAvailable,
    staffBookingReply,
    supabaseConfigured,
    supabaseRequest,
    timeToComparable,
    todayDate,
    updateAppointmentById,
    upsertCustomer,
    useMultiFileAuthState,
    wasAiGenerated,
    weekdayForDate,
  } = ctx;

function unwrapWhatsAppMessage(message) {
  let content = message?.message || {};
  // Baileys can wrap media in one or more ephemeral/view-once containers.
  for (let i = 0; i < 5; i += 1) {
    const next =
      content?.ephemeralMessage?.message ||
      content?.viewOnceMessage?.message ||
      content?.viewOnceMessageV2?.message ||
      content?.viewOnceMessageV2Extension?.message ||
      content?.documentWithCaptionMessage?.message;
    if (!next || next === content) break;
    content = next;
  }
  return content || {};
}

function extractAudioMessage(message) {
  const content = unwrapWhatsAppMessage(message);
  return content?.audioMessage || null;
}

function isIncomingVoiceMessage(message) {
  const audio = extractAudioMessage(message);
  return Boolean(audio && (audio.ptt === true || audio.mimetype));
}

async function transcribeWhatsAppAudio(message) {
  if (!VOICE_ENABLED) throw new Error("Sodah voice processing is disabled.");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing; voice transcription cannot run.");

  const audio = extractAudioMessage(message);
  if (!audio) throw new Error("No WhatsApp audio message was found.");

  const seconds = Number(audio.seconds || 0);
  if (seconds > VOICE_MAX_SECONDS) {
    throw new Error(`Voice message is too long. Maximum supported length is ${VOICE_MAX_SECONDS} seconds.`);
  }

  const buffer = await downloadMediaMessage(
    message,
    "buffer",
    {},
    { logger }
  );
  if (!buffer || !buffer.length) throw new Error("WhatsApp audio download returned no data.");

  const mimeType = String(audio.mimetype || "audio/ogg").split(";")[0] || "audio/ogg";
  const extension = mimeType.includes("wav") ? "wav" : mimeType.includes("mp3") ? "mp3" : mimeType.includes("mp4") ? "m4a" : "ogg";

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), `sodah-voice.${extension}`);
  form.append("model", OPENAI_STT_MODEL);
  form.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok) {
    throw new Error(data?.error?.message || `Voice transcription failed with status ${response.status}.`);
  }
  const transcript = String(data?.text || "").trim();
  if (!transcript) throw new Error("Voice transcription returned an empty transcript.");
  return transcript;
}

const DEFAULT_VOICE_PROFILE = {
  gender: "female",
  accent: "american",
  voice: "coral",
};

const VOICE_GENDER_TO_TTS = {
  female: "coral",
  male: "onyx",
};

const VOICE_ACCENT_INSTRUCTIONS = {
  american: [
    "Speak in clear General American English.",
    "Use natural American English vowel and consonant pronunciation.",
    "Do not use a British, Yorkshire, Irish, Australian, African, Nigerian or other regional accent.",
    "Keep the American character natural and consistent without forcing the accent.",
  ].join(" "),
  uk: [
    "Speak in clear contemporary British English.",
    "Use a neutral professional British pronunciation, not a Yorkshire or other strongly regional British accent.",
    "Do not use American, Scottish, Irish, Australian or other regional pronunciation.",
    "Keep the British character natural and consistent without forcing the accent.",
  ].join(" "),
  dubai: [
    "Speak clear professional English in the style commonly heard in the UAE and Dubai business environment.",
    "Use polished, internationally understandable UAE English with a natural Gulf-region influence.",
    "Do not exaggerate or caricature the accent.",
    "Keep pronunciation crisp and easy for multinational customers to understand.",
    "Do not drift into American, Yorkshire or strongly regional British pronunciation.",
    "Keep the UAE English style stable from the first word to the last.",
  ].join(" "),
  nigerian: [
    "Speak English with a natural Nigerian English accent and Nigerian English speech rhythm.",
    "Use authentic Nigerian English pronunciation without caricature or exaggeration.",
    "Keep the accent recognizably Nigerian while remaining clear and easy for international customers to understand.",
    "Do not drift into American, British, Yorkshire or generic international English.",
    "Keep the Nigerian English accent stable from the first word to the last.",
  ].join(" "),
  ghanaian: [
    "Speak English with a natural Ghanaian English accent and Ghanaian English speech rhythm.",
    "Use authentic Ghanaian English pronunciation without caricature or exaggeration.",
    "Keep the accent recognizably Ghanaian while remaining clear and easy for international customers to understand.",
    "Do not drift into American, British, Yorkshire, Nigerian or generic international English.",
    "Keep the Ghanaian English accent stable from the first word to the last.",
  ].join(" "),
  african: [
    "Speak clear English with a natural African English character.",
    "Keep the pronunciation warm, professional and easy for international customers to understand.",
    "Do not exaggerate the accent or turn it into a caricature.",
    "Keep the African English character natural and consistent without forcing the accent.",
  ].join(" "),
};
function resolveVoiceProfile(business) {
  const gender = ["female", "male"].includes(String(business?.voice_gender || "").toLowerCase())
    ? String(business.voice_gender).toLowerCase()
    : DEFAULT_VOICE_PROFILE.gender;

  const accent = Object.prototype.hasOwnProperty.call(
    VOICE_ACCENT_INSTRUCTIONS,
    String(business?.voice_accent || "").toLowerCase()
  )
    ? String(business.voice_accent).toLowerCase()
    : DEFAULT_VOICE_PROFILE.accent;

  const storedVoice = String(business?.voice_name || "").trim().toLowerCase();
  const allowedStoredVoices = new Set(["coral", "onyx"]);
  const voice = allowedStoredVoices.has(storedVoice)
    ? storedVoice
    : (VOICE_GENDER_TO_TTS[gender] || DEFAULT_VOICE_PROFILE.voice);

  return { gender, accent, voice };
}

async function synthesizeWhatsAppVoice(text, businessId) {
  if (!VOICE_ENABLED) throw new Error("Sodah voice processing is disabled.");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing; voice synthesis cannot run.");
  const input = String(text || "").trim();
  if (!input) throw new Error("Voice synthesis text is empty.");

  let business;
  try {
    business = await loadBusiness(businessId);
  } catch (error) {
    logger.warn({ businessId, error: error.message }, "Could not load business voice settings; using the configured fallback voice.");
    business = {};
  }

  const voiceProfile = resolveVoiceProfile(business);
  const accentInstruction = VOICE_ACCENT_INSTRUCTIONS[voiceProfile.accent] || VOICE_ACCENT_INSTRUCTIONS.american;
  const instructions = [
    "Speak like a real, experienced human receptionist talking naturally to one customer on WhatsApp.",
    "Use a warm, polished, confident and approachable professional tone.",
    "Sound conversational and spontaneous, never like an announcement, audiobook, call-centre script or AI demonstration.",
    "Use natural sentence rhythm, subtle pauses and realistic changes in pitch and emphasis.",
    "Let short sentences feel relaxed and let important words receive natural emphasis.",
    "Do not over-pronounce words or force the accent; the accent should feel effortless and natural.",
    "Avoid a fixed cadence, repetitive pitch, perfectly even timing, exaggerated friendliness or theatrical delivery.",
    "Keep the speaking pace comfortable and human, around normal everyday conversation.",
    "For questions, use natural rising or questioning intonation. For statements, let the voice settle naturally at the end.",
    "Sound attentive and genuinely helpful, as if you are speaking directly to one person rather than reading text aloud.",
    accentInstruction,
  ].join(" ");

  logger.info({
    businessId,
    voiceGender: voiceProfile.gender,
    voiceAccent: voiceProfile.accent,
    voiceName: voiceProfile.voice,
  }, "Using current business WhatsApp voice settings for TTS.");

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_TTS_MODEL,
      voice: voiceProfile.voice,
      input,
      response_format: OPENAI_TTS_FORMAT,
      speed: 0.98,
      instructions,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch {}
    throw new Error(data?.error?.message || `Voice synthesis failed with status ${response.status}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.length) throw new Error("Voice synthesis returned an empty audio file.");
  return buffer;
}

async function sendWhatsAppVoiceReply(session, to, text, source = "voice-ai") {
  const reply = String(text || "").trim();
  if (!reply) throw new Error("WhatsApp voice reply text is empty.");
  if (!session?.socket) throw new Error("WhatsApp socket is not available.");
  if (!to) throw new Error("WhatsApp voice recipient is missing.");
  if (session.status !== "connected") throw new Error(`WhatsApp session is not connected. Current status: ${session.status}`);

  const audio = await synthesizeWhatsAppVoice(reply, session.businessId);
  const pendingKey = pendingAiKey(session.sessionId, to);
  pendingAiMessages.set(pendingKey, { text: reply, timestamp: Date.now() });

  const result = await session.socket.sendMessage(to, {
    audio,
    mimetype: "audio/ogg; codecs=opus",
    ptt: true,
  });

  const messageId = result?.key?.id;
  if (messageId) aiMessageIds.set(messageId, Date.now());
  pendingAiMessages.delete(pendingKey);
  logger.info({ sessionId: session.sessionId, businessId: session.businessId, to, source, messageId: messageId || null }, "Sodah WhatsApp AI voice reply sent.");
  return result;
}

function setPendingVoiceReply(session, to, enabled) {
  const key = pendingAiKey(session.sessionId, to);
  if (enabled) pendingVoiceReplies.set(key, { timestamp: Date.now() });
  else pendingVoiceReplies.delete(key);
}

function shouldReplyWithVoice(session, to) {
  const key = pendingAiKey(session.sessionId, to);
  const item = pendingVoiceReplies.get(key);
  if (!item) return false;
  if (Date.now() - item.timestamp > 5 * 60 * 1000) {
    pendingVoiceReplies.delete(key);
    return false;
  }
  return VOICE_AUTO_REPLY;
}

  return {
    DEFAULT_VOICE_PROFILE,
    VOICE_ACCENT_INSTRUCTIONS,
    VOICE_GENDER_TO_TTS,
    extractAudioMessage,
    isIncomingVoiceMessage,
    resolveVoiceProfile,
    sendWhatsAppVoiceReply,
    setPendingVoiceReply,
    shouldReplyWithVoice,
    synthesizeWhatsAppVoice,
    transcribeWhatsAppAudio,
    unwrapWhatsAppMessage,
  };
};
