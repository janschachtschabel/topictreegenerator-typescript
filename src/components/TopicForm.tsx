import { useState, useEffect } from 'react';
import { Loader2, Settings } from 'lucide-react';
import { DISCIPLINE_MAPPING, EDUCATIONAL_CONTEXT_MAPPING, EDUCATION_SECTOR_MAPPING } from '../constants/mappings';
import { TopicTree } from '../types/TopicTree';
import { generateStructuredText, createProperties, chunkDocumentContext } from '../utils/openai';
import { MAIN_PROMPT_TEMPLATE, SUB_PROMPT_TEMPLATE, LP_PROMPT_TEMPLATE } from '../constants/prompts';
import { DocumentUpload } from './DocumentUpload';
import { supabase } from '../utils/supabase';
import { Trash2 } from 'lucide-react';

interface TopicFormProps {
  onGenerate: (tree: TopicTree) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
}

export default function TopicForm({ onGenerate, isGenerating, setIsGenerating }: TopicFormProps) {
  const [topic, setTopic] = useState('Physik');
  const [discipline, setDiscipline] = useState('Physik');
  const [context, setContext] = useState('Sekundarstufe II');
  const [sector, setSector] = useState('Allgemeinbildend');
  const [showSettings, setShowSettings] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [numMain, setNumMain] = useState(10); // Default: 10
  const [numSub, setNumSub] = useState(4);    // Default: 4
  const [numLehrplan, setNumLehrplan] = useState(2); // Default: 2
  const [includeAllgemeines, setIncludeAllgemeines] = useState(false);
  const [includeMethodik, setIncludeMethodik] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [documentContexts, setDocumentContexts] = useState<string[]>([]);
  const [canGenerate, setCanGenerate] = useState(false);
  const [showGenerateButton, setShowGenerateButton] = useState(false);
  const [knowledgeSource, setKnowledgeSource] = useState<'ai' | 'hybrid' | 'documents'>('hybrid');
  const [documentIds, setDocumentIds] = useState<string[]>([]);

  const saveTree = async (tree: TopicTree) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('topic_trees')
      .insert({
        title: tree.metadata.title,
        tree_data: tree,
        user_id: user.id,
        document_ids: documentIds
      })
      .select()
      .single();

    if (error) {
      console.error('Fehler beim Speichern des Themenbaums:', error);
      alert('Fehler beim Speichern des Themenbaums');
      return;
    }

    // Benachrichtige die übergeordnete Komponente über die Änderung
    onGenerate(tree);
  };

  const resetCurrentTree = () => {
    onGenerate(null);
    setDocumentIds([]);
    setDocumentContexts([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setStatus('');
    setProgress(0);
    setCurrentStep(0);

    if (!apiKey.trim()) {
      alert('Bitte geben Sie einen OpenAI API Key in den Einstellungen ein');
      setShowSettings(true);
      return;
    }
    
    // Berechne die Gesamtanzahl der zu generierenden Themen
    const totalTopics = numMain + (numMain * numSub) + (numMain * numSub * numLehrplan);
    setTotalSteps(totalTopics);
    
    const updateProgress = (current: number) => {
      setCurrentStep(current);
      setProgress((current / totalTopics) * 100);
    };
    
    setIsGenerating(true);
    setStatus('Verbinde mit OpenAI API...');
    
    try {
      const disciplineInfo = discipline !== "Keine Vorgabe" ? ` im Fach ${discipline}` : '';
      const contextInfo = context !== "Keine Vorgabe" ? ` für die ${context}` : '';
      const sectorInfo = sector !== "Keine Vorgabe" ? ` im ${sector.toLowerCase()}en Bildungssektor` : '';

      // Validate API key format before making request
      if (!apiKey.trim() || !apiKey.startsWith('sk-')) {
        throw new Error('Bitte geben Sie einen gültigen OpenAI API Key ein. Der Key muss mit "sk-" beginnen.');
      }
      console.log('Starte Generierung mit Parametern:', {
        topic,
        discipline,
        context,
        sector,
        model,
        numMain
      });

      const mainPrompt = MAIN_PROMPT_TEMPLATE
        .replace('{num_main}', numMain.toString())
        .replace('{themenbaumthema}', topic)
        .replace('{discipline_info}', knowledgeSource !== 'documents' ? disciplineInfo : '')
        .replace('{context_info}', knowledgeSource !== 'documents' ? contextInfo : '')
        .replace('{sector_info}', knowledgeSource !== 'documents' ? sectorInfo : '')
        + (documentContexts.length > 0 && knowledgeSource !== 'ai' 
           ? `\n\nBerücksichtige bei der Generierung ${knowledgeSource === 'documents' ? 'ausschließlich' : 'zusätzlich'} folgende Kontexte aus den hochgeladenen Dokumenten:\n${
               documentContexts
                 .map(context => chunkDocumentContext(context))
                 .join('\n---\n')
             }`
           : '')
        + (knowledgeSource === 'documents' 
           ? '\n\nWICHTIG: Generiere die Themen AUSSCHLIESSLICH basierend auf den bereitgestellten Dokumenten!' 
           : '');

      setStatus('Generiere Hauptthemen...');
      console.log('Sende Hauptthemen-Prompt:', mainPrompt);
      const topics = await generateStructuredText(apiKey, mainPrompt, model);
      updateProgress(numMain);

      // Create main collections
      const collections = await Promise.all(topics.map(async topic => {
        setStatus(`Generiere ${numSub} Fachthemen für "${topic.title}"...`);
        
        // Generate subtopics for each main topic
        const subPrompt = SUB_PROMPT_TEMPLATE
          .replace('{num_sub}', numSub.toString())
          .replace('{main_theme}', topic.title)
          .replace('{themenbaumthema}', topic)
          .replace('{discipline_info}', disciplineInfo)
          .replace('{context_info}', contextInfo)
          .replace('{sector_info}', sectorInfo);

        const subtopics = await generateStructuredText(apiKey, subPrompt, model);
        updateProgress(currentStep + numSub);
        
        // Generate curriculum topics for each subtopic
        const subcollections = await Promise.all(subtopics.map(async subtopic => {
          setStatus(`Generiere ${numLehrplan} Lehrplanthemen für "${subtopic.title}"...`);
          
          const lpPrompt = LP_PROMPT_TEMPLATE
            .replace('{num_lp}', numLehrplan.toString())
            .replace('{sub_theme}', subtopic.title)
            .replace('{themenbaumthema}', topic)
            .replace('{discipline_info}', disciplineInfo)
            .replace('{context_info}', contextInfo)
            .replace('{sector_info}', sectorInfo);

          const lehrplanTopics = await generateStructuredText(apiKey, lpPrompt, model);
          updateProgress(currentStep + numLehrplan);
          
          return {
            title: subtopic.title,
            shorttitle: subtopic.shorttitle,
            properties: createProperties(
              subtopic.title,
              subtopic.shorttitle,
              subtopic.description,
              subtopic.keywords,
              DISCIPLINE_MAPPING[discipline],
              EDUCATIONAL_CONTEXT_MAPPING[context]
            ),
            subcollections: lehrplanTopics.map(lp => ({
              title: lp.title,
              shorttitle: lp.shorttitle,
              properties: createProperties(
                lp.title,
                lp.shorttitle,
                lp.description,
                lp.keywords,
                DISCIPLINE_MAPPING[discipline],
                EDUCATIONAL_CONTEXT_MAPPING[context]
              ),
              subcollections: []
            }))
          };
        }));

        return {
          title: topic.title,
          shorttitle: topic.shorttitle,
          properties: createProperties(
            topic.title,
            topic.shorttitle,
            topic.description,
            topic.keywords,
            DISCIPLINE_MAPPING[discipline],
            EDUCATIONAL_CONTEXT_MAPPING[context]
          ),
          subcollections
        };
      }));

      // Create optional main topics
      const optionalCollections = [];
      
      if (includeAllgemeines) {
        optionalCollections.push({
          title: "Allgemeines",
          shorttitle: "Allg",
          properties: createProperties(
            "Allgemeines",
            "Allg",
            "Allgemeine Informationen und übergreifende Themen",
            ["Allgemein", "Übergreifend"],
            DISCIPLINE_MAPPING[discipline],
            EDUCATIONAL_CONTEXT_MAPPING[context]
          ),
          subcollections: []
        });
      }

      if (includeMethodik) {
        optionalCollections.push({
          title: "Methodik und Didaktik",
          shorttitle: "MuD",
          properties: createProperties(
            "Methodik und Didaktik",
            "MuD",
            "Methodische und didaktische Konzepte und Ansätze",
            ["Methodik", "Didaktik", "Lehrmethoden"],
            DISCIPLINE_MAPPING[discipline],
            EDUCATIONAL_CONTEXT_MAPPING[context]
          ),
          subcollections: []
        });
      }

      const tree: TopicTree = {
        collection: [
          ...(includeAllgemeines ? [{
            title: "Allgemeines",
            shorttitle: "Allg",
            properties: createProperties(
              "Allgemeines",
              "Allg",
              "Allgemeine Informationen und übergreifende Themen",
              ["Allgemein", "Übergreifend"],
              DISCIPLINE_MAPPING[discipline],
              EDUCATIONAL_CONTEXT_MAPPING[context]
            ),
            subcollections: []
          }] : []),
          ...collections,
          ...(includeMethodik ? [{
            title: "Methodik und Didaktik",
            shorttitle: "MuD",
            properties: createProperties(
              "Methodik und Didaktik",
              "MuD",
              "Methodische und didaktische Konzepte und Ansätze",
              ["Methodik", "Didaktik", "Lehrmethoden"],
              DISCIPLINE_MAPPING[discipline],
              EDUCATIONAL_CONTEXT_MAPPING[context]
            ),
            subcollections: []
          }] : [])
        ],
        metadata: {
          title: topic,
          description: `Themenbaum für ${topic}`,
          target_audience: "Lehrkräfte und Bildungseinrichtungen",
          created_at: new Date().toISOString(),
          version: "1.0",
          author: "Themenbaum Generator"
        }
      };

      // Speichere den generierten Baum
      await saveTree(tree);
      onGenerate(tree);
    } catch (error) {
      console.error('Fehler bei der Generierung des Themenbaums:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unbekannter Fehler',
        errorName: error instanceof Error ? error.name : 'Unknown'
      });

      if (error instanceof Error && error.message.toLowerCase().includes('api key')) {
        alert('Der OpenAI API Key ist ungültig. Bitte überprüfen Sie Ihre Eingabe in den Einstellungen.');
        setShowSettings(true);
      } else {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Ein unerwarteter Fehler ist aufgetreten.';
        setStatus(`Fehler: ${errorMessage}`);
        alert(`Fehler bei der Generierung: ${errorMessage}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      {/* Haupteinstellungen */}
      <div className="space-y-6">
        {/* KI Einstellungen */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-4">KI-Einstellungen</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="sk-..."
                required
              />
            </div>
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                KI-Modell
              </label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
            Themenbaumthema
          </label>
          <textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            rows={3}
            required
          />
        </div>

        {/* Themenanzahl Einstellungen */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="numMain" className="block text-sm font-medium text-gray-700">
              Hauptthemen
            </label>
            <input
              type="number"
              id="numMain"
              value={numMain}
              onChange={(e) => setNumMain(Number(e.target.value))}
              min="1"
              max="20"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="numSub" className="block text-sm font-medium text-gray-700">
              Fachthemen
            </label>
            <input
              type="number"
              id="numSub"
              value={numSub}
              onChange={(e) => setNumSub(Number(e.target.value))}
              min="1"
              max="20"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="numLehrplan" className="block text-sm font-medium text-gray-700">
              Lehrplanthemen
            </label>
            <input
              type="number"
              id="numLehrplan"
              value={numLehrplan}
              onChange={(e) => setNumLehrplan(Number(e.target.value))}
              min="1"
              max="20"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 mb-2">
              Fachbereich
            </label>
            <select
              id="discipline"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {Object.keys(DISCIPLINE_MAPPING).map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
              Bildungsstufe
            </label>
            <select
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {Object.keys(EDUCATIONAL_CONTEXT_MAPPING).map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="sector" className="block text-sm font-medium text-gray-700 mb-2">
            Bildungssektor
          </label>
          <select
            id="sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {Object.keys(EDUCATION_SECTOR_MAPPING).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 mt-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeAllgemeines}
              onChange={(e) => setIncludeAllgemeines(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Allgemeines (wird am Anfang eingefügt)</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeMethodik}
              onChange={(e) => setIncludeMethodik(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Methodik und Didaktik (wird am Ende eingefügt)</span>
          </label>
        </div>
      </div>

      {/* Rest of the component remains unchanged */}
      <div className="grid grid-cols-1 gap-6 mt-6">
        {/* Linke Seite: Dokumentenupload und Wissensquelle */}
        <div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Wissensquelle</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              {/* Hilfetext für Wissensquellen */}
              <div className="mb-4 text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-2">Wissensquellen im Vergleich:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="w-4 h-4 mt-1 mr-2 rounded-full bg-blue-100 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-gray-700">Nur KI-Wissen:</span>
                      <p className="text-gray-600">Generiert Themen basierend auf dem trainierten Wissen der KI. Ideal für allgemeine und standardisierte Themenstrukturen.</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-4 h-4 mt-1 mr-2 rounded-full bg-purple-100 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-gray-700">KI-Wissen + Dokumente:</span>
                      <p className="text-gray-600">Kombiniert KI-Wissen mit Ihren Dokumenten. Optimal für angepasste Themenbäume, die sowohl Standards als auch spezifische Inhalte berücksichtigen.</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-4 h-4 mt-1 mr-2 rounded-full bg-green-100 flex-shrink-0"></div>
                    <div>
                      <span className="font-medium text-gray-700">Nur Dokumente:</span>
                      <p className="text-gray-600">Erstellt Themen ausschließlich aus Ihren Dokumenten. Perfekt für hochspezialisierte oder institutionsspezifische Themenbäume.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <label className="flex items-center p-2 rounded hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  checked={knowledgeSource === 'ai'}
                  onChange={() => {
                    setKnowledgeSource('ai');
                    setCanGenerate(true);
                    setShowGenerateButton(true);
                  }}
                  className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-2">
                  <span className="text-sm font-medium text-gray-700">Nur KI-Wissen</span>
                  <div className="w-2 h-2 inline-block ml-2 rounded-full bg-blue-100"></div>
                </div>
              </label>
              <label className="flex items-center p-2 rounded hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  checked={knowledgeSource === 'hybrid'}
                  onChange={() => setKnowledgeSource('hybrid')}
                  className="rounded-full border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div className="ml-2">
                  <span className="text-sm font-medium text-gray-700">KI-Wissen + Dokumente</span>
                  <div className="w-2 h-2 inline-block ml-2 rounded-full bg-purple-100"></div>
                </div>
              </label>
              <label className="flex items-center p-2 rounded hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  checked={knowledgeSource === 'documents'}
                  onChange={() => setKnowledgeSource('documents')}
                  className="rounded-full border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div className="ml-2">
                  <span className="text-sm font-medium text-gray-700">Nur Dokumente</span>
                  <div className="w-2 h-2 inline-block ml-2 rounded-full bg-green-100"></div>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Dokumente für Kontext</h3>
            <DocumentUpload 
              onDocumentsProcessed={(contexts) => {
                setDocumentContexts(contexts);
                setShowGenerateButton(knowledgeSource === 'ai' || contexts.length > 0);
                setCanGenerate(knowledgeSource === 'ai' || contexts.length > 0);
              }} 
            />
            {documentContexts.length > 0 && (
              <div className="mt-2 text-sm text-green-600">
                {documentContexts.length} {documentContexts.length === 1 ? 'Dokument' : 'Dokumente'} verarbeitet
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isGenerating || (!canGenerate || (knowledgeSource !== 'ai' && documentContexts.length === 0))}
        className={`w-full flex flex-col items-center space-y-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${
          showGenerateButton 
            ? 'text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500' 
            : 'text-gray-400 bg-gray-100'
        } disabled:opacity-50`}
      >
        <div className="flex items-center">
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              {status || 'Generiere Themenbaum...'}
            </>
          ) : (
            showGenerateButton 
              ? 'Themenbaum generieren' 
              : knowledgeSource === 'ai' 
                ? 'Themenbaum generieren' 
                : 'Bitte zuerst Dokumente hochladen'
          )}
        </div>
        {isGenerating && (
          <div className="w-full space-y-1">
            <div className="w-full bg-indigo-200 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-indigo-100">
              {currentStep} von {totalSteps} Themen generiert ({Math.round(progress)}%)
            </div>
          </div>
        )}
      </button>
      {status && !isGenerating && (
        <p className={`mt-2 text-sm text-center ${status.includes('Fehler') ? 'text-red-600' : 'text-green-600'}`}>
          {status}
        </p>
      )}
    </form>
  );
}