export interface LLMModel {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface LLMProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: LLMModel[];
  isDefault?: boolean;
}

export const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', isDefault: true },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'o3-mini', name: 'O3 Mini' }
    ],
    isDefault: true
  }
];

export function getDefaultProvider(): LLMProvider {
  return LLM_PROVIDERS.find(p => p.isDefault) || LLM_PROVIDERS[0];
}

export function getDefaultModel(provider: LLMProvider): LLMModel {
  return provider.models.find(m => m.isDefault) || provider.models[0];
}

export function getProviderById(id: string): LLMProvider | undefined {
  return LLM_PROVIDERS.find(p => p.id === id);
}