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

export const DOCUMENT_ANALYSIS_PROMPT = `Analysiere den folgenden Text und identifiziere den primären Bildungssektor sowie die wichtigsten Hauptkategorien:

{document_content}

Formatiere die Antwort als JSON-Objekt mit genau diesem Format:
{
  "primary_sector": "grundbildend|allgemeinbildend|berufsbildend|akademisch",
  "main_categories": ["Kategorie1", "Kategorie2", ...]
}

WICHTIG:
- Der primäre Bildungssektor muss EXAKT einem dieser Werte entsprechen: grundbildend, allgemeinbildend, berufsbildend, akademisch
- Hauptkategorien müssen sich klar voneinander abgrenzen
- Maximal 5 Hauptkategorien pro Dokument
- Verwende präzise, aussagekräftige Bezeichnungen
- Vermeide Überschneidungen zwischen Kategorien`;

export const SECTOR_SUMMARY_PROMPT = `Fasse die folgenden Hauptkategorien für den Bildungssektor '{sector}' zusammen:

{category_lists}

Erstelle eine konsolidierte Liste von maximal {num_main} Hauptkategorien, die:
- Die wichtigsten Themen aus allen Dokumenten abdecken
- Sich klar voneinander abgrenzen
- Keine Überschneidungen oder Redundanzen aufweisen
- Dem Sprachniveau und der Terminologie des Bildungssektors entsprechen

Formatiere die Antwort als JSON-Array mit den Kategorienamen:
["Kategorie1", "Kategorie2", ...]`;

