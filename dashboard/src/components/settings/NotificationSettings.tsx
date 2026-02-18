import { useCurrentUser } from '../../lib/authProvider';
import type { NotificationPreferences } from '@agenttailor/shared';

export interface NotificationSettingsProps {
  values: NotificationPreferences;
  onChange: (updated: Partial<NotificationPreferences>) => void;
  disabled?: boolean;
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        checked ? 'bg-primary-600' : 'bg-secondary-300',
        'disabled:cursor-not-allowed disabled:opacity-60',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform mt-0.5',
          checked ? 'translate-x-4.5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, description, checked, onChange, disabled = false }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-secondary-200 last:border-b-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-secondary-800">{label}</span>
        <span className="text-xs text-secondary-500">{description}</span>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function NotificationSettings({ values, onChange, disabled = false }: NotificationSettingsProps) {
  const { user } = useCurrentUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="flex flex-col gap-4">
      {/* Email display */}
      {userEmail && (
        <div className="flex flex-col gap-0.5 pb-4 border-b border-secondary-200">
          <span className="text-xs font-medium text-secondary-500 uppercase tracking-wide">
            Notification Email
          </span>
          <span className="text-sm text-secondary-800">{userEmail}</span>
          <span className="text-xs text-secondary-400">
            Manage email addresses in your Clerk account settings.
          </span>
        </div>
      )}

      {/* Toggle rows */}
      <div className="flex flex-col">
        <ToggleRow
          label="Processing Complete"
          description="Receive an email when context assembly finishes successfully."
          checked={values.emailOnProcessingComplete}
          onChange={(v) => onChange({ emailOnProcessingComplete: v })}
          disabled={disabled}
        />
        <ToggleRow
          label="Processing Error"
          description="Receive an email when context assembly encounters an error."
          checked={values.emailOnProcessingError}
          onChange={(v) => onChange({ emailOnProcessingError: v })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
