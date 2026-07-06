const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { XMLParser } = require('fast-xml-parser');

const app = express();
app.use(cors());
app.use(express.json());

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const DB_FILE = path.join(__dirname, 'database.json');
let presentations = {};
if (fs.existsSync(DB_FILE)) {
  presentations = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

const saveDb = () => {
  fs.writeFileSync(DB_FILE, JSON.stringify(presentations, null, 2));
};

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// API: Upload Presentation (.pptx or .zip)
app.post('/api/upload', upload.single('presentation'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const originalFile = req.file.path;
    const presentationId = uuidv4();
    const baseDir = path.join(UPLOADS_DIR, presentationId);
    const rawDir = path.join(baseDir, 'raw');
    const slidesDir = path.join(baseDir, 'slides');
    
    fs.mkdirSync(baseDir);
    fs.mkdirSync(rawDir);
    fs.mkdirSync(slidesDir);

    // 1. Extract zip/pptx to rawDir to get the media
    const zip = new AdmZip(originalFile);
    zip.extractAllTo(rawDir, true);

    // 2. Convert PPTX to high-fidelity JPG slides using OS-specific script
    let command = '';
    if (process.platform === 'win32') {
      const scriptPath = path.join(__dirname, 'convert.ps1');
      command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -PptxPath "${originalFile}" -OutputDir "${slidesDir}"`;
    } else {
      const scriptPath = path.join(__dirname, 'convert.sh');
      command = `bash "${scriptPath}" "${originalFile}" "${slidesDir}"`;
    }
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('PowerShell Error:', error, stderr);
        return res.status(500).json({ error: 'Failed to convert presentation' });
      }

      // 3. Map videos to slides
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
      let slides = [];

      // PowerPoint saves images as Slide1.JPG, Slide2.JPG...
      // but sometimes different locales use different prefixes. Let's just grab all images and sort them.
      let exportedImages = fs.readdirSync(slidesDir).filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png'));
      
      // Extract the slide number from filename (e.g. Slide12.JPG -> 12)
      exportedImages.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      exportedImages.forEach((img, index) => {
        const slideNum = index + 1;
        let slideData = {
          id: `s${slideNum}`,
          type: 'slide',
          image: `/api/media/${presentationId}/slides/${img}`,
          video: null
        };

        // Check if there is an associated XML relationships file to find videos
        const relPath = path.join(rawDir, 'ppt', 'slides', '_rels', `slide${slideNum}.xml.rels`);
        if (fs.existsSync(relPath)) {
          const xmlData = fs.readFileSync(relPath, 'utf8');
          try {
            const parsed = parser.parse(xmlData);
            let relationships = parsed.Relationships.Relationship;
            if (!Array.isArray(relationships)) relationships = [relationships];
            
            // Find video relationship
            const videoRel = relationships.find(r => r["@_Type"].includes('/video'));
            if (videoRel && videoRel["@_Target"]) {
              // Target is usually "../media/media1.mp4"
              const targetPath = videoRel["@_Target"].replace('../media/', '');
              slideData.video = `/api/media/${presentationId}/raw/ppt/media/${targetPath}`;
            }
          } catch (e) {
            console.error(`Error parsing XML for slide ${slideNum}`, e);
          }
        }
        
        slides.push(slideData);
      });

      const newPresentation = {
        id: presentationId,
        title: req.file.originalname.replace(path.extname(req.file.originalname), '') || 'Untitled Presentation',
        slides
      };

      presentations[presentationId] = newPresentation;
      saveDb();

      res.json({ id: presentationId, message: 'Upload & Conversion successful' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process presentation' });
  }
});

// API: Get presentation manifest
app.get('/api/presentation/:id', (req, res) => {
  const { id } = req.params;
  const presentation = presentations[id];
  if (!presentation) return res.status(404).json({ error: 'Presentation not found' });
  res.json(presentation);
});

// API: Serve all static files (handles images and HTTP 206 video streaming)
app.use('/api/media', express.static(UPLOADS_DIR, {
  acceptRanges: true, // This enables 206 Partial Content for videos!
}));

// Serve React Frontend
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// Handle React Router fallback
app.use((req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
