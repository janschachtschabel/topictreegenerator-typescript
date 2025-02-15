interface KnowledgeSourceFormProps {
  knowledgeSource: 'ai' | 'documents' | 'manual' | 'documents-sorted';
  onKnowledgeSourceChange: (value: 'ai' | 'documents' | 'manual' | 'documents-sorted') => void;
  onCanGenerateChange: (value: boolean) => void;
  onShowGenerateButtonChange: (value: boolean) => void;
  documentContexts: string[];
}

export function KnowledgeSourceForm({
  knowledgeSource,
  onKnowledgeSourceChange,
  onCanGenerateChange,
  onShowGenerateButtonChange,
  documentContexts
}: KnowledgeSourceFormProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
        <span>Wissensquelle</span>
        <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">Erforderlich</span>
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center p-2 rounded hover:bg-gray-100 transition-colors">
          <input
            type="radio"
            checked={knowledgeSource === 'ai'}
            onChange={() => {
              onKnowledgeSourceChange('ai');
              onCanGenerateChange(true);
              onShowGenerateButtonChange(true);
            }}
            className="sr-only"
          />
          <div className={`p-4 rounded-lg border-2 w-full transition-all duration-200 ${
            knowledgeSource === 'ai' 
              ? 'border-indigo-500 bg-indigo-50' 
              : 'border-gray-200 hover:border-indigo-200'
          }`}>
            <div className="flex items-center mb-2">
              <span className="text-sm font-medium text-gray-700">KI-Wissen</span>
              <div className="w-2 h-2 ml-2 rounded-full bg-indigo-500"></div>
            </div>
            <p className="text-xs text-gray-500">Generiere Themen basierend auf KI-Wissen</p>
          </div>
        </label>
        <label className="flex items-center p-2 rounded hover:bg-gray-100 transition-colors">
          <input
            type="radio"
            checked={knowledgeSource === 'manual'}
            onChange={() => {
              onKnowledgeSourceChange('manual');
              onCanGenerateChange(true);
              onShowGenerateButtonChange(true);
            }}
            className="sr-only"
          />
          <div className={`p-4 rounded-lg border-2 w-full transition-all duration-200 ${
            knowledgeSource === 'manual' 
              ? 'border-orange-500 bg-orange-50' 
              : 'border-gray-200 hover:border-orange-200'
          }`}>
            <div className="flex items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Manuelle Erstellung</span>
              <div className="w-2 h-2 ml-2 rounded-full bg-orange-500"></div>
            </div>
            <p className="text-xs text-gray-500">Erstelle und strukturiere Themen selbst</p>
          </div>
        </label>
        <label className="flex items-center p-2 rounded hover:bg-gray-100 transition-colors">
          <input
            type="radio"
            checked={knowledgeSource === 'documents'}
            onChange={() => {
              onKnowledgeSourceChange('documents');
              onCanGenerateChange(documentContexts.length > 0);
              onShowGenerateButtonChange(documentContexts.length > 0);
            }}
            className="sr-only"
          />
          <div className={`p-4 rounded-lg border-2 w-full transition-all duration-200 ${
            knowledgeSource === 'documents' 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-200 hover:border-green-200'
          }`}>
            <div className="flex items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Dokumentenwissen</span>
              <div className="w-2 h-2 ml-2 rounded-full bg-green-500"></div>
            </div>
            <p className="text-xs text-gray-500">Generiere Themen aus hochgeladenen Dokumenten</p>
          </div>
        </label>
        <label className="flex items-center p-2 rounded hover:bg-gray-100 transition-colors">
          <input
            type="radio"
            checked={knowledgeSource === 'documents-sorted'}
            onChange={() => {
              onKnowledgeSourceChange('documents-sorted');
              onCanGenerateChange(documentContexts.length > 0);
              onShowGenerateButtonChange(documentContexts.length > 0);
            }}
            className="sr-only"
          />
          <div className={`p-4 rounded-lg border-2 w-full transition-all duration-200 ${
            knowledgeSource === 'documents-sorted' 
              ? 'border-purple-500 bg-purple-50' 
              : 'border-gray-200 hover:border-purple-200'
          }`}>
            <div className="flex items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Dokumentenwissen (Sortiert)</span>
              <div className="w-2 h-2 ml-2 rounded-full bg-purple-500"></div>
            </div>
            <p className="text-xs text-gray-500">Generiere sortierte Themen aus Dokumenten</p>
          </div>
        </label>
      </div>
    </div>
  );
}