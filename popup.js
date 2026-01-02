// Popup script
let currentChatData = null;
let currentTab = 'recent'; // 'recent' or 'favorites' for library

// DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const mainContent = document.getElementById('mainContent');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const cancelSettingsBtn = document.getElementById('cancelSettings');
const statusText = document.getElementById('statusText');
const platformBadge = document.getElementById('platformBadge');
const platformName = document.getElementById('platformName');
const questionCount = document.getElementById('questionCount');
const questionsList = document.getElementById('questionsList');
const summaryContent = document.getElementById('summaryContent');
const generateSummaryBtn = document.getElementById('generateSummaryBtn');
const copyContextBtn = document.getElementById('copyContextBtn');
const historyList = document.getElementById('historyList');
const recentTabBtn = document.getElementById('recentTabBtn');
const favoritesTabBtn = document.getElementById('favoritesTabBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadApiKey();
    loadCurrentChat();
    loadChatHistory();
    setupEventListeners();
});

// Helper to parse basic markdown
function parseMarkdown(text) {
    if (!text) return '';

    let html = text
        // Headings
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Inline code
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Lists (unordered)
        .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
        .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
        // Fix multiple <ul> tags
        .replace(/<\/ul>\s?<ul>/g, '')
        // Paragraphs
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    return html;
}

// Event Listeners
function setupEventListeners() {
    settingsBtn.addEventListener('click', toggleSettings);
    cancelSettingsBtn.addEventListener('click', toggleSettings);
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    generateSummaryBtn.addEventListener('click', generateSummary);
    copyContextBtn.addEventListener('click', copyContextToClipboard);

    recentTabBtn.addEventListener('click', () => switchLibTab('recent'));
    favoritesTabBtn.addEventListener('click', () => switchLibTab('favorites'));

    // Top Level Tabs
    document.querySelectorAll('.content-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;
            switchView(target, tab);
        });
    });
}

function switchView(viewId, activeTab) {
    // Update tabs
    document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
    activeTab.classList.add('active');

    // Update views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function switchLibTab(tab) {
    currentTab = tab;
    recentTabBtn.classList.toggle('active', tab === 'recent');
    favoritesTabBtn.classList.toggle('active', tab === 'favorites');
    loadChatHistory();
}

function toggleFavorite(chatId, event) {
    event.stopPropagation();
    chrome.storage.local.get(['chatHistory'], (result) => {
        const chatHistory = result.chatHistory || {};
        if (chatHistory[chatId]) {
            chatHistory[chatId].isFavorite = !chatHistory[chatId].isFavorite;
            chrome.storage.local.set({ chatHistory }, () => {
                loadChatHistory();
                if (currentChatData && currentChatData.chatId === chatId) {
                    currentChatData.isFavorite = chatHistory[chatId].isFavorite;
                }
            });
        }
    });
}

// Settings
function toggleSettings() {
    const isVisible = settingsPanel.style.display !== 'none';
    settingsPanel.style.display = isVisible ? 'none' : 'flex';
}

function loadApiKey() {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
    });
}

function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('Please enter a valid API key');
        return;
    }

    chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
        toggleSettings();
    });
}

// Load current chat data
async function loadCurrentChat() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            showEmptyState('No active tab found');
            return;
        }

        const url = tab.url;
        const isChatGPT = url.includes('chat.openai.com') || url.includes('chatgpt.com');
        const isClaude = url.includes('claude.ai');

        if (!isChatGPT && !isClaude) {
            showEmptyState('Connect on ChatGPT or Claude');
            return;
        }

        try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_QUESTIONS' });
            if (response && response.questions) {
                chrome.storage.local.get(['chatHistory'], (result) => {
                    const chatHistory = result.chatHistory || {};
                    const fullData = { ...response, ...chatHistory[response.chatId] };
                    displayChatData(fullData);
                });
                return;
            }
        } catch (e) {
            console.log('Content script not ready, loading from storage');
        }

        chrome.storage.local.get(['chatHistory'], (result) => {
            const chatHistory = result.chatHistory || {};
            const chatId = extractChatIdFromUrl(url);

            if (chatHistory[chatId]) {
                displayChatData(chatHistory[chatId]);
            } else {
                const platform = isChatGPT ? 'ChatGPT' : 'Claude';
                showEmptyState(`Ready on ${platform}`, platform);
            }
        });
    } catch (error) {
        console.error('Error loading current chat:', error);
        showEmptyState('Error loading chat');
    }
}

function extractChatIdFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');

        let chatIndex = pathParts.indexOf('c');
        if (chatIndex !== -1 && pathParts[chatIndex + 1]) return pathParts[chatIndex + 1];

        chatIndex = pathParts.indexOf('chat');
        if (chatIndex !== -1 && pathParts[chatIndex + 1]) return pathParts[chatIndex + 1];

        return 'default-chat';
    } catch (e) {
        return 'default-chat';
    }
}

