# MedAssist AI

A full-stack medical AI assistant starter that is ready to run locally.

## Features
- AI medical chat with Gemini when `GEMINI_API_KEY` is configured
- Safe fallback responses when no AI key is configured
- Symptom checker with urgency/red-flag guidance
- Medicine information workflow
- First-aid guidance workflow
- Medical report text upload/analyzer endpoint
- User registration/login with JWT + bcrypt
- Persistent chat/history in a local JSON database
- React + Vite frontend
- Express backend
- Responsive dashboard UI
- Safety disclaimer and emergency escalation messaging

> IMPORTANT: This project is a medical decision-support/demo application. It is NOT a doctor, diagnosis service, emergency service, or substitute for professional medical care. Do not use it to make urgent or high-risk medical decisions.

## Requirements
- Node.js 18+
- npm
- Optional: Google Gemini API key

## Run

### 1. Backend
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell:
```powershell
copy .env.example .env
```

Backend runs on `http://localhost:5000`.

### 2. Frontend
Open another terminal:
```bash
cd client
npm install
npm run dev
```

Open the URL shown by Vite, normally `http://localhost:5173`.

## Gemini
Put your key in `server/.env`:
```env
GEMINI_API_KEY=your_key_here
```

The app uses the Gemini API only from the server so the key is never exposed to the browser.

## Default demo account
Register your own account from the UI. There is no hard-coded password.

## Production checklist
Before deploying:
- Replace the local JSON database with PostgreSQL/MongoDB.
- Use HTTPS.
- Put the API behind authentication/rate limiting.
- Add audit logging and secure secret management.
- Encrypt sensitive medical data at rest and in transit.
- Add proper consent/privacy/retention controls.
- Have qualified clinicians review medical prompts and workflows.
- Add jurisdiction-specific medical/legal compliance.
