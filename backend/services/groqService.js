console.log("GROQ SERVICE LOADED");
const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function askAI(prompt) {

    const chatCompletion = await groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
        model: "openai/gpt-oss-120b",
    });

    return chatCompletion.choices[0].message.content;
}

module.exports = askAI;
