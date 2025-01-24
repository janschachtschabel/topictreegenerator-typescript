import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { DISCIPLINE_MAPPING, EDUCATIONAL_CONTEXT_MAPPING, EDUCATION_SECTOR_MAPPING } from '../constants/mappings';
import { TopicTree } from '../types/TopicTree';
import { generateStructuredText, createProperties, chunkDocumentContext } from '../utils/openai';
import { MAIN_PROMPT_TEMPLATE, SUB_PROMPT_TEMPLATE, LP_PROMPT_TEMPLATE, DOCUMENT_ANALYSIS_PROMPT, SECTOR_SUMMARY_PROMPT } from '../constants/prompts';
import { DocumentUpload } from './DocumentUpload';
import { supabase } from '../utils/supabase';
import { Trash2 } from 'lucide-react';

interface TopicFormProps {
  onGenerate: (tree: TopicTree) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  apiKey: string;
  model: string;
}

export default function TopicForm({ onGenerate, isGenerating, setIsGenerating, apiKey, model }: TopicFormProps) {
  const [topic, setTopic] = useState('Physik');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [targetAudience, setTargetAudience] = useState('Lehrkräfte und Bildungseinrichtungen');
  const [discipline, setDiscipline] = useState('Physik');
  const [context, setContext] = useState('Sekundarstufe II');
  const [sector, setSector] = useState('allgemeinbildend');
  const [numMain, setNumMain] = useState(10); // Default: 10
  const [numSub, setNumSub] = useState(4);    // Default: 4
  const [numLehrplan, setNumLehrplan] = useState(2); // Default: 2
  const [includeAllgemeines, setIncludeAllgemeines] = useState<false | true | 'ai'>(false);
  const [includeMethodik, setIncludeMethodik] = useState<false | true | 'ai'>(false);
  const [status, setStatus] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [totalPrompts, setTotalPrompts] = useState(0);
  const [documentContexts, setDocumentContexts] = useState<string[]>([]);
  const [canGenerate, setCanGenerate] = useState(false);
  const [showGenerateButton, setShowGenerateButton] = useState(false);
  const [knowledgeSource, setKnowledgeSource] = useState<'ai' | 'documents' | 'manual' | 'documents-sorted'>('ai');
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);

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

  const analyzeDocuments = async (apiKey: string, model: string) => {
    setStatus('Analysiere Dokumente...');
    const results = [];
    
    for (const context of documentContexts) {
      const prompt = DOCUMENT_ANALYSIS_PROMPT.replace('{document_content}', chunkDocumentContext(context));
      const result = await generateStructuredText(apiKey, prompt, model);
      results.push(result);
    }
    
    // Group categories by sector
    const sectorCategories: Record<string, string[]> = {
      grundbildend: [],
      allgemeinbildend: [],
      berufsbildend: [],
      akademisch: []
    };
    
    results.forEach(result => {
      if (result.primary_sector && result.main_categories) {
        sectorCategories[result.primary_sector].push(...result.main_categories);
      }
    });
    
    // Generate summaries for each sector
    const sectorSummaries: Record<string, string[]> = {};
    
    for (const [sector, categories] of Object.entries(sectorCategories)) {
      if (categories.length > 0) {
        const prompt = SECTOR_SUMMARY_PROMPT
          .replace('{sector}', sector)
          .replace('{category_lists}', categories.join('\n'))
          .replace('{num_main}', Math.min(categories.length, numMain).toString());
        
        const summary = await generateStructuredText(apiKey, prompt, model);
        sectorSummaries[sector] = summary;
      }
    }
    
    return sectorSummaries;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For manual generation, create a simple tree with one main category
    if (knowledgeSource === 'manual') {
      const tree: TopicTree = {
        collection: [{
          title: "Hauptkategorie 1",
          shorttitle: "HK1",
          properties: createProperties(
            "Hauptkategorie 1",
            "HK1",
            {
              grundbildend: "Hauptkategorie 1",
              allgemeinbildend: "Hauptkategorie 1",
              berufsbildend: "Hauptkategorie 1",
              akademisch: "Hauptkategorie 1"
            },
            "Erste Hauptkategorie des Themenbaums",
            ["hauptkategorie", "themenbaum"],
            DISCIPLINE_MAPPING[discipline],
            EDUCATIONAL_CONTEXT_MAPPING[context]
          ),
          subcollections: []
        }],
        metadata: {
          title: title,
          theme: topic,
          generation_settings: {
            num_main: 1,
            num_sub: 0,
            num_lehrplan: 0,
            discipline: discipline,
            educational_context: context,
            education_sector: sector,
            allgemeines_option: false,
            methodik_option: false
          },
          description: `Manuell erstellter Themenbaum für ${topic}`,
          target_audience: targetAudience,
          created_at: new Date().toISOString(),
          version: "1.0",
          author: author
        }
      };
      
      await saveTree(tree);
      onGenerate(tree);
      return;
    }
    
    setStatus('');
    setCurrentPrompt(0);

    if (!apiKey.trim()) {
      alert('Bitte geben Sie einen OpenAI API Key in den Einstellungen ein');
      return;
    }
    
    // Berechne die Gesamtanzahl der notwendigen Prompts
    const promptsForMain = 1; // Ein Prompt für alle Oberkategorien
    const promptsForSub = numMain; // Ein Prompt pro Oberkategorie für Unterkategorien
    const promptsForLehrplan = numMain * numSub; // Ein Prompt pro Unterkategorie für weitere Unterkategorien
    const totalPrompts = promptsForMain + promptsForSub + promptsForLehrplan;
    setTotalPrompts(totalPrompts);
    setCurrentPrompt(0);
    
    const updateProgress = () => {
      setCurrentPrompt(prev => {
        const next = prev + 1;
        return next;
      });
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

      // For documents-sorted mode, analyze documents first
      let sectorSummaries = {};
      if (knowledgeSource === 'documents-sorted') {
        sectorSummaries = await analyzeDocuments(apiKey, model);
        setStatus('Dokumente analysiert, generiere Themenbaum...');
      }

      const mainPrompt = MAIN_PROMPT_TEMPLATE
        .replace('{num_main}', numMain.toString())
        .replace('{themenbaumthema}', topic)
        .replace('{include_allgemeines}', includeAllgemeines === 'ai' ? 'Beginne mit einer Hauptkategorie "Allgemeines".' : '')
        .replace('{include_methodik}', includeMethodik === 'ai' ? 'Füge eine Hauptkategorie "Methodik und Didaktik" hinzu.' : '')
        .replace('{discipline_info}', knowledgeSource !== 'documents' ? disciplineInfo : '')
        .replace('{context_info}', knowledgeSource !== 'documents' ? contextInfo : '')
        .replace('{sector_info}', knowledgeSource !== 'documents' ? sectorInfo : '')
        + (documentContexts.length > 0 && (knowledgeSource === 'documents' || knowledgeSource === 'documents-sorted')
           ? `\n\nBerücksichtige bei der Generierung ${knowledgeSource === 'documents' ? 'ausschließlich' : 'zusätzlich'} folgende Kontexte aus den hochgeladenen Dokumenten:\n${
               documentContexts
                 .map(context => chunkDocumentContext(context))
                 .join('\n---\n')
             }`
           : '')
        + (knowledgeSource === 'documents' 
           ? '\n\nWICHTIG: Generiere die Themen AUSSCHLIESSLICH basierend auf den bereitgestellten Dokumenten!'
           : knowledgeSource === 'documents-sorted'
           ? `\n\nWICHTIG: Berücksichtige bei der Generierung die folgenden voranalysierten Hauptkategorien je Bildungssektor:\n${
               Object.entries(sectorSummaries)
                 .map(([sector, categories]) => `${sector}:\n${categories.join('\n')}`)
                 .join('\n\n')
             }`
           : '');

      setStatus('Generiere Hauptthemen...');
      console.log('Sende Hauptthemen-Prompt:', mainPrompt);
      const topics = await generateStructuredText(apiKey, mainPrompt, model);
      updateProgress(); // Updates currentPrompt

      // Create a list of all main topics for context
      const mainTopicsList = topics.map(t => t.title).join('\n- ');

      // Handle special categories
      let finalTopics = [...topics];
      
      // If AI-generated categories are present but not requested, remove them
      if (includeAllgemeines !== 'ai') {
        finalTopics = finalTopics.filter(t => t.title !== "Allgemeines");
      }
      if (includeMethodik !== 'ai') {
        finalTopics = finalTopics.filter(t => t.title !== "Methodik und Didaktik");
      }

      // Create main collections
      const collections = await Promise.all(finalTopics.map(async topic => {
        setStatus(`Generiere ${numSub} Unterkategorien für "${topic.title}"...`);
        
        // Generate subtopics for regular main topics
        const subPrompt = SUB_PROMPT_TEMPLATE
          .replace('{num_sub}', numSub.toString())
          .replace('{main_theme}', topic.title)
          .replace('{existing_main_topics}', mainTopicsList)
          .replace('{themenbaumthema}', topic)
          .replace('{discipline_info}', disciplineInfo)
          .replace('{context_info}', contextInfo)
          .replace('{sector_info}', sectorInfo);

        const subtopics = await generateStructuredText(apiKey, subPrompt, model);
        updateProgress(); // Updates currentPrompt
        
        // Create a list of all existing topics for context
        const existingTopics = topics.map(t => ({
          title: t.title,
          subtopics: t === topic ? subtopics.map(st => st.title) : []
        }));

        // Generate curriculum topics for each subtopic
        const subcollections = await Promise.all(subtopics.map(async subtopic => {
          setStatus(`Generiere ${numLehrplan} weitere Unterkategorien für "${subtopic.title}"...`);
          
          // Format existing topics for the prompt
          const existingTopicsText = existingTopics
            .map(t => `${t.title}${t.subtopics.length ? '\n  ' + t.subtopics.join('\n  ') : ''}`)
            .join('\n');

          const lpPrompt = LP_PROMPT_TEMPLATE
            .replace('{num_lp}', numLehrplan.toString())
            .replace('{main_theme}', topic.title)
            .replace('{existing_topics}', existingTopicsText)
            .replace('{sub_theme}', subtopic.title)
            .replace('{themenbaumthema}', topic)
            .replace('{discipline_info}', disciplineInfo)
            .replace('{context_info}', contextInfo)
            .replace('{sector_info}', sectorInfo);

          const lehrplanTopics = await generateStructuredText(apiKey, lpPrompt, model);
          updateProgress(); // Updates currentPrompt
          
          return {
            title: subtopic.title,
            shorttitle: subtopic.shorttitle,
            properties: createProperties(
              subtopic.title,
              subtopic.shorttitle,
              subtopic.alternative_titles,
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
                lp.alternative_titles,
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
            topic.alternative_titles,
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
            {
              grundbildend: "Allgemeines",
              allgemeinbildend: "Allgemeines",
              berufsbildend: "Allgemeines",
              akademisch: "Allgemeines"
            },
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
          shorttitle: "Methodik",
          properties: createProperties(
            "Methodik und Didaktik",
            "Methodik",
            {
              grundbildend: "Methodik und Didaktik",
              allgemeinbildend: "Methodik und Didaktik",
              berufsbildend: "Methodik und Didaktik",
              akademisch: "Methodik und Didaktik"
            },
            "Pädagogische Methoden und didaktische Ansätze",
            ["Methodik", "Didaktik", "Lehrmethoden"],
            DISCIPLINE_MAPPING[discipline],
            EDUCATIONAL_CONTEXT_MAPPING[context]
          ),
          subcollections: []
        });
      }

      // Combine collections
      const finalCollections = [...collections, ...optionalCollections];

      const tree: TopicTree = {
        collection: finalCollections,
        metadata: {
          title: title || topic,
          theme: topic,
          generation_settings: {
            num_main: numMain,
            num_sub: numSub,
            num_lehrplan: numLehrplan,
            discipline: discipline,
            educational_context: context,
            education_sector: sector,
            allgemeines_option: includeAllgemeines,
            methodik_option: includeMethodik
          },
          description: `Generierter Themenbaum für ${topic}`,
          target_audience: targetAudience,
          created_at: new Date().toISOString(),
          version: "1.0",
          author: author
        }
      };

      await saveTree(tree);
      setStatus('Themenbaum erfolgreich generiert!');
      setIsGenerating(false);
    } catch (error) {
      console.error('Fehler bei der Generierung:', error);
      setStatus(`Fehler: ${error.message}`);
      setIsGenerating(false);
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Metadaten */}
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Titel des Themenbaums
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="z.B. Physik Sekundarstufe II"
            required
          />
        </div>
        
        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
            Autor
          </label>
          <input
            type="text"
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Name des Autors"
            required
          />
        </div>
        
        <div>
          <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-2">
            Zielgruppe
          </label>
          <input
            type="text"
            id="targetAudience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="z.B. Lehrkräfte und Bildungseinrichtungen"
            required
          />
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
            Oberkategorien
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
            Unterkategorien
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
            Weitere Unterkategorien
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

      <div className="space-y-4">
        <div className="relative">
          <label htmlFor="allgemeines" className="block text-sm font-medium text-gray-700 mb-2">
            Allgemeines
            <span 
              className="ml-2 inline-block text-gray-400 hover:text-gray-600 cursor-help"
              title="Wählen Sie, wie die Kategorie 'Allgemeines' in den Themenbaum integriert werden soll"
            >
              ⓘ
            </span>
          </label>
          <select
            id="allgemeines"
            value={includeAllgemeines ? (includeAllgemeines === 'ai' ? 'ai' : 'hardcoded') : 'none'}
            onChange={(e) => {
              const value = e.target.value;
              setIncludeAllgemeines(value === 'none' ? false : value === 'ai' ? 'ai' : true);
            }}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
          <label htmlFor="methodik" className="block text-sm font-medium text-gray-700 mb-2">
            Methodik und Didaktik
            <span 
              className="ml-2 inline-block text-gray-400 hover:text-gray-600 cursor-help"
              title="Wählen Sie, wie die Kategorie 'Methodik und Didaktik' in den Themenbaum integriert werden soll"
            >
              ⓘ
            </span>
          </label>
          <select
            id="methodik"
            value={includeMethodik ? (includeMethodik === 'ai' ? 'ai' : 'hardcoded') : 'none'}
            onChange={(e) => {
              const value = e.target.value;
              setIncludeMethodik(value === 'none' ? false : value === 'ai' ? 'ai' : true);
            }}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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

      <div className="grid grid-cols-1 gap-6">
        <div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Wissensquelle</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
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
                  checked={knowledgeSource === 'manual'}
                  onChange={() => {
                    setKnowledgeSource('manual');
                    setCanGenerate(true);
                    setShowGenerateButton(true);
                  }}
                  className="rounded-full border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <div className="ml-2">
                  <span className="text-sm font-medium text-gray-700">Manuelle Erstellung</span>
                  <div className="w-2 h-2 inline-block ml-2 rounded-full bg-orange-100"></div>
                </div>
              </label>
              <label className="flex items-center p-2 rounded hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  checked={knowledgeSource === 'documents'}
                  onChange={() => {
                    setKnowledgeSource('documents');
                    setCanGenerate(documentContexts.length > 0);
                    setShowGenerateButton(documentContexts.length > 0);
                  }}
                  className="rounded-full border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div className="ml-2">
                  <span className="text-sm font-medium text-gray-700">Nur Dokumente (direkt)</span>
                  <div className="w-2 h-2 inline-block ml-2 rounded-full bg-green-100"></div>
                </div>
              </label>
              <label className="flex items-center p-2 rounded hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  checked={knowledgeSource === 'documents-sorted'}
                  onChange={() => {
                    setKnowledgeSource('documents-sorted');
                    setCanGenerate(documentContexts.length > 0);
                    setShowGenerateButton(documentContexts.length > 0);
                  }}
                  className="rounded-full border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div className="ml-2">
                  <span className="text-sm font-medium text-gray-700">Nur Dokumente mit Listensortierung</span>
                  <div className="w-2 h-2 inline-block ml-2 rounded-full bg-purple-100"></div>
                </div>
              </label>
            </div>
          </div>

          {(knowledgeSource === 'documents' || knowledgeSource === 'documents-sorted') && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Dokumente für Kontext</h3>
              <DocumentUpload 
                onDocumentsProcessed={(contexts) => {
                  setDocumentContexts(contexts);
                  setShowGenerateButton(contexts.length > 0);
                  setCanGenerate(contexts.length > 0);
                }}
                onDocumentIdsUpdate={(ids) => setDocumentIds(ids)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Generation Status */}
      {isGenerating && (
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
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isGenerating || !title || !author || (knowledgeSource === 'documents' && documentContexts.length === 0)}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <div className="flex items-center">
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              <span>Generiere...</span>
            </div>
          ) : knowledgeSource === 'manual' ? (
            'Themenbaum erstellen'
          ) : (
            'Themenbaum generieren'
          )}
        </button>
      </div>
    </form>
  );
}