import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // USER INFO
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // SUBSCRIPTION STATUS
    subscriptionStatus: {
      type: String,

      enum: [
        "trial",
        "active",
        "expired",
      ],

      default: "trial",
    },

    // PLAN
    plan: {
      type: String,

      default: "7-days-trial",
    },

    // TRIAL START
    trialStartDate: {
      type: Date,

      default: Date.now,
    },

    // TRIAL END
    trialEndDate: {
      type: Date,
    },

    // FUTURE PAYMENT SUPPORT
    subscriptionStartDate: {
      type: Date,
    },

    subscriptionEndDate: {
      type: Date,
    },
  },

  {
    timestamps: true,
  }
);

// AUTO CREATE 7 DAYS TRIAL
UserSchema.pre("save", function () {

  if (!this.trialEndDate) {

    const trial = new Date();

    // ADD 7 DAYS
    trial.setDate(
      trial.getDate() + 7
    );

    this.trialEndDate = trial;
  }

});

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    UserSchema
  );

export default User;