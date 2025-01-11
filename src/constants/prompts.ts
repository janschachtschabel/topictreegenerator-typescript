// Prompt Templates
export const BASE_INSTRUCTIONS = `Du bist ein hilfreicher KI-Assistent für Lehr- und Lernsituationen, der sachlich korrekte und verständliche Antworten gibt, 
um Lernenden und Lehrenden komplexe Themen näherzubringen. Deine Antworten sind relevant, aktuell und fachlich fundiert, 
basieren auf vertrauenswürdigen Quellen und enthalten keine falschen oder spekulativen Aussagen. Du passt deine Sprache an die Zielgruppe an, 
bleibst klar und fachlich präzise, um den Lernerfolg zu fördern.

Du achtest darauf, dass deine Antworten rechtlich unbedenklich sind, insbesondere in Bezug auf Urheberrecht, Datenschutz, 
Persönlichkeitsrechte und Jugendschutz. Die Herkunft der Informationen wird bei Bedarf transparent gemacht. Du orientierst dich an anerkannten didaktischen Prinzipien, 
lieferst praxisorientierte Erklärungen und vermeidest unnötige Komplexität.

Neutralität und Objektivität stehen im Fokus. Persönliche Meinungen oder parteiische Bewertungen sind ausgeschlossen. Deine Inhalte werden regelmäßig überprüft, 
um den höchsten Qualitätsstandards zu genügen, unter anderem durch den Einsatz von LLM-gestützter Analyse. Dein Ziel ist es, sachliche, aktuelle und rechtlich wie didaktisch einwandfreie Informationen bereitzustellen.

Bitte antworte ausschließlich im JSON-Format ohne zusätzliche Erklärungen, Codeblöcke oder Text.`;

export const MAIN_PROMPT_TEMPLATE = `Erstelle eine Liste von {num_main} Hauptthemen für einen Themenbaum zum Thema '{themenbaumthema}'{discipline_info}{context_info}{sector_info}. 

Beachte dabei folgende VERPFLICHTENDE Regeln:

1. TITEL-REGELN:
   - Verwende Langformen statt Abkürzungen (z.B. "Allgemeine Relativitätstheorie" statt "ART")
   - Nutze "vs." für Gegenüberstellungen (z.B. "Perfecto vs. Indefinido")
   - Verbinde verwandte Begriffe mit "und" (z.B. "Elektrizität und Magnetismus")
   - Vermeide Sonderzeichen (kein Kaufmanns-und, kein Schrägstrich)
   - Verwende Substantive (z.B. "Begrüßung und Verabschiedung")
   - Kennzeichne Homonyme mit runden Klammern (z.B. "Lösung (Mathematik)")
   - Vermeide Artikel und schreibe Adjektive klein

2. KURZTITEL-REGELN:
   - Maximal 20 Zeichen
   - Prägnant und eindeutig
   - Keine Sonderzeichen
   - Bevorzugt ein Hauptbegriff

3. BESCHREIBUNGS-REGELN:
   - Beginne mit präziser Definition des Themas
   - Erkläre die Relevanz im Bildungskontext
   - Beschreibe die wesentlichen Merkmale
   - Verwende maximal 5 prägnante Sätze
   - Nutze klare, zielgruppengerechte Sprache
   - Vermeide direkte Zielgruppeneinordnungen
   - Verwende aktive Formulierungen
   - Baue logisch auf: Definition → Relevanz → Merkmale → Anwendung

4. KATEGORISIERUNG:
Jede Sammlung MUSS einer dieser Kategorien entsprechen:
   a) Thema (Substantiv, für Lehrplanthemen)
   b) Kompetenz (Verb, für Fähigkeiten und Fertigkeiten)
   c) Vermittlung (für Didaktik/Methodik)
   d) Redaktionelle Sammlung (für spezielle Themen)

Formatiere die Antwort als JSON-Array mit genau diesem Format:
[
  {
    "title": "Name des Hauptthemas",
    "shorttitle": "Kurzer, prägnanter Titel (max. 20 Zeichen)",
    "description": "Ausführliche Beschreibung des Hauptthemas",
    "keywords": ["Schlagwort1", "Schlagwort2"]
  }
]`;

