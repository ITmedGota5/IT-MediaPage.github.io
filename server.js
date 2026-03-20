const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

// --- SUPABASE SETUP ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- AUTH CONFIGURATION ---
const ADMIN_PASSWORD = 'admin123';
const validTokens = new Set();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- MULTER CONFIG (Memory Storage for Supabase) ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- AUTH ROUTES ---
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = Math.random().toString(36).substring(2);
        validTokens.add(token);
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Fel lösenord' });
    }
});

const checkAuth = (req, res, next) => {
    const token = req.headers['x-auth-token'];
    if (token && validTokens.has(token)) {
        next();
    } else {
        res.status(403).json({ error: 'Not authorized' });
    }
};

// --- API ROUTES ---

// 1. PROJECTS
app.get('/api/projects', async (req, res) => {
    const { data, error } = await supabase.from('projects').select('*').order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/projects', checkAuth, async (req, res) => {
    const { data, error } = await supabase.from('projects').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

app.put('/api/projects/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    const { data, error } = await supabase.from('projects').update(req.body).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

app.delete('/api/projects/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted' });
});

// 2. MEDIA

// GET all media
app.get('/api/media', async (req, res) => {
    const { data, error } = await supabase.from('media').select('*').order('id', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST new media (Upload Image + Data)
// POST new media (Upload Image + Data)
app.post('/api/media', checkAuth, upload.single('image'), async (req, res) => {
    try {
        console.log("--- Starting Media Upload ---");
        
        if (!req.file) {
            console.log("Error: No file in request");
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const fileExt = path.extname(file.originalname);
        const fileName = `${Date.now()}${fileExt}`;
        const filePath = `public/${fileName}`; 

        console.log(`Target Bucket: images`);
        console.log(`Target Path: ${filePath}`);

        // 1. Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('images') 
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (storageError) {
            console.error("!!! SUPABASE STORAGE ERROR:", storageError);
            return res.status(500).json({ error: 'Storage Error', details: storageError.message });
        }

        console.log("Storage Upload Successful");

        // 2. Get Public URL
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
        const src = urlData.publicUrl;

        // 3. Save to Database
        const newItem = { src, category: req.body.category, title: req.body.title };

        const { data: dbData, error: dbError } = await supabase
            .from('media')
            .insert(newItem)
            .select()
            .single();

        if (dbError) {
            console.error("!!! SUPABASE DATABASE ERROR:", dbError);
            return res.status(500).json({ error: 'Database Error', details: dbError.message });
        }

        console.log("Database Save Successful:", dbData);
        res.status(201).json(dbData);

    } catch (err) {
        console.error("!!! SERVER CRASH:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT (Update) media - FIXED TO HANDLE FILE UPLOADS
app.put('/api/media/:id', checkAuth, upload.single('image'), async (req, res) => {
    const id = req.params.id;
    const updateData = {
        title: req.body.title,
        category: req.body.category
    };

    try {
        // If a new file is uploaded, process it
        if (req.file) {
            const file = req.file;
            const fileExt = path.extname(file.originalname);
            const fileName = `${Date.now()}${fileExt}`;
            const filePath = `public/${fileName}`;

            // Upload new image
            const { error: storageError } = await supabase.storage
                .from('images')
                .upload(filePath, file.buffer, { contentType: file.mimetype });

            if (storageError) {
                return res.status(500).json({ error: 'Failed to update image' });
            }

            // Get new URL
            const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
            updateData.src = urlData.publicUrl;
            
            // Optional: Here you could add logic to delete the OLD image from storage to save space
        }

        const { data, error } = await supabase
            .from('media')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE media
app.delete('/api/media/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    
    // 1. Get the item to find the image URL
    const { data: item } = await supabase
        .from('media')
        .select('src')
        .eq('id', id)
        .single();

    // 2. Delete from Storage
    if (item && item.src) {
        try {
            const urlParts = item.src.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const folder = urlParts[urlParts.length - 2]; 
            const pathInBucket = `${folder}/${fileName}`;
            await supabase.storage.from('images').remove([pathInBucket]);
        } catch (err) {
            console.log("Error deleting storage file, continuing DB delete");
        }
    }

    // 3. Delete from Database
    const { error } = await supabase.from('media').delete().eq('id', id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted' });
});

// 3. CONTACT FORM
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    console.log(`New Contact Form Submission: Name: ${name}, Email: ${email}`);
    res.status(200).json({ message: 'Message received' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});