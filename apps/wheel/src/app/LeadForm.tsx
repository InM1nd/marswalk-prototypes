import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CampaignConfig } from '../config/schema';

const LeadFormSchema = z.object({
  email: z.string().email('Enter a valid email'),
  consent: z.literal(true, 'Consent is required to receive your prize'),
});

export type LeadFormValues = z.infer<typeof LeadFormSchema>;

interface LeadFormProps {
  config: CampaignConfig;
  submitting: boolean;
  errorMessage?: string;
  onSubmit: (values: LeadFormValues) => void;
}

export function LeadForm({ config, submitting, errorMessage, onSubmit }: LeadFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormValues>({ resolver: zodResolver(LeadFormSchema) });

  return (
    <form className="lead-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h3 className="lead-form__title">{config.copy.leadFormTitle}</h3>

      <label className="lead-form__field">
        <span>Email</span>
        <input type="email" autoComplete="email" {...register('email')} />
        {errors.email && <em className="lead-form__error">{errors.email.message}</em>}
      </label>

      <label className="lead-form__consent">
        <input type="checkbox" {...register('consent')} />
        <span>{config.leadForm.consentText}</span>
      </label>
      {errors.consent && <em className="lead-form__error">{errors.consent.message}</em>}

      {errorMessage && <p className="lead-form__error lead-form__error--submit">{errorMessage}</p>}

      <button type="submit" className="btn btn--primary" disabled={submitting}>
        {submitting ? 'Sending…' : config.copy.leadFormSubmitLabel}
      </button>
    </form>
  );
}
