# 🚀 START HERE - 2 Minute Setup

## Quick Start (Choose One)

### Option 1: Interactive Setup (Easiest)
```bash
node quick-setup.js
```
Follow the prompts to enter your API keys.

### Option 2: Manual Setup
```bash
# 1. Copy example file
copy .env.example .env

# 2. Edit .env and add your OpenAI key
# (Open .env in any text editor)

# 3. Install dependencies
npm install

# 4. Run the app
npm run dev
```

### Option 3: Minimal Setup (Just to Test)
Create `.env` with just this:
```env
OPENAI_API_KEY=sk-your-key-here
```

Then:
```bash
npm install
npm run dev
```

---

## Get Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Paste it in your `.env` file

---

## What Happens Next?

1. App starts at: http://localhost:3000
2. You'll see an interactive map of India
3. Click anywhere to analyze that location
4. Use the AI chat to ask questions
5. Run simulations and view predictions

---

## Need Help?

- **Full Guide**: Read `CONTINUE_HERE.md`
- **Documentation**: Check `README.md`
- **Current Status**: See `CURRENT_STATUS.md`
- **API Reference**: Read `ROUTES.md`

---

**That's it! You're ready to go! 🌳**
