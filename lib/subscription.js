export const FEATURES = {
  GROUP_AUTOMATION: "GROUP_AUTOMATION",
  FOLLOW_UPS: "FOLLOW_UPS",
  REMINDERS: "REMINDERS",
  INCOMPLETE_RECOVERY: "INCOMPLETE_RECOVERY",
};

export function checkSubscription(user) {
  // No user found
  if (!user) {
    return {
      expired: true,
      plan: "Starter",
      remainingDays: 0,
      remainingHours: 0,
      notification: "No active subscription found.",
    };
  }

  // Support both old and new date fields
  const expiryDate =
    user.planExpiry ||
    user.trialEndDate;

  // No expiry date
  if (!expiryDate) {
    return {
      expired: false,
      plan: user.plan || "Starter",
      remainingDays: 0,
      remainingHours: 0,
      notification: "",
    };
  }

  const now = new Date();

  const endDate = new Date(
    expiryDate
  );

  const remainingMs =
    endDate.getTime() -
    now.getTime();

  const remainingDays =
    Math.ceil(
      remainingMs /
        (1000 * 60 * 60 * 24)
    );

  const remainingHours =
    Math.ceil(
      remainingMs /
        (1000 * 60 * 60)
    );

  // Expired
  if (remainingMs <= 0) {
    return {
      expired: true,
      plan: user.plan || "Starter",
      remainingDays: 0,
      remainingHours: 0,
      notification:
        "Your subscription has expired.",
    };
  }

  let notification = "";

  // 3 Hour Warning
  if (remainingHours <= 3) {
    notification =
      "Your subscription expires in 3 hours.";
  }

  // 2 Day Warning
  else if (remainingDays <= 2) {
    notification =
      `Your subscription expires in ${remainingDays} day(s).`;
  }

  return {
    expired: false,
    plan: user.plan || "Starter",
    remainingDays,
    remainingHours,
    notification,
  };
}

/* ====================================
   FEATURE ACCESS CONTROL
==================================== */

export function hasFeature(
  user,
  feature
) {
  const plan =
    user?.plan || "Starter";

  const permissions = {
    Starter: [],

    Pro: [],

    Premium: [
      FEATURES.GROUP_AUTOMATION,
      FEATURES.FOLLOW_UPS,
      FEATURES.REMINDERS,
      FEATURES.INCOMPLETE_RECOVERY,
    ],
  };

  return (
    permissions[plan] || []
  ).includes(feature);
}

/* ====================================
   PLAN HELPERS
==================================== */

export function isStarter(
  user
) {
  return (
    user?.plan === "Starter"
  );
}

export function isPro(user) {
  return (
    user?.plan === "Pro" ||
    user?.plan === "Premium"
  );
}

export function isPremium(
  user
) {
  return (
    user?.plan === "Premium"
  );
}

/* ====================================
   PLAN LIMITS
==================================== */

export function getPlanLimits(
  user
) {
  const plan =
    user?.plan || "Starter";

  const limits = {
    Starter: {
      aiUsage: "0.5GB",
      followUps: false,
      reminders: false,
      groupAutomation: false,
      incompleteRecovery: false,
    },

    Pro: {
      aiUsage: "5.5GB",
      followUps: false,
      reminders: false,
      groupAutomation: false,
      incompleteRecovery: false,
    },

    Premium: {
      aiUsage: "20GB",
      followUps: true,
      reminders: true,
      groupAutomation: true,
      incompleteRecovery: true,
    },
  };

  return (
    limits[plan] ||
    limits.Starter
  );
}