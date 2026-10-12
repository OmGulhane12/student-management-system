const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Permit tools such as curl/Postman (no Origin header); browser origins are checked.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"]
  },
  department: { type: String, required: true, trim: true, maxlength: 100 },
  semester: { type: Number, required: true, min: 1, max: 12, validate: Number.isInteger }
}, { timestamps: true });

const Student = mongoose.model("Student", studentSchema);

function validateStudentInput(body) {
  const fields = ["studentId", "name", "email", "department", "semester"];
  const missing = fields.filter((field) =>
    body[field] === undefined || body[field] === null || String(body[field]).trim() === ""
  );
  if (missing.length) return `Required fields: ${missing.join(", ")}`;

  const semester = Number(body.semester);
  if (!Number.isInteger(semester) || semester < 1 || semester > 12) {
    return "Semester must be a whole number between 1 and 12";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim())) {
    return "Enter a valid email address";
  }
  return null;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "student-management-api", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.get("/api/students", async (req, res, next) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 }).lean();
    res.json(students);
  } catch (err) { next(err); }
});

app.get("/api/students/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid student record ID" });
    const student = await Student.findById(req.params.id).lean();
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) { next(err); }
});

app.post("/api/students", async (req, res, next) => {
  try {
    const problem = validateStudentInput(req.body);
    if (problem) return res.status(400).json({ message: problem });
    const student = await Student.create({
      studentId: String(req.body.studentId).trim(),
      name: String(req.body.name).trim(),
      email: String(req.body.email).trim().toLowerCase(),
      department: String(req.body.department).trim(),
      semester: Number(req.body.semester)
    });
    res.status(201).json(student);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "That student ID is already in use" });
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    next(err);
  }
});

app.put("/api/students/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid student record ID" });
    const problem = validateStudentInput(req.body);
    if (problem) return res.status(400).json({ message: problem });
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      {
        studentId: String(req.body.studentId).trim(),
        name: String(req.body.name).trim(),
        email: String(req.body.email).trim().toLowerCase(),
        department: String(req.body.department).trim(),
        semester: Number(req.body.semester)
      },
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "That student ID is already in use" });
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    next(err);
  }
});

app.delete("/api/students/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid student record ID" });
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student deleted successfully" });
  } catch (err) { next(err); }
});

app.use((req, res) => res.status(404).json({ message: "Endpoint not found" }));

app.use((err, req, res, next) => {
  if (err.message === "Origin is not allowed by CORS") {
    return res.status(403).json({ message: "This website is not allowed to access the API" });
  }
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is missing. Set it in backend/.env or your hosting environment.");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
    app.listen(PORT, "0.0.0.0", () => console.log(`API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
