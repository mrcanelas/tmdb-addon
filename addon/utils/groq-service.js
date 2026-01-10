const axios = require('axios');

class GroqService {
    constructor() {
        this.apiKey = null;
        this.primaryModel = "llama-3.3-70b-versatile";
        this.fallbackModel = "llama-3.1-8b-instant";
        this.baseUrl = "https://api.groq.com/openai/v1/chat/completions";
    }

    initialize(apiKey) {
        if (!apiKey) return false;
        this.apiKey = apiKey;
        return true;
    }

    async _fetchAIResponse(model, prompt) {
        return await axios.post(
            this.baseUrl,
            {
                model: model,
                messages: [
                    {
                        role: "system",
                        content: "You are a movie and TV show expert. Analyze the user query in any language, but ALWAYS return the titles in English."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.2
            },
            {
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                timeout: 10000
            }
        );
    }

    async searchWithAI(query, type) {
        if (!this.apiKey) return [];

        const prompt = `### TASK
Analyze the user's intent and return a comma-separated list of the most relevant movie or TV show titles.
Order the results by relevance (most relevant first), but do NOT use numbers or categories.

### CONTEXT
Search Query (Native Language): "${query}"
Media Type: ${type}

### STRICT INSTRUCTIONS
1. LANGUAGE: Return titles ONLY in English.
2. FORMAT: Title A, Title B, Title C (Strictly comma-separated).
3. NO NOISE: No introduction, no explanations, no numbering (1, 2, 3), and no bullet points.
4. ORDERING: Place the most semantically correlated titles at the beginning of the list.
5. QUANTITY: Provide a maximum of 20 titles.
6. PURITY: Return only the titles. If you don't find relevant results, return an empty string.

### EXAMPLE
User: "filmes de ficção científica com viagem no tempo"
Response: Interstellar, Tenet, Arrival, Looper, Primer, Twelve Monkeys, Donnie Darko

### YOUR RESPONSE (JSON-like list only):`;

        try {
            console.log(`Attempting search with primary model: ${this.primaryModel}`);
            const response = await this._fetchAIResponse(this.primaryModel, prompt);
            return this._parseTitles(response.data.choices[0]?.message?.content);

        } catch (primaryError) {
            console.error(`Primary model failed (${primaryError.message}). Switching to fallback...`);

            try {
                const fallbackResponse = await this._fetchAIResponse(this.fallbackModel, prompt);
                console.log("Fallback successful.");
                return this._parseTitles(fallbackResponse.data.choices[0]?.message?.content);

            } catch (fallbackError) {
                console.error("Critical: Both models failed.", fallbackError.message);
                return [];
            }
        }
    }

    _parseTitles(content) {
        if (!content) return [];
        
        return content
            .split(",")
            .map((title) => title.trim().replace(/^\d+[\.\-\)]\s*/, ""))
            .filter((title) => 
                title.length > 0 && 
                !title.toLowerCase().includes("here are") && 
                !title.toLowerCase().includes("titles:") &&
                !title.toLowerCase().includes("response:")
            );
    }
}

module.exports = new GroqService();
