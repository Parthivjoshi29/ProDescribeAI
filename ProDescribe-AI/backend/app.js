const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs').promises;
const OpenAI = require('openai');
require('dotenv').config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads/'))
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// Auth middleware
const authMiddleware = (req, res, next) => {
    // For GET requests to dashboard, just serve the page
    // The client-side auth will handle redirecting if not logged in
    if (req.method === 'GET' && req.path === '/dashboard') {
        return next();
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'No authorization header' });
    }
    try {
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

// Initialize OpenAI client for Llama
const openai = new OpenAI({
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVAPI_KEY || 'UES_YOUR_API_KEY',
    dangerouslyAllowBrowser: true
});

// Add these routes if they don't exist
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/signup.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/dashboard', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.post('/api/upload', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        // Read and convert image to base64
        const imageBuffer = await fs.readFile(req.file.path);
        const imageB64 = imageBuffer.toString('base64');

        // 1. Image Analysis with Gemma
        const gemmaResponse = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
            model: 'google/gemma-3-27b-it',
            messages: [{
                role: 'user',
                content: `Analyze this product image in detail: <img src="data:${req.file.mimetype};base64,${imageB64}" />`
            }],
            max_tokens: 512,
            temperature: 0.20,
            top_p: 0.70,
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.NVAPI_KEY}`,
                'Accept': 'application/json'
            }
        });

        // 2. Generate description with Llama
        const llamaResponse = await openai.chat.completions.create({
            model: 'nvidia/llama-3.3-nemotron-super-49b-v1',
            messages: [
                {
                    role: 'system',
                    content: 'Generate a professional product description based on this analysis'
                },
                {
                    role: 'user',
                    content: gemmaResponse.data.choices[0].message.content
                }
            ],
            temperature: 0.6,
            top_p: 0.95,
            max_tokens: 4096
        });

        // Combine results
        const result = {
            title: 'Product Analysis',
            description: llamaResponse.choices[0].message.content,
            keywords: req.body.keywords || ''
        };

        res.json(result);

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to process image' });
    } finally {
        // Clean up uploaded file
        if (req.file) {
            await fs.unlink(req.file.path).catch(console.error);
        }
    }
});

// Add this at the end of the file if it doesn't exist
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
