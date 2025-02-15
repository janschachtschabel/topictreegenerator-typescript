interface MetadataFormProps {
  title: string;
  author: string;
  targetAudience: string;
  onTitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onTargetAudienceChange: (value: string) => void;
}

export function MetadataForm({
  title,
  author,
  targetAudience,
  onTitleChange,
  onAuthorChange,
  onTargetAudienceChange
}: MetadataFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Titel des Themenbaums
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="z.B. Physik Sekundarstufe II"
          required
        />
      </div>
      
      <div>
        <label htmlFor="author" className="block text-sm font-medium text-gray-700">
          Autor
        </label>
        <input
          type="text"
          id="author"
          value={author}
          onChange={(e) => onAuthorChange(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Name des Autors"
        />
      </div>
      
      <div>
        <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700">
          Zielgruppe
        </label>
        <input
          type="text"
          id="targetAudience"
          value={targetAudience}
          onChange={(e) => onTargetAudienceChange(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="z.B. Lehrkräfte und Bildungseinrichtungen"
        />
      </div>
    </div>
  );
}