require('dotenv').config(); // Load .env variables
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

// --- CONFIGURATION ---
// Initialize Supabase Client (use Service Role for backend admin tasks)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- AUTH CONFIGURATION (Kept your existing simple auth) ---
const ADMIN_PASSWORD = 'admin123'; 
const validTokens = new Set();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer Setup (Store files in memory temporarily before sending to Supabase)
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
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('id', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/projects', checkAuth, async (req, res) => {
    const { data, error } = await supabase
        .from('projects')
        .insert([req.body])
        .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

app.put('/api/projects/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    const { data, error } = await supabase
        .from('projects')
        .update(req.body)
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

app.delete('/api/projects/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted' });
});


// 2. MEDIA (Gallery)
app.get('/api/media', async (req, res) => {
    const { data, error } = await supabase
        .from('media')
        .select('*')
        .order('id', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Upload Image (Upload to Supabase Storage, then save URL to DB)
app.post('/api/media', checkAuth, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`; // Unique filename
    const filePath = `public/${fileName}`; // Folder inside bucket

    // 1. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images') // Bucket name
        .upload(filePath, file.buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.mimetype
        });

    if (uploadError) {
        console.error(uploadError);
        return res.status(500).json({ error: uploadError.message });
    }

    // 2. Get Public URL
    const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // 3. Save metadata to Database
    const newItem = {
        category: req.body.category,
        title: req.body.title,
        src: publicUrl
    };

    const { data: dbData, error: dbError } = await supabase
        .from('media')
        .insert([newItem])
        .select();

    if (dbError) return res.status(500).json({ error: dbError.message });
    res.status(201).json(dbData[0]);
});

app.put('/api/media/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    // Note: This logic only updates text. To change image, you'd need to delete old and upload new.
    const { data, error } = await supabase
        .from('media')
        .update({ title: req.body.title, category: req.body.category })
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

app.delete('/api/media/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    
    // 1. Get the item to find the image URL
    const { data: item } = await supabase
        .from('media')
        .select('src')
        .eq('id', id)
        .single();

    // 2. Delete from Storage (Extract path from URL)
    if (item && item.src) {
        try {
            const urlParts = item.src.split('/');
            const fileName = urlParts[urlParts.length - 1]; // get filename
            const folder = urlParts[urlParts.length - 2]; // get 'public'
            
            // Construct the path relative to bucket: 'public/filename.jpg'
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