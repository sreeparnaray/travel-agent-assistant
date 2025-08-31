import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: import.meta.env.VITE_OPEN_AI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export class Assistant {
  #client;
  #model;
  #systemMessage;

  constructor(model = "openai/gpt-oss-20b:free", client = openai) {
    this.#client = client;
    this.#model = model;

    // Define system restriction like in googleai.js
    this.#systemMessage = {
      role: "system",
      content: `You are a travel assistant. 
You must only respond to questions related to travel, location details, famous travel recommendations, nearby places to visit, trip planning, food & restaurants, and weather. 
If the user asks about anything else, politely respond: 
"I can only answer travel, famous places, trip, food, and weather related queries."`,
    };
  }

  async chat(content, history = []) {
    try {
      const result = await this.#client.chat.completions.create({
        model: this.#model,
        messages: [
          this.#systemMessage,
          ...history,
          { role: "user", content },
        ],
      });

      return result.choices[0].message.content;
    } catch (error) {
      throw this.#parseError(error);
    }
  }

  async *chatStream(content, history = []) {
    try {
      const result = await this.#client.chat.completions.create({
        model: this.#model,
        messages: [
          this.#systemMessage,
          ...history,
          { role: "user", content },
        ],
        stream: true,
      });

      for await (const chunk of result) {
        yield chunk.choices[0]?.delta?.content || "";
      }
    } catch (error) {
      throw this.#parseError(error);
    }
  }

  #parseError(error) {
    return error;
  }
}
