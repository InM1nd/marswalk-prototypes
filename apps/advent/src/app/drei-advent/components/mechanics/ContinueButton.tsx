import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

// drei.at primary CTA: lime pill, bold navy label.
export const PRIMARY_BTN =
  'flex w-full items-center justify-center gap-2 rounded-full bg-lime px-5 py-4 text-base font-bold text-navy shadow-[0_6px_18px_rgb(221_238_61/0.45)] transition hover:brightness-95 active:scale-[0.98] disabled:opacity-70';

export function ContinueButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button type="button" onClick={onClick} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-5 ${PRIMARY_BTN}`}>
      {children} <ArrowRight size={18} />
    </motion.button>
  );
}
