const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { exec } = require("child_process");
require("./db");
const CallLog = require("./models/CallLog");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

// ---------------- TEXT ANALYSIS ----------------
app.post("/analyze-call", async (req, res) => {
  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: "Transcript is required" });
  }

  const command = `python3 ml/predict.py "${transcript}"`;

  exec(command, async (error, stdout) => {
    if (error) {
      return res.status(500).json({ error: "ML processing failed" });
    }

    const [status, risk_level, probability] = stdout.trim().split("|");

    // ✅ SAVE TO DATABASE
    await CallLog.create({
      type: "text",
      transcript,
      status,
      risk_level,
      probability: Number(probability)
    });

    res.json({
      status,
      risk_level,
      probability: Number(probability)
    });
  });
});

app.get("/analyze-call", (req, res) => {
  res.send("Analyze Call API is working. Use POST request.");
});


// ---------------- AUDIO (PROTOTYPE) ----------------
app.post("/analyze-audio", upload.single("file"), async (req, res) => {
  const transcript = "This is a dummy transcript from audio";

  const command = `python3 ml/predict.py "${transcript}"`;

  exec(command, async (error, stdout) => {
    const [status, risk_level, probability] = stdout.trim().split("|");

    // ✅ SAVE TO DATABASE
    await CallLog.create({
      type: "audio",
      transcript,
      status,
      risk_level,
      probability: Number(probability)
    });

    res.json({
      transcript,
      status,
      risk_level,
      probability: Number(probability)
    });
  });
});

app.get("/analyze-audio", (req, res) => {
  res.send("Analyze Audio API is working. Use POST with file upload.");
});



app.get("/", (req, res) => {
  res.json({
    status: "Backend is running",
    service: "AI Call Fraud Analyzer API"
  });
});


app.get("/history", async (req, res) => {
  const logs = await CallLog.find().sort({ createdAt: -1 });
  res.json(logs);
});

// ---------------- SERVER ----------------
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Backend running at http://127.0.0.1:${PORT}`);
});
