import { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Presentation, UploadCloud, Copy, Check } from 'lucide-react';
import PresentationViewer from './components/PresentationViewer';

function Dashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setShareLink(null);

    const formData = new FormData();
    formData.append('presentation', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (data.id) {
        const link = `${window.location.origin}/view/${data.id}`;
        setShareLink(link);
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center">
      <header className="w-full max-w-5xl flex items-center justify-between py-6 mb-12 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg border border-primary/50">
            <Presentation className="text-primary w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Nexus Viewer
          </h1>
        </div>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Upload Section */}
        <section 
          onClick={!isUploading ? handleUploadClick : undefined}
          className={`bg-surface border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors ${!isUploading ? 'hover:border-primary/50 cursor-pointer group' : 'opacity-70'}`}
        >
          <input 
            type="file" 
            accept=".zip" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange}
          />
          
          <div className={`w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center mb-6 ${!isUploading && 'group-hover:scale-110'} transition-transform`}>
            {isUploading ? (
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 text-primary" />
            )}
          </div>
          
          <h2 className="text-xl font-medium mb-2">
            {isUploading ? 'Uploading & Processing...' : 'Upload Presentation'}
          </h2>
          <p className="text-sm text-gray-400 max-w-xs">
            {isUploading 
              ? 'Extracting heavy assets. Please wait.' 
              : 'Select a .zip containing images and videos. We will extract and optimize them for streaming.'}
          </p>

          {!isUploading && (
            <button className="mt-8 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-medium rounded-full transition-colors">
              Select File
            </button>
          )}

          {/* Share Link Modal/Banner */}
          {shareLink && (
            <div className="mt-6 w-full p-4 bg-primary/10 border border-primary/30 rounded-lg text-left" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-medium text-primary mb-2">Upload complete! Share this link globally:</p>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={shareLink} 
                  className="flex-1 bg-background border border-border p-2 rounded text-sm text-gray-300 outline-none"
                />
                <button 
                  onClick={copyToClipboard}
                  className="p-2 bg-surface hover:bg-surface-hover border border-border rounded transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button 
                onClick={() => window.open(shareLink, '_blank')}
                className="mt-3 w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded font-medium text-sm transition-colors border border-primary/50"
              >
                View Now
              </button>
            </div>
          )}
        </section>

        {/* Recent Presentations List */}
        <section className="flex flex-col gap-4">
          <h3 className="text-lg font-medium text-gray-300 px-2">Ready to Present</h3>
          
          <div 
            onClick={() => navigate('/view/demo-1')}
            className="p-4 bg-surface border border-border rounded-xl flex items-center gap-4 cursor-pointer hover:bg-surface-hover hover:border-primary/50 transition-all group"
          >
            <div className="w-16 h-12 bg-black rounded overflow-hidden relative border border-border">
              <img src="/api/media/demo-1/slide1.jpg" alt="thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Q3 Financial Review</h4>
              <p className="text-xs text-gray-500 mt-1">Mock Demo</p>
            </div>
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="px-4 py-1.5 bg-primary/20 text-primary font-medium text-sm rounded-full border border-primary/50">
                Play
              </button>
            </div>
          </div>
        </section>

      </main>
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
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/view/:id" element={<ViewerWrapper />} />
      </Routes>
    </Router>
  );
}

export default App;