export const MAIN_PROMPT_TEMPLATE = `Erstelle eine Liste von {num_main} Hauptthemen für einen Themenbaum zum Thema '{themenbaumthema}'{discipline_info}{context_info}{sector_info}. 

WICHTIG: Dies ist die ERSTE EBENE des dreigliedrigen Themenbaums. Generiere die wichtigsten übergeordneten Themenbereiche des Fachs.

1. HIERARCHIE-REGELN:
   - Erste Ebene: Übergeordnete Themenbereiche des Fachs (z.B. "Organische Chemie", "Theoretische Chemie")
   - Kategorien müssen klar voneinander abgrenzbar sein
   - Keine Überschneidungen oder Redundanzen zwischen Kategorien
   - Keine Synonyme als separate Kategorien verwenden
   - Sparsamer Umgang mit Und-Verknüpfungen
   - Kategorien müssen sich logisch untergliedern lassen

1. TITEL-REGELN:
   - Titel für Hauptthemen sollten nicht direkt dem Fach entsprechen, das sie gliedern (also nicht "Chemie", "Physik" usw.)
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

WICHTIG - Alternative Titel für Bildungssektoren:
1. Grundbildend:
   - Definition: Grundlegende Auseinandersetzung mit einem Thema, oft als Einstieg in einen Bereich
   - Ziele: Förderung der motorischen Entwicklung, Entwicklung und Erlernen von Sprache, Erwerb grundlegender sozialer Fähigkeiten
   - Zielgruppen: Kinder im Kita- oder Vorschulalter, Erwachsene, die grundlegende Fähigkeiten später erwerben (z. B. Lesen oder Schreiben)
   - Merkmale: Altersunabhängig, Vermittlung von essenziellen Grundlagen für den weiteren Bildungsweg oder die persönliche Entwicklung
   - Einfache, konkrete Begriffe
   - Alltagsnahe Bezeichnungen
   - Fokus auf Grundverständnis
   - Beispiel: "Plastik" statt "Polymere"

2. Allgemeinbildend:
   - Definition: Vermittlung von Basiswissen und Kompetenzen für ein breites Verständnis der Welt
   - Inhalte: Mathematik, Geschichte, Sprachen, Weitere grundlegende Wissensgebiete ...
   - Bildungskontexte: Formales Bildungssystem (z. B. Schulen), Informelle Bildung (z. B. Volkshochschulen, Kulturangebote)
   - Ziele: Aufbau einer breiten Wissensbasis, Förderung vielseitiger Fähigkeiten, Unabhängigkeit von beruflicher Spezialisierung
   - Merkmale: Ermöglicht kulturelle Orientierung, Unterstützt allgemeines Verständnis und gesellschaftliche Teilhabe
   - Standard-Fachbegriffe
   - Ausgewogene Komplexität
   - Schulbuch-Terminologie
   - Beispiel: "Kunststoffe"

3. Berufsbildend:
   - Definition: Praxis- und anwendungsorientierte Vermittlung von berufsspezifischen Fähigkeiten und Qualifikationen
   - Inhalte: Technische Fertigkeiten, Wirtschaftliches Wissen, Fachspezifische Anwendungen
   - Ziele: Vorbereitung auf die Anforderungen eines bestimmten Berufsfeldes, Unterstützung des Übergangs in den Arbeitsmarkt, Förderung der beruflichen Weiterentwicklung, Spezialisierung in einem Berufsfeld
   - - Merkmale: Direkter Bezug zu beruflichen Anforderungen, Vermittlung praxisnaher Kompetenzen, Beitrag zur individuellen Karriereentwicklung
   - Praxisorientierte Fachbegriffe
   - Berufsbezogene Terminologie
   - Anwendungsorientiert
   - Beispiel: "Kunststoffe"

4. Akademisch:
   - Definition: Bildung, die durch Fachsprache und wissenschaftliche Methodik geprägt ist
   - Merkmale: Forschungsmethodik und -orientierung, Vertiefte Auseinandersetzung mit spezifischen Fachgebieten, Analytisch fundierte und theoretische Fragestellungen, Hohes Maß an Abstraktionsvermögen erforderlich
   - Bildungskontexte: Universitäten, Wissenschaftliche Einrichtungen
   - Zielgruppen: Personen, die ein vertieftes Verständnis eines Fachbereichs anstreben, Personen mit Interesse an wissenschaftlichem Arbeiten
   - Ziele: Entwicklung eines tiefgehenden Fachwissens, Förderung wissenschaftlicher Kompetenzen, Vorbereitung auf forschungsorientierte Berufe
   - Wissenschaftliche Fachbegriffe
   - Präzise Terminologie
   - Theoretisch fundiert
   - Beispiel: "Polymere"   

Wo es möglich ist, Hauptthemen zu bilden die bildungsbereichsübergreifend für mehrere Bildungssektoren relevant sind,
sollte dies getan werden. Der Titel stellt dann den übergreifenden Begriff dar und die alternativen Titel
sind die an den typsischen Sprachgebrauch angepassten Bezeichnungen des jeweiligen Bildungssektorsrs.

Bitte achte darauf, das es Hauptthemen gibt, die nicht für alle Bildungssektoren relevant sind.
In diesen Fällen werden alternative Titel nur für relevante Bildungssektoren erzeugt und andere alternative Titel leer gelassen.

Bsp. für alternative Titel zu einem Hauptthema in Deutsch:

grundbildend: Lesen
allgemeinbildend: Lesen
berufsbildend: 
akademisch: Sprachdidaktik

Formatiere die Antwort als JSON-Array mit genau diesem Format:
[
  {
    "title": "Name des Hauptthemas",
    "alternative_titles": {
      "grundbildend": "Titel für grundbildenden Bereich",
      "allgemeinbildend": "Titel für allgemeinbildenden Bereich",
      "berufsbildend": "Titel für berufsbildenden Bereich",
      "akademisch": "Titel für akademischen Bereich"
    },
    "shorttitle": "Kurzer, prägnanter Titel (max. 20 Zeichen)",
    "description": "Ausführliche Beschreibung des Hauptthemas",
    "keywords": ["Schlagwort1", "Schlagwort2"]
  }
]`;

