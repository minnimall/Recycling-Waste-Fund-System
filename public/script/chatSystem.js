// Chat System
class ChatSystem {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.isTyping = false;
        this.unreadCount = 0;

        this.chatButton = document.getElementById('chat-button');
        this.chatWindow = document.getElementById('chat-window');
        this.chatClose = document.getElementById('chat-close');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.chatSend = document.getElementById('chat-send');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.chatStatus = document.getElementById('chat-status');
        this.chatBadge = document.getElementById('chat-badge');

        this.initializeEventListeners();
        this.loadChatHistory();
        this.setWelcomeTime();
        // this.simulateInitialNotification();
    }

    initializeEventListeners() {
        this.chatButton.addEventListener('click', () => this.toggleChat());
        this.chatClose.addEventListener('click', () => this.closeChat());
        this.chatSend.addEventListener('click', () => this.sendMessage());

        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.chatInput.addEventListener('input', () => {
            this.autoResize();
        });

        // Quick replies
        document.querySelectorAll('.quick-reply').forEach(reply => {
            reply.addEventListener('click', () => {
                const message = reply.getAttribute('data-message');
                this.chatInput.value = message;
                this.sendMessage();
            });
        });

        // Close chat when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.chatWidget.contains(e.target)) {
                // Don't close immediately, add a small delay
                setTimeout(() => {
                    if (!this.chatWindow.matches(':hover')) {
                        this.closeChat();
                    }
                }, 100);
            }
        });
    }

    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        this.isOpen = true;
        this.chatWindow.classList.add('show');
        this.chatButton.classList.add('active');
        this.chatButton.innerHTML = '<i class="fas fa-times"></i>';
        this.chatInput.focus();
        this.markAsRead();
        this.scrollToBottom();

        // Update status
        this.chatStatus.textContent = 'พร้อมให้บริการ';
    }

    closeChat() {
        this.isOpen = false;
        this.chatWindow.classList.remove('show');
        this.chatButton.classList.remove('active');
        this.chatButton.innerHTML = '<i class="fas fa-comments"></i>';
        if (this.unreadCount > 0) {
            this.chatButton.appendChild(this.chatBadge);
        }
    }

    sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        this.addMessage('user', message);
        this.chatInput.value = '';
        this.autoResize();
        this.scrollToBottom();

        // Show typing indicator and respond
        this.showTyping();
        setTimeout(() => {
            this.hideTyping();
            this.generateResponse(message);
        }, 1000 + Math.random() * 2000);
    }

    addMessage(sender, text, time = null) {
        const messageTime = time || new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        messageElement.innerHTML = `
                    <div class="message-bubble">
                        ${text}
                        <div class="message-time">${messageTime}</div>
                    </div>
                `;

        // Insert before typing indicator
        this.chatMessages.insertBefore(messageElement, this.typingIndicator.parentElement);

        const messageData = { sender, text, time: messageTime, timestamp: Date.now() };
        this.messages.push(messageData);
        this.saveChatHistory();

        if (sender === 'bot' && !this.isOpen) {
            this.showNotification();
        }

        this.scrollToBottom();
    }

    generateResponse(userMessage) {
        const responses = this.getResponseForMessage(userMessage.toLowerCase());
        const response = responses[Math.floor(Math.random() * responses.length)];

        this.addMessage('bot', response);
    }

    getResponseForMessage(message) {
        const responseMap = {
            'สวัสดี': ['สวัสดีครับ! ยินดีให้บริการครับ', 'สวัสดีครับ! มีอะไรให้ช่วยเหลือไหมครับ?'],
            'เวลาทำการ': ['เวลาทำการของเรา คือ จันทร์-ศุกร์ 08:30-16:30 น. ครับ'],
            'ขอทราบเวลาทำการ': ['เวลาทำการของ อบต.ตัวอย่าง คือ จันทร์-ศุกร์ 08:30-16:30 น. ครับ'],
            'ยื่นคำร้อง': ['สำหรับการยื่นคำร้อง ท่านสามารถมาที่สำนักงานโดยตรง หรือใช้บริการออนไลน์ได้ครับ <a class="text-blue-500 decoration-solid" href="/user/complaint">คลิกที่นี่</a>'],
            'ต้องการยื่นคำร้อง': ['สำหรับการยื่นคำร้อง ท่านสามารถมาที่สำนักงานโดยตรง หรือใช้บริการออนไลน์ได้ครับ <a class="text-blue-500 decoration-solid" href="/user/complaint">คลิกที่นี่</a>'],
            // 'ชำระภาษี': ['ท่านสามารถชำระภาษีได้ที่สำนักงาน อบต. หรือผ่านระบบออนไลน์ครับ'],
            'สอบถามการชำระภาษี': ['การชำระภาษีสามารถทำได้หลายช่องทาง ทั้งที่สำนักงานและออนไลน์ครับ'],
            'ติดต่อ': ['ท่านสามารถติดต่อเราได้ที่ โทร. 043 306 526 ครับ'],
            'ขอข้อมูลติดต่อ': ['ข้อมูลติดต่อ: โทร. โทร. 043 306 526 ที่อยู่: หมู่ 10 97 ตำบล ขามป้อม อำเภอ เปือยน้อย ขอนแก่น 40340 ครับ'],
            'ขอบคุณ': ['ยินดีครับ! หากมีข้อสงสัยเพิ่มเติม สามารถสอบถามได้เสมอครับ', 'ด้วยความยินดีครับ! พร้อมให้บริการเสมอครับ']
        };

        // Check for exact matches first
        for (const [key, responses] of Object.entries(responseMap)) {
            if (message.includes(key)) {
                return responses;
            }
        }

        // Default responses
        return [
            'ขอบคุณสำหรับข้อความครับ เจ้าหน้าที่จะติดต่อกลับไปครับ',
            'ได้รับข้อความแล้วครับ หากต้องการข้อมูลเพิ่มเติม กรุณาติดต่อ 0XX-XXX-XXXX ครับ',
            'ขอบคุณที่ติดต่อมาครับ ท่านสามารถมาติดต่อที่สำนักงานได้ในเวลาทำการครับ'
        ];
    }

    showTyping() {
        this.isTyping = true;
        this.typingIndicator.style.display = 'flex';
        this.chatStatus.textContent = 'กำลังพิมพ์...';
        this.scrollToBottom();
    }

    hideTyping() {
        this.isTyping = false;
        this.typingIndicator.style.display = 'none';
        this.chatStatus.textContent = 'พร้อมให้บริการ';
    }

    showNotification() {
        this.unreadCount++;
        this.chatBadge.textContent = this.unreadCount;
        this.chatBadge.style.display = 'flex';

        // Show system notification
        notificationSystem.info('ข้อความใหม่', 'มีข้อความตอบกลับจากเจ้าหน้าที่ อบต.');
    }

    markAsRead() {
        this.unreadCount = 0;
        this.chatBadge.style.display = 'none';
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    autoResize() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 80) + 'px';
    }

    saveChatHistory() {
        localStorage.setItem('chatHistory', JSON.stringify(this.messages));
    }

    loadChatHistory() {
        const history = localStorage.getItem('chatHistory');
        if (history) {
            this.messages = JSON.parse(history);
            // Only load recent messages (last 24 hours)
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            this.messages = this.messages.filter(msg => msg.timestamp > oneDayAgo);

            // Display loaded messages
            this.messages.forEach(msg => {
                if (msg.sender !== 'bot' || msg.text !== 'สวัสดีครับ! ยินดีต้อนรับสู่ อบต.ตัวอย่าง<br>มีอะไรให้ช่วยเหลือไหมครับ?') {
                    const messageElement = document.createElement('div');
                    messageElement.className = `chat-message ${msg.sender}`;
                    messageElement.innerHTML = `
                                <div class="message-bubble">
                                    ${msg.text}
                                    <div class="message-time">${msg.time}</div>
                                </div>
                            `;
                    this.chatMessages.insertBefore(messageElement, this.typingIndicator.parentElement);
                }
            });
        }
    }

    setWelcomeTime() {
        const welcomeTime = document.getElementById('welcome-time');
        if (welcomeTime) {
            welcomeTime.textContent = new Date().toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    // simulateInitialNotification() {
    //     // Show notification after 10 seconds if chat is not opened
    //     setTimeout(() => {
    //         if (!this.isOpen) {
    //             this.showNotification();
    //             notificationSystem.info('💬 แชทสด', 'เจ้าหน้าที่พร้อมให้คำปรึกษา คลิกเพื่อเริ่มสนทนา');
    //         }
    //     }, 10000);
    // }

    // get chatWidget() {
    //     return document.querySelector('.chat-widget');
    // }
}

const chatSystem = new ChatSystem();