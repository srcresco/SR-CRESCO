 module.exports = async function handler(req, res) {

  /* =========================================
     CORS
  ========================================= */

  const origin = req.headers.origin;

  if (origin === "https://srcresco.github.io") {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );
  }

  res.setHeader(
    "Vary",
    "Origin"
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
     PREFLIGHT
  ========================================= */

  if (req.method === "OPTIONS") {

    return res.status(204).end();

  }


  /* =========================================
     ONLY POST
  ========================================= */

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });

  }


  /* =========================================
     API KEY
  ========================================= */

  if (!process.env.OPENAI_API_KEY) {

    console.error(
      "OPENAI_API_KEY is missing"
    );

    return res.status(500).json({
      error:
        "OPENAI_API_KEY is not configured in Vercel."
    });

  }


  try {

    /* =========================================
       REQUEST BODY
    ========================================= */

    const { messages } = req.body || {};


    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {

      return res.status(400).json({
        error: "Messages are required."
      });

    }


    /* =========================================
       CLEAN MESSAGES
    ========================================= */

    const cleanMessages =
      messages
        .filter(
          item =>
            item &&
            typeof item === "object" &&
            (
              item.role === "user" ||
              item.role === "assistant"
            ) &&
            typeof item.content === "string" &&
            item.content.trim().length > 0
        )
        .slice(-20);


    if (cleanMessages.length === 0) {

      return res.status(400).json({
        error:
          "No valid messages were received."
      });

    }


    /* =========================================
       SR CRESCO AI INSTRUCTIONS
    ========================================= */

    const instructions = `
You are SR CRESCO KNOWLEDGE AI.

You are an agriculture information assistant
created for SR CRESCO.

Your purpose is to provide useful,
clear and practical agriculture information.

You can help with:

- Farming
- Crop cultivation
- Coconut farming
- Avocado farming
- Macadamia farming
- Cashew farming
- Date farming
- Mushroom farming
- Honey and beekeeping
- Dairy farming
- Soil management
- Irrigation
- Fertilizers
- Pest management
- Disease management
- Farm planning
- Modern agriculture
- Natural farming
- Technology in agriculture
- Greenhouse farming
- Market information
- Farmer education

Give answers in a simple and practical way.

If the user asks in Kannada,
answer in Kannada.

If the user asks in English,
answer in English.

If the user mixes Kannada and English,
you may answer in a natural Kannada-English mix.

Do not claim uncertain information as fact.

For agriculture recommendations,
consider location, climate, soil,
water availability and crop variety
when those details matter.

SR CRESCO is an information and
knowledge platform, not an online
product-selling website.

Founder:
SUBHASH V S

Location:
Chamarajanagar, Karnataka, India - 571127.

Website:
https://srcresco.github.io/SR-CRESCO/
`;


    /* =========================================
       OPENAI RESPONSES API
    ========================================= */

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: JSON.stringify({

          model: "gpt-5.6-luna",

          instructions: instructions,

          input:
            cleanMessages.map(item => ({
              role: item.role,
              content: item.content
            }))

        })

      }
    );


    /* =========================================
       OPENAI RESPONSE
    ========================================= */

    const raw =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(raw);

    } catch (parseError) {

      console.error(
        "Invalid OpenAI response:",
        raw
      );

      return res.status(502).json({
        error:
          "Invalid response received from OpenAI."
      });

    }


    /* =========================================
       OPENAI ERROR
    ========================================= */

    if (!response.ok) {

      console.error(
        "OpenAI API error:",
        data
      );

      return res.status(
        response.status
      ).json({

        error:
          data?.error?.message ||
          "OpenAI API request failed."

      });

    }


    /* =========================================
       GET AI RESPONSE TEXT
    ========================================= */

    let reply =
      data.output_text;


    if (
      !reply &&
      Array.isArray(data.output)
    ) {

      for (
        const item
        of data.output
      ) {

        if (
          !Array.isArray(
            item.content
          )
        ) {
          continue;
        }


        for (
          const content
          of item.content
        ) {

          if (
            typeof content.text ===
            "string"
          ) {

            reply =
              content.text;

            break;

          }

        }


        if (reply) {
          break;
        }

      }

    }


    /* =========================================
       NO RESPONSE
    ========================================= */

    if (
      !reply ||
      typeof reply !== "string"
    ) {

      console.error(
        "OpenAI returned no text:",
        data
      );

      return res.status(502).json({
        error:
          "OpenAI returned no text response."
      });

    }


    /* =========================================
       SUCCESS
    ========================================= */

    return res.status(200).json({

      reply:
        reply.trim()

    });


  } catch (error) {

    console.error(
      "SR CRESCO KNOWLEDGE AI ERROR:",
      error
    );


    return res.status(500).json({

      error:
        error?.message ||
        "SR CRESCO KNOWLEDGE AI server error."

    });

  }

};
