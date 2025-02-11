# Themenbaum Generator

Eine leistungsstarke Webanwendung zur Generierung und Verwaltung hierarchischer Themenbäume, speziell entwickelt für die Strukturierung von Bildungsinhalten.

## Hauptfunktionen

### KI-gestützte Themengenerierung
- Unterstützung mehrerer KI-Modelle (GPT-4o-mini, GPT-4o, O3-mini)
- Konfigurierbare Anzahl von Haupt-, Unter- und Lehrplanthemen
- Intelligente Hierarchiegenerierung
- Kontextbewusste Themenvorschläge
- Sektorspezifische Terminologieanpassung

### Dokumentenverarbeitung
- Unterstützte Dateiformate:
  - PDF (mit Textextraktion)
  - DOCX (mit Formatierungserhalt)
  - RTF
  - TXT
- Semantische Textzerlegung für große Dokumente
- Embedding-basierte Relevanzanalyse
- Automatische Dokumentenkategorisierung
- Sektorspezifische Inhaltsanalyse

### Wissensquellen
- Reines KI-Wissen: Generierung basierend auf KI-Modellen
- KI + Dokumente: Kombiniertes Wissen aus KI und hochgeladenen Dokumenten
- Nur Dokumente: Themenbäume basierend auf Dokumenteninhalten
- Dokumente mit Sortierung: Intelligente Dokumentenanalyse mit sektorbasierter Kategorisierung
- Manuelle Erstellung: Individuelle Themenbaumgestaltung

### Interaktiver Baumeditor
- Visuelle Baumstruktur-Bearbeitung
- Echtzeit-Aktualisierungen
- Drag-and-Drop Organisation
- Knoteneigenschaften:
  - Titel und Kurztitel
  - Beschreibungen
  - Schlagwörter
  - Sektorspezifische alternative Titel

### Bildungssektoren
- Grundbildend
- Allgemeinbildend
- Berufsbildend
- Akademisch

### Ansichtsmodi
- Baumansicht: Hierarchische Darstellung
- ASCII-Ansicht: Textbasierte Baumvisualisierung
- Sektorvergleich: Parallele Ansicht verschiedener Sektoren

### Exportoptionen
- JSON-Export für vollständige Baumdaten
- ASCII-Baum Export für Textdarstellung
- Export von Kategorielisten aus der Dokumentenanalyse

### Benutzerverwaltung
- Sichere E-Mail/Passwort-Authentifizierung
- Persönliche Themenbaumspeicherung
- Dokumentenverwaltung
- Datenlöschoptionen

### Spezielle Kategorien
- Optionale "Allgemeines"-Sektion
  - KI-generiert oder vordefiniert
  - Sektorspezifische Inhalte
- Optionale "Methodik und Didaktik"-Sektion
  - KI-generiert oder vordefiniert
  - Lehr- und Lernmethoden

## Technische Features

### Dokumentenverarbeitung
- Effiziente PDF-Textextraktion
- DOCX-Verarbeitung mit Mammoth.js
- RTF- und TXT-Unterstützung
- Automatische Textzerlegung
- Embedding-Generierung mit Transformers.js
- Semantische Ähnlichkeitsanalyse
- Automatische Sektorklassifizierung

### Datenbankintegration
- Supabase Backend
- Echtzeit-Updates
- Row Level Security
- Volltextsuche
- Dokumenten-Metadatenspeicherung
- Benutzerdatenisolierung

### UI/UX
- Responsives Design
- Ladezustände und Fortschrittsanzeigen
- Fehlerbehandlung und Benutzerfeedback
- Intuitive Navigation
- Moderne, aufgeräumte Oberfläche
- Tailwind CSS Styling

## Voraussetzungen

- Node.js 18 oder höher
- npm 9 oder höher
- Supabase-Konto

## Umgebungsvariablen

Erstellen Sie eine `.env`-Datei im Hauptverzeichnis mit:

```env
VITE_SUPABASE_URL=ihre_supabase_url
VITE_SUPABASE_ANON_KEY=ihr_supabase_anon_key
```

## Installation

1. Repository klonen:
```bash
git clone [repository-url]
cd themenbaum-generator
```

2. Abhängigkeiten installieren:
```bash
npm install
```

3. Entwicklungsserver starten:
```bash
npm run dev
```

## Projektstruktur

```
src/
├── components/         # React-Komponenten
│   ├── Auth.tsx       # Authentifizierung
│   ├── DocumentUpload.tsx # Dokumentenverarbeitung
│   ├── TopicForm.tsx  # Hauptformular
│   └── TreeView.tsx   # Baumvisualisierung
├── constants/         # Konstanten und Mappings
│   ├── mappings.ts   # Bildungssektor-Mappings
│   └── prompts.ts    # KI-Prompt-Templates
├── types/            # TypeScript-Definitionen
│   ├── TopicTree.ts  # Baumstruktur-Typen
│   └── supabase.ts   # Datenbanktypen
├── utils/            # Hilfsfunktionen
│   ├── documentProcessor.ts # Dokumentenverarbeitung
│   ├── openai.ts     # KI-Integration
│   ├── supabase.ts   # Datenbank-Client
│   └── treeUtils.ts  # Baummanipulation
└── App.tsx           # Hauptanwendungskomponente
```

## Datenbankschema

### Themenbäume
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

### Dokumente
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

## Sicherheitsfunktionen

- Row Level Security (RLS) aktiviert
- Benutzerdatenisolierung
- Sicherer Authentifizierungsablauf
- Geschützte API-Endpunkte
- Sichere Dokumentenverarbeitung
- Eingabevalidierung
- Fehlerbehandlung

## Leistungsoptimierungen

- Effiziente Dokumentenzerlegung
- Optimierte Embedding-Generierung
- Lazy Loading von Komponenten
- Caching-Strategien
- Minimierte API-Aufrufe
- Effizientes Baumrendering

## Lizenz

MIT-Lizenz

## Support

Bei Fragen oder Problemen öffnen Sie bitte ein Issue im Repository.