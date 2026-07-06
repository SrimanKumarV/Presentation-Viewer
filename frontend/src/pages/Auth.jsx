import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Presentation, Mail, Lock, LogIn, UserPlus } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link! If email confirmations are disabled in Supabase, you can just log in now.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex relative overflow-hidden">
      
      {/* Cinematic Mesh Background */}
      <div className="mesh-bg">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
        <div className="mesh-blob mesh-blob-3" />
      </div>

      {/* Left Side: Branding (Hidden on small screens) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="p-4 bg-white/5 premium-glass rounded-2xl w-fit mb-8 border-white/10 glow-border-primary">
            <Presentation className="text-white w-10 h-10" />
          </div>
          <h1 className="text-6xl font-bold font-heading text-white mb-4 leading-tight">
            The next era of <br/>
            <span className="glow-text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              presentations.
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-md">
            Upload your slide decks and instantly transform them into hyper-fast, cloud-streamed interactive media players.
          </p>
        </motion.div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="premium-glass-heavy rounded-[2rem] p-10 relative overflow-hidden">
            
            <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 mb-4 glow-border-primary">
                <Presentation className="text-white w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white font-heading text-center">Nexus Viewer</h2>
            </div>

            <div className="mb-8 hidden lg:block">
              <h2 className="text-3xl font-bold text-white font-heading mb-2">
                {isLogin ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-gray-400 text-sm">
                {isLogin ? 'Enter your details to access your dashboard.' : 'Sign up to start hosting your presentations.'}
              </p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-center gap-2"
              >
                <div className="w-1.5 h-full bg-red-500 rounded-full" />
                {error}
              </motion.div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-widest ml-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/20 premium-glass border border-white/10 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-gray-500 shadow-inner"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/20 premium-glass border border-white/10 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-gray-500 shadow-inner"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden rounded-xl mt-6 bg-white text-black font-semibold py-3.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 w-full"
              >
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <span className="text-primary font-medium">{isLogin ? 'Sign up' : 'Sign in'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