function displayChatData(data) {
    currentChatData = data;

    // Show the chat title instead of just "Active Session"
    statusText.textContent = data.title || 'Active Session';
    platformBadge.style.display = 'flex';
    platformName.textContent = data.platform || 'AI';

    const questions = data.questions || [];
    questionCount.textContent = questions.length;

    if (questions.length === 0) {
        questionsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="ri-history-line"></i></div>
                <p>No questions yet</p>
                <span>Session is active</span>
            </div>
        `;
        generateSummaryBtn.disabled = true;
        copyContextBtn.style.display = 'none';
    } else {
        questionsList.innerHTML = questions.map((q, index) => `
            <div class="question-card">
                <div class="question-number">#${index + 1}</div>
                <div class="question-text">${parseMarkdown(escapeHtml(q.text))}</div>
                <div class="question-time">${formatTime(q.timestamp)}</div>
            </div>
        `).join('');
        generateSummaryBtn.disabled = false;
    }

    if (data.summary) {
        summaryContent.innerHTML = `<div class="summary-text">${parseMarkdown(escapeHtml(data.summary))}</div>`;
        copyContextBtn.style.display = 'flex';
    } else {
        summaryContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="ri-lightbulb-line"></i></div>
                <p>No analysis yet</p>
                <span>Click "Generate Context" to start</span>
            </div>
        `;
        copyContextBtn.style.display = 'none';
    }
}

function showEmptyState(message, platform = null) {
    statusText.textContent = message;
    if (platform) {
        platformBadge.style.display = 'flex';
        platformName.textContent = platform;
    } else {
        platformBadge.style.display = 'none';
    }
    questionCount.textContent = '0';
    generateSummaryBtn.disabled = true;
    copyContextBtn.style.display = 'none';
}

async function copyContextToClipboard() {
    if (!currentChatData || !currentChatData.summary) return;

    const formattedText = `# Previous Chat Context\n\n## Summary & Intent\n${currentChatData.summary}\n\n## Key Questions Asked\n${currentChatData.questions.map(q => "- " + q.text).join('\n')}\n\n---\n*Carry this context into your next chat session.*`;

    try {
        await navigator.clipboard.writeText(formattedText);
        const originalIcon = copyContextBtn.innerHTML;
        copyContextBtn.innerHTML = `<i class="ri-check-line"></i>`;
        setTimeout(() => {
            copyContextBtn.innerHTML = originalIcon;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy!', err);
    }
}

async function generateSummary() {
    if (!currentChatData || !currentChatData.questions || currentChatData.questions.length === 0) return;

    const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
    if (!geminiApiKey) {
        toggleSettings();
        return;
    }

    generateSummaryBtn.disabled = true;
    const originalText = generateSummaryBtn.innerHTML;
    generateSummaryBtn.innerHTML = `<i class="ri-loader-4-line ri-spin"></i> Analyzing...`;

    chrome.runtime.sendMessage({
        type: 'SUMMARIZE_WITH_GEMINI',
        questions: currentChatData.questions,
        chatId: currentChatData.chatId
    }, (response) => {
        generateSummaryBtn.disabled = false;
        generateSummaryBtn.innerHTML = originalText;

        if (response.success) {
            summaryContent.innerHTML = `<div class="summary-text">${parseMarkdown(escapeHtml(response.summary))}</div>`;
            copyContextBtn.style.display = 'flex';
            if (currentChatData) currentChatData.summary = response.summary;
            loadChatHistory();
        } else {
            summaryContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="ri-error-warning-line"></i></div>
                    <p>Analysis failed</p>
                    <span>${escapeHtml(response.error || 'Check connection')}</span>
                </div>
            `;
        }
    });
}

function loadChatHistory() {
    chrome.storage.local.get(['chatHistory'], (result) => {
        const chatHistory = result.chatHistory || {};
        let chats = Object.values(chatHistory);

        if (currentTab === 'favorites') {
            chats = chats.filter(c => c.isFavorite);
        }

        chats.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

        if (chats.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="ri-archive-line"></i></div>
                    <p>Library is empty</p>
                    <span>No ${currentTab === 'favorites' ? 'starred' : 'recent'} sessions</span>
                </div>
            `;
            return;
        }

        historyList.innerHTML = chats.map(chat => `
            <div class="history-item" data-chat-id="${chat.chatId}">
                <div class="history-header">
                    <div class="hist-title">${escapeHtml(chat.title || chat.platform || 'Untitled Session')}</div>
                    <button class="star-btn ${chat.isFavorite ? 'active' : ''}" data-id="${chat.chatId}" title="${chat.isFavorite ? 'Unstar' : 'Star'}">
                        <i class="${chat.isFavorite ? 'ri-star-fill' : 'ri-star-line'}"></i>
                    </button>
                </div>
                <div class="history-meta">
                    <span class="platform-mini-tag">${chat.platform}</span>
                    <span>${chat.questions.length} questions</span>
                    <span>${formatTime(chat.lastUpdated)}</span>
                </div>
            </div>
        `).join('');

        // Add click listeners
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.star-btn')) return;
                const chatId = item.dataset.chatId;
                const chat = chatHistory[chatId];
                if (chat && chat.url) {
                    chrome.tabs.create({ url: chat.url });
                }
            });
        });

        document.querySelectorAll('.star-btn').forEach(star => {
            star.addEventListener('click', (e) => {
                toggleFavorite(star.dataset.id, e);
            });
        });
    });
}

function formatTime(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Listen for updates from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'QUESTIONS_UPDATED') {
        loadCurrentChat();
        loadChatHistory();
    }
});

