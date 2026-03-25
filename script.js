/* ===========================
   GCE AI Assistant — script.js
   =========================== */

let currentLang = 'en';
let isDark = false;
let isRecording = false;
let recognition = null;
let conversationHistory = [];

/* ===== INIT ===== */
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('welcomeTime').textContent = getTime();
  initScrollAnimations();
  initStatsCounter();
  initSpeechRecognition();

  if (localStorage.getItem('gce-theme') === 'dark') {
    isDark = true;
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggle').textContent = '☀️';
  }
});

/* ===== THEME TOGGLE ===== */
function toggleTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('gce-theme', isDark ? 'dark' : 'light');
}

/* ===== LANGUAGE TOGGLE ===== */
function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'hi' : 'en';
  const btn = document.getElementById('langToggle');
  btn.textContent = currentLang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English';

  document.querySelectorAll('[data-lang-en]').forEach(el => {
    el.textContent = el.getAttribute(`data-lang-${currentLang}`);
  });

  document.getElementById('userInput').placeholder = currentLang === 'hi' ? 'कुछ पूछें...' : 'Ask something...';

  const welcomeMsg = document.getElementById('welcomeMsg');
  if (welcomeMsg) {
    welcomeMsg.innerHTML = currentLang === 'hi'
      ? 'नमस्ते 👋 मैं GCE का AI सहायक हूँ।<br>प्रवेश, हॉस्टल, छात्रवृत्ति या प्लेसमेंट के बारे में पूछें।'
      : 'Hello 👋 I\'m your GCE AI Assistant powered by Groq AI!<br>Ask me anything about admissions, hostel, scholarship, departments or placements.';
  }
}

/* ===== TIME ===== */
function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ===== CHAT OPEN/CLOSE ===== */
function openChat() {
  const bot = document.getElementById('chatbot');
  bot.style.display = 'flex';
  setTimeout(() => document.getElementById('userInput').focus(), 100);
}

function closeChat() {
  document.getElementById('chatbot').style.display = 'none';
}

function clearChat() {
  const chatBox = document.getElementById('chatBox');
  chatBox.innerHTML = '';
  conversationHistory = [];

  const botDiv = document.createElement('div');
  botDiv.className = 'message bot';
  botDiv.innerHTML = `
    <div class="avatar">🤖</div>
    <div class="msg-content">
      <div class="text">Chat cleared! How can I help you? 😊</div>
      <div class="msg-time">${getTime()}</div>
    </div>`;
  chatBox.appendChild(botDiv);

  showSuggestions(['Admission process', 'Hostel fee', 'PMS scholarship', 'Placements']);
}

