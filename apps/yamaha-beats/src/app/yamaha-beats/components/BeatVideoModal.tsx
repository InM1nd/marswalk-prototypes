'use client';

import { motion } from 'framer-motion';
import { Download, Share2, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';

export type VideoState = { phase: 'rec'; bar: number; bars: number } | { phase: 'done'; file: File };

export function BeatVideoModal({ state, onClose }: { state: VideoState; onClose: () => void }) {
  const url = useMemo(() => (state.phase === 'done' ? URL.createObjectURL(state.file) : null), [state]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const file = state.phase === 'done' ? state.file : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Beat-Video"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="chassis relative max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-t-[26px] p-5 pb-7 sm:rounded-[26px]"
      >
        {state.phase === 'rec' ? (
          <div className="py-6 text-center" role="status">
            <p className="flex items-center justify-center gap-2 font-mono text-sm text-orange">
              <span className="led led-on animate-pulse" style={{ ['--c' as string]: '#FF5500' }} aria-hidden /> REC
            </p>
            <p className="mt-3 text-2xl font-bold">
              Takt {state.bar}/{state.bars}
            </p>
            <p className="mt-1 text-sm text-white/50">Dein Beat wird als Video aufgenommen. Spiel ruhig die FX!</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-orange transition-[width] duration-300" style={{ width: `${(state.bar / state.bars) * 100}%` }} />
            </div>
          </div>
        ) : (
          <>
            <button type="button" onClick={onClose} aria-label="Schließen" className="keycap absolute top-4 right-4 z-10 grid h-9 w-9 place-items-center text-white/70">
              <X size={16} />
            </button>
            <p className="silk">Dein Beat-Video · 9:16</p>
            <video src={url ?? undefined} controls playsInline loop autoPlay className="mx-auto mt-3 aspect-[9/16] max-h-[52dvh] rounded-xl bg-black" />
            <div className="mt-4 grid gap-2">
              {canShare && (
                <button
                  type="button"
                  onClick={() => navigator.share({ files: [file!], title: 'Mein Yamaha Beat', text: 'Bau deinen eigenen Beat und hol dir -10%!' }).catch(() => {})}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-purple-2 to-purple px-5 py-3.5 font-semibold text-white"
                >
                  <Share2 size={17} /> In Story / TikTok teilen
                </button>
              )}
              <a href={url ?? undefined} download={file!.name} className="keycap flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold text-white/85">
                <Download size={16} /> Video speichern
              </a>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
