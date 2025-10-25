import React from "react";
import axios from "axios";

export function MessageInput({
  newMessageText,
  setNewMessageText,
  sendMessage,
  sendFile,
  showAIAssistant,
  setShowAIAssistant,
  aiLogo,
  aiQuestion,
  setAiQuestion,
  aiResponse,
  aiLoading,
  askAI,
  handleAiKeyDown,
}) {
  return (
    <form className="flex gap-2 relative" onSubmit={sendMessage}>
      <input
        type="text"
        value={newMessageText}
        onChange={(ev) => setNewMessageText(ev.target.value)}
        placeholder="Type your message here"
        className="bg-white flex-grow border rounded-sm p-2 text-sm md:text-base"
      />

      <button
        type="button"
        onClick={() => setShowAIAssistant((prev) => !prev)}
        className="bg-blue-200 p-2 text-gray-600 rounded-sm border border-blue-200 flex items-center justify-center hover:bg-blue-300 transition-colors"
        title="AI Assistant"
      >
        <img src={aiLogo} alt="AI Assistant" className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <label className="bg-blue-200 p-2 text-gray-600 cursor-pointer rounded-sm border border-blue-200 hover:bg-blue-300 transition-colors">
        <input type="file" className="hidden" onChange={sendFile} />
        <span className="text-sm md:text-base">📎</span>
      </label>

      <button
        type="submit"
        className="bg-blue-500 p-2 text-white rounded-sm hover:bg-blue-600 transition-colors"
      >
        <span className="text-sm md:text-base">➤</span>
      </button>

      {showAIAssistant && (
        <div
          className={`absolute bottom-12 z-50 bg-white shadow-lg rounded-md border flex flex-col
            right-0 w-full max-w-sm h-80
            md:right-16 md:w-96 md:h-96`}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-sm font-semibold">AI Assistant</h3>
            <button
              onClick={() => setShowAIAssistant(false)}
              className="text-gray-500 hover:text-gray-700 text-lg font-bold"
            >
              ×
            </button>
          </div>

          <div className="flex-grow flex flex-col overflow-hidden">
            <div className="flex-grow overflow-y-auto p-3 bg-gray-50">
              {aiLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin border-2 border-gray-300 border-t-blue-500 w-5 h-5 rounded-full"></div>
                </div>
              ) : aiResponse ? (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{aiResponse}</div>
              ) : (
                <div className="text-sm text-gray-400 text-center">
                  AI response will appear here...
                </div>
              )}
            </div>

            <div className="p-3 border-t bg-white">
              <textarea
                className="w-full border rounded-md p-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Ask your question..."
                rows="2"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={handleAiKeyDown}
              />
              <button
                type="button"
                onClick={askAI}
                disabled={aiLoading || !aiQuestion.trim()}
                className="mt-2 w-full bg-blue-500 text-white text-sm py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {aiLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