/* ===== SEND MESSAGE ===== */
async function sendMessage() {
  const input = document.getElementById('userInput');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  const chat = document.getElementById('chatBox');

  const initSugg = document.getElementById('initialSuggestions');
  if (initSugg) initSugg.remove();

  chat.querySelectorAll('.suggestions').forEach(s => s.remove());

  // User bubble
  const userDiv = document.createElement('div');
  userDiv.className = 'message user';
  userDiv.innerHTML = `
    <div class="avatar">🧑</div>
    <div class="msg-content">
      <div class="text">${escapeHtml(message)}</div>
      <div class="msg-time">${getTime()}</div>
    </div>`;
  chat.appendChild(userDiv);
  chat.scrollTop = chat.scrollHeight;

  // Typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="avatar">🤖</div>
    <div class="msg-content">
      <div class="text" style="padding:14px 18px;">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>`;
  chat.appendChild(typingDiv);
  chat.scrollTop = chat.scrollHeight;

  conversationHistory.push({ role: 'user', content: message });

  try {
    const reply = await askGroq(message);
    document.getElementById('typingIndicator')?.remove();

    const botDiv = document.createElement('div');
    botDiv.className = 'message bot';
    botDiv.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="msg-content">
        <div class="ai-badge">⚡ Groq AI</div>
        <div class="text">${formatReply(reply)}</div>
        <div class="msg-time">${getTime()}</div>
      </div>`;
    chat.appendChild(botDiv);

    conversationHistory.push({ role: 'assistant', content: reply });
    speakReply(reply);

    const lower = message.toLowerCase();
    if (lower.includes('admission') || lower.includes('प्रवेश')) {
      showSuggestions(['Admission eligibility', 'Departments', 'JEE cutoff', 'Fees structure']);
    } else if (lower.includes('hostel') || lower.includes('हॉस्टल')) {
      showSuggestions(['Hostel fee', 'Hostel facilities', 'Mess charges', 'WiFi campus']);
    } else if (lower.includes('scholarship') || lower.includes('pms') || lower.includes('छात्रवृत्ति')) {
      showSuggestions(['PMS eligibility', 'Scholarship amount', 'Apply for PMS', 'PMS documents']);
    } else if (lower.includes('placement') || lower.includes('प्लेसमेंट')) {
      showSuggestions(['Companies visiting', 'Highest package', 'Placement stats', 'CSE placements']);
    } else {
      showSuggestions(['Admission process', 'Hostel fee', 'PMS scholarship', 'CSE faculty']);
    }

  } catch (err) {
    document.getElementById('typingIndicator')?.remove();
    const errDiv = document.createElement('div');
    errDiv.className = 'message bot';
    errDiv.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="msg-content">
        <div class="text">⚠️ Error: ${err.message}<br><br>${getLocalReply(message)}</div>
        <div class="msg-time">${getTime()}</div>
      </div>`;
    chat.appendChild(errDiv);
    showSuggestions(['Admission process', 'Hostel fee', 'PMS scholarship']);
  }

  chat.scrollTop = chat.scrollHeight;
}

/* ===== GROQ API CALL ===== */
let GROQ_API_KEY = localStorage.getItem("groq_api_key") || "";

function saveApiKey(){
  const key = document.getElementById("apiKeyInput").value.trim();
  if(!key){
    alert("Please enter API key");
    return;
  }
  localStorage.setItem("groq_api_key", key);
  GROQ_API_KEY = key;
  alert("API key saved successfully ✅");
}

async function askGroq(userMessage) {
  if(!GROQ_API_KEY){
    throw new Error("Enter Groq API key first.");
  }
  const systemPrompt = `You are the official AI assistant for Gaya College of Engineering (GCE), a government engineering college in Gaya, Bihar, India under the Department of Science & Technology, Government of Bihar.

Key facts about GCE:
- Location: Srikrishna Nagar, Gaya, Bihar
- Admission: JEE Main + Bihar UGEAC counseling
- Departments: CSE, Mechanical, Civil, Electrical & Electronics Engineering
- CSE HOD: Dr. Pratik Ranjan
- CSE Faculty: Prof. Ritesh Kumar, Prof. Garima (Data Structures), Prof. Alok Kumar, Dr. Kanchan Bala, Prof. Pushpkala (DBMS, Computer Networks), Dr. Gajala Praveen
- Hostel fee: approx 25000 to 30000 per semester
- Placement companies: TCS, Wipro, Infosys
- PMS Scholarship: Available for SC, ST, BC, EBC students from Bihar government
- Campus: WiFi, hostels for boys and girls, library, labs, sports ground
- Class timing: 10:00 AM to 4:00 PM approx

Respond in the same language the user writes in (Hindi or English). Be friendly, helpful, concise, and accurate. Keep responses under 150 words.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      max_tokens: 400,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6),
        { role: 'user', content: userMessage }
      ]
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/* ===== LOCAL FALLBACK REPLIES ===== */
function getLocalReply(message) {
  const msg = message.toLowerCase();
  if (msg.includes('admission')) return 'Admission to GCE is through JEE Main followed by Bihar UGEAC counseling. Merit-based seat allotment.';
  if (msg.includes('hostel')) return 'GCE provides hostels for boys and girls with mess, WiFi and basic amenities. Fee: ~₹25,000-30,000 per semester.';
  if (msg.includes('pms') || msg.includes('scholarship')) return 'PMS Scholarship is for SC/ST/BC/EBC students. Apply via Bihar PMS portal. Covers tuition fees + maintenance.';
  if (msg.includes('placement')) return 'GCE has good placement record. Companies like TCS, Wipro and Infosys recruit from GCE.';
  if (msg.includes('cse') || msg.includes('department')) return 'CSE Department HOD: Dr. Pratik Ranjan. Faculty includes Prof. Garima, Prof. Pushpkala, Prof. Alok Kumar and more.';
  if (msg.includes('contact')) return 'Contact GCE at: Srikrishna Nagar, Gaya, Bihar. Visit the official college website for more details.';
  return 'I can help you with admissions, departments, hostel, PMS scholarship, placements and more. What would you like to know?';
}

