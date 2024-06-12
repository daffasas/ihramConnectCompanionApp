const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authenticateToken, authorizeRole } = require("../authentication/auth.middleware");
const voiceService = require("./voice.service");
const CreateVoiceDTO = require("./dto/create-voice.dto");

const app = express();

// Middleware untuk parsing body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/// Buat direktori uploads jika belum ada
// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi multer untuk penyimpanan file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const { title } = req.body;
        if (!title) {
            return cb(new Error('Title is required'), false);
        }
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        cb(null, sanitizedTitle + path.extname(file.originalname));
    }
});

// Fungsi untuk memeriksa apakah file adalah audio
const audioFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('File is not an audio!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: audioFileFilter
});

// Voice Note Controller
const createVoice = async (req, res) => {
    try {
        const { title } = req.body;
        if (!title || !req.file) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const filePath = req.file.path;
        const createVoiceDTO = CreateVoiceDTO.fromRequest(req.body, filePath);
        createVoiceDTO.validate();

        const voice = await voiceService.createVoice({
            title: createVoiceDTO.title,
            filePath: createVoiceDTO.filePath
        });

        res.status(201).json(voice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



const getAllVoices = async (req, res) => {
    try {
        const Voices = await voiceService.getAllVoices();
        res.json(Voices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getVoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const Voice = await voiceService.getVoiceById(id);

        if (!Voice) {
            return res.status(404).json({ message: 'Voice note not found' });
        }

        res.status(200).json(Voice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateVoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const filePath = req.file ? req.file.path : undefined;
        const Voice = await voiceService.updateVoice(id, { title, filePath });

        if (!Voice) {
            return res.status(404).json({ message: 'Voice note not found' });
        }

        res.status(200).json({
            message: 'Voice updated successfully',
            data: Voice
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteVoice = async (req, res) => {
    try {
        const { id } = req.params;
        const Voice = await voiceService.deleteVoice(id);

        if (!Voice) {
            return res.status(404).json({ error: 'Voice note not found' });
        }

        res.status(200).json({
            message: 'Voice deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Route definitions
app.post('/', upload.single('voiceNote'), authenticateToken, authorizeRole(1), createVoice);
app.get('/', authenticateToken, getAllVoices);
app.get('/:id', authenticateToken, getVoiceById);
app.put('/:id', upload.single('voiceNote'), authenticateToken, authorizeRole(1), updateVoice);
app.delete('/:id', authenticateToken, authorizeRole(1), deleteVoice);

module.exports = app;
