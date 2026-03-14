import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("medflow.db");

const TOPICS_DATA: Record<string, string[]> = {
  "Pediatria": [
    "Doenças Exantemáticas",
    "Síndromes Respiratórias na Infância – Parte I",
    "Síndromes Respiratórias na Infância – Parte II",
    "Imunização; Dever de Casa: Infecções do Trato Urinário",
    "Neonatologia I",
    "Neonatologia II",
    "Crescimento e seus Distúrbios. Dever de Casa: Carência de Micronutrientes",
    "Puberdade e seus Distúrbios. Dever de Casa: Desenvolvimento Infantil",
    "Aleitamento Materno + Diarreia Aguda"
  ],
  "Clínica Médica": [
    "Síndrome Ictérica I (Hepatites)",
    "Síndrome Ictérica II (Doenças das Vias Biliares)",
    "Síndrome Diarreica",
    "Síndrome Metabólica I – HAS e Dislipidemia",
    "Síndrome Metabólica II – Diabetes e Obesidade",
    "Grandes Síndromes Endócrinas – Parte I (Tireoide)",
    "Grandes Síndromes Endócrinas – Parte II (Suprarrenal/Cálcio); Hipofunção Adrenal: Doença de Addison",
    "Terapia Intensiva",
    "Síndrome da Pneumonia Típica e Atípica",
    "Grandes Síndromes Bacterianas",
    "Síndromes de Imunodeficiência",
    "Síndromes Febris",
    "Tosse Crônica",
    "Dispneia (Doenças Vasculares, Obstrutivas e Restritivas)",
    "Geriatria",
    "Epilepsia",
    "Síndrome Neurovascular",
    "Fraqueza Muscular",
    "Síndrome Álgica II – Cefaleias",
    "Síndromes Glomerulares e Doença Vascular Renal",
    "Síndrome Urêmica",
    "Distúrbio Hidroeletrolítico e Ácido-Básico",
    "Anemias – Parte II (Hemolíticas)",
    "Anemias – Parte I (Carenciais)",
    "Leucemias e Pancitopenia",
    "Linfonodo e Esplenomegalia",
    "Distúrbios da Hemostasia",
    "Artrites",
    "Colagenoses",
    "Vasculites",
    "Síndrome Edemigênica",
    "Síndrome Álgica IV – Dor Torácica – Parte I",
    "Síndrome Álgica IV – Dor Torácica – Parte II",
    "Taquiarritmias",
    "Bradiarritmias"
  ],
  "Ginecologia": [
    "Síndromes de Transmissão Sexual",
    "Oncologia I – Parte I (Mama e Ovário)",
    "Oncologia I – Parte II (Endométrio e Colo Uterino)",
    "Ciclo Menstrual, Distopia Genital e Incontinência Urinária",
    "Amenorreia, Infertilidade e Síndrome dos Ovários Policísticos",
    "Anticoncepção, Sangramentos Ginecológicos e Endometriose"
  ],
  "Cirurgia": [
    "Síndrome de Insuficiência Hepática",
    "Síndrome de Hipertensão Porta",
    "Síndrome Disfágica",
    "Síndrome Dispéptica e Doenças do TGI Superior",
    "Hemorragia Digestiva I – Abordagem e Conduta",
    "Síndrome Álgica I – Dor Abdominal",
    "Hemorragia Digestiva II – Proctologia",
    "Síndrome de Oclusão Intestinal (Aguda x Crônica)",
    "Oncologia II – Parte II (Esôfago, Estômago, Colorretal, Pâncreas e Fígado)",
    "Oncologia II – Parte I (Próstata, Pulmão e Tireoide)",
    "Síndrome Álgica III – Dor Lombar",
    "Trauma e suas Consequências I",
    "Trauma e suas Consequências II",
    "Perioperatório I",
    "Perioperatório II",
    "Especialidade Cirúrgica – Parte I",
    "Especialidade Cirúrgica – Parte II"
  ],
  "Obstetrícia": [
    "Sangramentos da Primeira Metade da Gravidez e Doença Hemolítica Perinatal",
    "Sangramentos da Segunda Metade da Gravidez",
    "Doenças Clínicas na Gravidez",
    "Sofrimento Fetal, Avaliação da Vitalidade Fetal, Fórcipe e Puerpério",
    "Diagnóstico de Gravidez, Modificações do Organismo Materno, Pré-Natal e Aconselhamento Genético",
    "O Parto"
  ],
  "Preventiva": [
    "SUS – Evolução Histórica, Diretrizes, Propostas e Financiamento",
    "Medidas de Saúde Coletiva",
    "Estudos Epidemiológicos",
    "Epidemiologia Clínica",
    "Vigilância da Saúde e Ética Médica",
    "Declaração de Óbito e Saúde do Trabalhador",
    "Intoxicações e Acidentes por Animais Peçonhentos"
  ],
  "Único": [
    "Otorrinolaringologia – Parte I",
    "Otorrinolaringologia – Parte II",
    "Bônus Oftalmologia",
    "TP3 – PALS",
    "Psiquiatria I",
    "Psiquiatria II",
    "Ortopedia I",
    "Ortopedia II",
    "Dermatologia I",
    "Dermatologia II"
  ]
};

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    specialty TEXT NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER UNIQUE,
    current_interval INTEGER DEFAULT 0,
    last_score REAL DEFAULT 0,
    next_review_date TEXT,
    urgency_count INTEGER DEFAULT 0,
    previous_state TEXT,
    FOREIGN KEY(topic_id) REFERENCES topics(id)
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    difficulty_factor REAL DEFAULT 2.5,
    current_interval INTEGER DEFAULT 0,
    repetition_level INTEGER DEFAULT 0,
    next_review TEXT,
    last_difficulty INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(topic_id) REFERENCES topics(id)
  );

  CREATE TABLE IF NOT EXISTS error_notebook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER,
    content TEXT NOT NULL,
    tags TEXT,
    is_converted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(topic_id) REFERENCES topics(id)
  );

  CREATE TABLE IF NOT EXISTS study_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT CURRENT_DATE,
    activity_type TEXT,
    duration_minutes INTEGER,
    score REAL,
    topic_id INTEGER
  );
