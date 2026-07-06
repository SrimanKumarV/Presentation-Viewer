import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { Presentation, UploadCloud, Copy, Check, LogOut, Loader2, Play, Trash2, Share2, QrCode, X } from 'lucide-react';
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
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
            // Cap at 95% because server still needs time to process/convert after upload finishes
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
        fetchPresentations(); // Refresh list after upload
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset input
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground p-8 flex flex-col items-center relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] opacity-70 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] opacity-70 pointer-events-none" />

      <header className="w-full max-w-5xl flex items-center justify-between py-6 mb-12 border-b border-border/50 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg border border-primary/50 shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)]">
            <Presentation className="text-primary w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Nexus Viewer
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400 hidden sm:block">
            {user?.email}
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Upload Section (Left Column) */}
        <section className="lg:col-span-1 flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface/60 backdrop-blur-md border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            <div 
              onClick={!isUploading ? handleUploadClick : undefined}
              className={`flex flex-col items-center justify-center text-center transition-all ${!isUploading ? 'cursor-pointer group' : 'opacity-80'}`}
            >
              <input 
                type="file" 
                accept=".pptx" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange}
              />
              
              <div className={`w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.1)] ${!isUploading && 'group-hover:scale-105 group-hover:bg-primary/20 group-hover:border-primary/50'} transition-all duration-300`}>
                {isUploading ? (
                  <div className="relative flex items-center justify-center w-full h-full">
                    <Loader2 className="w-10 h-10 text-primary animate-spin opacity-20" />
                    <span className="absolute text-primary font-bold text-sm">{uploadProgress}%</span>
                  </div>
                ) : (
                  <UploadCloud className="w-10 h-10 text-primary" />
                )}
              </div>
              
              <h2 className="text-xl font-semibold mb-2 text-white">
                {isUploading ? (uploadProgress < 95 ? 'Uploading...' : 'Processing...') : 'Upload Presentation'}
              </h2>
              
              {isUploading && (
                <div className="w-full max-w-[80%] h-1.5 bg-black/50 rounded-full mt-2 mb-4 overflow-hidden border border-border">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out relative"
                    style={{ width: `${uploadProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-400">
                {isUploading 
                  ? 'Extracting heavy assets. Please wait.' 
                  : 'Select a .pptx file. We will optimize it for global streaming.'}
              </p>

              {!isUploading && (
                <button className="mt-8 w-full py-3 bg-primary/20 hover:bg-primary/30 text-primary font-medium rounded-xl transition-all border border-primary/50 group-hover:shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)]">
                  Select File
                </button>
              )}
            </div>
          </motion.div>

          {/* Share Link Modal/Banner */}
          {shareLink && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full p-5 bg-green-500/10 border border-green-500/30 rounded-2xl backdrop-blur-md"
            >
              <p className="text-sm font-semibold text-green-400 mb-3">Upload complete! Share this link:</p>
              <div className="flex items-center gap-2 mb-3">
                <input 
                  type="text" 
                  readOnly 
                  value={shareLink} 
                  className="flex-1 bg-black/50 border border-green-500/30 p-2.5 rounded-lg text-sm text-green-100 outline-none"
                />
                <button 
                  onClick={copyToClipboard}
                  className="p-2.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-green-400" />}
                </button>
              </div>
              <button 
                onClick={() => window.open(shareLink, '_blank')}
                className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-black rounded-lg font-bold text-sm transition-colors"
              >
                View Now
              </button>
            </motion.div>
          )}
        </section>

        {/* User Presentations List (Right Column) */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-semibold text-white">Your Presentations</h3>
            <span className="text-sm font-medium text-primary px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
              {presentations.length} Total
            </span>
          </div>
          
          {loadingPresentations ? (
            <div className="flex items-center justify-center p-12 border border-border/50 rounded-3xl bg-surface/30">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : presentations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 border border-dashed border-border rounded-3xl bg-surface/30 text-center">
              <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4">
                <Presentation className="w-8 h-8 text-gray-500" />
              </div>
              <h4 className="text-lg font-medium text-white mb-2">No presentations yet</h4>
              <p className="text-sm text-gray-400 max-w-sm">
                Upload your first presentation on the left to start hosting your media-rich slides on the cloud.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {presentations.map((p, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={p.id}
                  onClick={() => navigate(`/view/${p.id}`)}
                  className="p-5 bg-surface/60 backdrop-blur-md border border-border rounded-2xl flex flex-col cursor-pointer hover:bg-surface-hover hover:border-primary/50 transition-all group overflow-hidden relative"
                >
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onClick={(e) => { e.stopPropagation(); setActiveQR(p.id); }} className="p-2 bg-black/60 hover:bg-primary/50 text-white rounded-lg backdrop-blur-md transition-colors border border-white/10" title="Show QR Code">
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => handleShare(p.id, e)} className="p-2 bg-black/60 hover:bg-green-500/50 text-white rounded-lg backdrop-blur-md transition-colors border border-white/10" title="Copy Link">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => handleDelete(p.id, e)} disabled={deletingId === p.id} className="p-2 bg-black/60 hover:bg-red-500/50 text-white rounded-lg backdrop-blur-md transition-colors border border-white/10" title="Delete">
                      {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="w-full aspect-[16/9] bg-black/50 rounded-xl overflow-hidden relative mb-4 border border-border/50 group-hover:border-primary/30 transition-colors">
                    {p.manifest?.slides?.[0]?.image ? (
                      <img src={p.manifest.slides[0].image} alt="thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Presentation className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-5 h-5 ml-1" />
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10">
                    <h4 className="font-semibold text-white truncate text-lg">{p.manifest?.title || 'Untitled'}</h4>
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                      <span>{p.manifest?.slides?.length || 0} Slides</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setActiveQR(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface/90 backdrop-blur-xl border border-border p-8 rounded-3xl flex flex-col items-center shadow-2xl relative max-w-sm w-full"
          >
            <button onClick={() => setActiveQR(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 mb-4">
              <QrCode className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-6">Scan to View</h3>
            <div className="p-4 bg-white rounded-xl mb-6 shadow-inner">
              <QRCodeSVG value={`${window.location.origin}/view/${activeQR}`} size={200} level="H" />
            </div>
            <p className="text-sm text-gray-400 text-center">
              Scan this QR code with any mobile device to open the presentation instantly. No app required.
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