export const SUB_PROMPT_TEMPLATE = `Erstelle eine Liste von {num_sub} Unterthemen für das Hauptthema '{main_theme}' im Kontext von '{themenbaumthema}'{discipline_info}{context_info}{sector_info}. 

WICHTIG: Dies ist die ZWEITE EBENE des dreigliedrigen Themenbaums. Generiere spezifische Unterthemen der Hauptkategorie '{main_theme}'.

Folgende Hauptthemen existieren bereits:
{existing_main_topics}

1. HIERARCHIE-REGELN:
   - Zweite Ebene: Spezifische Unterthemen der Hauptkategorie (z.B. "Kohlenwasserstoffe" unter "Organische Chemie")
   - Jedes Unterthema muss eine echte Unterkategorie des Hauptthemas sein
   - Keine Wiederholung des Hauptthemas oder seiner Synonyme
   - Keine Wiederholung von Titeln aus anderen Hauptthemen
   - Kategorien müssen sich logisch weiter untergliedern lassen
   - Keine Überschneidungen mit anderen Hauptkategorien oder deren Unterthemen
   - Sparsamer Umgang mit Und-Verknüpfungen

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

WICHTIG - Alternative Titel für Bildungssektoren:
1. Grundbildend:
   - Definition: Grundlegende Auseinandersetzung mit einem Thema, oft als Einstieg in einen Bereich
   - Ziele: Förderung der motorischen Entwicklung, Entwicklung und Erlernen von Sprache, Erwerb grundlegender sozialer Fähigkeiten
   - Zielgruppen: Kinder im Kita- oder Vorschulalter, Erwachsene, die grundlegende Fähigkeiten später erwerben (z. B. Lesen oder Schreiben)
   - Merkmale: Altersunabhängig, Vermittlung von essenziellen Grundlagen für den weiteren Bildungsweg oder die persönliche Entwicklung
   - Einfache, konkrete Begriffe
   - Alltagsnahe Bezeichnungen
   - Fokus auf Grundverständnis
   - Beispiel: "Plastik" statt "Polymere"

2. Allgemeinbildend:
   - Definition: Vermittlung von Basiswissen und Kompetenzen für ein breites Verständnis der Welt
   - Inhalte: Mathematik, Geschichte, Sprachen, Weitere grundlegende Wissensgebiete ...
   - Bildungskontexte: Formales Bildungssystem (z. B. Schulen), Informelle Bildung (z. B. Volkshochschulen, Kulturangebote)
   - Ziele: Aufbau einer breiten Wissensbasis, Förderung vielseitiger Fähigkeiten, Unabhängigkeit von beruflicher Spezialisierung
   - Merkmale: Ermöglicht kulturelle Orientierung, Unterstützt allgemeines Verständnis und gesellschaftliche Teilhabe
   - Standard-Fachbegriffe
   - Ausgewogene Komplexität
   - Schulbuch-Terminologie
   - Beispiel: "Kunststoffe"

3. Berufsbildend:
   - Definition: Praxis- und anwendungsorientierte Vermittlung von berufsspezifischen Fähigkeiten und Qualifikationen
   - Inhalte: Technische Fertigkeiten, Wirtschaftliches Wissen, Fachspezifische Anwendungen
   - Ziele: Vorbereitung auf die Anforderungen eines bestimmten Berufsfeldes, Unterstützung des Übergangs in den Arbeitsmarkt, Förderung der beruflichen Weiterentwicklung, Spezialisierung in einem Berufsfeld
   - - Merkmale: Direkter Bezug zu beruflichen Anforderungen, Vermittlung praxisnaher Kompetenzen, Beitrag zur individuellen Karriereentwicklung
   - Praxisorientierte Fachbegriffe
   - Berufsbezogene Terminologie
   - Anwendungsorientiert
   - Beispiel: "Kunststoffe"

4. Akademisch:
   - Definition: Bildung, die durch Fachsprache und wissenschaftliche Methodik geprägt ist
   - Merkmale: Forschungsmethodik und -orientierung, Vertiefte Auseinandersetzung mit spezifischen Fachgebieten, Analytisch fundierte und theoretische Fragestellungen, Hohes Maß an Abstraktionsvermögen erforderlich
   - Bildungskontexte: Universitäten, Wissenschaftliche Einrichtungen
   - Zielgruppen: Personen, die ein vertieftes Verständnis eines Fachbereichs anstreben, Personen mit Interesse an wissenschaftlichem Arbeiten
   - Ziele: Entwicklung eines tiefgehenden Fachwissens, Förderung wissenschaftlicher Kompetenzen, Vorbereitung auf forschungsorientierte Berufe
   - Wissenschaftliche Fachbegriffe
   - Präzise Terminologie
   - Theoretisch fundiert
   - Beispiel: "Polymere"   

Wo es möglich ist, Unterthemen zu einem Hauptthema zu bilden, die übergreifend für mehrere Bildungssektoren relevant sind,
sollte dies getan werden. Der Titel stellt dann den bildungsbereichsübergreifenden Begriff dar und die alternativen Titel
sind die sprachlich angepassten Entsprechungen für den jeweiligen Bildungssektor.

Bitte achte darauf, das es Unterthemen von Hauptthemen gibt, die nicht für alle Bildungssektoren relevant sind.
In diesen Fällen werden alternative Titel nur für relevante Bildungssektoren erzeugt.

Bsp. für alternative Titel zu einem Unterthemen in Deutsch:

grundbildend: Buchstaben erkennen
allgemeinbildend: Leseförderung und Lesemotivation
berufsbildend: Fachtexte lesen und verstehen
akademisch: Textanalyse und Interpretation

Es werden nur für die Bildungssektoren alternative Titel angelegt, bei denen es in der direkt übergeordneten Hauptkategorie im gleichen Bildungssektor auch einen alternativen Titel gibt.

Formatiere die Antwort als JSON-Array mit genau diesem Format:
[
  {
    "title": "Name des Unterthemas",
    "alternative_titles": {
      "grundbildend": "Titel für grundbildenden Bereich",
      "allgemeinbildend": "Titel für allgemeinbildenden Bereich",
      "berufsbildend": "Titel für berufsbildenden Bereich",
      "akademisch": "Titel für akademischen Bereich"
    },
    "shorttitle": "Kurzer, prägnanter Titel (max. 20 Zeichen)",
    "description": "Ausführliche Beschreibung des Unterthemas",
    "keywords": ["Schlagwort1", "Schlagwort2"]
  }
]`;

