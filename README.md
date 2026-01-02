# Mem-extension

**Persist context. Restore state. Accelerate workflows.**

Memory Extension acts as a bridge between your AI conversations, allowing you to capture the full context of a chat session and inject it purely into a new one. it generates concise, machine-readable summaries that act as "save states" for your intellectual work.

---

##  The Problem & Solution

**The Problem**: AI conversations are ephemeral. Losing context when starting a new chat or switching platforms means re-explaining complex requirements, technical constraints, or project history.

**The Solution**: Memory Extension runs in the background, analyzing your conversation history. With one click, it uses Gemini 3.0 Flash to synthesize the discussion into a portable "Context Block". You paste this block into any new AI session to immediately restore your project's state.

---

## Key Features

- **Context Serialization**: Instantly convert long, complex chat threads into a dense, high-signal summary optimized for AI consumption.
- **"Memory" Injection**: Generates a standard "OK, memory added" block. Paste it into a new chat, and the AI will acknowledge and adopt the previous context.
- **Cross-Platform Intelligence**: Works seamlessly on both **ChatGPT** and **Claude**. Carry context from GPT-4 to Claude 3.5 Sonnet and back.
- **Private & Local**: Your data never leaves your browser except to hit the Gemini API for summarization. All history is stored in your local Chrome storage.
- **Zero-Friction UI**: A subtle floating "Memory Bubble" tracks your session without cluttering the interface.

---

## Installation (For developers)

1.  **Get Your API Key**:
    *   Visit [Google AI Studio](https://makersuite.google.com/app/apikey) and create a free API Key.

2.  **Load the Extension**:
    *   Clone or download this repository.
    *   Open Chrome and go to `chrome://extensions/`.
    *   Enable **Developer mode** (top right).
    *   Click **Load unpacked** and select the extension directory.

3.  **Configure**:
    *   Click the extension icon in the toolbar.
    *   Go to **Settings** and paste your Gemini API Key.

---

##  Workflow: The "Save State" Loop

1.  **Work Normally**: Chat with ChatGPT or Claude as you always do. The Memory Bubble in the corner tracks the exchange in real-time.
2.  **Capture Context**: When you reach a milestone or need to switch sessions, click the Memory Bubble or open the popup extension.
3.  **Generate Memory**: hitting **Summarize**, Gemini analyzes the entire interaction (User + AI) to extract:
    *   **Core Objectives**: What you are trying to achieve.
    *   **Technical Context**: Code structure, constraints, and decisions made.
    *   **Action Items**: What needs to happen next.
4.  **Restore**: In your new chat window, simply paste the generated "Context Block".
    *   *The AI will respond: "OK, memory added..." and you can continue exactly where you left off.*

---


## Future Enhancements

- [ ] Export conversations to markdown/PDF
- [ ] Search across chat history
- [ ] Categories and tags for conversations
- [ ] Support for more AI platforms (Perplexity, Bing Chat, etc.)
- [ ] Advanced analytics and insights
- [ ] Conversation comparisons
- [ ] Voice-to-text question capture
- [ ] Add DB support to persist the data
- [ ] Add RAG to automatically inject memory to the conversation


---

##Contributing

We welcome contributions to make context persistence even better.
*   **Bug Reports**: Open an issue if you notice tracking errors on specific platforms.
*   **Feature Requests**: Share ideas for new "Memory Types" or integrations.

---

**License**: MIT
