// Content script for ChatGPT
let isTracking = false;
let currentChatId = null;
let extractedQuestions = [];

// Extract chat ID from URL
function getChatId() {
  const urlParts = window.location.pathname.split('/');
  const chatIndex = urlParts.indexOf('c');
  if (chatIndex !== -1 && urlParts[chatIndex + 1]) {
    return urlParts[chatIndex + 1];
  }
  return 'default-chat';
}

// Extract chat title from the page
function getChatTitle() {
  // Try to get title from the page title (ChatGPT shows it there)
  const pageTitle = document.title;
  if (pageTitle && pageTitle !== 'ChatGPT' && !pageTitle.includes('New chat')) {
    return pageTitle.replace(' - ChatGPT', '').trim();
  }

  // Fallback: use first question as title
  const firstMessage = document.querySelector('[data-message-author-role="user"]');
  if (firstMessage) {
    const text = firstMessage.textContent.trim();
    // Truncate if too long
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }

  return 'Untitled Chat';
}

// Extract user questions from the DOM
function extractQuestions() {
  const questions = [];
  const messages = document.querySelectorAll('[data-message-author-role]');

  messages.forEach((message, index) => {
    const role = message.getAttribute('data-message-author-role');
    // Only capture user and assistant
    if (role !== 'user' && role !== 'assistant') return;

    const textContent = message.textContent.trim();
    if (textContent) {
      questions.push({
        text: `[${role.toUpperCase()}] ${textContent}`,
        timestamp: new Date().toISOString(),
        order: index + 1,
        platform: 'ChatGPT',
        role: role
      });
    }
  });

  return questions;
}

// Monitor DOM changes
function startTracking() {
  if (isTracking) return;
  isTracking = true;
  currentChatId = getChatId();
  updateQuestions();

  const observer = new MutationObserver(() => updateQuestions());
  const chatContainer = document.querySelector('main') || document.body;
  observer.observe(chatContainer, { childList: true, subtree: true });
}

// Update and store questions
function updateQuestions(forceUpdate = false) {
  const questions = extractQuestions();

  // If questions changed or we forced an update (like on navigation)
  if (forceUpdate || questions.length > extractedQuestions.length || (questions.length === 0 && extractedQuestions.length > 0)) {
    extractedQuestions = questions;
    updateFloatingBubble();

    if (!chrome.runtime?.id) return;

    chrome.storage.local.get(['chatHistory'], (result) => {
      if (chrome.runtime.lastError) return;
      const chatHistory = result.chatHistory || {};

      // Update or create entry
      chatHistory[currentChatId] = {
        chatId: currentChatId,
        platform: 'ChatGPT',
        title: getChatTitle(),
        questions: extractedQuestions,
        lastUpdated: new Date().toISOString(),
        url: window.location.href,
        isFavorite: chatHistory[currentChatId]?.isFavorite || false
      };

      chrome.storage.local.set({ chatHistory }, () => {
        chrome.runtime.sendMessage({
          type: 'QUESTIONS_UPDATED',
          chatId: currentChatId,
          platform: 'ChatGPT',
          questionsCount: extractedQuestions.length
        });
      });
    });
  }
}

// Memory Bubble Logic
function injectFloatingBubble() {
  if (document.getElementById('memory-buddy-root')) return;

  const style = document.createElement('style');
  style.textContent = `
    #memory-buddy-root {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .memory-bubble {
      width: 54px;
      height: 54px;
      background: linear-gradient(135deg, #0ea5e9, #2dd4bf);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
    }
    .memory-bubble:hover {
      transform: scale(1.05);
      box-shadow: 0 0 20px rgba(14, 165, 233, 0.5);
    }
    .memory-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 12px;
      border: 2px solid white;
      z-index: 10;
    }
    .memory-popup-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 999998;
      display: none;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .memory-popup {
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      max-width: 320px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .memory-popup h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #7dd3fc;
    }
    .memory-popup-info {
      margin-bottom: 20px;
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
    }
    .memory-popup-actions {
      display: flex;
      gap: 10px;
    }
    .memory-btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .memory-btn-primary {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: white;
    }
    .memory-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
    }
    .memory-btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .memory-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .memory-btn-favorite {
      background: rgba(250, 204, 21, 0.1);
      color: #facc15;
      border: 1px solid rgba(250, 204, 21, 0.3);
    }
    .memory-btn-favorite.active {
      background: #facc15;
      color: #1e293b;
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'memory-buddy-root';
  root.innerHTML = `
    <div class="memory-bubble" id="memory-bubble-main">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
        <path d="M2 17L12 22L22 17"/>
        <path d="M2 12L12 17L22 12"/>
      </svg>
      <div id="memory-badge" class="memory-badge" style="display: none;">0</div>
    </div>
    <div class="memory-popup-overlay" id="memory-popup-overlay">
      <div class="memory-popup">
        <h3>🧠 Memory Assistant</h3>
        <div class="memory-popup-info">
          <p><strong>Chat:</strong> <span id="popup-chat-title">Untitled</span></p>
          <p><strong>Platform:</strong> ChatGPT</p>
          <p><strong>Questions Captured:</strong> <span id="popup-question-count">0</span></p>
          <p style="margin-top: 12px; font-size: 13px;">Open the extension in your toolbar for full AI-powered analysis.</p>
        </div>
        <div class="memory-popup-actions">
          <button class="memory-btn memory-btn-favorite" id="popup-favorite-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span id="favorite-text">Star</span>
          </button>
          <button class="memory-btn memory-btn-secondary" id="popup-close-btn">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  document.getElementById('memory-bubble-main').addEventListener('click', () => {
    showMemoryPopup();
  });

  document.getElementById('popup-close-btn').addEventListener('click', () => {
    hideMemoryPopup();
  });

  document.getElementById('memory-popup-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'memory-popup-overlay') {
      hideMemoryPopup();
    }
  });

  document.getElementById('popup-favorite-btn').addEventListener('click', () => {
    toggleInlineFavorite();
  });
}


