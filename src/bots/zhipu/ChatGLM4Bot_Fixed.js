import AsyncLock from "async-lock";
import Bot from "@/bots/Bot";
import axios from "axios";
import store from "@/store";

export default class ChatGLM4Bot extends Bot {
  static _brandId = "chatGlm4";
  static _className = "ChatGLM4Bot";
  static _logoFilename = "chatglm-4-logo.png";
  static _loginUrl = "https://open.bigmodel.cn/";
  static _model = "GLM-4";
  static _lock = new AsyncLock();

  constructor() {
    super();
  }

  getAuthHeader() {
    return {
      headers: {
        Authorization: `Bearer ${store.state.chatGlm4?.api_key}`,
        "Content-Type": "application/json",
      },
    };
  }

  async _checkAvailability() {
    let available = false;

    if (!store.state.chatGlm4?.api_key) {
      return false;
    }

    try {
      const response = await axios.post(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        {
          model: "glm-4",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 1,
        },
        this.getAuthHeader(),
      );

      available = response.status === 200;
    } catch (error) {
      console.error("Error checking ChatGLM4 availability:", error);
      if (error.response?.status === 401) {
        console.error("API key is invalid or expired");
      }
    }

    return available;
  }

  async _sendPrompt(prompt, onUpdateResponse, callbackParam) {
    const context = await this.getChatContext();

    const messages = [
      ...(context.conversation || []),
      { role: "user", content: prompt },
    ];

    return new Promise((resolve, reject) => {
      axios
        .post(
          "https://open.bigmodel.cn/api/paas/v4/chat/completions",
          {
            model: "glm-4",
            messages: messages,
            stream: true,
            max_tokens: 2000,
            temperature: 0.7,
          },
          {
            ...this.getAuthHeader(),
            responseType: "stream",
          },
        )
        .then((response) => {
          let fullContent = "";
          let buffer = "";

          response.data.on("data", (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  onUpdateResponse(callbackParam, {
                    content: fullContent,
                    done: true,
                  });
                  resolve();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    fullContent += content;
                    onUpdateResponse(callbackParam, {
                      content: fullContent,
                      done: false,
                    });
                  }
                } catch (e) {
                  console.error("Error parsing ChatGLM4 SSE data:", e);
                }
              }
            }
          });

          response.data.on("error", (error) => {
            console.error("ChatGLM4 stream error:", error);
            reject(error.message);
          });

          response.data.on("end", () => {
            // Save conversation context
            messages.push({ role: "assistant", content: fullContent });
            this.setChatContext({
              ...context,
              conversation: messages.slice(-10), // Keep last 10 messages
            });

            if (fullContent && !fullContent.includes("done")) {
              onUpdateResponse(callbackParam, {
                content: fullContent,
                done: true,
              });
            }
            resolve();
          });
        })
        .catch((error) => {
          console.error("ChatGLM4 API error:", error);
          if (error.response?.data?.error) {
            reject(`ChatGLM4 API Error: ${error.response.data.error.message}`);
          } else {
            reject(error.message);
          }
        });
    });
  }

  async createChatContext() {
    return {
      conversation: [],
    };
  }
}
