import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { Presentation, UploadCloud, Copy, Check, LogOut, Loader2, Play, Trash2, Share2, QrCode, X, Search, Info, FileText, Calendar, HardDrive } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import PresentationViewer from './components/PresentationViewer';
import Auth from './pages/Auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [activeDetails, setActiveDetails] = useState(null);
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

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown Size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    return new Date(dateString).toLocaleString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center relative overflow-hidden font-sans">
      
      {/* Cinematic Mesh Background */}
      <div className="mesh-bg">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
        <div className="mesh-blob mesh-blob-3" />
      </div>

      {/* Header */}
      <header className="w-full max-w-6xl flex items-center justify-between py-6 mb-8 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 premium-glass glow-border-primary">
            <Presentation className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
            Nexus Viewer
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search presentations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-2.5 premium-glass rounded-full text-sm text-white focus:outline-none focus:border-primary/50 w-64 transition-all focus:w-80 shadow-inner"
            />
          </div>
          <div className="flex items-center gap-4 border-l border-white/10 pl-6">
            <div className="text-sm font-medium text-gray-300 hidden sm:block">
              {user?.email}
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 premium-glass hover:bg-white/10 rounded-xl text-gray-400 hover:text-red-400 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
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
            className="premium-glass-heavy rounded-[2rem] p-12 flex flex-col md:flex-row items-center justify-between gap-12"
          >
            <div className="flex-1 text-left">
              <h2 className="text-4xl font-bold text-white font-heading mb-4 leading-tight">
                Host your next <span className="glow-text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">big idea.</span>
              </h2>
              <p className="text-gray-300 max-w-md text-lg leading-relaxed">
                Upload PowerPoint presentations and instantly turn them into ultra-fast, cloud-streamed interactive media players.
              </p>
            </div>

            <div className="flex-1 w-full max-w-md">
              <div 
                onClick={!isUploading ? handleUploadClick : undefined}
                className={`w-full premium-glass border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all ${!isUploading ? 'border-primary/30 cursor-pointer hover:bg-white/5 hover:border-primary/60 hover:scale-[1.02]' : 'border-white/10 opacity-80'}`}
              >
                <input 
                  type="file" 
                  accept=".pptx" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                />
                
                <div className={`w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 ${!isUploading && 'glow-border-primary'} transition-all`}>
                  {isUploading ? (
                    <div className="relative flex items-center justify-center w-full h-full">
                      <Loader2 className="w-10 h-10 text-primary animate-spin opacity-40" />
                      <span className="absolute text-white font-bold text-sm">{uploadProgress}%</span>
                    </div>
                  ) : (
                    <UploadCloud className="w-10 h-10 text-primary" />
                  )}
                </div>
                
                <h3 className="font-bold text-white text-lg mb-2">
                  {isUploading ? (uploadProgress < 95 ? 'Uploading Asset...' : 'Processing Cloud Sync...') : 'Click to Upload (.pptx)'}
                </h3>
                <p className="text-sm text-gray-400">Max file size depends on your tier.</p>
                
                {isUploading && (
                  <div className="w-full h-2 bg-black/40 rounded-full mt-6 overflow-hidden border border-white/5 shadow-inner">
                    <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Share Link Banner */}
          <AnimatePresence>
            {shareLink && (
              <motion.div 
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full mt-6 p-5 premium-glass border border-secondary/40 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center glow-border-secondary">
                    <Check className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">Upload complete!</p>
                    <p className="text-sm text-gray-300">Your presentation is now live on the edge.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    readOnly 
                    value={shareLink} 
                    className="bg-black/30 border border-white/10 px-4 py-3 rounded-xl text-sm text-white outline-none w-72 shadow-inner"
                  />
                  <button onClick={copyToClipboard} className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-colors">
                    {copied ? <Check className="w-5 h-5 text-secondary" /> : <Copy className="w-5 h-5 text-white" />}
                  </button>
                  <button onClick={() => window.open(shareLink, '_blank')} className="px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold text-sm transition-colors shadow-lg">
                    View Now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Presentations Grid */}
        <section className="w-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold text-white font-heading">Your Library</h3>
            <span className="text-sm font-semibold text-primary px-4 py-1.5 premium-glass rounded-full border border-primary/30">
              {filteredPresentations.length} Items
            </span>
          </div>
          
          {loadingPresentations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(n => (
                <div key={n} className="premium-glass rounded-3xl h-72 animate-pulse bg-white/5" />
              ))}
            </div>
          ) : presentations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 premium-glass border border-dashed border-white/20 rounded-[2rem] text-center">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10">
                <Presentation className="w-12 h-12 text-gray-400" />
              </div>
              <h4 className="text-2xl font-bold text-white font-heading mb-3">Library is empty</h4>
              <p className="text-gray-400 max-w-md text-lg">
                Drop your first presentation above to start building your cloud library.
              </p>
            </div>
          ) : filteredPresentations.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-lg">No presentations match your search.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPresentations.map((p, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={p.id}
                  onClick={() => navigate(`/view/${p.id}`)}
                  className="p-4 premium-glass rounded-3xl flex flex-col cursor-pointer hover:border-primary/40 hover:shadow-[0_10px_40px_rgba(157,78,221,0.2)] transition-all duration-500 group overflow-hidden relative"
                >
                  {/* Action Tooltips (Glass Pills) */}
                  <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 translate-x-4 group-hover:translate-x-0 duration-300">
                    <button onClick={(e) => { e.stopPropagation(); setActiveDetails(p.manifest); }} className="p-2.5 bg-black/40 backdrop-blur-xl hover:bg-white/20 text-white rounded-full border border-white/10 shadow-xl transition-all hover:scale-110" title="Details">
                      <Info className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveQR(p.id); }} className="p-2.5 bg-black/40 backdrop-blur-xl hover:bg-white/20 text-white rounded-full border border-white/10 shadow-xl transition-all hover:scale-110" title="Show QR Code">
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => handleShare(p.id, e)} className="p-2.5 bg-black/40 backdrop-blur-xl hover:bg-white/20 text-white rounded-full border border-white/10 shadow-xl transition-all hover:scale-110" title="Copy Link">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => handleDelete(p.id, e)} disabled={deletingId === p.id} className="p-2.5 bg-black/40 backdrop-blur-xl hover:bg-red-500/80 text-white rounded-full border border-white/10 shadow-xl transition-all hover:scale-110" title="Delete">
                      {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Thumbnail Image */}
                  <div className="w-full aspect-[16/9] bg-black/50 rounded-2xl overflow-hidden relative mb-5 border border-white/5">
                    {p.manifest?.slides?.[0]?.image ? (
                      <img src={p.manifest.slides[0].image} alt="thumbnail" className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700 ease-out" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700">
                        <Presentation className="w-12 h-12" />
                      </div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] z-10">
                      <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-2xl transform scale-50 group-hover:scale-100 transition-transform duration-500 ease-out">
                        <Play className="w-6 h-6 ml-1 fill-white" />
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="px-3 pb-2 relative z-10">
                    <h4 className="font-bold text-white truncate text-xl font-heading mb-1">{p.manifest?.title || 'Untitled'}</h4>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary glow-border-primary"></span>
                      {p.manifest?.slides?.length || 0} Slides
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Details Modal */}
      <AnimatePresence>
        {activeDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg" onClick={() => setActiveDetails(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="premium-glass-heavy p-10 rounded-[2.5rem] flex flex-col shadow-2xl relative max-w-md w-full border border-white/10"
            >
              <button onClick={() => setActiveDetails(null)} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors bg-white/5 p-2.5 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/30 glow-border-primary">
                  <FileText className="text-primary w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white font-heading leading-tight truncate max-w-[200px]">File Details</h3>
                  <p className="text-gray-400 text-sm">Presentation Metadata</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1 block">Title</label>
                  <p className="text-lg text-white font-medium">{activeDetails.title || 'Untitled'}</p>
                </div>
                
                {activeDetails.originalName && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1 block">Original Filename</label>
                    <p className="text-sm text-gray-300 break-all bg-black/20 p-3 rounded-xl border border-white/5 font-mono">{activeDetails.originalName}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5"/> Size</label>
                    <p className="text-lg text-white font-medium">{formatSize(activeDetails.size)}</p>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Presentation className="w-3.5 h-3.5"/> Slides</label>
                    <p className="text-lg text-white font-medium">{activeDetails.slides?.length || 0}</p>
                  </div>
                </div>

                {activeDetails.createdAt && (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Uploaded On</label>
                    <p className="text-md text-white font-medium">{formatDate(activeDetails.createdAt)}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {activeQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg" onClick={() => setActiveQR(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="premium-glass-heavy p-10 rounded-[2.5rem] flex flex-col items-center shadow-2xl relative max-w-sm w-full border border-white/10"
            >
              <button onClick={() => setActiveQR(null)} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors bg-white/5 p-2.5 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/30 mb-6 glow-border-primary">
                <QrCode className="text-primary w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white font-heading mb-8 glow-text-primary">Scan to View</h3>
              <div className="p-5 bg-white rounded-3xl mb-8 shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                <QRCodeSVG value={`${window.location.origin}/view/${activeQR}`} size={220} level="H" />
              </div>
              <p className="text-sm text-gray-300 text-center leading-relaxed">
                Scan this QR code with your mobile device to open the presentation instantly.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
