const axios = require('axios');

class GroqService {
    constructor() {
        this.apiKey = null;
        this.model = "llama-3.3-70b-versatile";
        this.baseUrl = "https://api.groq.com/openai/v1/chat/completions";
    }

    initialize(apiKey) {
        if (!apiKey) return false;
        this.apiKey = apiKey;
        return true;
    }

    async translateToEnglish(query) {
        if (!this.apiKey) return query;

        try {
            const response = await axios.post(
                this.baseUrl,
                {
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: "Translate the following search query to English. Return only the translation, no explanations."
                        },
                        {
                            role: "user",
                            content: query
                        }
                    ],
                    temperature: 0.1
                },
                {
                    headers: {
                        "Authorization": `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            return response.data.choices[0]?.message?.content?.trim() || query;
        } catch (error) {
            console.error("Error translating query with Groq:", error.message);
            return query;
        }
    }

    async searchWithAI(query, type) {
        if (!this.apiKey) {
            return [];
        }

        try {
            const prompt = `You are a movie and TV show expert assistant. Your task is to analyze the user's search query and return the exact titles of the most relevant movies/shows.

        User's search: "${query}"
        Type: ${type}

        Important instructions:
        1. Analyze the context, intent, and mood (even if slang, idioms, or not in English).
        2. If the user asks for a feeling (e.g., "scary", "funny", "sad"), return the best movies for that genre/mood.
        3. Return ONLY the exact titles, separated by commas.
        4. Do not include explanations, numbering, or additional text.
        5. Maximum 20 titles per search.

        Example query: "da cagarsi in mano" -> Return: The Exorcist, Hereditary, The Conjuring, Sinister
        Example query: "movies like matrix" -> Return: The Matrix, Inception, Dark City, Equilibrium`;

            const response = await axios.post(
                this.baseUrl,
                {
                    model: this.model,
                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.3
                },
                {
                    headers: {
                        "Authorization": `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const content = response.data.choices[0]?.message?.content || "";

            const titles = content
                .split(",")
                .map((title) => title.trim())
                .filter((title) => title.length > 0 && !title.toLowerCase().includes("example response"));

            return titles;
        } catch (error) {
            console.error("Error processing AI search with Groq:", error.message);
            return [];
        }
    }
}

module.exports = new GroqService();
