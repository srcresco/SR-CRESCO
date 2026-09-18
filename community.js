  const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.COMMUNITY_ADMIN_EMAIL;
const COMMUNITY_LINK = process.env.COMMUNITY_LINK;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const APP_URL = process.env.APP_URL;

function hash(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      typeof data === "string"
        ? data
        : data?.message || "Supabase request failed"
    );
  }

  return data;
}

async function sendEmail(to, subject, html) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Email sending failed");
  }

  return data;
}

module.exports = async function handler(req, res) {

  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://srcresco.github.io"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    if (
      !SUPABASE_URL ||
      !SUPABASE_SECRET_KEY ||
      !RESEND_API_KEY ||
      !ADMIN_EMAIL ||
      !COMMUNITY_LINK ||
      !FROM_EMAIL ||
      !APP_URL
    ) {
      return res.status(500).json({
        error: "Community system environment variables are missing"
      });
    }

    const {
      action,
      email,
      otp,
      requestId,
      token
    } = req.body || {};

    /* =========================================
       SEND OTP
    ========================================= */

    if (action === "send_otp") {

      if (!email || typeof email !== "string") {
        return res.status(400).json({
          error: "Email is required"
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
          error: "Please enter a valid email address"
        });
      }

      const generatedOtp =
        Math.floor(100000 + Math.random() * 900000).toString();

      const otpHash = hash(generatedOtp);

      const expiresAt =
        new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const existing = await supabaseRequest(
        `community_requests?email=eq.${encodeURIComponent(cleanEmail)}&select=id&limit=1`
      );

      let id;

      if (existing.length > 0) {

        id = existing[0].id;

        await supabaseRequest(
          `community_requests?id=eq.${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              otp_hash: otpHash,
              otp_expires_at: expiresAt,
              verified: false,
              status: "pending",
              verified_at: null,
              approved_at: null
            })
          }
        );

      } else {

        const created = await supabaseRequest(
          "community_requests",
          {
            method: "POST",
            headers: {
              Prefer: "return=representation"
            },
            body: JSON.stringify({
              email: cleanEmail,
              otp_hash: otpHash,
              otp_expires_at: expiresAt,
              verified: false,
              status: "pending"
            })
          }
        );

        id = created[0].id;
      }

      await sendEmail(
        cleanEmail,
        "SR CRESCO Community – Email Verification",
        `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>🌱 SR CRESCO Community</h2>

          <p>Your verification code is:</p>

          <div style="
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
            margin:20px 0;
          ">
            ${generatedOtp}
          </div>

          <p>This OTP is valid for 10 minutes.</p>

          <p>
            If you did not request SR CRESCO Community access,
            you can ignore this email.
          </p>

          <hr>

          <p>
            SR CRESCO<br>
            Agriculture • Knowledge • Innovation
          </p>
        </div>
        `
      );

      return res.status(200).json({
        success: true,
        requestId: id,
        message: "OTP sent successfully"
      });
    }

    /* =========================================
       VERIFY OTP
    ========================================= */

    if (action === "verify_otp") {

      if (!requestId || !otp) {
        return res.status(400).json({
          error: "Request ID and OTP are required"
        });
      }

      const rows = await supabaseRequest(
        `community_requests?id=eq.${encodeURIComponent(requestId)}&select=*`
      );

      if (!rows.length) {
        return res.status(404).json({
          error: "Request not found"
        });
      }

      const request = rows[0];

      if (
        !request.otp_expires_at ||
        new Date(request.otp_expires_at).getTime() < Date.now()
      ) {
        return res.status(400).json({
          error: "OTP expired. Please request a new OTP."
        });
      }

      if (hash(String(otp).trim()) !== request.otp_hash) {
        return res.status(400).json({
          error: "Invalid OTP"
        });
      }

      await supabaseRequest(
        `community_requests?id=eq.${encodeURIComponent(requestId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            verified: true,
            status: "verified",
            verified_at: new Date().toISOString(),
            otp_hash: null,
            otp_expires_at: null
          })
        }
      );

      await sendEmail(
        ADMIN_EMAIL,
        "SR CRESCO Community – New Join Request",
        `
        <div style="font-family:Arial,sans-serif;line-height:1.6">

          <h2>🌱 SR CRESCO Community</h2>

          <p>A new farmer/community member has verified their email.</p>

          <p>
            <strong>Email:</strong> ${request.email}
          </p>

          <p>
            Please review this request and approve or reject it.
          </p>

          <p>
            Request ID:<br>
            ${requestId}
          </p>

          <p>
            Open SR CRESCO Admin Panel:
          </p>

          <p>
            <a href="${APP_URL}ai.html?community=admin">
              Open Admin Panel
            </a>
          </p>

        </div>
        `
      );

      return res.status(200).json({
        success: true,
        message:
          "Email verified successfully. Your request is waiting for approval."
      });
    }

    /* =========================================
       ADMIN APPROVE
    ========================================= */

    if (action === "admin_approve") {

      if (!requestId || !token) {
        return res.status(400).json({
          error: "Request ID and admin token are required"
        });
      }

      const rows = await supabaseRequest(
        `community_requests?id=eq.${encodeURIComponent(requestId)}&select=*`
      );

      if (!rows.length) {
        return res.status(404).json({
          error: "Request not found"
        });
      }

      const request = rows[0];

      if (request.status !== "verified") {
        return res.status(400).json({
          error: "Only verified requests can be approved"
        });
      }

      /*
        Admin token protection.
        Token must match ADMIN_APPROVAL_TOKEN.
      */

      if (
        token !== process.env.ADMIN_APPROVAL_TOKEN
      ) {
        return res.status(403).json({
          error: "Invalid admin authorization"
        });
      }

      const accessToken =
        crypto.randomBytes(32).toString("hex");

      const accessTokenHash = hash(accessToken);

      await supabaseRequest(
        `community_requests?id=eq.${encodeURIComponent(requestId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "approved",
            approved_at: new Date().toISOString(),
            access_token_hash: accessTokenHash
          })
        }
      );

      await sendEmail(
        request.email,
        "SR CRESCO Community – Approved ✅",
        `
        <div style="font-family:Arial,sans-serif;line-height:1.6">

          <h2>🌱 SR CRESCO Community</h2>

          <p>
            Your SR CRESCO Community request has been approved.
          </p>

          <p>
            You can now join the community using the button below:
          </p>

          <p>
            <a
              href="${APP_URL}ai.html?community=access&token=${accessToken}"
              style="
                display:inline-block;
                padding:12px 20px;
                background:#111;
                color:#fff;
                text-decoration:none;
                border-radius:8px;
              "
            >
              Join SR CRESCO Community
            </a>
          </p>

          <p>
            Please do not share this access link with others.
          </p>

        </div>
        `
      );

      return res.status(200).json({
        success: true,
        message: "Community request approved"
      });
    }

    /* =========================================
       ADMIN REJECT
    ========================================= */

    if (action === "admin_reject") {

      if (!requestId || !token) {
        return res.status(400).json({
          error: "Request ID and admin token are required"
        });
      }

      if (
        token !== process.env.ADMIN_APPROVAL_TOKEN
      ) {
        return res.status(403).json({
          error: "Invalid admin authorization"
        });
      }

      const rows = await supabaseRequest(
        `community_requests?id=eq.${encodeURIComponent(requestId)}&select=*`
      );

      if (!rows.length) {
        return res.status(404).json({
          error: "Request not found"
        });
      }

      const request = rows[0];

      await supabaseRequest(
        `community_requests?id=eq.${encodeURIComponent(requestId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "rejected"
          })
        }
      );

      await sendEmail(
        request.email,
        "SR CRESCO Community – Request Update",
        `
        <div style="font-family:Arial,sans-serif;line-height:1.6">

          <h2>SR CRESCO Community</h2>

          <p>
            Your community request could not be approved at this time.
          </p>

          <p>
            Thank you for your interest in SR CRESCO.
          </p>

        </div>
        `
      );

      return res.status(200).json({
        success: true,
        message: "Community request rejected"
      });
    }

    /* =========================================
       CHECK ACCESS
    ========================================= */

    if (action === "check_access") {

      if (!token) {
        return res.status(400).json({
          error: "Access token is required"
        });
      }

      const tokenHash = hash(token);

      const rows = await supabaseRequest(
        `community_requests?access_token_hash=eq.${encodeURIComponent(tokenHash)}&select=status,email`
      );

      if (!rows.length || rows[0].status !== "approved") {
        return res.status(403).json({
          error: "Community access not approved"
        });
      }

      return res.status(200).json({
        success: true,
        approved: true,
        communityLink: COMMUNITY_LINK
      });
    }

    return res.status(400).json({
      error: "Invalid action"
    });

  } catch (error) {

    console.error("SR CRESCO COMMUNITY ERROR:", error);

    return res.status(500).json({
      error: error?.message || "Internal server error"
    });
  }
};
