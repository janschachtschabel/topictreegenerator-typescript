# Themenbaum Generator

A powerful web application for generating and managing hierarchical topic trees, specifically designed for educational content structuring. Built with React, TypeScript, and Supabase.

## Core Features

### AI-Powered Topic Generation
- Multiple AI models support (GPT-4o-mini, GPT-4o)
- Configurable number of main topics, subtopics, and curriculum topics
- Intelligent topic hierarchy generation
- Context-aware topic suggestions
- Sector-specific terminology adaptation

### Document Processing
- Support for multiple file formats:
  - PDF (with text extraction)
  - DOCX (with formatting preservation)
  - RTF
  - TXT
- Semantic chunking for large documents
- Embedding-based relevance analysis
- Automatic document categorization
- Sector-specific content analysis

### Knowledge Sources
- AI Knowledge Only: Pure AI-generated topic trees
- AI + Documents: Combined knowledge from AI and uploaded documents
- Documents Only: Topic trees based solely on document content
- Documents with Sorting: Intelligent document analysis with sector-based categorization
- Manual Creation: Custom topic tree creation

### Interactive Tree Editor
- Visual tree structure editor
- Real-time updates
- Drag-and-drop organization
- Node editing capabilities:
  - Title and short title
  - Descriptions
  - Keywords
  - Sector-specific alternative titles
- Multi-level hierarchy support

### Educational Sector Support
- Grundbildend (Basic Education)
- Allgemeinbildend (General Education)
- Berufsbildend (Vocational Education)
- Akademisch (Academic Education)

### View Modes
- Tree View: Traditional hierarchical display
- ASCII View: Text-based tree visualization
- Sector Comparison: Side-by-side view of different sectors

### Export Options
- JSON export for full tree data
- ASCII tree export for plain text representation
- Category lists export for document analysis results

### User Management
- Secure email/password authentication
- Personal topic tree storage
- Document management
- Data deletion options

### Special Categories
- Optional "Allgemeines" (General) section
  - AI-generated or hardcoded
  - Sector-specific content
- Optional "Methodik und Didaktik" (Methodology and Didactics) section
  - AI-generated or hardcoded
  - Teaching methods and approaches

## Technical Features

### Document Processing
- Efficient text extraction from PDFs
- DOCX processing with Mammoth.js
- RTF and TXT support
- Automatic text chunking
- Embedding generation with Transformers.js
- Semantic similarity analysis
- Automatic sector classification

### Database Integration
- Supabase backend
- Real-time updates
- Row Level Security
- Full-text search capabilities
- Document metadata storage
- User data isolation

### UI/UX
- Responsive design
- Loading states and progress indicators
- Error handling and user feedback
- Intuitive navigation
- Modern, clean interface
- Tailwind CSS styling

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- OpenAI API key
- Supabase account

## Environment Variables

Create a `.env` file in the root directory with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd themenbaum-generator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Project Structure

```
src/
├── components/         # React components
│   ├── Auth.tsx       # Authentication component
│   ├── DocumentUpload.tsx # Document processing
│   ├── TopicForm.tsx  # Main form component
│   └── TreeView.tsx   # Tree visualization
├── constants/         # Constants and mappings
│   ├── mappings.ts   # Educational sector mappings
│   └── prompts.ts    # AI prompt templates
├── types/            # TypeScript definitions
│   ├── TopicTree.ts  # Tree structure types
│   └── supabase.ts   # Database types
├── utils/            # Utility functions
│   ├── documentProcessor.ts # Document handling
│   ├── openai.ts     # AI integration
│   ├── supabase.ts   # Database client
│   └── treeUtils.ts  # Tree manipulation
└── App.tsx           # Main application component
```

## Database Schema

### Topic Trees
```sql
CREATE TABLE topic_trees (
  id uuid PRIMARY KEY,
  title text,
  tree_data jsonb,
  created_at timestamptz,
  user_id uuid,
  document_ids text[]
);
```

### Documents
```sql
CREATE TABLE documents (
  id uuid PRIMARY KEY,
  title text,
  content text,
  file_type text,
  created_at timestamptz,
  user_id uuid,
  metadata jsonb
);
```

## Production Deployment

The application is deployed on Netlify and can be accessed at:
https://visionary-mandazi-1f971b.netlify.app

## Security Features

- Row Level Security (RLS) enabled
- User data isolation
- Secure authentication flow
- Protected API endpoints
- Safe document processing
- Input validation
- Error handling

## Performance Optimizations

- Efficient document chunking
- Optimized embedding generation
- Lazy loading of components
- Caching strategies
- Minimized API calls
- Efficient tree rendering

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For support, please open an issue in the repository or contact the development team.