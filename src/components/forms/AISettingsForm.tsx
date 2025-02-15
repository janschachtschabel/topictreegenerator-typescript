import { LLMProvider } from '../../types/LLMProvider';

interface AISettingsFormProps {
  apiKey: string;
  model: string;
  provider: LLMProvider;
  baseUrl: string;
  onApiKeyChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onProviderChange: (value: LLMProvider) => void;
  onBaseUrlChange: (value: string) => void;
}

export function AISettingsForm({
  apiKey,
  model,
  provider,
  baseUrl,
  onApiKeyChange,
  onModelChange,
  onProviderChange,
  onBaseUrlChange
}: AISettingsFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
          KI-Provider
        </label>
        <select
          id="provider"
          value={provider.id}
          onChange={(e) => {
            const newProvider = provider.models.find(p => p.id === e.target.value);
            if (newProvider) {
              onProviderChange(newProvider);
            }
          }}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          {provider.models.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
          API Key
        </label>
        <input
          type="password"
          id="apiKey"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder={`${provider.name} API Key`}
        />
        <p className="mt-1 text-sm text-gray-500">
          Ihr API Key wird sicher im Browser gespeichert
        </p>
      </div>
      
      <div>
        <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
          KI-Modell
        </label>
        <select
          id="model"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          {provider.models.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Wählen Sie das zu verwendende KI-Modell
        </p>
      </div>

      <div>
        <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-2">
          API Basis-URL
        </label>
        <input
          type="text"
          id="baseUrl"
          value={baseUrl}
          onChange={(e) => onBaseUrlChange(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="https://api.example.com/v1"
        />
        <p className="mt-1 text-sm text-gray-500">
          Standard-URL: {provider.baseUrl}
        </p>
      </div>
    </div>
  );
}