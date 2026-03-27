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
// Increased limit for JSON and URL-encoded bodies to handle large payloads if needed
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- MULTER CONFIG (Memory Storage for Supabase) ---
const storage = multer.memoryStorage();
// Increased limit for multer to handle video files (e.g., 50MB)
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } 
});

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
app.post('/api/media', checkAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const fileExt = path.extname(file.originalname);
        const fileName = `${Date.now()}${fileExt}`;
        const filePath = `public/${fileName}`; 

        // Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('images') 
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (storageError) {
            return res.status(500).json({ error: 'Storage Error', details: storageError.message });
        }

        // Get Public URL
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
        const src = urlData.publicUrl;

        // Save to Database
        const newItem = { src, category: req.body.category, title: req.body.title };

        const { data: dbData, error: dbError } = await supabase
            .from('media')
            .insert(newItem)
            .select()
            .single();

        if (dbError) {
            return res.status(500).json({ error: 'Database Error', details: dbError.message });
        }

        res.status(201).json(dbData);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT (Update) media
app.put('/api/media/:id', checkAuth, upload.single('image'), async (req, res) => {
    const id = req.params.id;
    const updateData = {
        title: req.body.title,
        category: req.body.category
    };

    try {
        if (req.file) {
            const file = req.file;
            const fileExt = path.extname(file.originalname);
            const fileName = `${Date.now()}${fileExt}`;
            const filePath = `public/${fileName}`;

            const { error: storageError } = await supabase.storage
                .from('images')
                .upload(filePath, file.buffer, { contentType: file.mimetype });

            if (storageError) {
                return res.status(500).json({ error: 'Failed to update image' });
            }

            const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
            updateData.src = urlData.publicUrl;
        }

        const { data, error } = await supabase
            .from('media')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data[0]);

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE media
app.delete('/api/media/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    
    const { data: item } = await supabase
        .from('media')
        .select('src')
        .eq('id', id)
        .single();

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

    const { error } = await supabase.from('media').delete().eq('id', id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted' });
});

// 3. VIDEO ROUTES (NEW)

// GET featured video
app.get('/api/video', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('featured_video')
            .select('*')
            .eq('id', 1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        res.json(data || null);
    } catch (err) {
        res.status(500).json({ error: 'Kunde inte hämta video' });
    }
});

// POST (Upload/Update) featured video
app.post('/api/video', checkAuth, upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Ingen fil vald.' });
    }

    try {
        const file = req.file;
        const title = req.body.title || '';
        const fileExt = path.extname(file.originalname);
        // Store in 'videos' folder inside 'images' bucket
        const fileName = `videos/featured_${Date.now()}${fileExt}`;

        // 1. Upload to 'images' bucket
        const { data: storageData, error: storageError } = await supabase.storage
            .from('images')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (storageError) {
            console.error("Upload Error:", storageError);
            return res.status(500).json({ error: storageError.message });
        }

        // 2. Get Public URL
        const { data: urlData } = supabase.storage
            .from('images')
            .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        // 3. Delete old video file if it exists (to save space)
        const { data: oldData } = await supabase.from('featured_video').select('src').eq('id', 1).single();
        if (oldData && oldData.src) {
            try {
                // Extract path relative to bucket: "videos/filename.mp4"
                const oldPath = oldData.src.split('/images/')[1];
                if (oldPath) {
                    await supabase.storage.from('images').remove([oldPath]);
                }
            } catch (e) {
                console.log("Could not delete old video file", e);
            }
        }

        // 4. Upsert DB (Update id=1 or Insert)
        const { error: dbError } = await supabase
            .from('featured_video')
            .upsert(
                { id: 1, title: title, src: publicUrl },
                { onConflict: 'id' }
            );

        if (dbError) throw dbError;

        res.json({ success: true, video: { title, src: publicUrl } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE featured video
app.delete('/api/video', checkAuth, async (req, res) => {
    try {
        const { data: current } = await supabase
            .from('featured_video')
            .select('src')
            .eq('id', 1)
            .single();

        if (current && current.src) {
            const oldPath = current.src.split('/images/')[1];
            if (oldPath) {
                await supabase.storage.from('images').remove([oldPath]);
            }
        }

        await supabase.from('featured_video').delete().eq('id', 1);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Kunde inte radera video' });
    }
});


// 4. CONTACT FORM
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    console.log(`New Contact Form Submission: Name: ${name}, Email: ${email}`);
    res.status(200).json({ message: 'Message received' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});