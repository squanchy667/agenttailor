import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useApiKeys, useSaveApiKey, useDeleteApiKey } from '../../hooks/useSettings';
import type { MaskedApiKey } from '@agenttailor/shared';

type Provider = 'tavily' | 'brave';

interface ProviderConfig {
  provider: Provider;
  label: string;
  description: string;
  placeholder: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    provider: 'tavily',
    label: 'Tavily API Key',
    description: 'Primary search provider — high-quality, AI-optimised results.',
    placeholder: 'tvly-...',
  },
  {
    provider: 'brave',
    label: 'Brave Search API Key',
    description: 'Fallback search provider — used when Tavily is unavailable.',
    placeholder: 'BSA...',
  },
];

interface ApiKeyRowProps {
  config: ProviderConfig;
  existing: MaskedApiKey | undefined;
}

function ApiKeyRow({ config, existing }: ApiKeyRowProps) {
  const [editing, setEditing] = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveKey = useSaveApiKey();
  const deleteKey = useDeleteApiKey();

  const handleSave = async () => {
    if (!keyValue.trim()) return;
    await saveKey.mutateAsync({ provider: config.provider, key: keyValue.trim() });
    setKeyValue('');
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteKey.mutateAsync(config.provider);
    setConfirmDelete(false);
  };

  const handleCancelDelete = () => {
    setConfirmDelete(false);
  };

  const handleCancelEdit = () => {
    setKeyValue('');
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-2 py-4 border-b border-secondary-200 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-secondary-800">{config.label}</span>
          <span className="text-xs text-secondary-500">{config.description}</span>
          {existing && !editing && (
            <span className="text-xs font-mono text-secondary-600 mt-1 bg-secondary-50 border border-secondary-200 rounded px-2 py-0.5 w-fit">
              {existing.maskedKey}
            </span>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              {existing ? 'Update Key' : 'Add Key'}
            </Button>

            {existing && !confirmDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleDelete()}
                loading={deleteKey.isPending}
              >
                Remove
              </Button>
            )}

            {existing && confirmDelete && (
              <div className="flex items-center gap-1">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void handleDelete()}
                  loading={deleteKey.isPending}
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelDelete}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="flex items-end gap-2 mt-1">
          <div className="flex-1">
            <Input
              label="API Key"
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={config.placeholder}
              autoFocus
            />
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => void handleSave()}
            loading={saveKey.isPending}
            disabled={!keyValue.trim() || saveKey.isPending}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={handleCancelEdit}
            disabled={saveKey.isPending}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export function ApiKeyManager() {
  const apiKeys = useApiKeys();

  return (
    <div className="flex flex-col">
      {PROVIDERS.map((config) => {
        const existing = apiKeys.find((k) => k.provider === config.provider);
        return (
          <ApiKeyRow
            key={config.provider}
            config={config}
            existing={existing}
          />
        );
      })}
    </div>
  );
}
