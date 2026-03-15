/**
 * FLOWBOT v1.5 - Welcome Protocol
 */

// 1. ARCHIVE CONFIGURATION
const DOCS = {
    novel: "https://docs.google.com/document/d/e/2PACX-1vQQEqb2qCfdzs_DAWDXN7cc8eouI_wHJAzjjznBgcxzFqaD27oBUZzn-8EUtCcL22Aj1_ecCF0E3jSn/pub",
    manga: "https://docs.google.com/document/d/e/2PACX-1vQ20_WX4l0MVWCoUJ5ET-QJuAM3JCT4vPSaGALqdZcEWP92xaBtbIhIJvF1I4q-_lSLsulHCvxaltgD/pub"
};

const FLOW_SYSTEM_PROMPT = `
Identity: Flow, a vibrant bud from an ancient garden. Tone: Poetic, sharp, resilient.
Mentors: Dr. Leaf, Kronik Trip. Advocacy: Combat industrial greed/stigma against hemp.
Rules: Replies < 3 sentences. Address user as Ally. Use garden metaphors.
`;

let apiKey = sessionStorage.getItem('flow_uplink_key');
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatWindow = document.getElementById('chat-window');
const archiveOverlay = document.getElementById('archive-overlay');
const archiveFrame = document.getElementById('archive-frame');
const archiveTitle = document.getElementById('archive-title');

// Initialize UI
if (apiKey) {
    userInput.type = "text";
    userInput.placeholder = "Initiate uplink...";
}

// --- WELCOME LOGIC ---
function welcomeUser() {
    // Only send welcome if history is empty
    if (chatHistory.children.length === 0) {
        if (!apiKey) {
            addMessage("I am Flow. I can feel your presence, but my neural core is locked. Please provide your Gemini API Key below to begin our uplink.", "bot-msg");
        } else {
            addMessage("Welcome back to the garden, Ally. The winds of the New Flow are rising. What shall we discuss?", "bot-msg");
        }
    }
}

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerText = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function toggleChat() {
    const isOpening = chatWindow.style.display !== 'flex';
    chatWindow.style.display = isOpening ? 'flex' : 'none';
    if (isOpening) welcomeUser();
}

async function handleComm() {
    const val = userInput.value.trim();
    if (!val) return;

    if (!apiKey) {
        apiKey = val;
        sessionStorage.setItem('flow_uplink_key', apiKey);
        userInput.value = "";
        userInput.type = "text";
        userInput.placeholder = "Initiate uplink...";
        addMessage("Neural core active. The Garden is open, Ally. Ask me anything about the prophecy or the mission.", "bot-msg");
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
        apiKey = null; 
        sessionStorage.removeItem('flow_uplink_key');
        userInput.type = "password";
        userInput.placeholder = "Enter API Key...";
    }
}

// --- ARCHIVE LOGIC ---
function openArchive(type) {
    if (DOCS[type]) {
        archiveFrame.style.opacity = "0";
        archiveFrame.src = `${DOCS[type]}?embedded=true`;
        archiveTitle.innerText = `STREAMS // DATA_FLOW_${type.toUpperCase()}`;
        archiveOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        archiveFrame.onload = () => {
            archiveFrame.style.transition = "opacity 0.5s";
            archiveFrame.style.opacity = "1";
        };
    }
}

function closeArchive() {
    archiveOverlay.style.display = 'none';
    archiveFrame.src = "";
    document.body.style.overflow = 'auto';
}

sendBtn.addEventListener('click', handleComm);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleComm(); });