`);

// Migrations for existing DBs
try { db.exec("ALTER TABLE user_progress ADD COLUMN previous_state TEXT"); } catch (e) { }
try { db.exec("ALTER TABLE flashcards ADD COLUMN last_difficulty INTEGER"); } catch (e) { }
try { db.exec("ALTER TABLE flashcards ADD COLUMN current_interval INTEGER DEFAULT 0"); } catch (e) { }
try { db.exec("ALTER TABLE flashcards ADD COLUMN repetition_level INTEGER DEFAULT 0"); } catch (e) { }
try { db.exec("ALTER TABLE flashcards ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP"); } catch (e) { }
try { db.exec("ALTER TABLE study_log ADD COLUMN topic_id INTEGER"); } catch (e) { }

// Seed Topics
const seedTopics = () => {
  const count = db.prepare("SELECT COUNT(*) as count FROM topics").get().count;
  if (count === 0) {
    const insert = db.prepare("INSERT INTO topics (specialty, title, order_index) VALUES (?, ?, ?)");
    Object.entries(TOPICS_DATA).forEach(([specialty, titles]) => {
      titles.forEach((title, index) => {
        insert.run(specialty, title, index);
      });
    });
    console.log("Database seeded with topics.");
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  seedTopics();

  app.use(express.json());

  // API Routes
  app.get("/api/topics", (req, res) => {
    const topics = db.prepare(`
      SELECT t.*, p.current_interval, p.last_score, p.next_review_date, p.urgency_count,
             (SELECT COUNT(*) FROM study_log sl WHERE sl.topic_id = t.id) as study_count,
             (SELECT COUNT(*) FROM flashcards f WHERE f.topic_id = t.id) as card_count
      FROM topics t
      LEFT JOIN user_progress p ON t.id = p.topic_id
      ORDER BY t.specialty, t.order_index
    `).all();
    res.json(topics);
  });

  app.post("/api/study-session", (req, res) => {
    const { topic_id, score, duration_minutes } = req.body;

    // Get current progress
    let progress = db.prepare("SELECT * FROM user_progress WHERE topic_id = ?").get(topic_id);

    if (!progress) {
      db.prepare("INSERT INTO user_progress (topic_id) VALUES (?)").run(topic_id);
      progress = { current_interval: 0, urgency_count: 0 };
    }

    // Save previous state for "undo"
    const previousState = JSON.stringify(progress);

    // Algorithm logic
    let nextInterval;
    let newUrgencyCount = progress.urgency_count || 0;
    let nextReviewDateStr: string | null = null;
    let finalScore: number | null = score;

    if (score === 0 && duration_minutes === 0) {
      nextInterval = 0;
      newUrgencyCount = 0;
      nextReviewDateStr = null;
      finalScore = null;
      // Remove any study logs for this topic today to reset effort in chart
      db.prepare("DELETE FROM study_log WHERE topic_id = ? AND date = date('now')").run(topic_id);
    } else {
      if (score > 79) {
        const intervals = [15, 30, 60, 90, 120, 180];
        nextInterval = intervals.find(i => i > progress.current_interval) || 180;
        newUrgencyCount = 0;
      } else if (score < 65) {
        const urgencyIntervals = [1, 3, 7];
        nextInterval = urgencyIntervals[newUrgencyCount] || 1;
        newUrgencyCount++;
      } else {
        nextInterval = Math.max(7, progress.current_interval || 7);
      }

      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
      nextReviewDateStr = nextReviewDate.toISOString();
    }

    db.prepare(`
      UPDATE user_progress 
      SET current_interval = ?, last_score = ?, next_review_date = ?, urgency_count = ?, previous_state = ?
      WHERE topic_id = ?
    `).run(nextInterval, finalScore, nextReviewDateStr, newUrgencyCount, previousState, topic_id);

    if (score !== 0 || duration_minutes !== 0) {
      db.prepare(`
        INSERT INTO study_log (activity_type, duration_minutes, score, topic_id)
        VALUES (?, ?, ?, ?)
      `).run('Study', duration_minutes, score, topic_id);
    }

    res.json({ success: true, nextReviewDate: nextReviewDateStr });
  });

  app.post("/api/study-session/undo", (req, res) => {
    const { topic_id } = req.body;
    const progress = db.prepare("SELECT previous_state FROM user_progress WHERE topic_id = ?").get(topic_id);

    if (progress && progress.previous_state) {
      const prev = JSON.parse(progress.previous_state);
      db.prepare(`
        UPDATE user_progress 
        SET current_interval = ?, last_score = ?, next_review_date = ?, urgency_count = ?, previous_state = NULL
        WHERE topic_id = ?
      `).run(prev.current_interval, prev.last_score, prev.next_review_date, prev.urgency_count, topic_id);

      // Also remove last log entry for this topic
      db.prepare("DELETE FROM study_log WHERE topic_id = ? ORDER BY id DESC LIMIT 1").run(topic_id);

      res.json({ success: true });
    } else {
      res.status(400).json({ error: "No state to undo" });
    }
  });

  app.post("/api/study-session/clear-review", (req, res) => {
    const { topic_id } = req.body;
    db.prepare("UPDATE user_progress SET next_review_date = NULL WHERE topic_id = ?").run(topic_id);
    res.json({ success: true });
  });

  app.post("/api/topics/:id/reset", (req, res) => {
    db.prepare(`
      UPDATE user_progress 
      SET current_interval = 0, last_score = 0, next_review_date = NULL, urgency_count = 0, previous_state = NULL
      WHERE topic_id = ?
    `).run(req.params.id);

    // Optional: remove all logs for this topic?
    db.prepare("DELETE FROM study_log WHERE topic_id = ?").run(req.params.id);

    res.json({ success: true });
  });

  app.get("/api/dashboard", (req, res) => {
    // Generate last 7 days effort with zeros for missing days
    const effort = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayData = db.prepare(`
        SELECT SUM(duration_minutes) as total_minutes, AVG(score) as avg_score
        FROM study_log
        WHERE date = ?
      `).get(dateStr);

      effort.push({
        date: dateStr,
        total_minutes: dayData.total_minutes || 0,
        avg_score: dayData.avg_score || 0
      });
    }

    const stats = db.prepare(`
      SELECT 
        COUNT(last_score) as total_topics,
        SUM(CASE WHEN last_score > 79 THEN 1 ELSE 0 END) as high_perf,
        SUM(CASE WHEN next_review_date < datetime('now') THEN 1 ELSE 0 END) as overdue
      FROM user_progress
    `).get();

    res.json({ effort, stats });
  });

  app.get("/api/flashcards", (req, res) => {
    const { topic_id, specialty, mode } = req.query;
    let query = "SELECT f.*, t.specialty, t.title as topic_title FROM flashcards f LEFT JOIN topics t ON f.topic_id = t.id WHERE 1=1";
    const params = [];

    if (mode === 'due') {
      query += " AND (f.next_review IS NULL OR f.next_review <= datetime('now'))";
    } else if (mode === 'difficult') {
      query += " AND f.last_difficulty = 0 AND (f.next_review IS NULL OR f.next_review <= datetime('now'))";
    }

    if (topic_id) {
      query += " AND f.topic_id = ?";
      params.push(topic_id);
    }
    if (specialty) {
      query += " AND t.specialty = ?";
      params.push(specialty);
    }

    const cards = db.prepare(query).all(...params);
    res.json(cards);
  });

  app.get("/api/flashcards/all", (req, res) => {
    const cards = db.prepare("SELECT f.*, t.specialty, t.title as topic_title FROM flashcards f LEFT JOIN topics t ON f.topic_id = t.id").all();
    res.json(cards);
  });

  app.put("/api/flashcards/:id", (req, res) => {
    const { front, back } = req.body;
    db.prepare("UPDATE flashcards SET front = ?, back = ? WHERE id = ?").run(front, back, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/flashcards/stats", (req, res) => {
    const dailyVolume = db.prepare(`
      SELECT date, COUNT(*) as count, SUM(duration_minutes) as total_minutes
      FROM study_log
      WHERE activity_type = 'Flashcard'
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    `).all();

    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_reviews,
        SUM(duration_minutes) as total_minutes
      FROM study_log
      WHERE activity_type = 'Flashcard'
    `).get();

    res.json({ dailyVolume, totals });
  });

  app.post("/api/flashcards", (req, res) => {
    const { topic_id, front, back } = req.body;

    if (!topic_id || isNaN(parseInt(topic_id))) {
      return res.status(400).json({ error: "ID do tema inválido ou ausente" });
    }

    console.log(`Adding flashcard: topic_id=${topic_id}, front=${front?.substring(0, 20)}...`);
    try {
      const result = db.prepare("INSERT INTO flashcards (topic_id, front, back) VALUES (?, ?, ?)").run(topic_id, front, back);
      console.log(`Flashcard added with ID: ${result.lastInsertRowid}`);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error("Error adding flashcard:", error);
      res.status(500).json({ error: "Falha ao adicionar flashcard no banco de dados" });
    }
  });

  app.delete("/api/flashcards/:id", (req, res) => {
    db.prepare("DELETE FROM flashcards WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/flashcards/:id/score", (req, res) => {
    const { difficulty, duration_minutes } = req.body; // 0: Errei, 1: Difícil, 2: Bom, 3: Fácil
    const card = db.prepare("SELECT * FROM flashcards WHERE id = ?").get(req.params.id);

    if (!card) return res.status(404).json({ error: "Card not found" });

    let newInterval = card.current_interval || 0;
    let newLevel = card.repetition_level || 0;

    if (difficulty === 0) { // Errei
      // 1 min (today) then 1 day
      if (card.last_difficulty === 0) {
        newInterval = 1;
      } else {
        newInterval = 0; // Immediate
      }
      newLevel = 0;
    } else if (difficulty === 1) { // Difícil
      newInterval = 2;
      // Level stays or resets? User says "2 in 2 days until category changes"
    } else if (difficulty === 2) { // Bom
      const intervals = [1, 5, 8, 15, 30, 90];
      newInterval = intervals[newLevel] || 90;
      newLevel++;
    } else if (difficulty === 3) { // Fácil
      if (card.current_interval === 0) {
        newInterval = 4;
      } else {
        newInterval = 30; // 1x per month
      }
      newLevel = 0; // Reset level for Easy? Or keep? Usually Easy jumps ahead.
    }

    const nextReview = new Date();
    if (newInterval > 0) {
      nextReview.setDate(nextReview.getDate() + newInterval);
    } else {
      // If 0, it's for "today" but maybe later in the session. 
      // For simplicity, set to 1 minute from now
      nextReview.setMinutes(nextReview.getMinutes() + 1);
    }

    db.prepare("UPDATE flashcards SET next_review = ?, last_difficulty = ?, current_interval = ?, repetition_level = ? WHERE id = ?")
      .run(nextReview.toISOString(), difficulty, newInterval, newLevel, req.params.id);

    // Log the study
    db.prepare(`
      INSERT INTO study_log (activity_type, duration_minutes, topic_id)
      VALUES (?, ?, ?)
    `).run('Flashcard', duration_minutes || 0, card.topic_id);

    res.json({ success: true, nextInterval: newInterval });
  });

  app.get("/api/errors", (req, res) => {
    const errors = db.prepare("SELECT e.*, t.title as topic_title FROM error_notebook e JOIN topics t ON e.topic_id = t.id ORDER BY created_at DESC").all();
    res.json(errors);
  });

  app.delete("/api/errors/:id", (req, res) => {
    db.prepare("DELETE FROM error_notebook WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/errors", (req, res) => {
    const { topic_id, content, tags } = req.body;
    db.prepare("INSERT INTO error_notebook (topic_id, content, tags) VALUES (?, ?, ?)").run(topic_id, content, tags);
    res.json({ success: true });
  });

  app.post("/api/quizzes/generate", (req, res) => {
    const { topic_title } = req.body;
    if (!topic_title) {
      return res.status(400).json({ error: "Topic title is required" });
    }

    console.log(`Generating quiz for: ${topic_title}`);

    // Execute the python script
    // We use the same 'uv' environment
    const pythonPath = "/Users/Joao/.local/bin/uv";
    const scriptPath = path.join(__dirname, "scripts", "generate_quiz.py");

    exec(`${pythonPath} tool run --from notebooklm-mcp-server python3 "${scriptPath}" "${topic_title}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exec error: ${error}`);
        return res.status(500).json({ error: "Failed to execute quiz generation script" });
      }

      try {
        // Find the JSON line in output (the script prints progress then JSON)
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const result = JSON.parse(lastLine);

        if (result.status === "success") {
          res.json(result);
        } else {
          res.status(500).json({ error: result.message || "Quiz generation failed" });
        }
      } catch (parseError) {
        console.error(`Parse error: ${parseError}. Output was: ${stdout}`);
        res.status(500).json({ error: "Failed to parse quiz generation result" });
      }
    });
  });

  app.post("/api/study-log", (req, res) => {
    const { duration_minutes, activity_type = 'Stopwatch' } = req.body;

    if (!duration_minutes || duration_minutes <= 0) {
      return res.status(400).json({ error: "Duração inválida" });
    }

    try {
      db.prepare(`
        INSERT INTO study_log (activity_type, duration_minutes, date)
        VALUES (?, ?, date('now'))
      `).run(activity_type, duration_minutes);

      res.json({ success: true });
    } catch (error) {
      console.error("Error saving study log:", error);
      res.status(500).json({ error: "Falha ao salvar log de estudo" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
