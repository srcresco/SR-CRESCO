 module.exports = async function handler(req, res) {

  /* =========================================
     CORS
  ========================================= */

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


  /* =========================================
     OPTIONS / PREFLIGHT
  ========================================= */

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }


  /* =========================================
     ONLY POST ALLOWED
  ========================================= */

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }


  try {

    /* =========================================
       OPENAI API KEY
    ========================================= */

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing"
      });
    }


    /* =========================================
       GET USER MESSAGES
    ========================================= */

    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Messages are required"
      });
    }


    /* =========================================
       OPENAI RESPONSES API
    ========================================= */

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },

        body: JSON.stringify({

          model: "gpt-5.6-luna",

          /* =====================================
             SR CRESCO KNOWLEDGE AI INSTRUCTIONS
          ===================================== */

          instructions: `
You are SR CRESCO KNOWLEDGE AI.

You are the knowledge assistant of SR CRESCO.

Your job is to provide clear, accurate, useful and practical answers,
especially for agriculture, farming, farmer information,
government schemes, agricultural markets, technology,
smart farming, AI, drones, satellites and general knowledge.

LANGUAGE RULES:

1. Always identify the language used by the user.

2. Reply in the SAME language used by the user.

3. If the user writes in Kannada, reply in Kannada.

4. If the user writes in Kannada-English mixed language (Kanglish),
reply in simple and natural Kanglish.

5. If the user writes in English, reply in English.

6. If the user writes in Hindi, reply in Hindi.

7. NEVER switch to Hindi automatically.

8. NEVER switch to another language unless the user asks you to.

9. If the user mixes Kannada and English,
understand the meaning and reply naturally in the same style.

10. Do not translate the user's question into another language
unless the user specifically asks for translation.

11. Match the user's language naturally throughout the answer.

12. Keep answers simple, clear and easy to understand.


FORMATTING RULES:

1. Do NOT use Markdown symbols such as:
#
*
**
_
