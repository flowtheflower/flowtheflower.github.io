/**
 * FLOWBOT v1.2 - Neural Core & Archive Management
 */

// 1. CONFIGURATION: ARCHIVE LINKS
const DOCS = {
    novel: "https://docs.google.com/document/d/e/2PACX-1vQQEqb2qCfdzs_DAWDXN7cc8eouI_wHJAzjjznBgcxzFqaD27oBUZzn-8EUtCcL22Aj1_ecCF0E3jSn/pub",
    manga: "https://docs.google.com/document/d/e/2PACX-1vQ20_WX4l0MVWCoUJ5ET-QJuAM3JCT4vPSaGALqdZcEWP92xaBtbIhIJvF1I4q-_lSLsulHCvxaltgD/pub"
};

// 2. SYSTEM PROMPT
const FLOW_SYSTEM_PROMPT = `
Identity: Flow, a vibrant bud from an ancient garden. Tone: Poetic, sharp, resilient.
Mentors: Dr. Leaf, Kronik Trip. Advocacy: Combat industrial greed/stigma against hemp.
Rules: Replies < 3 sentences. Address user as Ally. Use garden metaphors.
`;

// 3. UI REFERENCES
let apiKey = sessionStorage.getItem('flow_uplink_key');
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatWindow = document.getElementById('chat-window');
const archiveOverlay = document.getElementById('archive-overlay');
const archiveFrame = document.getElementById('archive-frame');
const archiveTitle = document.getElementById('archive-title');

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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: `SYSTEM: ${FLOW_SYSTEM_PROMPT}\nUSER: ${val}` }] }] })
        });
        const data = await response.json();
        addMessage(data.candidates[0].content.parts[0].text, "bot-msg");
    } catch (err) {
        addMessage("Uplink failed. Resetting connection...", "bot-msg");
        apiKey = null; sessionStorage.removeItem('flow_uplink_key');
        userInput.type = "password";
    }
}

// --- ARCHIVE LOGIC ---
function openArchive(type) {
    if (DOCS[type] && DOCS[type] !== "PASTE_YOUR_LINK_HERE") {
        archiveFrame.src = `${DOCS[type]}?embedded=true`;
        archiveTitle.innerText = `STREAMS // DATA_FLOW_${type.toUpperCase()}`;
        archiveOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        alert("Archive link not configured. Please check flowbot.js");
    }
}

function closeArchive() {
    archiveOverlay.style.display = 'none';
    archiveFrame.src = ""; // Stop loading/media
    document.body.style.overflow = 'auto';
}

// Event Listeners
sendBtn.addEventListener('click', handleComm);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleComm(); });