function showMemoryPopup() {
  const overlay = document.getElementById('memory-popup-overlay');
  const questionCount = document.getElementById('popup-question-count');
  const chatTitle = document.getElementById('popup-chat-title');

  questionCount.textContent = extractedQuestions.length;
  chatTitle.textContent = getChatTitle();
  overlay.style.display = 'flex';

  // Update favorite button state
  if (!chrome.runtime?.id) return;

  chrome.storage.local.get(['chatHistory'], (result) => {
    if (chrome.runtime.lastError) return;
    const chatHistory = result.chatHistory || {};
    updateFavoriteButton(chatHistory[currentChatId]?.isFavorite || false);
  });
}

function hideMemoryPopup() {
  const overlay = document.getElementById('memory-popup-overlay');
  overlay.style.display = 'none';
}

function updateFavoriteButton(isFavorite) {
  const favBtn = document.getElementById('popup-favorite-btn');
  const favText = document.getElementById('favorite-text');
  const svg = favBtn.querySelector('svg');

  if (isFavorite) {
    favBtn.classList.add('active');
    favText.textContent = 'Remove from Favourites';
    svg.setAttribute('fill', 'currentColor');
  } else {
    favBtn.classList.remove('active');
    favText.textContent = 'Add to Favourites';
    svg.setAttribute('fill', 'none');
  }
}

function toggleInlineFavorite() {
  if (!chrome.runtime?.id) return;

  chrome.storage.local.get(['chatHistory'], (result) => {
    if (chrome.runtime.lastError) return;
    const chatHistory = result.chatHistory || {};
    if (!chatHistory[currentChatId]) {
      // Create session if it doesn't exist yet
      chatHistory[currentChatId] = {
        chatId: currentChatId,
        platform: 'ChatGPT',
        questions: extractedQuestions,
        lastUpdated: new Date().toISOString(),
        url: window.location.href,
        isFavorite: true
      };
    } else {
      chatHistory[currentChatId].isFavorite = !chatHistory[currentChatId].isFavorite;
    }

    const isFav = chatHistory[currentChatId].isFavorite;
    chrome.storage.local.set({ chatHistory }, () => {
      updateFavoriteButton(isFav);
    });
  });
}

function updateFloatingBubble() {
  const badge = document.getElementById('memory-badge');
  if (badge) {
    badge.textContent = extractedQuestions.length;
    badge.style.display = extractedQuestions.length > 0 ? 'block' : 'none';
  }
}

// Watch navigation
let lastUrl = location.href;
setInterval(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    currentChatId = getChatId();
    extractedQuestions = []; // Reset local state
    // Delay slightly to let the DOM stabilize on new page
    setTimeout(() => updateQuestions(true), 500);
  }
}, 1000);

// Also use MutationObserver for internal app navigation if possible
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    currentChatId = getChatId();
    extractedQuestions = [];
    updateQuestions(true);
  }
}).observe(document.body, { subtree: true, childList: true });

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    startTracking();
    injectFloatingBubble();
  });
} else {
  startTracking();
  injectFloatingBubble();
}

// Internal messaging
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_CURRENT_QUESTIONS') {
    sendResponse({
      chatId: currentChatId,
      questions: extractedQuestions,
      platform: 'ChatGPT',
      title: getChatTitle()
    });
  }
});
