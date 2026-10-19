import React, { useState } from "react";
import { X, Copy, Check, Database, ShieldAlert, Key, Globe, Server } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FirebaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionErrorDetail?: any;
}

export default function FirebaseGuideModal({ isOpen, onClose, permissionErrorDetail }: FirebaseGuideModalProps) {
  const [copiedRules, setCopiedRules] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const rulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products: anyone can read, write allows authenticated users
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Users: allow read/write for registration and login
    match /users/{userId} {
      allow read, write: if true;
    }
    
    // Orders: allow authenticated read/write
    match /orders/{orderId} {
      allow read, write: if true;
    }
  }
}`;

  const envText = `# Your Firebase Web App configuration
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_MEASUREMENT_ID="your-measurement-id"`;

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-2xl bg-white border-2 border-brand-gold overflow-hidden rounded-xl shadow-2xl max-h-[90vh] flex flex-col z-50 select-text"
          >
            {/* Fine golden bounding line */}
            <div className="absolute inset-2 border border-brand-gold/25 pointer-events-none rounded-lg" />

            {/* Header */}
            <header className="relative bg-primary-green p-4 sm:p-6 text-brand-cream border-b border-brand-gold/30 flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-brand-gold tracking-widest uppercase block mb-1">
                  Production Integration
                </span>
                <h3 className="font-serif text-2xl tracking-wide text-brand-cream flex items-center gap-2">
                  <Database className="w-6 h-6 text-brand-gold animate-pulse" />
                  Firebase Connection Guide
                </h3>
                <p className="text-xs text-brand-cream/80 font-mono mt-1 font-light">
                  How to link Hostinger & GitHub exports to your Firestore Database
                </p>
              </div>

              <button
                id="close-firebase-guide-modal"
                onClick={onClose}
                className="p-1.5 rounded-full bg-brand-cream/10 text-brand-cream hover:bg-brand-cream/20 hover:text-brand-gold transition-colors focus:outline-none"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 font-mono text-xs text-dark-text select-text">
              
              {permissionErrorDetail && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                  <h4 className="font-bold text-red-800 flex items-center gap-1.5 font-sans text-sm">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Live Database Permission Denied Detected
                  </h4>
                  <p className="text-[11px] text-red-700 leading-relaxed">
                    The portal attempted to query your remote Firestore collections but was blocked. This indicates either your database security rules are not set to open read/write access or the collections are missing.
                  </p>
                  <div className="bg-red-950 text-red-200 p-2 rounded text-[10px] whitespace-pre-wrap overflow-x-auto leading-tight">
                    {JSON.stringify(permissionErrorDetail, null, 2)}
                  </div>
                </div>
              )}

              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary-green font-bold text-sm font-sans">
                  <span className="w-5 h-5 bg-brand-gold text-primary-green rounded-full flex items-center justify-center text-xs">1</span>
                  <span>Set Cloud Firestore Security Rules</span>
                </div>
                <p className="text-dark-text/80 leading-relaxed pl-7">
                  Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-green underline font-bold hover:text-brand-gold">Firebase Console</a>, select your project, go to <strong>Cloud Firestore</strong>, and click the <strong>Rules</strong> tab. Paste the following security rules and click <strong>Publish</strong>:
                </p>
                <div className="pl-7">
                  <div className="relative bg-zinc-900 text-zinc-100 rounded-lg overflow-hidden border border-brand-gold/30">
                    <div className="flex justify-between items-center px-4 py-2 bg-zinc-800 text-[10px] text-zinc-400 border-b border-zinc-700">
                      <span>firestore.rules</span>
                      <button
                        onClick={() => copyToClipboard(rulesText, setCopiedRules)}
                        className="flex items-center gap-1 text-zinc-300 hover:text-white transition-colors"
                      >
                        {copiedRules ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Rules</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 text-[10px] overflow-x-auto leading-relaxed max-h-48 whitespace-pre">
                      {rulesText}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary-green font-bold text-sm font-sans">
                  <span className="w-5 h-5 bg-brand-gold text-primary-green rounded-full flex items-center justify-center text-xs">2</span>
                  <span>Enable Email & Password Authentication</span>
                </div>
                <p className="text-dark-text/80 leading-relaxed pl-7">
                  This portal uses email matching to link consignees to their custom trade ledgers. In your Firebase Console:
                </p>
                <ul className="list-disc pl-12 space-y-1 text-dark-text/80">
                  <li>Go to <strong>Authentication</strong></li>
                  <li>Click the <strong>Sign-in method</strong> tab</li>
                  <li>Click <strong>Add new provider</strong></li>
                  <li>Select <strong>Email/Password</strong>, enable it, and save.</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary-green font-bold text-sm font-sans">
                  <span className="w-5 h-5 bg-brand-gold text-primary-green rounded-full flex items-center justify-center text-xs">3</span>
                  <span>Configure Environment Variables</span>
                </div>
                <p className="text-dark-text/80 leading-relaxed pl-7">
                  Make sure your Hostinger deployment or local environment is injected with the correct Firebase Web credentials. If using Hostinger or standard VPS hosting, define these in your server settings or a <code>.env</code> file in the build directory:
                </p>
                <div className="pl-7">
                  <div className="relative bg-zinc-900 text-zinc-100 rounded-lg overflow-hidden border border-brand-gold/30">
                    <div className="flex justify-between items-center px-4 py-2 bg-zinc-800 text-[10px] text-zinc-400 border-b border-zinc-700">
                      <span>.env / System Environment Configuration</span>
                      <button
                        onClick={() => copyToClipboard(envText, setCopiedEnv)}
                        className="flex items-center gap-1 text-zinc-300 hover:text-white transition-colors"
                      >
                        {copiedEnv ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Template</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 text-[10px] overflow-x-auto leading-relaxed max-h-40 whitespace-pre">
                      {envText}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary-green font-bold text-sm font-sans">
                  <span className="w-5 h-5 bg-brand-gold text-primary-green rounded-full flex items-center justify-center text-xs">4</span>
                  <span>Initial Seeding of Cultivar Roster</span>
                </div>
                <p className="text-dark-text/80 leading-relaxed pl-7 font-sans text-xs">
                  Once rules are published and Auth is enabled, simply register or log in with any newly created user account. The portal will automatically populate your Firestore database with the official **Horn and Harvest** products roster!
                </p>
              </div>

            </div>

            {/* Footer */}
            <footer className="bg-brand-cream/40 p-4 border-t border-brand-gold/20 flex justify-end gap-3 font-sans">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-primary-green text-brand-cream hover:bg-primary-green/90 rounded cursor-pointer transition-colors"
              >
                Done
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
