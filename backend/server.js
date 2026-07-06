require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { XMLParser } = require('fast-xml-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Only initialize if keys are present (to prevent crashing immediately if user hasn't set them yet)
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Middleware to verify Supabase JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) return res.status(403).json({ error: 'Forbidden: Invalid token' });
  
  req.user = user;
  next();
};

// Helper function to upload file to Supabase Storage
const uploadToSupabase = async (filePath, destinationPath, contentType) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const fileBuffer = fs.readFileSync(filePath);
  
  const { data, error } = await supabase.storage
    .from('media') // User needs to create a bucket named 'media'
    .upload(destinationPath, fileBuffer, {
      contentType: contentType,
      upsert: true
    });

  if (error) throw error;
  
  const { data: publicUrlData } = supabase.storage
    .from('media')
    .getPublicUrl(destinationPath);
    
  return publicUrlData.publicUrl;
};

// Multer config for temporary local upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// API: Upload Presentation (.pptx or .zip)
app.post('/api/upload', authenticateToken, upload.single('presentation'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!supabase) return res.status(500).json({ error: 'Cloud storage is not configured. Please add Supabase keys to .env' });

    const originalFile = req.file.path;
    const presentationId = uuidv4();
    const baseDir = path.join(UPLOADS_DIR, presentationId);
    const rawDir = path.join(baseDir, 'raw');
    const slidesDir = path.join(baseDir, 'slides');
    
    fs.mkdirSync(baseDir);
    fs.mkdirSync(rawDir);
    fs.mkdirSync(slidesDir);

    // 1. Extract archive to rawDir to get the media using OS-level commands (Memory Efficient)
    let unzipCommand = '';
    if (process.platform === 'win32') {
      unzipCommand = `powershell -command "Expand-Archive -Force -Path '${originalFile}' -DestinationPath '${rawDir}'"`;
    } else {
      unzipCommand = `unzip -o "${originalFile}" -d "${rawDir}"`;
    }
    await execPromise(unzipCommand);

    // 2. Convert PPTX to high-fidelity JPG slides using OS-specific script
    let command = '';
    if (process.platform === 'win32') {
      const scriptPath = path.join(__dirname, 'convert.ps1');
      command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -PptxPath "${originalFile}" -OutputDir "${slidesDir}"`;
    } else {
      const scriptPath = path.join(__dirname, 'convert.sh');
      command = `bash "${scriptPath}" "${originalFile}" "${slidesDir}"`;
    }
    
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error('Conversion Error:', error, stderr);
        return res.status(500).json({ error: 'Failed to convert presentation' });
      }

      try {
        // 3. Map videos to slides and upload EVERYTHING to Supabase
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        let slides = [];

        let exportedImages = fs.readdirSync(slidesDir).filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png'));
        
        // Extract the slide number from filename (e.g. Slide12.JPG -> 12)
        exportedImages.sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.replace(/\D/g, '')) || 0;
          return numA - numB;
        });

        for (let i = 0; i < exportedImages.length; i++) {
          const img = exportedImages[i];
          const slideNum = i + 1;
          
          // Upload Slide Image to Supabase
          const localImgPath = path.join(slidesDir, img);
          const cloudImgUrl = await uploadToSupabase(localImgPath, `${presentationId}/slides/${img}`, 'image/jpeg');

          let slideData = {
            id: `s${slideNum}`,
            type: 'slide',
            image: cloudImgUrl,
            video: null
          };

          // Check for video relationship
          const relPath = path.join(rawDir, 'ppt', 'slides', '_rels', `slide${slideNum}.xml.rels`);
          if (fs.existsSync(relPath)) {
            const xmlData = fs.readFileSync(relPath, 'utf8');
            try {
              const parsed = parser.parse(xmlData);
              let relationships = parsed.Relationships.Relationship;
              if (!Array.isArray(relationships)) relationships = [relationships];
              
              const videoRel = relationships.find(r => r["@_Type"].includes('/video'));
              if (videoRel && videoRel["@_Target"]) {
                const targetPath = videoRel["@_Target"].replace('../media/', '');
                const localVideoPath = path.join(rawDir, 'ppt', 'media', targetPath);
                
                // Upload Video to Supabase
                const cloudVideoUrl = await uploadToSupabase(localVideoPath, `${presentationId}/videos/${targetPath}`, 'video/mp4');
                slideData.video = cloudVideoUrl;
              }
            } catch (e) {
              console.error(`Error parsing XML for slide ${slideNum}`, e);
            }
          }
          
          slides.push(slideData);
        }

        const newPresentation = {
          id: presentationId,
          title: req.file.originalname.replace(path.extname(req.file.originalname), '') || 'Untitled Presentation',
          slides
        };

        // 4. Save Manifest to Supabase Postgres Database (with user_id)
        const { error: dbError } = await supabase
          .from('presentations') // User needs to create this table with user_id column
          .insert([
            { id: presentationId, user_id: req.user.id, manifest: newPresentation }
          ]);

        if (dbError) throw dbError;

        // 5. Cleanup local temp files!
        fs.rmSync(baseDir, { recursive: true, force: true });
        fs.unlinkSync(originalFile);

        res.json({ id: presentationId, message: 'Upload, Conversion, and Cloud Sync successful' });

      } catch (cloudErr) {
        console.error('Cloud Sync Error:', cloudErr);
        res.status(500).json({ error: `Failed to sync with cloud storage: ${cloudErr.message || JSON.stringify(cloudErr)}` });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process presentation' });
  }
});

// API: Get user's presentations (Protected)
app.get('/api/presentations', authenticateToken, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Cloud storage is not configured.' });

  const { data, error } = await supabase
    .from('presentations')
    .select('id, manifest')
    .eq('user_id', req.user.id);

  if (error) {
    console.error('Error fetching presentations:', error);
    return res.status(500).json({ error: 'Failed to fetch presentations' });
  }

  res.json(data);
});

// API: Get presentation manifest from Cloud (Public, so anyone with link can view)
app.get('/api/presentation/:id', async (req, res) => {
  const { id } = req.params;
  if (!supabase) return res.status(500).json({ error: 'Cloud storage is not configured.' });

  const { data, error } = await supabase
    .from('presentations')
    .select('manifest')
    .eq('id', id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Presentation not found in cloud database' });
  }
  
  res.json(data.manifest);
});

// Serve React Frontend (We no longer need to serve static media because it's on Supabase!)
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// Handle React Router fallback
app.use((req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
