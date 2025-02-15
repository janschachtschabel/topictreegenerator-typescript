import { Loader2 } from 'lucide-react';

interface GenerationStatusFormProps {
  isGenerating: boolean;
  status: string;
  currentPrompt: number;
  totalPrompts: number;
}

export function GenerationStatusForm({
  isGenerating,
  status,
  currentPrompt,
  totalPrompts
}: GenerationStatusFormProps) {
  if (!isGenerating) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{status}</span>
        <span className="text-sm text-gray-600">
          {currentPrompt} von {totalPrompts} Prompts
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-indigo-600 rounded-full h-2 transition-all duration-300"
          style={{
            width: `${totalPrompts > 0 ? (currentPrompt / totalPrompts) * 100 : 0}%`
          }}
        />
      </div>
    </div>
  );
}