// Background service worker

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'QUESTIONS_UPDATED') {
        console.log(`[Memory Extension] Questions updated for ${request.platform}:`, request.questionsCount);
    }

    if (request.type === 'SUMMARIZE_WITH_GEMINI') {
        summarizeWithGemini(request.questions, request.chatId)
            .then(summary => sendResponse({ success: true, summary }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }
});

// Summarize questions using Gemini API
async function summarizeWithGemini(questions, chatId) {
    // Get API key from storage
    const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);

    if (!geminiApiKey) {
        throw new Error('Gemini API key not set. Please configure it in the extension popup.');
    }

    // Prepare the prompt
    const questionTexts = questions.map(q => q.text).join('\n\n');
    const prompt = `You are analyzing a conversation history to create a comprehensive context summary. Below is the conversation history between a user and an AI.

Your task is to:
1. **Summarize the Conversation**: Provide a concise 2-3 sentence summary of what was discussed.
2. **Identify Main Intent**: What is the user's primary goal or objective?
3. **List Key Topics**: What are the main themes and topics covered?
4. **Context for Next Session**: Create a memory block that the user can copy and paste into their next chat to restore context. This block MUST start with the exact phrase "OK, memory added" followed by a summary of the technical context, decisions made, and pending tasks. The goal is for the next AI session to immediately understand the previous state.

Questions asked:
${questionTexts}

Format your response clearly with these sections. For the "Context for Next Session" section, ensure it is a self-contained paragraph starting with "OK, memory added" that effectively transfers the state of the conversation to a new AI instance.`;

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to generate summary');
        }

        const data = await response.json();
        const summary = data.candidates[0]?.content?.parts[0]?.text || 'No summary generated';

        // Store the summary
        const { chatHistory } = await chrome.storage.local.get(['chatHistory']);
        if (chatHistory && chatHistory[chatId]) {
            chatHistory[chatId].summary = summary;
            chatHistory[chatId].summarizedAt = new Date().toISOString();
            await chrome.storage.local.set({ chatHistory });
        }

        return summary;
    } catch (error) {
        console.error('[Memory Extension] Gemini API error:', error);
        throw error;
    }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Memory Extension] Installed');
});
