import Link from "next/link";

export const dynamic = "force-dynamic";

type FacebookPageProps = {
  searchParams: Promise<{
    businessId?: string;
  }>;
};

export default async function FacebookLoginPage({
  searchParams,
}: FacebookPageProps) {
  const params = await searchParams;

  const businessId =
    typeof params?.businessId === "string"
      ? params.businessId.trim()
      : "";

  const facebookLoginUrl = businessId
    ? `/api/auth/facebook/login?businessId=${encodeURIComponent(
        businessId
      )}`
    : "/api/auth/facebook/login";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #06120f 0%, #0b171d 50%, #111827 100%)",
        padding: "24px",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          border:
            "1px solid rgba(255,255,255,0.10)",
          borderRadius: "28px",
          background:
            "rgba(15, 23, 42, 0.88)",
          boxShadow:
            "0 25px 80px rgba(0,0,0,0.40)",
          padding: "40px",
          backdropFilter: "blur(20px)",
        }}
      >
        <Link
          href="/channels"
          style={{
            display: "inline-block",
            textDecoration: "none",
            color: "#9ca3af",
            marginBottom: "34px",
            fontSize: "14px",
          }}
        >
          ← Back to Channels
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              background: "#1877F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "34px",
              fontWeight: 900,
            }}
          >
            f
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "26px",
                fontWeight: 800,
              }}
            >
              Facebook
            </h1>

            <p
              style={{
                margin: "5px 0 0",
                color: "#7db7ff",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.20em",
              }}
            >
              CHANNEL CONNECTION
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "28px" }}>
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "36px",
              lineHeight: 1.1,
              fontWeight: 800,
            }}
          >
            Connect Facebook
          </h2>

          <p
            style={{
              margin: 0,
              color: "#aab4c3",
              fontSize: "15px",
              lineHeight: 1.6,
            }}
          >
            Sign in to Facebook and authorize
            Sodah to manage your Facebook Page
            and Messenger conversations.
          </p>
        </div>

        <div
          style={{
            borderRadius: "16px",
            border:
              "1px solid rgba(125,183,255,0.14)",
            background:
              "rgba(125,183,255,0.05)",
            padding: "18px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#7db7ff",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            What happens next
          </p>

          <div
            style={{
              marginTop: "10px",
              color: "#8b97a8",
              fontSize: "12px",
              lineHeight: 1.7,
            }}
          >
            <div>✓ Facebook opens directly</div>
            <div>✓ Enter your Facebook credentials</div>
            <div>✓ Review Sodah&apos;s permissions</div>
            <div>✓ Select your Facebook Page</div>
            <div>✓ Facebook returns you to Sodah</div>
          </div>
        </div>

        <div
          style={{
            borderRadius: "16px",
            border:
              "1px solid rgba(255,255,255,0.08)",
            background:
              "rgba(255,255,255,0.03)",
            padding: "18px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            🔒 Your Facebook password stays with
            Facebook
          </p>

          <p
            style={{
              margin: "6px 0 0",
              color: "#8b97a8",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            Sodah does not collect your Facebook
            password. Facebook handles authentication
            and permission approval directly.
          </p>
        </div>

        {!businessId ? (
          <div
            style={{
              borderRadius: "15px",
              padding: "17px 20px",
              background:
                "rgba(239,68,68,0.10)",
              border:
                "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5",
              fontSize: "14px",
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            Facebook connection cannot start because
            the business ID is missing.
          </div>
        ) : (
          <a
            href={facebookLoginUrl}
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              borderRadius: "15px",
              padding: "17px 20px",
              background: "#1877F2",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 800,
              textAlign: "center",
              textDecoration: "none",
              boxShadow:
                "0 12px 30px rgba(24,119,242,0.20)",
            }}
          >
            Continue with Facebook →
          </a>
        )}

        <p
          style={{
            margin: "20px 0 0",
            textAlign: "center",
            color: "#7f8a9a",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          You will leave Sodah and authenticate
          directly with Facebook.
        </p>
      </div>
    </main>
  );
}