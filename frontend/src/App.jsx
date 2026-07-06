import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { Presentation, UploadCloud, Copy, Check, LogOut, Loader2, Play, Trash2, Share2, QrCode, X, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import PresentationViewer from './components/PresentationViewer';
import Auth from './pages/Auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { motion } from 'framer-motion';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  return children;
};

function Dashboard() {
  const { user, session } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareLink, setShareLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [presentations, setPresentations] = useState([]);
  const [loadingPresentations, setLoadingPresentations] = useState(true);
  const [activeQR, setActiveQR] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPresentations();
  }, []);

  const fetchPresentations = async () => {
    try {
      const response = await fetch('/api/presentations', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPresentations(data);
      }
    } catch (err) {
      console.error('Failed to fetch presentations', err);
    } finally {
      setLoadingPresentations(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this presentation?')) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/presentations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (res.ok) {
        fetchPresentations();
      } else {
        alert('Failed to delete presentation.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleShare = (id, e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/view/${id}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setShareLink(null);

    const formData = new FormData();
    formData.append('presentation', file);

    try {
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token}`);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete < 95 ? percentComplete : 95);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.error || 'Upload failed'));
            } catch (e) {
              reject(new Error('Upload failed'));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });
      
      setUploadProgress(100);
      
      if (data.id) {
        const link = `${window.location.origin}/view/${data.id}`;
        setShareLink(link);
        fetchPresentations();
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const filteredPresentations = presentations.filter(p => 
    p.manifest?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center relative overflow-hidden font-sans">
      {/* Ambient Midnight Aurora Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/15 rounded-full blur-[140px] opacity-70 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-secondary/10 rounded-full blur-[160px] opacity-70 pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px] opacity-50 pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-6xl flex items-center justify-between py-6 mb-8 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl border border-primary/30 glow-border">
            <Presentation className="text-primary w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white glow-text font-heading">
            Nexus Viewer
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search presentations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface/80 backdrop-blur border border-border rounded-full text-sm text-white focus:outline-none focus:border-primary/50 w-64 transition-all focus:w-80 shadow-inner"
            />
          </div>
          <div className="flex items-center gap-4 border-l border-border pl-6">
            <div className="text-sm font-medium text-gray-400 hidden sm:block">
              {user?.email}
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 bg-surface hover:bg-surface-hover border border-border rounded-xl text-gray-400 hover:text-red-400 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl flex flex-col gap-12 relative z-10">
        
        {/* Full-width Upload Hero (Dropzone) */}
        <section className="w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div className="flex-1 text-left">
              <h2 className="text-3xl font-bold text-white font-heading mb-3">Host your next big idea.</h2>
              <p className="text-gray-400 max-w-md text-lg">Upload PowerPoint presentations and instantly turn them into ultra-fast, cross-platform interactive media players.</p>
            </div>

            <div className="flex-1 w-full max-w-md">
              <div 
                onClick={!isUploading ? handleUploadClick : undefined}
                className={`w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all bg-black/20 ${!isUploading ? 'border-primary/30 cursor-pointer hover:bg-primary/5 hover:border-primary/50' : 'border-border opacity-80'}`}
              >
                <input 
                  type="file" 
                  accept=".pptx" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                />
                
                <div className={`w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ${!isUploading && 'glow-border'} transition-all`}>
                  {isUploading ? (
                    <div className="relative flex items-center justify-center w-full h-full">
                      <Loader2 className="w-8 h-8 text-primary animate-spin opacity-20" />
                      <span className="absolute text-primary font-bold text-xs">{uploadProgress}%</span>
                    </div>
                  ) : (
                    <UploadCloud className="w-8 h-8 text-primary" />
                  )}
                </div>
                
                <h3 className="font-semibold text-white mb-1">
                  {isUploading ? (uploadProgress < 95 ? 'Uploading...' : 'Processing...') : 'Click to Upload (.pptx)'}
                </h3>
                
                {isUploading && (
                  <div className="w-full h-1.5 bg-black/50 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Share Link Banner */}
          {shareLink && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="w-full mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-between backdrop-blur-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-400">Upload complete!</p>
                  <p className="text-sm text-green-200/70">Your presentation is now live.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  readOnly 
                  value={shareLink} 
                  className="bg-black/50 border border-green-500/30 px-4 py-2 rounded-xl text-sm text-green-100 outline-none w-64"
                />
                <button onClick={copyToClipboard} className="p-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl transition-colors">
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-green-400" />}
                </button>
                <button onClick={() => window.open(shareLink, '_blank')} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-black rounded-xl font-bold text-sm transition-colors">
                  View Now
                </button>
              </div>
            </motion.div>
          )}
        </section>

        {/* Presentations Grid */}
        <section className="w-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white font-heading">Your Library</h3>
            <span className="text-sm font-medium text-primary px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              {filteredPresentations.length} Items
            </span>
          </div>
          
          {loadingPresentations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(n => (
                <div key={n} className="glass rounded-2xl h-64 animate-pulse bg-white/5 border border-white/5" />
              ))}
            </div>
          ) : presentations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-3xl bg-surface/30 text-center glass">
              <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6">
                <Presentation className="w-10 h-10 text-gray-500" />
              </div>
              <h4 className="text-xl font-bold text-white font-heading mb-2">Library is empty</h4>
              <p className="text-gray-400 max-w-sm">
                Drop your first presentation above to start building your cloud library.
              </p>
            </div>
          ) : filteredPresentations.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No presentations match your search.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPresentations.map((p, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={p.id}
                  onClick={() => navigate(`/view/${p.id}`)}
                  className="p-3 glass rounded-2xl flex flex-col cursor-pointer hover:border-primary/50 transition-all group overflow-hidden relative shadow-lg"
                >
                  {/* Action Bar */}
                  <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onClick={(e) => { e.stopPropagation(); setActiveQR(p.id); }} className="p-2 bg-black/70 hover:bg-primary text-white rounded-xl backdrop-blur-md transition-colors shadow-lg" title="Show QR Code">
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => handleShare(p.id, e)} className="p-2 bg-black/70 hover:bg-secondary text-white hover:text-black rounded-xl backdrop-blur-md transition-colors shadow-lg" title="Copy Link">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => handleDelete(p.id, e)} disabled={deletingId === p.id} className="p-2 bg-black/70 hover:bg-red-500 text-white rounded-xl backdrop-blur-md transition-colors shadow-lg" title="Delete">
                      {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Thumbnail Image */}
                  <div className="w-full aspect-[16/9] bg-black rounded-xl overflow-hidden relative mb-4 border border-white/5">
                    {p.manifest?.slides?.[0]?.image ? (
                      <img src={p.manifest.slides[0].image} alt="thumbnail" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700">
                        <Presentation className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                      <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-black shadow-[0_0_20px_rgba(0,240,255,0.5)] transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-6 h-6 ml-1 fill-black" />
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="px-2 pb-2 relative z-10">
                    <h4 className="font-bold text-white truncate text-lg font-heading">{p.manifest?.title || 'Untitled'}</h4>
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-secondary glow-border"></span>
                      {p.manifest?.slides?.length || 0} Slides
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* QR Code Modal */}
      {activeQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setActiveQR(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card p-10 rounded-[2rem] flex flex-col items-center shadow-2xl relative max-w-sm w-full border border-primary/30"
          >
            <button onClick={() => setActiveQR(null)} className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors bg-surface/50 p-2 rounded-full">
              <X className="w-5 h-5" />
            </button>
            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/30 mb-6 glow-border">
              <QrCode className="text-primary w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white font-heading mb-6 glow-text">Scan to View</h3>
            <div className="p-5 bg-white rounded-2xl mb-8 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              <QRCodeSVG value={`${window.location.origin}/view/${activeQR}`} size={220} level="H" />
            </div>
            <p className="text-sm text-gray-300 text-center leading-relaxed">
              Scan this QR code with your mobile device to open the presentation instantly.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ViewerWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <PresentationViewer presentationId={id} onExit={() => navigate('/')} />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/view/:id" element={<ViewerWrapper />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