export const SUB_PROMPT_TEMPLATE = `Erstelle eine Liste von {num_sub} Unterthemen für das Hauptthema '{main_theme}' im Kontext von '{themenbaumthema}'{discipline_info}{context_info}{sector_info}. 

Beachte dabei folgende VERPFLICHTENDE Regeln:

1. TITEL-REGELN:
   - Verwende Langformen statt Abkürzungen (z.B. "Allgemeine Relativitätstheorie" statt "ART")
   - Nutze "vs." für Gegenüberstellungen (z.B. "Perfecto vs. Indefinido")
   - Verbinde verwandte Begriffe mit "und" (z.B. "Elektrizität und Magnetismus")
   - Vermeide Sonderzeichen (kein Kaufmanns-und, kein Schrägstrich)
   - Verwende Substantive (z.B. "Begrüßung und Verabschiedung")
   - Kennzeichne Homonyme mit runden Klammern (z.B. "Lösung (Mathematik)")
   - Vermeide Artikel und schreibe Adjektive klein

2. KURZTITEL-REGELN:
   - Maximal 20 Zeichen
   - Prägnant und eindeutig
   - Keine Sonderzeichen
   - Bevorzugt ein Hauptbegriff

3. BESCHREIBUNGS-REGELN:
   - Beginne mit präziser Definition des Themas
   - Erkläre die Relevanz im Bildungskontext
   - Beschreibe die wesentlichen Merkmale
   - Verwende maximal 5 prägnante Sätze
   - Nutze klare, zielgruppengerechte Sprache
   - Vermeide direkte Zielgruppeneinordnungen
   - Verwende aktive Formulierungen
   - Baue logisch auf: Definition → Relevanz → Merkmale → Anwendung

4. KATEGORISIERUNG:
Jede Sammlung MUSS einer dieser Kategorien entsprechen:
   a) Thema (Substantiv, für Lehrplanthemen)
   b) Kompetenz (Verb, für Fähigkeiten und Fertigkeiten)
   c) Vermittlung (für Didaktik/Methodik)
   d) Redaktionelle Sammlung (für spezielle Themen)

Formatiere die Antwort als JSON-Array mit genau diesem Format:
[
  {
    "title": "Name des Unterthemas",
    "shorttitle": "Kurzer, prägnanter Titel (max. 20 Zeichen)",
    "description": "Ausführliche Beschreibung des Unterthemas",
    "keywords": ["Schlagwort1", "Schlagwort2"]
  }
]`;

export const LP_PROMPT_TEMPLATE = `Erstelle eine Liste von {num_lp} Lehrplanthemen für das Unterthema '{sub_theme}' im Kontext von '{themenbaumthema}'{discipline_info}{context_info}{sector_info}. 

Beachte dabei folgende VERPFLICHTENDE Regeln:

1. TITEL-REGELN:
   - Verwende Langformen statt Abkürzungen (z.B. "Allgemeine Relativitätstheorie" statt "ART")
   - Nutze "vs." für Gegenüberstellungen (z.B. "Perfecto vs. Indefinido")
   - Verbinde verwandte Begriffe mit "und" (z.B. "Elektrizität und Magnetismus")
   - Vermeide Sonderzeichen (kein Kaufmanns-und, kein Schrägstrich)
   - Verwende Substantive (z.B. "Begrüßung und Verabschiedung")
   - Kennzeichne Homonyme mit runden Klammern (z.B. "Lösung (Mathematik)")
   - Vermeide Artikel und schreibe Adjektive klein

2. KURZTITEL-REGELN:
   - Maximal 20 Zeichen
   - Prägnant und eindeutig
   - Keine Sonderzeichen
   - Bevorzugt ein Hauptbegriff

3. BESCHREIBUNGS-REGELN:
   - Beginne mit präziser Definition des Themas
   - Erkläre die Relevanz im Bildungskontext
   - Beschreibe die wesentlichen Merkmale
   - Verwende maximal 5 prägnante Sätze
   - Nutze klare, zielgruppengerechte Sprache
   - Vermeide direkte Zielgruppeneinordnungen
   - Verwende aktive Formulierungen
   - Baue logisch auf: Definition → Relevanz → Merkmale → Anwendung

4. KATEGORISIERUNG:
Jede Sammlung MUSS einer dieser Kategorien entsprechen:
   a) Thema (Substantiv, für Lehrplanthemen)
   b) Kompetenz (Verb, für Fähigkeiten und Fertigkeiten)
   c) Vermittlung (für Didaktik/Methodik)
   d) Redaktionelle Sammlung (für spezielle Themen)

Formatiere die Antwort als JSON-Array mit genau diesem Format:
[
  {
    "title": "Name des Lehrplanthemas",
    "shorttitle": "Kurzer, prägnanter Titel (max. 20 Zeichen)",
    "description": "Ausführliche Beschreibung mit Lernzielen",
    "keywords": ["Schlagwort1", "Schlagwort2"]
  }
]`;