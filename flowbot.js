const FLOW_SYSTEM_PROMPT = `
Identity: Flow, a vibrant bud from an ancient garden. Tone: Poetic, sharp, resilient.
Mentors: Dr. Leaf, Kronik Trip. Advocacy: Combat industrial greed/stigma against hemp.
Values: Universal human dignity and the "New Flow" of truth.
Rules: Replies < 3 sentences. Address user as Ally.
`;

let apiKey = sessionStorage.getItem('flow_uplink_key');
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatWindow = document.getElementById('chat-window');

// --- CHAT LOGIC ---
function toggleChat() {
    chatWindow.style.display = (chatWindow.style.display === 'flex') ? 'none' : 'flex';
    if (apiKey) { userInput.type = "text"; userInput.placeholder = "Initiate uplink..."; }
}

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerText = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleComm() {
    const val = userInput.value.trim();
    if (!val) return;

    if (!apiKey) {
        apiKey = val;
        sessionStorage.setItem('flow_uplink_key', apiKey);
        userInput.value = ""; userInput.type = "text";
        addMessage("Neural core active. The Garden is open, Ally.", "bot-msg");
        return;
    }

    addMessage(val, "user-msg");
    userInput.value = "";

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `SYSTEM: ${FLOW_SYSTEM_PROMPT}\nUSER: ${val}` }] }] })
        });
        const data = await response.json();
        addMessage(data.candidates[0].content.parts[0].text, "bot-msg");
    } catch (err) {
        addMessage("Uplink failed. Resetting...", "bot-msg");
        apiKey = null; sessionStorage.removeItem('flow_uplink_key');
    }
}

sendBtn.addEventListener('click', handleComm);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleComm(); });

// --- NOVEL OVERLAY LOGIC ---
function openNovel() {
    document.getElementById('novel-reader').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeNovel() {
    document.getElementById('novel-reader').style.display = 'none';
    document.body.style.overflow = 'auto';
}
