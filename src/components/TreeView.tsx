import { ChevronDown, ChevronRight, Download, Edit2, Trash2, Plus, Save, X } from 'lucide-react';
import { useState } from 'react';
import { TopicTree, Collection } from '../types/TopicTree';
import { generateAsciiTree } from '../utils/treeUtils';
import { createProperties } from '../utils/openai';

interface TreeViewProps {
  tree: TopicTree;
  onUpdate: (updatedTree: TopicTree) => void;
}

interface TreeNodeProps {
  node: Collection;
  level: number;
  onUpdate: (updatedNode: Collection) => void;
  onDelete: () => void;
  onAdd: () => void;
}

interface EditFormProps {
  node: Collection;
  onSave: (updatedNode: Collection) => void;
  onCancel: () => void;
}

function EditForm({ node, onSave, onCancel }: EditFormProps) {
  const [title, setTitle] = useState(node.title);
  const [shorttitle, setShorttitle] = useState(node.properties.ccm_collectionshorttitle[0]);
  const [description, setDescription] = useState(node.properties.cm_description[0]);
  const [keywords, setKeywords] = useState(node.properties.cclom_general_keyword.join(', '));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedNode: Collection = {
      ...node,
      title,
      shorttitle,
      properties: createProperties(
        title,
        shorttitle,
        description,
        keywords.split(',').map(k => k.trim())
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

function TreeNode({ node, level, onUpdate, onDelete, onAdd }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const hasChildren = node.subcollections && node.subcollections.length > 0;

  const handleSave = (updatedNode: Collection) => {
    setIsEditing(false);
    onUpdate(updatedNode);
  };

  const handleAddChild = () => {
    const newNode: Collection = {
      title: "Neues Thema",
      shorttitle: "Neu",
      properties: createProperties(
        "Neues Thema",
        "Neu",
        "Beschreibung des neuen Themas",
        ["neu", "thema"]
      ),
      subcollections: []
    };
    
    const updatedNode = {
      ...node,
      subcollections: [...(node.subcollections || []), newNode]
    };
    onUpdate(updatedNode);
  };

  return (
    <div className="ml-4">
      <div className="flex items-center py-2">
        {hasChildren && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mr-1 hover:bg-gray-100 rounded p-1"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
        <span className="font-medium flex-grow">{node.title}</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded"
            title="Bearbeiten"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded"
            title="Löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddChild}
            className="p-1 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded"
            title="Unterthema hinzufügen"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {isEditing && (
        <EditForm
          node={node}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      )}
      
      {isExpanded && hasChildren && (
        <div className="ml-4">
          {node.subcollections!.map((child, index) => (
            <TreeNode
              key={index}
              node={child}
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

export default function TreeView({ tree, onUpdate }: TreeViewProps) {
  const [showAsciiTree, setShowAsciiTree] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
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
      shorttitle: "Neu",
      properties: createProperties(
        "Neues Hauptthema",
        "Neu",
        "Beschreibung des neuen Hauptthemas",
        ["neu", "hauptthema"]
      ),
      subcollections: []
    };
    
    const updatedTree = {
      ...tree,
      collection: [...tree.collection, newNode]
    };
    onUpdate(updatedTree);
    setHasUnsavedChanges(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Generierter Themenbaum</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleDownload}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            JSON herunterladen
          </button>
          <button
            onClick={handleDownloadAscii}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            ASCII-Baum herunterladen
          </button>
        </div>
      </div>
      
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => setShowAsciiTree(!showAsciiTree)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {showAsciiTree ? 'Baumansicht' : 'ASCII-Ansicht'} anzeigen
        </button>
        <button
          onClick={handleAddMainTopic}
          className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Hauptthema hinzufügen
        </button>
      </div>

      {showAsciiTree ? (
        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto font-mono text-sm">
          {generateAsciiTree(tree)}
        </pre>
      ) : (
        <div className="border rounded-lg p-4">
          {tree.collection.map((node, index) => (
            <TreeNode
              key={index}
              node={node}
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
      )}

      {hasUnsavedChanges && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              onUpdate(tree);
              setHasUnsavedChanges(false);
            }}
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