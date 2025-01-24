import { ChevronDown, ChevronRight, Download, Edit2, Trash2, Plus, Save, X, FileText, Columns, List } from 'lucide-react';
import { useState } from 'react';
import { TopicTree, Collection } from '../types/TopicTree';
import { generateAsciiTree, filterTreeBySector } from '../utils/treeUtils';
import { EDUCATION_SECTOR_MAPPING } from '../constants/mappings';
import { createProperties } from '../utils/openai';

interface TreeViewProps {
  tree: TopicTree;
  onUpdate: (updatedTree: TopicTree) => void;
}

interface TreeNodeProps {
  node: Collection;
  level: number;
  selectedSector: string;
  onUpdate: (updatedNode: Collection) => void;
  onDelete: () => void;
  onAdd: () => void;
}

interface EditFormProps {
  node: Collection;
  onSave: (updatedNode: Collection) => void;
  onCancel: () => void;
  sector: string;
}

function EditForm({ node, onSave, onCancel, sector }: EditFormProps) {
  const [title, setTitle] = useState(node.title);
  const [shorttitle, setShorttitle] = useState(node.properties.ccm_collectionshorttitle[0]);
  const [alternativeTitles, setAlternativeTitles] = useState(node.properties.cm_alternative_titles || {
    grundbildend: node.title,
    allgemeinbildend: node.title,
    berufsbildend: node.title,
    akademisch: node.title
  });
  const [description, setDescription] = useState(node.properties.cm_description[0]);
  const [keywords, setKeywords] = useState(Array.isArray(node.properties.cclom_general_keyword) 
    ? node.properties.cclom_general_keyword.join(', ') 
    : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedNode: Collection = {
      ...node,
      title,
      shorttitle,
      properties: createProperties(
        title,
        shorttitle,
        alternativeTitles,
        description,
        keywords.split(',').map(k => k.trim()).filter(k => k)
      )
    };
    onSave(updatedNode);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-md space-y-4 mt-2">
      <div>
        <label className="block text-sm font-medium text-gray-700">Titel</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Kurztitel</label>
        <input
          type="text"
          value={shorttitle}
          onChange={(e) => setShorttitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
          maxLength={20}
        />
      </div>
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Alternative Titel</h3>
        {Object.keys(EDUCATION_SECTOR_MAPPING).filter(key => key !== "Keine Vorgabe").map(sectorKey => (
          <div key={sectorKey}>
            <label className="block text-sm font-medium text-gray-700">
              {sectorKey.charAt(0).toUpperCase() + sectorKey.slice(1)}
            </label>
            <input
              type="text"
              value={alternativeTitles[sectorKey] || ''}
              onChange={(e) => setAlternativeTitles({
                ...alternativeTitles,
                [sectorKey]: e.target.value
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder={`Titel für ${sectorKey}en Bereich`}
            />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          rows={3}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Schlagwörter (kommagetrennt)</label>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          Speichern
        </button>
      </div>
    </form>
  );
}

function TreeNode({ node, level, selectedSector, onUpdate, onDelete, onAdd }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const hasChildren = node.subcollections && node.subcollections.length > 0;
  const [isAddingChild, setIsAddingChild] = useState(false);

  // Get the appropriate title based on the selected sector
  const getDisplayTitle = () => {
    const alternativeTitles = node.properties.cm_alternative_titles;
    if (!alternativeTitles || selectedSector === 'Keine Vorgabe') {
      return node.title;
    }
    return alternativeTitles[selectedSector] || node.title;
  };

  const handleSave = (updatedNode: Collection) => {
    setIsEditing(false);
    onUpdate(updatedNode);
  };

  const handleAddChild = () => {
    const newNode: Collection = {
      title: "Neues Thema",
      shorttitle: "NT",
      properties: createProperties(
        "Neues Thema",
        "NT",
        {
          grundbildend: "Neues Thema",
          allgemeinbildend: "Neues Thema",
          berufsbildend: "Neues Thema",
          akademisch: "Neues Thema"
        },
        "Beschreibung des neuen Themas",
        ["neu", "thema"]
      ),
      subcollections: []
    };
    
    if (!node.subcollections) {
      node.subcollections = [];
    }
    
    node.subcollections.push(newNode);
    onUpdate({...node});
    setIsAddingChild(true);
    setIsExpanded(true);
  };

  return (
    <div className="ml-4">
      <div className="flex items-center py-2">
        {hasChildren && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`mr-1 hover:bg-gray-100 rounded p-1 ${
              level === 0 ? 'mt-1' : level === 1 ? 'mt-0.5' : ''
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
        <div className={`flex-grow flex items-center space-x-2 ${
          level === 0 
            ? 'text-lg font-semibold' 
            : level === 1 
              ? 'text-base font-medium' 
              : 'text-sm'
        }`}>
          <span className="font-medium">{getDisplayTitle()}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEditing(true)}
            className={`p-1 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded ${
              level === 0 ? 'text-base' : level === 1 ? 'text-sm' : 'text-xs'
            }`}
            title="Bearbeiten"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className={`p-1 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded ${
              level === 0 ? 'text-base' : level === 1 ? 'text-sm' : 'text-xs'
            }`}
            title="Löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddChild}
            className={`p-1 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded ${
              level === 0 ? 'text-base' : level === 1 ? 'text-sm' : 'text-xs'
            }`}
            title="Unterthema hinzufügen"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {isEditing && (
        <EditForm
          node={node}
          sector={selectedSector}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      )}
      
      {isExpanded && hasChildren && (
        <div className={`ml-4 ${
          level === 0 ? 'mt-2' : level === 1 ? 'mt-1.5' : 'mt-1'
        }`}>
          {node.subcollections!.map((child, index) => (
            <TreeNode
              key={index}
              node={child}
              selectedSector={selectedSector}
              level={level + 1}
              onUpdate={(updatedChild) => {
                const updatedSubcollections = [...node.subcollections!];
                updatedSubcollections[index] = updatedChild;
                onUpdate({
                  ...node,
                  subcollections: updatedSubcollections
                });
              }}
              onDelete={() => {
                const updatedSubcollections = node.subcollections!.filter((_, i) => i !== index);
                onUpdate({
                  ...node,
                  subcollections: updatedSubcollections
                });
              }}
              onAdd={handleAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type ViewMode = 'tree' | 'ascii' | 'comparison';

export default function TreeView({ tree, onUpdate }: TreeViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedSector, setSelectedSector] = useState('allgemeinbildend');

  // Filter tree based on selected sector
  const filteredTree = tree ? filterTreeBySector(tree, selectedSector) : null;
  
  const createNewTree = () => {
    const newTree: TopicTree = {
      collection: [],
      metadata: {
        title: "Neuer Themenbaum",
        theme: "",
        generation_settings: {
          num_main: 0,
          num_sub: 0,
          num_lehrplan: 0,
          discipline: "Keine Vorgabe",
          educational_context: "Keine Vorgabe",
          education_sector: "allgemeinbildend",
          allgemeines_option: false,
          methodik_option: false
        },
        description: "Manuell erstellter Themenbaum",
        target_audience: "Lehrkräfte und Bildungseinrichtungen",
        created_at: new Date().toISOString(),
        version: "1.0",
        author: ""
      }
    };
    onUpdate(newTree);
    setIsCreatingNew(true);
    setHasUnsavedChanges(true);
  };

  const handleDownload = () => {
    const jsonString = JSON.stringify(tree, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'themenbaum.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAscii = () => {
    const asciiTree = generateAsciiTree(tree);
    const blob = new Blob([asciiTree], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'themenbaum.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddMainTopic = () => {
    const newNode: Collection = {
      title: "Neues Hauptthema",
      shorttitle: "NHT",
      properties: createProperties(
        "Neues Hauptthema",
        "NHT",
        {
          grundbildend: "Neues Hauptthema",
          allgemeinbildend: "Neues Hauptthema",
          berufsbildend: "Neues Hauptthema",
          akademisch: "Neues Hauptthema"
        },
        "Beschreibung des neuen Hauptthemas",
        ["neu", "hauptthema"]
      ),
      subcollections: []
    };
    
    if (!tree.collection) {
      tree.collection = [];
    }
    
    tree.collection.push(newNode);
    onUpdate({...tree});
    setHasUnsavedChanges(true);
  };

  const handleDownloadCategoryLists = () => {
    if (!tree.metadata.category_analysis) return;
    
    let content = '# Kategorielisten aus Dokumentenanalyse\n\n';
    
    // Add document categories
    content += '## Kategorien je Dokument\n\n';
    tree.metadata.category_analysis.document_categories.forEach(doc => {
      content += `### ${doc.document_title}\n`;
      content += `Primärer Bildungssektor: ${doc.primary_sector}\n`;
      content += 'Kategorien:\n';
      doc.categories.forEach(cat => content += `- ${cat}\n`);
      content += '\n';
    });
    
    // Add sector summaries
    content += '## Zusammengefasste Kategorien je Bildungssektor\n\n';
    Object.entries(tree.metadata.category_analysis.sector_summaries).forEach(([sector, categories]) => {
      content += `### ${sector}\n`;
      categories.forEach(cat => content += `- ${cat}\n`);
      content += '\n';
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kategorielisten.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">
            {isCreatingNew ? "Manuell erstellter Themenbaum" : "Themenbaum Vorschau"}
          </h2>
          {!tree && !isCreatingNew && (
            <button
              onClick={createNewTree}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Neuen Themenbaum erstellen
            </button>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleDownload}
            disabled={!tree}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            JSON herunterladen
          </button>
          <button
            onClick={handleDownloadAscii}
            disabled={!tree}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            ASCII-Baum
          </button>
          {tree?.metadata.category_analysis && (
            <button
              onClick={handleDownloadCategoryLists}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <List className="w-4 h-4 mr-2" />
              Kategorielisten
            </button>
          )}
        </div>
      </div>
      
      {/* Category Analysis Display */}
      {tree?.metadata.category_analysis && (
        <div className="mb-4">
          <details className="bg-gray-50 rounded-lg">
            <summary className="cursor-pointer p-4 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Dokumentenanalyse
            </summary>
            <div className="p-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Kategorien je Dokument</h4>
                  {tree.metadata.category_analysis.document_categories.map((doc, idx) => (
                    <div key={idx} className="mb-4 bg-white p-3 rounded shadow-sm">
                      <h5 className="text-sm font-medium text-gray-600">{doc.document_title}</h5>
                      <p className="text-xs text-gray-500 mb-1">Primärer Sektor: {doc.primary_sector}</p>
                      <ul className="list-disc list-inside text-xs text-gray-600">
                        {doc.categories.map((cat, catIdx) => (
                          <li key={catIdx}>{cat}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Zusammengefasste Kategorien je Bildungssektor</h4>
                  {Object.entries(tree.metadata.category_analysis.sector_summaries).map(([sector, categories]) => (
                    <div key={sector} className="mb-4 bg-white p-3 rounded shadow-sm">
                      <h5 className="text-sm font-medium text-gray-600 capitalize">{sector}</h5>
                      <ul className="list-disc list-inside text-xs text-gray-600">
                        {categories.map((cat, catIdx) => (
                          <li key={catIdx}>{cat}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </div>
      )}
      
      <div className="mb-4 flex justify-between items-center">
        {tree && (
          <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1 text-sm rounded-md ${
                viewMode === 'tree' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Baumansicht
            </button>
            <button
              onClick={() => setViewMode('ascii')}
              className={`px-3 py-1 text-sm rounded-md ${
                viewMode === 'ascii' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              ASCII-Ansicht
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-3 py-1 text-sm rounded-md flex items-center ${
                viewMode === 'comparison' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Columns className="w-4 h-4 mr-1" />
              Sektorvergleich
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="sectorSelect" className="text-sm font-medium text-gray-700">
              Bildungssektor:
            </label>
            <select
              id="sectorSelect"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {Object.keys(EDUCATION_SECTOR_MAPPING)
                .filter(key => key !== "Keine Vorgabe")
                .map(sector => (
                  <option key={sector} value={sector}>
                    {sector.charAt(0).toUpperCase() + sector.slice(1)}
                  </option>
                ))
              }
            </select>
          </div>
        </div>
        )}
        {(tree || isCreatingNew) && (
          <button
            onClick={handleAddMainTopic}
            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Hauptthema hinzufügen
          </button>
        )}
      </div>

      {tree || isCreatingNew ? (viewMode === 'ascii' ? (
        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto font-mono text-sm">
          {filteredTree ? generateAsciiTree(filteredTree, selectedSector) : ''}
        </pre>
      ) : viewMode === 'comparison' ? (
        <div className="grid grid-cols-4 gap-4">
          {['grundbildend', 'allgemeinbildend', 'berufsbildend', 'akademisch'].map((sector) => (
            <div key={sector} className="space-y-2">
              <h3 className="text-sm font-medium text-center capitalize p-2 rounded-t-lg" style={{
                backgroundColor: sector === 'grundbildend' ? '#fef3c7' :
                                sector === 'allgemeinbildend' ? '#e0e7ff' :
                                sector === 'berufsbildend' ? '#dcfce7' :
                                '#fae8ff'
              }}>
                {sector}
              </h3>
              <pre 
                className="text-xs overflow-x-auto p-2 bg-gray-50 rounded-b-lg border-t-2" 
                style={{
                  borderColor: sector === 'grundbildend' ? '#fcd34d' :
                              sector === 'allgemeinbildend' ? '#818cf8' :
                              sector === 'berufsbildend' ? '#4ade80' :
                              '#e879f9',
                  minHeight: '500px',
                  maxHeight: '80vh'
                }}
              >
                {tree ? generateAsciiTree(filterTreeBySector(tree, sector), sector) : ''}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          {(filteredTree?.collection || []).map((node, index) => (
            <TreeNode
              key={index}
              node={node}
              selectedSector={selectedSector}
              level={0}
              onUpdate={(updatedNode) => {
                const updatedCollection = [...tree.collection];
                updatedCollection[index] = updatedNode;
                onUpdate({
                  ...tree,
                  collection: updatedCollection
                });
                setHasUnsavedChanges(true);
              }}
              onDelete={() => {
                const updatedCollection = tree.collection.filter((_, i) => i !== index);
                onUpdate({
                  ...tree,
                  collection: updatedCollection
                });
                setHasUnsavedChanges(true);
              }}
              onAdd={() => {}}
            />
          ))}
        </div>
      )) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {isCreatingNew ? "Fügen Sie Hauptthemen hinzu, um Ihren Themenbaum zu erstellen" : "Hier erscheint Ihr generierter Themenbaum"}
          </p>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setHasUnsavedChanges(false)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Änderungen speichern
          </button>
        </div>
      )}
    </div>
  );
}