/* ===== FORMAT REPLY ===== */
function formatReply(text) {
  return escapeHtml(text)
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

/* ===== QUICK QUESTION ===== */
function quickQuestion(question) {
  document.getElementById('userInput').value = question;
  sendMessage();
}

/* ===== SUGGESTIONS ===== */
function showSuggestions(list) {
  const chat = document.getElementById('chatBox');
  const container = document.createElement('div');
  container.className = 'suggestions';
  list.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-btn';
    btn.textContent = q;
    btn.onclick = () => quickQuestion(q);
    container.appendChild(btn);
  });
  chat.appendChild(container);
  chat.scrollTop = chat.scrollHeight;
}

/* ===== ENTER KEY ===== */
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('userInput');
  if (input) {
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });
  }
});

/* ===== VOICE INPUT ===== */
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('userInput').value = transcript;
    sendMessage();
  };

  recognition.onend = () => {
    isRecording = false;
    const btn = document.getElementById('voiceBtn');
    if (btn) { btn.classList.remove('recording'); btn.textContent = '🎙️'; }
  };

  recognition.onerror = () => {
    isRecording = false;
    const btn = document.getElementById('voiceBtn');
    if (btn) { btn.classList.remove('recording'); btn.textContent = '🎙️'; }
  };
}

function toggleVoice() {
  const btn = document.getElementById('voiceBtn');
  if (!recognition) {
    alert('Voice input not supported in your browser. Try Chrome!');
    return;
  }
  if (!isRecording) {
    isRecording = true;
    btn.classList.add('recording');
    btn.textContent = '🔴';
    recognition.lang = currentLang === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.start();
  } else {
    recognition.stop();
    isRecording = false;
    btn.classList.remove('recording');
    btn.textContent = '🎙️';
  }
}

/* ===== TEXT TO SPEECH ===== */
function speakReply(text) {
  if (!window.speechSynthesis) return;
  const clean = text.replace(/[*_`#]/g, '').substring(0, 200);
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = currentLang === 'hi' ? 'hi-IN' : 'en-IN';
  utter.rate = 0.95;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

/* ===== STATS COUNTER ===== */
function initStatsCounter() {
  const counters = document.querySelectorAll('.stat-num');
  let started = false;

  function startCounting() {
    if (started) return;
    started = true;
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'));
      const step = target / (2000 / 16);
      let current = 0;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          counter.textContent = target.toLocaleString() + '+';
          clearInterval(timer);
        } else {
          counter.textContent = Math.floor(current).toLocaleString();
        }
      }, 16);
    });
  }

  const statsSection = document.querySelector('.stats');
  if (!statsSection) return;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) startCounting();
  }, { threshold: 0.3 });

  observer.observe(statsSection);
}

/* ===== SCROLL ANIMATIONS ===== */
function initScrollAnimations() {
  const cards = document.querySelectorAll('.card.fade-in');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 100);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => observer.observe(card));
}
