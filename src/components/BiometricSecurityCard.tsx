import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  Unlock, 
  Sparkles, 
  Check, 
  X, 
  Trash2, 
  Smartphone, 
  Info, 
  ToggleLeft, 
  ToggleRight, 
  Radio, 
  Cpu, 
  Zap,
  Activity,
  ShieldAlert
} from 'lucide-react';
import WebAuthnBiometricService, { BiometricCredentialMeta } from '../config/webauthn.ts';

interface BiometricSecurityCardProps {
  currentUser: any;
  userProfile?: any;
  compact?: boolean;
}

export const BiometricSecurityCard: React.FC<BiometricSecurityCardProps> = ({
  currentUser,
  userProfile,
  compact = false
}) => {
  const userId = currentUser?.id || 'guest';
  const userEmail = currentUser?.email || userProfile?.email || 'member@mtl.hub';
  const userName = userProfile?.username || currentUser?.user_metadata?.full_name || 'MTL Fan';

  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [credentials, setCredentials] = useState<BiometricCredentialMeta[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    setIsSupported(WebAuthnBiometricService.isSupported());
    syncState();

    const handleUpdate = () => syncState();
    window.addEventListener('mtl_biometrics_updated', handleUpdate);
    return () => window.removeEventListener('mtl_biometrics_updated', handleUpdate);
  }, [userId]);

  const syncState = () => {
    const list = WebAuthnBiometricService.getCredentials(userId);
    setCredentials(list);
    const active = WebAuthnBiometricService.isBiometricsActive(userId);
    setIsActive(active);
  };

  const handleToggleBiometrics = async () => {
    if (!isActive) {
      // Activating biometrics: if no credential exists, trigger registration
      if (credentials.length === 0) {
        await handleRegisterBiometrics();
      } else {
        WebAuthnBiometricService.setBiometricsActive(userId, true);
        setIsActive(true);
        setFeedbackMsg('🔒 Biometric authentication reactivated for this account!');
        setFeedbackType('success');
      }
    } else {
      // Deactivating biometrics
      WebAuthnBiometricService.setBiometricsActive(userId, false);
      setIsActive(false);
      setIsUnlocked(false);
      setFeedbackMsg('🔓 Biometric authentication deactivated. Paused passkey verification.');
      setFeedbackType('info');
    }
  };

  const handleRegisterBiometrics = async () => {
    setIsRegistering(true);
    setFeedbackMsg('Initializing Touch ID / Face ID hardware verification...');
    setFeedbackType('info');

    try {
      const newCred = await WebAuthnBiometricService.registerCredential(userId, userEmail, userName);
      setIsActive(true);
      setFeedbackMsg(`✨ Biometric key successfully registered: ${newCred.authenticatorName}!`);
      setFeedbackType('success');
      syncState();
    } catch (err: any) {
      console.warn('Biometric registration notice:', err);
      setFeedbackMsg(err.message || 'Failed to register biometric key.');
      setFeedbackType('error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleVerifyBiometrics = async () => {
    setIsAuthenticating(true);
    setFeedbackMsg('Promping Touch ID / Face ID scanner...');
    setFeedbackType('info');

    try {
      const verified = await WebAuthnBiometricService.verifyCredential(userId);
      if (verified) {
        setIsUnlocked(true);
        setIsActive(true);
        setFeedbackMsg('🔓 Biometric Identity Verified! Encrypted Football Feeds & VIP Telemetry unlocked.');
        setFeedbackType('success');
      } else {
        setFeedbackMsg('Biometric verification cancelled.');
        setFeedbackType('error');
      }
    } catch (err: any) {
      console.warn('Biometric verification notice:', err);
      setFeedbackMsg(err.message || 'Verification error.');
      setFeedbackType('error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRevokeCredential = (credId: string) => {
    WebAuthnBiometricService.revokeCredential(userId, credId);
    setFeedbackMsg('Biometric passkey revoked.');
    setFeedbackType('info');
    syncState();
  };

  const activeCredential = credentials.find((c) => c.status === 'active') || credentials[0];

  return (
    <div className={`relative overflow-hidden rounded-3xl border transition-all duration-300 font-['Plus_Jakarta_Sans',sans-serif] ${
      isActive
        ? 'bg-gradient-to-b from-[#0b1b22] via-[#08131d] to-[#070d18] border-emerald-500/50 shadow-2xl shadow-emerald-950/40'
        : 'bg-[#0b1322] border-slate-800 shadow-xl'
    } p-6 sm:p-7 space-y-6`}>
      
      {/* Background Radial Glow */}
      <div className={`absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 ${
        isActive ? 'bg-emerald-500/15 opacity-100' : 'bg-cyan-500/5 opacity-40'
      }`} />

      {/* PROMINENT DEDICATED STATUS HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg transition-all duration-300 ${
            isActive
              ? 'bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-400 shadow-emerald-950/80 ring-2 ring-emerald-500/50 animate-pulse'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <Fingerprint className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white font-['Orbitron'] uppercase tracking-wider">
                {isActive ? 'BIOMETRIC AUTHENTICATION IS ACTIVE' : 'BIOMETRIC AUTHENTICATION IS OFF'}
              </h3>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 border ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}>
                <Radio className={`w-3 h-3 ${isActive ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
                <span>{isActive ? 'PASSKEY ENABLED' : 'DEACTIVATED'}</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              {isActive
                ? `Protected by ${activeCredential?.authenticatorName || 'Touch ID / Face ID'} hardware key`
                : 'Enable Touch ID / Face ID for 1-click access to encrypted football feeds'}
            </p>
          </div>
        </div>

        {/* ACTIVATION TOGGLE SWITCH */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 px-3.5 shrink-0 justify-between sm:justify-start">
          <span className="text-xs font-bold text-slate-300 font-['Orbitron'] uppercase tracking-wider">
            {isActive ? 'ENABLED' : 'DISABLED'}
          </span>
          <button
            type="button"
            onClick={handleToggleBiometrics}
            className="cursor-pointer transition-transform hover:scale-105 focus:outline-none"
            title={isActive ? 'Click to deactivate biometrics' : 'Click to activate Touch ID / Face ID'}
          >
            {isActive ? (
              <ToggleRight className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            ) : (
              <ToggleLeft className="w-9 h-9 text-slate-600 hover:text-slate-400" />
            )}
          </button>
        </div>

      </div>

      {/* FEEDBACK NOTIFICATION */}
      {feedbackMsg && (
        <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
          feedbackType === 'success' 
            ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300' 
            : feedbackType === 'error'
            ? 'bg-rose-950/70 border-rose-500/50 text-rose-300'
            : 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackType === 'success' ? <Check className="w-4 h-4 shrink-0 text-emerald-400" /> : <Info className="w-4 h-4 shrink-0" />}
            <span>{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HARDWARE STATUS RADAR METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">WEBAUTHN API</span>
          <span className="text-xs font-bold text-emerald-400 font-mono mt-0.5 block">
            {isSupported ? 'READY' : 'SUPPORTED'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">PASSKEY STATE</span>
          <span className={`text-xs font-bold font-mono mt-0.5 block ${isActive ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isActive ? 'ACTIVE (ENABLED)' : 'INACTIVE'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">DEVICE SENSOR</span>
          <span className="text-xs font-bold text-cyan-400 font-mono mt-0.5 block truncate">
            {activeCredential?.authenticatorName ? 'TOUCH ID / FACE ID' : 'PLATFORM SENSOR'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">ENCRYPTED FEEDS</span>
          <span className={`text-xs font-bold font-mono mt-0.5 block ${isUnlocked ? 'text-emerald-400' : 'text-slate-400'}`}>
            {isUnlocked ? 'UNLOCKED' : 'PROTECTED'}
          </span>
        </div>
      </div>

      {/* INTERACTIVE ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* ACTION 1: Activate / Register Passkey */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-[#070e1b] border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400">
              <KeyRound className="w-4 h-4" />
              <span className="text-xs font-black uppercase font-['Orbitron'] tracking-wider">
                1. REGISTER BIOMETRIC PASSKEY
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pairs your device's Touch ID, Face ID, or Fingerprint reader with your MTL user profile.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRegisterBiometrics}
            disabled={isRegistering}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 hover:from-emerald-400 hover:to-indigo-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Fingerprint className="w-4 h-4" />
            <span>{isRegistering ? 'PROMPTING SENSOR...' : 'PAIR TOUCH ID / FACE ID'}</span>
          </button>
        </div>

        {/* ACTION 2: Test Hardware Verification */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-[#070e1b] border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-black uppercase font-['Orbitron'] tracking-wider">
                2. SCAN & VERIFY BIOMETRICS
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Triggers live Touch ID / Face ID hardware verification to unlock zero-latency match telemetry.
            </p>
          </div>

          <button
            type="button"
            onClick={handleVerifyBiometrics}
            disabled={isAuthenticating}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs font-['Orbitron'] tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUnlocked ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-cyan-400" />}
            <span>{isAuthenticating ? 'VERIFYING...' : 'SCAN TOUCH ID / FACE ID'}</span>
          </button>
        </div>

      </div>

      {/* UNLOCKED ENCRYPTED FEED BANNER */}
      {isUnlocked && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-cyan-950/80 border border-emerald-500/50 space-y-2 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs font-['Orbitron']">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>VIP ENCRYPTED FOOTBALL FEEDS UNLOCKED</span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-bold">
              SESSION ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-200">
            Biometric identity verified. You have zero-latency access to encrypted match telemetry, quantum prediction streams, and VIP channels.
          </p>
        </div>
      )}

      {/* REGISTERED PASSKEYS LIST */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider flex items-center gap-2">
            <span>REGISTERED DEVICE KEYS ({credentials.length})</span>
          </h4>

          {credentials.length > 0 && (
            <button
              onClick={handleToggleBiometrics}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-bold cursor-pointer"
            >
              {isActive ? 'Deactivate Biometrics' : 'Activate Biometrics'}
            </button>
          )}
        </div>

        {credentials.length === 0 ? (
          <div className="p-5 text-center text-slate-400 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
            <Smartphone className="w-7 h-7 text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs">No biometric device keys registered yet.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Click "Pair Touch ID / Face ID" or switch the toggle to activate.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {credentials.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    c.status === 'active' && isActive
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white font-['Plus_Jakarta_Sans']">
                      {c.authenticatorName}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>Registered: {new Date(c.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className={c.status === 'active' && isActive ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        Status: {c.status === 'active' && isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevokeCredential(c.id)}
                  className="p-2 rounded-xl bg-slate-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                  title="Revoke biometric device key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default BiometricSecurityCard;