export const LP_PROMPT_TEMPLATE = `Erstelle eine Liste von {num_lp} Lehrplanthemen für das Unterthema '{sub_theme}' im Kontext von '{themenbaumthema}'{discipline_info}{context_info}{sector_info}. 

WICHTIG: Dies ist die DRITTE EBENE des dreigliedrigen Themenbaums. Generiere konkrete Lehrplanthemen für das Unterthema '{sub_theme}'.

Übergeordnete Struktur:
Hauptthema: {main_theme}
Unterthema: {sub_theme}

Existierende Themen in dieser Hierarchie:
{existing_topics}

1. HIERARCHIE-REGELN:
   - Dritte Ebene: Konkrete Lehrplanthemen des Unterthemas (z.B. "Alkane" unter "Kohlenwasserstoffe")
   - Jedes Thema muss eine spezifische Ausprägung des Unterthemas sein
   - Keine Wiederholung von Ober- oder Unterthemen
   - Keine Wiederholung von Titeln aus anderen Zweigen des Themenbaums
   - Keine Überschneidungen mit anderen Kategorien der gleichen Ebene
   - Themen müssen konkret und eindeutig sein
   - Sparsamer Umgang mit Und-Verknüpfungen

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

WICHTIG - Alternative Titel für Bildungssektoren:
1. Grundbildend:
   - Definition: Grundlegende Auseinandersetzung mit einem Thema, oft als Einstieg in einen Bereich
   - Ziele: Förderung der motorischen Entwicklung, Entwicklung und Erlernen von Sprache, Erwerb grundlegender sozialer Fähigkeiten
   - Zielgruppen: Kinder im Kita- oder Vorschulalter, Erwachsene, die grundlegende Fähigkeiten später erwerben (z. B. Lesen oder Schreiben)
   - Merkmale: Altersunabhängig, Vermittlung von essenziellen Grundlagen für den weiteren Bildungsweg oder die persönliche Entwicklung
   - Einfache, konkrete Begriffe
   - Alltagsnahe Bezeichnungen
   - Fokus auf Grundverständnis
   - Beispiel: "Plastik" statt "Polymere"

2. Allgemeinbildend:
   - Definition: Vermittlung von Basiswissen und Kompetenzen für ein breites Verständnis der Welt
   - Inhalte: Mathematik, Geschichte, Sprachen, Weitere grundlegende Wissensgebiete ...
   - Bildungskontexte: Formales Bildungssystem (z. B. Schulen), Informelle Bildung (z. B. Volkshochschulen, Kulturangebote)
   - Ziele: Aufbau einer breiten Wissensbasis, Förderung vielseitiger Fähigkeiten, Unabhängigkeit von beruflicher Spezialisierung
   - Merkmale: Ermöglicht kulturelle Orientierung, Unterstützt allgemeines Verständnis und gesellschaftliche Teilhabe
   - Standard-Fachbegriffe
   - Ausgewogene Komplexität
   - Schulbuch-Terminologie
   - Beispiel: "Kunststoffe"

3. Berufsbildend:
   - Definition: Praxis- und anwendungsorientierte Vermittlung von berufsspezifischen Fähigkeiten und Qualifikationen
   - Inhalte: Technische Fertigkeiten, Wirtschaftliches Wissen, Fachspezifische Anwendungen
   - Ziele: Vorbereitung auf die Anforderungen eines bestimmten Berufsfeldes, Unterstützung des Übergangs in den Arbeitsmarkt, Förderung der beruflichen Weiterentwicklung, Spezialisierung in einem Berufsfeld
   - - Merkmale: Direkter Bezug zu beruflichen Anforderungen, Vermittlung praxisnaher Kompetenzen, Beitrag zur individuellen Karriereentwicklung
   - Praxisorientierte Fachbegriffe
   - Berufsbezogene Terminologie
   - Anwendungsorientiert
   - Beispiel: "Kunststoffe"

4. Akademisch:
   - Definition: Bildung, die durch Fachsprache und wissenschaftliche Methodik geprägt ist
   - Merkmale: Forschungsmethodik und -orientierung, Vertiefte Auseinandersetzung mit spezifischen Fachgebieten, Analytisch fundierte und theoretische Fragestellungen, Hohes Maß an Abstraktionsvermögen erforderlich
   - Bildungskontexte: Universitäten, Wissenschaftliche Einrichtungen
   - Zielgruppen: Personen, die ein vertieftes Verständnis eines Fachbereichs anstreben, Personen mit Interesse an wissenschaftlichem Arbeiten
   - Ziele: Entwicklung eines tiefgehenden Fachwissens, Förderung wissenschaftlicher Kompetenzen, Vorbereitung auf forschungsorientierte Berufe
   - Wissenschaftliche Fachbegriffe
   - Präzise Terminologie
   - Theoretisch fundiert
   - Beispiel: "Polymere"   

Wo es möglich ist, weitere Unterthemen zu bilden die bildungsbereichsübergreifend für mehrere Bildungssektoren relevant sind,
sollte dies getan werden. Der Titel stellt dann den übergreifenden Begriff dar und die alternativen Titel
sind im typsischen Sprachgebrauch des Bildungssektors gehalten.

Bitte achte darauf, das es weitere Unterthemen gibt, die nicht für alle Bildungssektoren relevant sind.
In diesen Fällen werden alternative Titel nur für relevante Bildungssektoren erzeugt.

Bsp. für alternative Titel zu einem weiteren Unterthemea in Deutsch:

grundbildend: Bilderbücher verstehen
allgemeinbildend: Sachtexte verstehen
berufsbildend: Anleitungstexte interpretieren
akademisch: Wissenschaftliches Lesen (Studien, Artikel)

Es werden nur für die Bildungssektoren alternative Titel angelegt, bei denen es in der direkt übergeordneten Unterkategorie im gleichen Bildungssektor auch einen alternativen Titel gibt.

Formatiere die Antwort als JSON-Array mit genau diesem Format:
[
  {
    "title": "Name des Lehrplanthemas",
    "alternative_titles": {
      "grundbildend": "Titel für grundbildenden Bereich",
      "allgemeinbildend": "Titel für allgemeinbildenden Bereich",
      "berufsbildend": "Titel für berufsbildenden Bereich",
      "akademisch": "Titel für akademischen Bereich"
    },
    "shorttitle": "Kurzer, prägnanter Titel (max. 20 Zeichen)",
    "description": "Ausführliche Beschreibung mit Lernzielen",
    "keywords": ["Schlagwort1", "Schlagwort2"]
  }
]`;