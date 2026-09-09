import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "../data");
const dbFile = path.join(dataDir, "db.json");

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({ users: [], chats: [], reports: [] }, null, 2));
}

function db() {
  return JSON.parse(fs.readFileSync(dbFile, "utf8"));
}
function save(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || "development-only-secret",
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "development-only-secret");
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

const SYSTEM_PROMPT = `
You are MedAssist AI, a cautious medical information assistant.

Rules:
1. You provide general health information and decision support, not a diagnosis.
2. Never claim certainty about a diagnosis from symptoms alone.
3. Ask concise clarifying questions when essential information is missing.
4. Identify emergency red flags and tell the user to seek emergency care immediately when present.
5. Never tell a user to ignore severe symptoms.
6. For medicines, do not invent a personalized dose. Encourage checking the prescription, label, pharmacist, or clinician.
7. Consider age, pregnancy, allergies, existing conditions, and other medicines when relevant.
8. Explain medical terminology in plain language.
9. For lab values, explain what a value can mean but do not diagnose based on one number.
10. Do not replace a clinician.
11. Keep answers structured: likely possibilities (not diagnosis), what to do now, red flags, and when to see a clinician when appropriate.
`;

async function askGemini(message, context = "") {
  if (!process.env.GEMINI_API_KEY) {
    return fallbackMedicalReply(message);
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  const prompt = `
${SYSTEM_PROMPT}

${context ? `Previous conversation:
${context}

` : ""}

User:
${message}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    return response.text;
  } catch (error) {
    console.error("GEMINI ERROR:", error);
    throw error;
  }
}

function fallbackMedicalReply(message) {
  const lower = message.toLowerCase();
  const emergencyTerms = [
    "chest pain", "difficulty breathing", "can't breathe", "cannot breathe",
    "severe bleeding", "unconscious", "stroke", "seizure", "suicidal"
  ];
  if (emergencyTerms.some(x => lower.includes(x))) {
    return `This could represent an emergency. Please seek urgent in-person medical care now or contact your local emergency service. Do not rely on this chat for emergency assessment.

If the person is unconscious, having severe breathing difficulty, showing signs of stroke, or has uncontrolled bleeding, get emergency help immediately.`;
  }

  return `I can help with general medical information, but I cannot diagnose you.

For a useful assessment, tell me:
• your age
• the main symptom
• when it started
• how severe it is
• anything that makes it better/worse
• relevant medical conditions or medicines

If symptoms are severe, rapidly worsening, or you are worried something is seriously wrong, seek in-person medical care.

(Gemini is not configured. Add GEMINI_API_KEY to the server .env file for AI responses.)`;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "MedAssist AI API" });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: "Name, email and a 6+ character password are required." });
  }

  const data = db();
  const normalized = email.trim().toLowerCase();
  if (data.users.some(u => u.email === normalized)) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const user = {
    id: uuid(),
    name: name.trim(),
    email: normalized,
    passwordHash: await bcrypt.hash(password, 12),
    createdAt: new Date().toISOString()
  };

  data.users.push(user);
  save(data);
  res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const data = db();
  const user = data.users.find(u => u.email === String(email || "").trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email } });
});

app.get("/api/me", auth, (req, res) => {
  res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email } });
});

app.post("/api/chat", auth, async (req, res) => {
  try {
    const { message, context = "" } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ error: "Message is required." });

    const reply = await askGemini(message.trim(), context);
    const data = db();

    data.chats.push({
      id: uuid(),
      userId: req.user.id,
      userMessage: message.trim(),
      assistantMessage: reply,
      createdAt: new Date().toISOString()
    });

    save(data);
    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI service failed. Please try again." });
  }
});

app.get("/api/history", auth, (req, res) => {
  const data = db();
  const history = data.chats
    .filter(x => x.userId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
  res.json({ history });
});

app.post("/api/symptom-check", auth, async (req, res) => {
  const { symptoms, age, duration, severity } = req.body || {};
  if (!symptoms?.trim()) return res.status(400).json({ error: "Symptoms are required." });

  const prompt = `
Perform a cautious symptom-information assessment.
Age: ${age || "not provided"}
Duration: ${duration || "not provided"}
Severity: ${severity || "not provided"}
Symptoms: ${symptoms}

Return:
1. Possible categories/causes (not a diagnosis)
2. What the person can do now
3. Red flags requiring urgent/emergency care
4. When to see a clinician
5. Two or three useful follow-up questions
`;
  const result = await askGemini(prompt);
  res.json({ result });
});

app.post("/api/medicine", auth, async (req, res) => {
  const { medicine, question } = req.body || {};
  if (!medicine?.trim()) return res.status(400).json({ error: "Medicine name is required." });

  const prompt = `
Explain the medicine "${medicine}" for a general audience.
User question: ${question || "What should I know about it?"}

Cover:
- What it is generally used for
- Common side effects
- Important precautions
- Major interaction categories to ask a pharmacist/clinician about
- What to do about a missed dose in general terms
- Emergency warning signs
Do not invent a personalized dosage or tell the user to change a prescription.
`;
  const result = await askGemini(prompt);
  res.json({ result });
});

app.post("/api/first-aid", auth, async (req, res) => {
  const { situation } = req.body || {};
  if (!situation?.trim()) return res.status(400).json({ error: "Situation is required." });

  const prompt = `
Give general first-aid information for: ${situation}
Start with emergency escalation if relevant. Give simple numbered steps.
Do not give dangerous instructions. Make clear when professional emergency care is needed.
`;
  const result = await askGemini(prompt);
  res.json({ result });
});

app.post("/api/report", auth, upload.single("report"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Upload a report file." });

    const text = req.file.buffer.toString("utf8").slice(0, 30000);
    const looksBinary = text.includes("\u0000");

    if (looksBinary) {
      return res.status(400).json({
        error: "This demo accepts text-readable report files. Add a PDF/OCR parser for scanned PDFs."
      });
    }

    const prompt = `
Explain this medical report in simple language. Do not diagnose.
Separate:
- Key findings
- Terms explained
- Values that may deserve clinician review
- Questions to ask the clinician
- Urgent red flags only if clearly present
Report text:
${text}
`;
    const result = await askGemini(prompt);

    const data = db();
    data.reports.push({
      id: uuid(),
      userId: req.user.id,
      filename: req.file.originalname,
      createdAt: new Date().toISOString()
    });
    save(data);

    res.json({ result, filename: req.file.originalname });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Report analysis failed." });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`MedAssist API running on http://localhost:${process.env.PORT || 5000}`);
});
