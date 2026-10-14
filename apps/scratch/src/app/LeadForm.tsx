import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { GameConfig, ResolvedPrize } from './reducer';

const LeadFormSchema = z.object({
  email: z.string().email('Enter a valid email'),
  consent: z.literal(true, 'Consent is required to receive your prize'),
});

export type LeadFormValues = z.infer<typeof LeadFormSchema>;

interface LeadFormProps {
  config: GameConfig;
  segment: ResolvedPrize;
  submitting: boolean;
  errorMessage?: string;
  onSubmit: (values: LeadFormValues) => void;
}

export function LeadForm({ config, segment, submitting, errorMessage, onSubmit }: LeadFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LeadFormValues>({ resolver: zodResolver(LeadFormSchema) });

  const consent = useWatch({ control, name: 'consent' });

  return (
    <form className="lead-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="lead-form__prize" style={{ ['--seg' as string]: segment.color ?? config.branding.primaryColor }}>
        <span className="lead-form__prize-dot" aria-hidden="true" />
        {segment.label && <span className="lead-form__prize-label">{segment.label}</span>}
        <code className="lead-form__prize-code">{segment.prize.code}</code>
      </div>

      <h3 className="lead-form__title">{config.copy.leadFormTitle}</h3>

      <label className="lead-form__field">
        <span>Email</span>
        <input type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
        {errors.email && <em className="lead-form__error">{errors.email.message}</em>}
      </label>

      <label className="lead-form__consent">
        <input type="checkbox" {...register('consent')} />
        <span>{config.leadForm.consentText}</span>
      </label>
      {errors.consent && <em className="lead-form__error">{errors.consent.message}</em>}

      {errorMessage && <p className="lead-form__error lead-form__error--submit">{errorMessage}</p>}

      <button type="submit" className="btn btn--primary" disabled={submitting || consent !== true}>
        {submitting ? 'Sending…' : config.copy.leadFormSubmitLabel}
      </button>

      {config.leadForm.webhookUrl && (
        <p className="lead-form__pipeline">Demo · would POST to {config.leadForm.webhookUrl}</p>
      )}
    </form>
  );
}
