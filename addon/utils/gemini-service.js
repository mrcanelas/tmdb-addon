const { GoogleGenerativeAI } = require("@google/generative-ai");
const { withRetry } = require("./rateLimiter");

// Modelo padrão - versão mais recente disponível no free tier
// Limites: 10 RPM, 20 RPD, 250K TPM
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.modelName = DEFAULT_GEMINI_MODEL;
    // Throttling para respeitar limites: 10 RPM = mínimo 6 segundos entre requisições
    this.lastRequestTime = 0;
    this.minRequestInterval = 6000; // 6 segundos (10 RPM = 1 req a cada 6s)
  }

  async initialize(apiKey) {
    if (!apiKey) return false;

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
      return true;
    } catch (error) {
      console.error("Error initializing Gemini:", error);
      return false;
    }
  }

  // Throttling para respeitar limites da API (10 RPM)
  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  async searchWithAI(query, type) {
    if (!this.model) {
      return [];
    }

    try {
      // Aplica throttling antes de fazer a requisição (respeita 10 RPM)
      await this.throttle();

      // Faz tudo em uma única chamada - combina tradução e busca
      // Isso reduz o uso da API pela metade comparado a fazer 2 chamadas separadas
      const prompt = `You are a movie and TV show expert assistant. Your task is to analyze the user's search query (which may be in any language) and return the exact titles of the most relevant movies/shows.

        User's search: "${query}"
        Type: ${type}

        Important instructions:
        1. The search query may be in any language - translate it to English if needed, then analyze the context and intent
        2. Return only the exact titles, separated by commas
        3. Do not include explanations or additional text
        4. Prioritize results most relevant to the search intent
        5. Consider genre, theme, style, and specific elements mentioned
        6. Maximum 20 titles per search

        Example response: The Matrix, The Matrix Reloaded, The Matrix Revolutions`;

      const result = await withRetry(
        async () => {
          return await this.model.generateContent(prompt);
        },
        {
          maxRetries: 3,
          baseDelayMs: 1000,
          shouldRetry: (error) => {
            // Não retenta erros 400 (bad request)
            const is400 = error.status === 400 || 
                        error.error?.code === 400 ||
                        error.response?.status === 400;
            if (is400) return false;
            
            // Verifica se a quota está completamente esgotada (limit: 0)
            const errorMessage = error.error?.message || error.message || '';
            const quotaExhausted = errorMessage.includes('limit: 0');
            
            // Se a quota está esgotada e não há delay sugerido, não retenta
            if (quotaExhausted) {
              const retryMatch = errorMessage.match(/Please retry in ([\d.]+)s/i);
              if (!retryMatch) {
                // Quota esgotada sem delay sugerido = não retentar
                return false;
              }
            }
            
            return true; // Retenta outros erros 429
          },
          operationName: "Gemini API call (search)"
        }
      );

      const response = await result.response;
      const titles = response
        .text()
        .split(",")
        .map((title) => title.trim())
        .filter((title) => title.length > 0);

      return titles;
    } catch (error) {
      const errorMessage = error.error?.message || error.message || '';
      if (errorMessage.includes('limit: 0')) {
        console.error("Quota do Gemini completamente esgotada. Verifique seu plano no Google AI Studio: https://ai.dev/usage?tab=rate-limit");
      } else {
        console.error("Error processing AI search:", error.message || error);
      }
      return []; // Return empty array in case of error
    }
  }
}

module.exports = new GeminiService();
