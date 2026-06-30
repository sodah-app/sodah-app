export const PLAN_LIMITS = {
  Starter: {
    name: "Starter",
    price: 0,

    storageGB: 0.5,

    aiReplies: 500,

    workflows: 1,

    whatsappConnections: 1,

    groupAutomation: false,

    reminders: false,

    followUps: false,

    analytics: "basic",

    support: "community",

    prioritySupport: false,

    customAI: false,
  },

  Pro: {
    name: "Pro",
    price: 29,

    storageGB: 5,

    aiReplies: 5000,

    workflows: 3,

    whatsappConnections: 3,

    groupAutomation: false,

    reminders: true,

    followUps: true,

    analytics: "advanced",

    support: "email",

    prioritySupport: true,

    customAI: true,
  },

  Premium: {
    name: "Premium",
    price: 79,

    storageGB: 20,

    aiReplies: 20000,

    workflows: Infinity,

    whatsappConnections: Infinity,

    groupAutomation: true,

    reminders: true,

    followUps: true,

    analytics: "enterprise",

    support: "vip",

    prioritySupport: true,

    customAI: true,
  },
};