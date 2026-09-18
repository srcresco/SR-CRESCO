 module.exports = async function handler(req, res) {

  // ================================
  // CORS
  // ================================

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

  // ================================
  // OPTIONS
  // ================================

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ================================
  // POST ONLY
  // ================================

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    // ================================
    // API KEY CHECK
    // ================================

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing in Vercel"
      });
    }

    // ================================
    // REQUEST BODY
    // ================================

    const body = req.body || {};
    const messages = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Messages are required"
      });
    }

    // ================================
    // OPENAI REQUEST
    // ================================

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
          input: messages
        })
      }
    );

    const data = await response.json();

    // ================================
    // OPENAI ERROR
    // ================================

    if (!response.ok) {
      console.error("OpenAI API Error:", data);

      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI API error"
      });
    }

    // ================================
    // RESPONSE
    // ================================

    return res.status(200).json({
      reply: data.output_text || "No response generated."
    });

  } catch (error) {

    console.error("Function Error:", error);

    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
};
