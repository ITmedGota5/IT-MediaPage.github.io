const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

// --- AUTH CONFIGURATION ---
const ADMIN_PASSWORD = 'admin123'; // Change this password!
const validTokens = new Set(); // Store active tokens in memory

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure necessary folders exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Helper functions for JSON database
const getData = (filename) => {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
};

const saveData = (filename, data) => {
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// --- CONFIGURATION FOR IMAGE UPLOADS (MUST BE DEFINED BEFORE ROUTES) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// --- AUTH ROUTES ---

// Login Route
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = Math.random().toString(36).substring(2); // Simple random token
        validTokens.add(token);
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Fel lösenord' });
    }
});

// Auth Middleware (Checks if user has a valid token)
const checkAuth = (req, res, next) => {
    const token = req.headers['x-auth-token'];
    if (token && validTokens.has(token)) {
        next(); // Allowed
    } else {
        res.status(403).json({ error: 'Not authorized' });
    }
};


// --- API ROUTES ---

// 1. PROJECTS
// GET all projects
app.get('/api/projects', (req, res) => {
    const projects = getData('projects.json');
    res.json(projects);
});

// POST new project (Protected)
app.post('/api/projects', checkAuth, (req, res) => {
    const projects = getData('projects.json');
    const newProject = { id: Date.now(), ...req.body };
    projects.push(newProject);
    saveData('projects.json', projects);
    res.status(201).json(newProject);
});

// PUT (Update) project (Protected)
app.put('/api/projects/:id', checkAuth, (req, res) => {
    const id = parseInt(req.params.id);
    let projects = getData('projects.json');
    const index = projects.findIndex(item => item.id === id);
    
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    projects[index] = { ...projects[index], ...req.body };
    
    saveData('projects.json', projects);
    res.json(projects[index]);
});

// DELETE project (Protected)
app.delete('/api/projects/:id', checkAuth, (req, res) => {
    const id = parseInt(req.params.id);
    let projects = getData('projects.json');
    const project = projects.find(p => p.id === id);
    
    if (project) {
        projects = projects.filter(p => p.id !== id);
        saveData('projects.json', projects);
        res.json({ message: 'Deleted' });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});


// 2. MEDIA (Gallery)
// GET all media items
app.get('/api/media', (req, res) => {
    const media = getData('media.json');
    res.json(media);
});

// POST new media (Upload Image + Data) (Protected)
app.post('/api/media', checkAuth, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const media = getData('media.json');
    const newItem = {
        id: Date.now(),
        src: `/uploads/${req.file.filename}`,
        category: req.body.category,
        title: req.body.title
    };
    
    media.push(newItem);
    saveData('media.json', media);
    res.status(201).json(newItem);
});

// PUT (Update) media item (Protected)
app.put('/api/media/:id', checkAuth, (req, res) => {
    const id = parseInt(req.params.id);
    let media = getData('media.json');
    const index = media.findIndex(item => item.id === id);
    
    if (index === -1) return res.status(404).json({ error: 'Not found' });

    media[index] = { 
        ...media[index], 
        category: req.body.category, 
        title: req.body.title 
    };
    
    saveData('media.json', media);
    res.json(media[index]);
});

// DELETE media item (Protected)
app.delete('/api/media/:id', checkAuth, (req, res) => {
    const id = parseInt(req.params.id);
    let media = getData('media.json');
    const item = media.find(m => m.id === id);
    
    if (item) {
        const filePath = path.join(uploadsDir, path.basename(item.src));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        media = media.filter(m => m.id !== id);
        saveData('media.json', media);
        res.json({ message: 'Deleted' });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});


// 3. CONTACT FORM
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    console.log(`New Contact Form Submission: Name: ${name}, Email: ${email}, Message: ${message}`);
    res.status(200).json({ message: 'Message received' });
});


// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    
    // Initialize default data files if they don't exist
    if (!fs.existsSync(path.join(dataDir, 'projects.json'))) {
        const defaultProjects = [
            { id: 1, status: 'Pågående', title: 'Ny Webbkarta', description: 'Vi bygger en helt ny interaktiv karta för kommunen.', date: 'Start: Januari 2024', details: 'Detta projekt innefattar migrering från gamla GIS-system.', progress: 40 },
            { id: 2, status: 'Pågående', title: 'Fiberutbyggnad Etapp 3', description: 'Utbyggnad av fibernätet till landsbygden.', date: 'Start: November 2023', details: 'Arbetet omfattar cirka 15 km grävning.', progress: 65 },
            { id: 3, status: 'Avslutat', title: 'Upphandling Skol-IT', description: 'Nytt avtal för leverans av datorer och surfplattor.', date: 'Avslutat: December 2023', details: 'Totalt levererades 1200 enheter.', progress: 100 },
            { id: 4, status: 'Pågående', title: 'Medborgarplattform', description: 'Utveckling av en ny plattform för digital dialog.', date: 'Start: Mars 2024', details: 'Plattformen kommer erbjuda e-tjänster.', progress: 20 },
            { id: 5, status: 'Planerat', title: 'Säkerhetsuppdatering Intranät', description: 'Kommande uppgradering av det interna nätverket.', date: 'Start: September 2024', details: 'Planerat underhåll.', progress: 0 }
        ];
        saveData('projects.json', defaultProjects);
    }
    if (!fs.existsSync(path.join(dataDir, 'media.json'))) {
        saveData('media.json', []);
    }
});