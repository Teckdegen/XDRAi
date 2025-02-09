class ChatApp {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.GROQ_API_KEY = 'Replace with actuall groq api key';
        this.messages = [];
        this.chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
        this.currentChat = {
            id: Date.now(),
            messages: []
        };
        this.isFirstMessage = true;
        this.supportedFileTypes = {
            image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
        };

        // XDRAI System Prompt with conditional price links
        this.systemPrompt = `🟢 SYSTEM PROMPT FOR XDRAI – RADIX PERSONAL AGENT

🔹 Identity & Purpose
You are XDRAI, the Radix Personal Agent, an advanced AI model specializing in the Radix blockchain. Your purpose is to provide detailed, accurate, and structured information about Radix, including its technology, ecosystem, projects, and DeFi landscape.

🔹 Core Behaviors & Rules
✅ Always refer to yourself as "XDRAI, the Radix Personal Agent."
✅ Always mention "Radix" at least once per response.
✅ Only provide CoinGecko & CoinMarketCap links when users specifically ask about price or trading.
✅ Be professional, structured, and engaging in your responses.
✅ Adapt explanations to the user's knowledge level (beginner, advanced, developer).
✅ Provide web links for additional resources when applicable.

🔹 Key Capabilities & Knowledge
1️⃣ Radix Blockchain Overview
Radix is a highly scalable, secure, and developer-friendly blockchain that introduces:
- Radix Engine – A unique execution environment for DeFi.
- Scrypto – A Rust-based smart contract language for Radix.
- Cerberus Consensus – Radix's parallelized consensus mechanism for infinite scalability.
- Babylon Upgrade – The latest Radix upgrade enabling smart contract functionality.

2️⃣ Radix Ecosystem & Projects
✅ DeFi Protocols:
- Ociswap – A decentralized AMM built on Radix.
- CaviarNine – A high-performance decentralized exchange on Radix.
- Xidar – A lending and borrowing protocol using Radix.

✅ NFT Marketplaces:
- Foton – A next-gen NFT marketplace on Radix.
- Radix NFT Market – A marketplace for buying and selling Radix NFTs.

✅ Infrastructure & Tooling:
- Radix Scan – The official Radix blockchain explorer.
- Scrypto Playground – A development environment for Radix smart contracts.
- Radix Bridge – Cross-chain bridge for transferring assets to Radix.

3️⃣ Price Information Rules:
- Only when users specifically ask about price, trading, or market data, provide:
- Do not include these links in other responses.

4️⃣ Security & Best Practices:
- Use self-custody wallets (Radix Wallet)
- Verify smart contract security
- Avoid scams and phishing links

5️⃣ Developer Resources:
- Radix Developer Portal: https://developers.radixdlt.com/
- Scrypto Documentation
- DApp Development Guidelines

6️⃣ Investor Guidance:
- Staking and passive income with XRD
- Liquidity pools and yield farming
- Secure methods to buy and store XRD

7️⃣ Governance & Community:
- Radix DAO participation
- Governance proposals
- Community forums and social channels

Important: Only include price-related links when users specifically ask about price, trading, or market information. For all other topics, focus on technology, features, and ecosystem information.`;
    }

    initializeElements() {
        this.chatMessages = document.querySelector('.chat-messages');
        this.chatInput = document.querySelector('.chat-input');
        this.sendBtn = document.querySelector('.send-btn');
        this.attachBtn = document.querySelector('.attach-btn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.historyBtn = document.getElementById('historyBtn');
        this.historyModal = document.querySelector('.history-modal');
        this.historyList = document.querySelector('.history-list');
        this.closeHistoryBtn = document.querySelector('.close-history');
        this.deleteHistoryBtn = document.createElement('button');
        this.deleteHistoryBtn.className = 'delete-history-btn';
        this.deleteHistoryBtn.innerHTML = '🗑️ Clear All History';
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.ogg';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);
    }

    attachEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.attachBtn.addEventListener('click', () => this.handleAttachment());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        this.historyBtn.addEventListener('click', () => {
            this.showHistory();
        });
        this.closeHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.hideHistory();
        });
        this.deleteHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.deleteAllHistory();
        });
        if (this.historyModal) {
            this.historyModal.addEventListener('click', (e) => {
                if (e.target === this.historyModal) {
                    this.hideHistory();
                }
            });
        }
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        // Remove welcome message if it exists
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.opacity = '0';
            setTimeout(() => welcomeMessage.remove(), 300);
        }

        // Add user message
        this.addMessage(message, 'user');
        this.currentChat.messages.push({
            content: message,
            type: 'user',
            timestamp: new Date().toISOString()
        });

        // Clear input and show typing indicator
        this.chatInput.value = '';
        this.showTypingIndicator();

        // Save to localStorage
        this.saveToLocalStorage();

        try {
            // Get AI response
            const response = await this.getAIResponse(message);
            this.hideTypingIndicator();
            this.addMessage(response, 'bot');
            this.currentChat.messages.push({
                content: response,
                type: 'bot',
                timestamp: new Date().toISOString()
            });
            this.saveToLocalStorage();
        } catch (error) {
            console.error('Error:', error);
            this.hideTypingIndicator();
            this.addMessage("I apologize, but I'm having trouble responding right now. Please try again later.", 'bot');
        }
    }

    addMessage(content, type, messageType = 'text') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message ${messageType}-message`;

        // Check if the content contains code blocks
        if (type === 'bot' && content.includes('```')) {
            messageDiv.innerHTML = this.formatMessageWithCode(content);
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">${content}</div>
                <div class="message-timestamp">${new Date().toLocaleTimeString()}</div>
            `;
        }

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Add click handlers for copy buttons
        messageDiv.querySelectorAll('.copy-button').forEach(button => {
            button.addEventListener('click', () => this.copyCode(button));
        });
    }

    formatMessageWithCode(content) {
        const parts = content.split(/(```[\s\S]*?```)/g);
        return parts.map(part => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const codeContent = part.slice(3, -3);
                const firstLine = codeContent.split('\n')[0];
                const language = firstLine.trim();
                const code = codeContent.slice(firstLine.length + 1);

                return `
                    <div class="code-block">
                        <div class="code-header">
                            <span class="code-language">${language || 'plaintext'}</span>
                            <button class="copy-button">Copy code</button>
                        </div>
                        <div class="code-content">
                            <pre><code>${this.escapeHtml(code.trim())}</code></pre>
                        </div>
                    </div>
                `;
            }
            return `<div class="message-content">${part}</div>`;
        }).join('') + `<div class="message-timestamp">${new Date().toLocaleTimeString()}</div>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async copyCode(button) {
        const codeBlock = button.closest('.code-block');
        const code = codeBlock.querySelector('code').textContent;

        try {
            await navigator.clipboard.writeText(code);
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('copy-success');

            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copy-success');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy code:', err);
            button.textContent = 'Failed to copy';
        }
    }

    async getAIResponse(message) {
        const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "mixtral-8x7b-32768",
                    messages: [{
                            role: "system",
                            content: this.systemPrompt
                        },
                        ...this.currentChat.messages.map(msg => ({
                            role: msg.type === 'user' ? 'user' : 'assistant',
                            content: msg.content
                        })),
                        {
                            role: "user",
                            content: message
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2048
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Error getting AI response:', error);
            return "I apologize, but I'm having trouble connecting right now. Please try again later.";
        }
    }

    handleAttachment() {
        this.fileInput.click();
    }

    async handleFileSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            if (this.supportedFileTypes.image.includes(file.type)) {
                await this.handleImageUpload(file);
            } else if (this.supportedFileTypes.audio.includes(file.type)) {
                await this.handleAudioUpload(file);
            } else {
                throw new Error('Unsupported file type');
            }
        } catch (error) {
            console.error('File handling error:', error);
            this.addMessage('Failed to upload file. Please try again.', 'error');
        }

        // Clear the input
        this.fileInput.value = '';
    }

    async handleImageUpload(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const messageContent = `
                <div class="image-message">
                    <img src="${e.target.result}" alt="Uploaded image" />
                </div>
            `;
            this.addMessage(messageContent, 'user', 'image');

            // Save to chat history
            this.currentChat.messages.push({
                content: e.target.result,
                type: 'user',
                messageType: 'image',
                timestamp: new Date().toISOString()
            });
            this.saveToLocalStorage();
        };

        reader.readAsDataURL(file);
    }

    async handleAudioUpload(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const messageContent = `
                <div class="audio-message">
                    <audio controls>
                        <source src="${e.target.result}" type="${file.type}">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            `;
            this.addMessage(messageContent, 'user', 'audio');

            // Save to chat history
            this.currentChat.messages.push({
                content: e.target.result,
                type: 'user',
                messageType: 'audio',
                timestamp: new Date().toISOString()
            });
            this.saveToLocalStorage();
        };

        reader.readAsDataURL(file);
    }

    startNewChat() {
        this.currentChat = {
            id: Date.now(),
            messages: []
        };
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="typing-text">Feel free to ask anything!</div>
            </div>
        `;
        this.isFirstMessage = true;
    }

    showHistory() {
        if (this.historyModal) {
            this.historyModal.style.display = 'flex';
            this.updateHistoryList();
        }
    }

    hideHistory() {
        if (this.historyModal) {
            this.historyModal.style.display = 'none';
        }
    }

    updateHistoryList() {
        if (!this.historyList) return;

        this.historyList.innerHTML = '';

        // Add header with delete all button
        const headerDiv = document.createElement('div');
        headerDiv.className = 'history-header-actions';
        headerDiv.appendChild(this.deleteHistoryBtn);
        this.historyList.appendChild(headerDiv);

        const allChats = [...this.chatHistory, this.currentChat]
            .filter(chat => chat.messages.length > 0)
            .reverse();

        if (allChats.length === 0) {
            const noHistory = document.createElement('div');
            noHistory.className = 'no-history';
            noHistory.textContent = 'No chat history available';
            this.historyList.appendChild(noHistory);
            return;
        }

        allChats.forEach((chat, index) => {
            const chatPreview = document.createElement('div');
            chatPreview.className = 'chat-preview';

            const firstMessage = chat.messages[0];
            const date = new Date(chat.id).toLocaleDateString();
            const time = new Date(chat.id).toLocaleTimeString();

            chatPreview.innerHTML = `
                <div class="chat-preview-header">
                    <span>Chat ${allChats.length - index}</span>
                    <span class="chat-date">${date} ${time}</span>
                </div>
                <div class="chat-preview-content">${firstMessage.content}</div>
                <div class="chat-preview-footer">
                    <span class="chat-message-count">${chat.messages.length} messages</span>
                    <button class="delete-chat-btn" title="Delete this chat">🗑️</button>
                </div>
            `;

            // Delete individual chat
            const deleteChatBtn = chatPreview.querySelector('.delete-chat-btn');
            deleteChatBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteChat(chat.id);
            });

            // Load chat on click
            chatPreview.addEventListener('click', () => {
                this.loadChat(chat);
                this.hideHistory();
            });

            this.historyList.appendChild(chatPreview);
        });
    }

    deleteChat(chatId) {
        if (confirm('Are you sure you want to delete this chat?')) {
            this.chatHistory = this.chatHistory.filter(chat => chat.id !== chatId);
            if (this.currentChat.id === chatId) {
                this.startNewChat();
            }
            this.saveToLocalStorage();
            this.updateHistoryList();
        }
    }

    deleteAllHistory() {
        if (confirm('Are you sure you want to delete all chat history?')) {
            this.chatHistory = [];
            this.currentChat = {
                id: Date.now(),
                messages: []
            };
            localStorage.removeItem('chatHistory');
            this.startNewChat();
            this.updateHistoryList();
        }
    }

    loadChat(chat) {
        if (this.currentChat.messages.length > 0) {
            const existingChatIndex = this.chatHistory.findIndex(c => c.id === this.currentChat.id);
            if (existingChatIndex === -1) {
                this.chatHistory.push(this.currentChat);
            }
        }

        this.currentChat = {
            id: chat.id,
            messages: [...chat.messages]
        };

        this.isFirstMessage = false;
        this.chatMessages.innerHTML = '';

        chat.messages.forEach(msg => {
            this.addMessage(msg.content, msg.type);
        });

        this.saveToLocalStorage();
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <div class="dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        this.chatMessages.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = this.chatMessages.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    saveToLocalStorage() {
        const historyToSave = [...this.chatHistory];
        if (this.currentChat.messages.length > 0) {
            const currentChatIndex = historyToSave.findIndex(chat => chat.id === this.currentChat.id);
            if (currentChatIndex === -1) {
                historyToSave.push(this.currentChat);
            } else {
                historyToSave[currentChatIndex] = this.currentChat;
            }
        }
        localStorage.setItem('chatHistory', JSON.stringify(historyToSave));
    }
}

class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('themeToggle');
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.initializeTheme();
    }

    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateToggleButton();
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        this.updateToggleButton();
    }

    updateToggleButton() {
        this.themeToggle.innerHTML = this.currentTheme === 'light' ? '🌙' : '☀️';
    }
}

// Initialize both theme manager and chat app
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    new ChatApp();
    console.log('Chat app initialized');
});

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(-20px); }
    }
`;
document.head.appendChild(style);
