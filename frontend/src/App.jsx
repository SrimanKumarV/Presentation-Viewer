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
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
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
      
      {/* Header */}
      <header className="w-full max-w-6xl flex items-center justify-between py-6 mb-8 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 vision-glass">
            <Presentation className="text-white w-5 h-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white font-heading">
            Nexus
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search presentations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white focus:outline-none focus:border-white/30 w-64 transition-all focus:w-80"
            />
          </div>
          <div className="flex items-center gap-4 border-l border-white/10 pl-6">
            <div className="text-sm font-medium text-gray-400 hidden sm:block">
              {user?.email}
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
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
            className="vision-glass-heavy rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-12"
          >
            <div className="flex-1 text-left">
              <h2 className="text-3xl font-semibold text-white font-heading mb-3 tracking-tight">
                Upload Presentation
              </h2>
              <p className="text-gray-400 max-w-md text-base leading-relaxed">
                Turn your PowerPoint files into ultra-fast, cloud-streamed interactive media players instantly.
              </p>
            </div>

            <div className="flex-1 w-full max-w-md">
              <div 
                onClick={!isUploading ? handleUploadClick : undefined}
                className={`w-full bg-black/40 border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all ${!isUploading ? 'cursor-pointer hover:bg-white/5 hover:border-white/30' : 'opacity-80'}`}
              >
                <input 
                  type="file" 
                  accept=".pptx" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                />
                
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5 border border-white/10">
                  {isUploading ? (
                    <div className="relative flex items-center justify-center w-full h-full">
                      <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                    </div>
                  ) : (
                    <UploadCloud className="w-8 h-8 text-white" />
                  )}
                </div>
                
                <h3 className="font-medium text-white text-base mb-1">
                  {isUploading ? (uploadProgress < 95 ? 'Uploading Asset...' : 'Processing Cloud Sync...') : 'Select .pptx file'}
                </h3>
                
                {isUploading && (
                  <div className="w-full h-1.5 bg-white/10 rounded-full mt-5 overflow-hidden">
                    <div className="h-full bg-white transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
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
                className="w-full mt-6 p-4 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-between backdrop-blur-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-base">Upload complete</p>
                    <p className="text-sm text-gray-300">Your presentation is now live.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    readOnly 
                    value={shareLink} 
                    className="bg-black/50 border border-white/10 px-4 py-2.5 rounded-lg text-sm text-white outline-none w-72"
                  />
                  <button onClick={copyToClipboard} className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-colors">
                    {copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 text-white" />}
                  </button>
                  <button onClick={() => window.open(shareLink, '_blank')} className="px-6 py-2.5 bg-white text-black hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors">
                    View
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Presentations Grid */}
        <section className="w-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-semibold text-white font-heading tracking-tight">Library</h3>
            <span className="text-sm font-medium text-gray-400 px-3 py-1 bg-white/5 rounded-full border border-white/10">
              {filteredPresentations.length} Items
            </span>
          </div>
          
          {loadingPresentations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(n => (
                <div key={n} className="vision-glass rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : presentations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 vision-glass border-dashed rounded-[2rem] text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                <Presentation className="w-10 h-10 text-gray-500" />
              </div>
              <h4 className="text-xl font-semibold text-white font-heading mb-2">No presentations</h4>
              <p className="text-gray-400 text-base max-w-sm">
                Upload your first .pptx file above.
              </p>
            </div>
          ) : filteredPresentations.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-base">No presentations match your search.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPresentations.map((p, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={p.id}
                  onClick={() => navigate(`/view/${p.id}`)}
                  className="p-3 vision-glass rounded-3xl flex flex-col cursor-pointer hover:bg-white/5 border border-white/10 transition-all duration-300 group overflow-hidden relative"
                >
                  {/* Action Tooltips (Glass Pills) */}
                  <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onClick={(e) => { e.stopPropagation(); setActiveDetails(p.manifest); }} className="p-2.5 bg-black/60 backdrop-blur-xl hover:bg-white/20 text-white rounded-full border border-white/10 transition-colors" title="Details">
                      <Info className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveQR(p.id); }} className="p-2.5 bg-black/60 backdrop-blur-xl hover:bg-white/20 text-white rounded-full border border-white/10 transition-colors" title="Show QR Code">
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => handleShare(p.id, e)} className="p-2.5 bg-black/60 backdrop-blur-xl hover:bg-white/20 text-white rounded-full border border-white/10 transition-colors" title="Copy Link">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => handleDelete(p.id, e)} disabled={deletingId === p.id} className="p-2.5 bg-black/60 backdrop-blur-xl hover:bg-red-500/80 text-white rounded-full border border-white/10 transition-colors" title="Delete">
                      {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Thumbnail Image */}
                  <div className="w-full aspect-[16/9] bg-black/80 rounded-2xl overflow-hidden relative mb-4 border border-white/5">
                    {p.manifest?.slides?.[0]?.image ? (
                      <img src={p.manifest.slides[0].image} alt="thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700">
                        <Presentation className="w-10 h-10" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] z-10">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-6 h-6 ml-1 fill-white" />
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="px-3 pb-2 relative z-10">
                    <h4 className="font-medium text-white truncate text-lg font-heading mb-1 tracking-tight">{p.manifest?.title || 'Untitled'}</h4>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={() => setActiveDetails(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="vision-glass-heavy p-8 rounded-3xl flex flex-col shadow-2xl relative max-w-sm w-full"
            >
              <button onClick={() => setActiveDetails(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                  <FileText className="text-white w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white font-heading truncate max-w-[200px]">File Details</h3>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1.5 block">Title</label>
                  <p className="text-base text-white">{activeDetails.title || 'Untitled'}</p>
                </div>
                
                {activeDetails.originalName && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase mb-1.5 block">Filename</label>
                    <p className="text-sm text-gray-300 break-all">{activeDetails.originalName}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase mb-1.5 flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5"/> Size</label>
                    <p className="text-base text-white">{formatSize(activeDetails.size)}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase mb-1.5 flex items-center gap-1.5"><Presentation className="w-3.5 h-3.5"/> Slides</label>
                    <p className="text-base text-white">{activeDetails.slides?.length || 0}</p>
                  </div>
                </div>

                {activeDetails.createdAt && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Uploaded</label>
                    <p className="text-base text-white">{formatDate(activeDetails.createdAt)}</p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={() => setActiveQR(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="vision-glass-heavy p-8 rounded-3xl flex flex-col items-center shadow-2xl relative max-w-sm w-full"
            >
              <button onClick={() => setActiveQR(null)} className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
              <div className="p-3 bg-white/10 rounded-xl border border-white/20 mb-5">
                <QrCode className="text-white w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white font-heading mb-6">Scan QR</h3>
              <div className="p-4 bg-white rounded-2xl mb-6">
                <QRCodeSVG value={`${window.location.origin}/view/${activeQR}`} size={200} level="H" />
              </div>
              <p className="text-sm text-gray-400 text-center">
                Scan to open instantly on mobile.
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
