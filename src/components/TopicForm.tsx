import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { TopicTree } from '../types/TopicTree';
import { generateStructuredText, createProperties, chunkDocumentContext } from '../utils/openai';
import { DocumentUpload } from './DocumentUpload';
import { supabase } from '../utils/supabase';
import { MetadataForm } from './forms/MetadataForm';
import { TopicSettingsForm } from './forms/TopicSettingsForm';
import { KnowledgeSourceForm } from './forms/KnowledgeSourceForm';
import { GenerationStatusForm } from './forms/GenerationStatusForm';
import { DISCIPLINE_MAPPING, EDUCATIONAL_CONTEXT_MAPPING } from '../constants/mappings';
import { MAIN_PROMPT_TEMPLATE, SUB_PROMPT_TEMPLATE, LP_PROMPT_TEMPLATE } from '../constants/prompts';

interface TopicFormProps {
  onGenerate: (tree: TopicTree) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  apiKey: string;
  model: string;
  provider: any;
  baseUrl: string;
}

export default function TopicForm({ 
  onGenerate, 
  isGenerating, 
  setIsGenerating, 
  apiKey, 
  model, 
  provider, 
  baseUrl 
}: TopicFormProps) {
  // Metadata state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  
  // Topic settings state
  const [topic, setTopic] = useState('');
  const [discipline, setDiscipline] = useState('Keine Vorgabe');
  const [context, setContext] = useState('Keine Vorgabe');
  const [sector, setSector] = useState('Keine Vorgabe');
  const [numMain, setNumMain] = useState(10);
  const [numSub, setNumSub] = useState(4);
  const [numLehrplan, setNumLehrplan] = useState(2);
  const [includeAllgemeines, setIncludeAllgemeines] = useState<false | true | 'ai'>(false);
  const [includeMethodik, setIncludeMethodik] = useState<false | true | 'ai'>(false);
  const [useSubjectFamilies, setUseSubjectFamilies] = useState(false);
  
  // Generation state
  const [status, setStatus] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [totalPrompts, setTotalPrompts] = useState(0);
  const [documentContexts, setDocumentContexts] = useState<string[]>([]);
  const [canGenerate, setCanGenerate] = useState(false);
  const [showGenerateButton, setShowGenerateButton] = useState(false);
  const [knowledgeSource, setKnowledgeSource] = useState<'ai' | 'documents' | 'manual' | 'documents-sorted'>('ai');
  const [documentIds, setDocumentIds] = useState<string[]>([]);

  const saveTree = async (tree: TopicTree) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      // First, check if a tree with this title already exists
      const { data: existingTree, error: fetchError } = await supabase
        .from('topic_trees')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('title', tree.metadata.title)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
        throw fetchError;
      }

      if (existingTree) {
        // Ask user if they want to update the existing tree
        const shouldUpdate = window.confirm(
          `Ein Themenbaum mit dem Titel "${tree.metadata.title}" existiert bereits. ` +
          'Möchten Sie den bestehenden Themenbaum aktualisieren?'
        );

        if (!shouldUpdate) {
          // Ask for a new title
          const newTitle = window.prompt(
            'Bitte geben Sie einen neuen Titel für den Themenbaum ein:',
            `${tree.metadata.title} (Kopie)`
          );

          if (!newTitle) {
            throw new Error('Speichern abgebrochen');
          }

          // Update the tree title
          tree.metadata.title = newTitle.trim();
        }
      }

      // Now save/update the tree
      const { error } = await supabase
        .from('topic_trees')
        .upsert({
          tree_data: tree,
          title: tree.metadata.title,
          user_id: user.id,
          document_ids: documentIds
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving tree:', error);
      if (error instanceof Error) {
        throw new Error(
          error.message === 'Speichern abgebrochen'
            ? error.message
            : 'Fehler beim Speichern des Themenbaums'
        );
      }
      throw new Error('Fehler beim Speichern des Themenbaums');
    }
  };

  // Effect for generation status events
  useEffect(() => {
    const handleGenerationStatus = (event: CustomEvent) => {
      setStatus(event.detail);
    };

    window.addEventListener('generationStatus', handleGenerationStatus as EventListener);
    
    return () => {
      window.removeEventListener('generationStatus', handleGenerationStatus as EventListener);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      alert('Bitte geben Sie einen Titel ein.');
      return;
    }
    
    setIsGenerating(true);
    setCurrentPrompt(0);
    setTotalPrompts(0);
    setStatus('Initialisiere...');

    try {
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
            title: title || topic,
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

      // Calculate total number of prompts
      const promptsForMain = 1;
      const promptsForSub = numMain * (numSub > 0 ? 1 : 0);
      const promptsForLehrplan = numMain * numSub * (numLehrplan > 0 ? 1 : 0);
      const totalPrompts = promptsForMain + promptsForSub + promptsForLehrplan;
      setTotalPrompts(totalPrompts);

      // Process document context if using documents
      let documentContext = '';
      if (knowledgeSource === 'documents' || knowledgeSource === 'documents-sorted') {
        documentContext = documentContexts.join('\n\n');
        if (!documentContext) {
          throw new Error('Keine Dokumente zum Verarbeiten gefunden');
        }
        documentContext = chunkDocumentContext(documentContext);
      }

      // Generate main topics
      setStatus('Generiere Hauptthemen...');
      const mainPrompt = MAIN_PROMPT_TEMPLATE
        .replace('{num_main}', numMain.toString())
        .replace('{themenbaumthema}', topic)
        .replace('{discipline_info}', discipline !== "Keine Vorgabe" ? ` im Fach ${discipline}` : '')
        .replace('{context_info}', context !== "Keine Vorgabe" ? ` für die ${context}` : '')
        .replace('{sector_info}', sector !== "Keine Vorgabe" ? ` im ${sector.toLowerCase()}en Bildungssektor` : '')
        .replace('{include_allgemeines}', includeAllgemeines === 'ai' ? 'Beginne mit einer Hauptkategorie "Allgemeines".' : '')
        .replace('{include_methodik}', includeMethodik === 'ai' ? 'Füge eine Hauptkategorie "Methodik und Didaktik" am Ende hinzu.' : '')
        + (documentContext ? `\n\nBerücksichtige folgenden Kontext:\n${documentContext}` : '');

      const mainTopics = await generateStructuredText(apiKey, mainPrompt, model, baseUrl);
      setCurrentPrompt(prev => prev + 1);

      // Process each main topic
      const collection = await Promise.all(mainTopics.map(async (mainTopic) => {
        let subcollections = [];
        
        if (numSub > 0) {
          setStatus(`Generiere Unterthemen für "${mainTopic.title}"...`);
          
          const subPrompt = SUB_PROMPT_TEMPLATE
            .replace('{num_sub}', numSub.toString())
            .replace('{main_theme}', mainTopic.title)
            .replace('{existing_main_topics}', mainTopics.map(t => t.title).join('\n'))
            .replace('{themenbaumthema}', topic)
            .replace('{discipline_info}', discipline !== "Keine Vorgabe" ? ` im Fach ${discipline}` : '')
            .replace('{context_info}', context !== "Keine Vorgabe" ? ` für die ${context}` : '')
            .replace('{sector_info}', sector !== "Keine Vorgabe" ? ` im ${sector.toLowerCase()}en Bildungssektor` : '')
            + (documentContext ? `\n\nBerücksichtige folgenden Kontext:\n${documentContext}` : '');

          const subTopics = await generateStructuredText(apiKey, subPrompt, model, baseUrl);
          setCurrentPrompt(prev => prev + 1);

          // Process each subtopic
          subcollections = await Promise.all(subTopics.map(async (subTopic) => {
            let lpSubcollections = [];
            
            if (numLehrplan > 0) {
              setStatus(`Generiere Lehrplanthemen für "${subTopic.title}"...`);
              
              const lpPrompt = LP_PROMPT_TEMPLATE
                .replace('{num_lp}', numLehrplan.toString())
                .replace('{main_theme}', mainTopic.title)
                .replace('{sub_theme}', subTopic.title)
                .replace('{themenbaumthema}', topic)
                .replace('{discipline_info}', discipline !== "Keine Vorgabe" ? ` im Fach ${discipline}` : '')
                .replace('{context_info}', context !== "Keine Vorgabe" ? ` für die ${context}` : '')
                .replace('{sector_info}', sector !== "Keine Vorgabe" ? ` im ${sector.toLowerCase()}en Bildungssektor` : '')
                + (documentContext ? `\n\nBerücksichtige folgenden Kontext:\n${documentContext}` : '');

              const lpTopics = await generateStructuredText(apiKey, lpPrompt, model, baseUrl);
              setCurrentPrompt(prev => prev + 1);

              lpSubcollections = lpTopics.map(lp => ({
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
              }));
            }

            return {
              title: subTopic.title,
              shorttitle: subTopic.shorttitle,
              properties: createProperties(
                subTopic.title,
                subTopic.shorttitle,
                subTopic.alternative_titles,
                subTopic.description,
                subTopic.keywords,
                DISCIPLINE_MAPPING[discipline],
                EDUCATIONAL_CONTEXT_MAPPING[context]
              ),
              subcollections: lpSubcollections
            };
          }));
        }

        return {
          title: mainTopic.title,
          shorttitle: mainTopic.shorttitle,
          properties: createProperties(
            mainTopic.title,
            mainTopic.shorttitle,
            mainTopic.alternative_titles,
            mainTopic.description,
            mainTopic.keywords,
            DISCIPLINE_MAPPING[discipline],
            EDUCATIONAL_CONTEXT_MAPPING[context]
          ),
          subcollections
        };
      }));

      // Add hardcoded categories if selected
      let finalCollection = [...collection];
      
      if (includeAllgemeines === true) {
        finalCollection.unshift({
          title: "Allgemeines",
          shorttitle: "ALG",
          properties: createProperties(
            "Allgemeines",
            "ALG",
            {
              grundbildend: "Allgemeines",
              allgemeinbildend: "Allgemeines",
              berufsbildend: "Allgemeines",
              akademisch: "Allgemeines"
            },
            "Allgemeine Grundlagen und übergreifende Aspekte",
            ["allgemein", "grundlagen", "übergreifend"],
            DISCIPLINE_MAPPING[discipline],
            EDUCATIONAL_CONTEXT_MAPPING[context]
          ),
          subcollections: []
        });
      }

      if (includeMethodik === true) {
        finalCollection.push({
          title: "Methodik und Didaktik",
          shorttitle: "MUD",
          properties: createProperties(
            "Methodik und Didaktik",
            "MUD",
            {
              grundbildend: "Methodik und Didaktik",
              allgemeinbildend: "Methodik und Didaktik",
              berufsbildend: "Methodik und Didaktik",
              akademisch: "Methodik und Didaktik"
            },
            "Methodische und didaktische Aspekte der Vermittlung",
            ["methodik", "didaktik", "vermittlung", "lehren"],
            DISCIPLINE_MAPPING[discipline],
            EDUCATIONAL_CONTEXT_MAPPING[context]
          ),
          subcollections: []
        });
      }

      const tree: TopicTree = {
        collection: finalCollection,
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
            methodik_option: includeMethodik,
            subject_families_option: useSubjectFamilies
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
      onGenerate(tree);
    } catch (error) {
      console.error('Error generating tree:', error);
      setStatus(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      alert('Fehler bei der Generierung des Themenbaums. Bitte versuchen Sie es erneut.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <MetadataForm
        title={title}
        author={author}
        targetAudience={targetAudience}
        onTitleChange={setTitle}
        onAuthorChange={setAuthor}
        onTargetAudienceChange={setTargetAudience}
      />

      <TopicSettingsForm
        topic={topic}
        discipline={discipline}
        context={context}
        sector={sector}
        numMain={numMain}
        numSub={numSub}
        numLehrplan={numLehrplan}
        includeAllgemeines={includeAllgemeines}
        includeMethodik={includeMethodik}
        useSubjectFamilies={useSubjectFamilies}
        onTopicChange={setTopic}
        onDisciplineChange={setDiscipline}
        onContextChange={setContext}
        onSectorChange={setSector}
        onNumMainChange={setNumMain}
        onNumSubChange={setNumSub}
        onNumLehrplanChange={setNumLehrplan}
        onIncludeAllgemeinesChange={setIncludeAllgemeines}
        onIncludeMethodikChange={setIncludeMethodik}
        onUseSubjectFamiliesChange={setUseSubjectFamilies}
      />

      <div className="grid grid-cols-1 gap-6">
        <KnowledgeSourceForm
          knowledgeSource={knowledgeSource}
          onKnowledgeSourceChange={setKnowledgeSource}
          onCanGenerateChange={setCanGenerate}
          onShowGenerateButtonChange={setShowGenerateButton}
          documentContexts={documentContexts}
        />

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

      <GenerationStatusForm
        isGenerating={isGenerating}
        status={status}
        currentPrompt={currentPrompt}
        totalPrompts={totalPrompts}
      />

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