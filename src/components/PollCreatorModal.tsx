import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2, Sparkles, Check } from 'lucide-react';

interface PollCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (pollData: {
    question: string;
    options: string[];
    allowMultiple: boolean;
    isAnonymous: boolean;
  }) => void;
}

export const PollCreatorModal: React.FC<PollCreatorModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>([
    'Home Win & Over 1.5 Goals',
    'Both Teams to Score (Yes)',
    'Away Win'
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (text: string, index: number) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validQuestion = question.trim();
    const validOptions = options.map(o => o.trim()).filter(Boolean);

    if (!validQuestion || validOptions.length < 2) return;

    onCreatePoll({
      question: validQuestion,
      options: validOptions,
      allowMultiple,
      isAnonymous
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-5 py-4 bg-[#0c1728] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-slate-950">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white font-['Orbitron']">NEW FOOTBALL POLL</h3>
              <p className="text-[10px] text-slate-400">Interactive live hub community vote</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 font-mono">POLL QUESTION</label>
            <input
              type="text"
              placeholder="e.g. Who wins the Derby match tonight? (Required question for community vote)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 font-mono flex items-center justify-between">
              <span>POLL OPTIONS (2 - 6)</span>
              <span className="text-[10px] text-slate-400">{options.length}/6</span>
            </label>

            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-xs font-mono text-cyan-400 font-bold w-4">{idx + 1}.</span>
                <input
                  type="text"
                  placeholder={`e.g. Option ${idx + 1} e.g. CF Montréal (Required option ${idx + 1})`}
                  value={opt}
                  onChange={(e) => handleOptionChange(e.target.value, idx)}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  required
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="w-full py-1.5 rounded-xl border border-dashed border-slate-700 hover:border-cyan-500 text-slate-400 hover:text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-slate-300 font-medium">Anonymous Voting</span>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="accent-cyan-500 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-slate-300 font-medium">Allow Multiple Answers</span>
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="accent-cyan-500 rounded"
              />
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider disabled:opacity-50 cursor-pointer shadow-md"
            >
              CREATE POLL
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default PollCreatorModal;
