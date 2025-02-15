import { DISCIPLINE_MAPPING, EDUCATIONAL_CONTEXT_MAPPING, EDUCATION_SECTOR_MAPPING } from '../../constants/mappings';

interface TopicSettingsFormProps {
  topic: string;
  discipline: string;
  context: string;
  sector: string;
  numMain: number;
  numSub: number;
  numLehrplan: number;
  includeAllgemeines: false | true | 'ai';
  includeMethodik: false | true | 'ai';
  useSubjectFamilies: boolean;
  onTopicChange: (value: string) => void;
  onDisciplineChange: (value: string) => void;
  onContextChange: (value: string) => void;
  onSectorChange: (value: string) => void;
  onNumMainChange: (value: number) => void;
  onNumSubChange: (value: number) => void;
  onNumLehrplanChange: (value: number) => void;
  onIncludeAllgemeinesChange: (value: false | true | 'ai') => void;
  onIncludeMethodikChange: (value: false | true | 'ai') => void;
  onUseSubjectFamiliesChange: (value: boolean) => void;
}

export function TopicSettingsForm({
  topic,
  discipline,
  context,
  sector,
  numMain,
  numSub,
  numLehrplan,
  includeAllgemeines,
  includeMethodik,
  useSubjectFamilies,
  onTopicChange,
  onDisciplineChange,
  onContextChange,
  onSectorChange,
  onNumMainChange,
  onNumSubChange,
  onNumLehrplanChange,
  onIncludeAllgemeinesChange,
  onIncludeMethodikChange,
  onUseSubjectFamiliesChange
}: TopicSettingsFormProps) {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
          Themenbaumthema und besondere Anweisungen
        </label>
        <textarea
          id="topic"
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Beschreiben Sie das Thema und fügen Sie bei Bedarf besondere Anweisungen hinzu"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="numMain" className="block text-sm font-medium text-gray-700">
            Hauptkategorien
          </label>
          <div className="mt-1 relative">
            <input
              type="range"
              id="numMain"
              value={numMain}
              onChange={(e) => onNumMainChange(Number(e.target.value))}
              min="1"
              max="30"
              step="1"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="mt-2 text-sm text-gray-600 text-center font-medium">
              {numMain} {numMain === 1 ? 'Kategorie' : 'Kategorien'}
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="numSub" className="block text-sm font-medium text-gray-700">
            Unterkategorien
          </label>
          <div className="mt-1 relative">
            <input
              type="range"
              id="numSub"
              value={numSub}
              onChange={(e) => onNumSubChange(Number(e.target.value))}
              min="0"
              max="30"
              step="1"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="mt-2 text-sm text-gray-600 text-center font-medium">
              {numSub} {numSub === 1 ? 'Kategorie' : 'Kategorien'}
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="numLehrplan" className="block text-sm font-medium text-gray-700">
            Weitere Unterkategorien
          </label>
          <div className="mt-1 relative">
            <input
              type="range"
              id="numLehrplan"
              value={numLehrplan}
              onChange={(e) => onNumLehrplanChange(Number(e.target.value))}
              min="0"
              max="30"
              step="1"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="mt-2 text-sm text-gray-600 text-center font-medium">
              {numLehrplan} {numLehrplan === 1 ? 'Kategorie' : 'Kategorien'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="discipline" className="block text-sm font-medium text-gray-700">
            Fachbereich
          </label>
          <select
            id="discipline"
            value={discipline}
            onChange={(e) => onDisciplineChange(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {Object.keys(DISCIPLINE_MAPPING).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="context" className="block text-sm font-medium text-gray-700">
            Bildungsstufe
          </label>
          <select
            id="context"
            value={context}
            onChange={(e) => onContextChange(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {Object.keys(EDUCATIONAL_CONTEXT_MAPPING).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          Sonderregeln für Hauptkategorien
          <span 
            className="ml-2 inline-block text-gray-400 hover:text-gray-600 cursor-help"
            title="Diese Optionen beeinflussen die Struktur der Hauptkategorien im Themenbaum"
          >
            ⓘ
          </span>
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label htmlFor="allgemeines" className="block text-sm font-medium text-gray-700">
              <div className="flex items-center">
                <span>Allgemeines</span>
                <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">Optional</span>
              </div>
            </label>
            <select
              id="allgemeines"
              value={includeAllgemeines ? (includeAllgemeines === 'ai' ? 'ai' : 'hardcoded') : 'none'}
              onChange={(e) => {
                const value = e.target.value;
                onIncludeAllgemeinesChange(value === 'none' ? false : value === 'ai' ? 'ai' : true);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 mt-2"
            >
              <option value="none">
                Nicht berücksichtigen
              </option>
              <option value="hardcoded">
                Hardcodiert hinzufügen
              </option>
              <option value="ai">
                KI-generiert
              </option>
            </select>
          </div>

          <div className="relative">
            <label htmlFor="methodik" className="block text-sm font-medium text-gray-700">
              <div className="flex items-center">
                <span>Methodik und Didaktik</span>
                <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">Optional</span>
              </div>
            </label>
            <select
              id="methodik"
              value={includeMethodik ? (includeMethodik === 'ai' ? 'ai' : 'hardcoded') : 'none'}
              onChange={(e) => {
                const value = e.target.value;
                onIncludeMethodikChange(value === 'none' ? false : value === 'ai' ? 'ai' : true);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 mt-2"
            >
              <option value="none">
                Nicht berücksichtigen
              </option>
              <option value="hardcoded">
                Hardcodiert hinzufügen
              </option>
              <option value="ai">
                KI-generiert
              </option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={useSubjectFamilies}
            onChange={(e) => onUseSubjectFamiliesChange(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-gray-700 flex items-center">
            Fachfamilien für Hauptkategorien
            <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">Experimentell</span>
          </span>
        </label>
      </div>
    </div>
  );
}