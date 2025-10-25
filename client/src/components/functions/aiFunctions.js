import axios from "axios";
export function createAskAI({ aiQuestion, setAiResponse, setAiQuestion, setAiLoading }) {
  return async function askAI() {
    if (!aiQuestion.trim()) return;
    setAiResponse("");
    setAiLoading(true);

    try {
      const res = await axios.post("/ai", { message: aiQuestion });
      setAiResponse(res.data.reply);
      setAiQuestion("");
    } catch (err) {
      console.error(err);
      setAiResponse("Error getting response from AI.");
    } finally {
      setAiLoading(false);
    }
  };
}

// KeyDown handler factory
export function createHandleAiKeyDown(askAIFn) {
  return function handleAiKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAIFn();
    }
  };
}
