// Topic Tree Types
export interface Properties {
  ccm_collectionshorttitle: string[];
  ccm_taxonid: string[];
  cm_title: string[];
  cm_alternative_titles?: {
    grundbildend?: string;
    allgemeinbildend?: string;
    berufsbildend?: string;
    akademisch?: string;
  };
  ccm_educationalintendedenduserrole: string[];
  ccm_educationalcontext: string[];
  cm_description: string[];
  cclom_general_keyword: string[];
}

export interface Collection {
  title: string;
  shorttitle: string;
  properties: Properties;
  subcollections?: Collection[];
}

export interface TopicTree {
  collection: Collection[];
  metadata: {
    title: string;
    theme: string;
    generation_settings: {
      num_main: number;
      num_sub: number;
      num_lehrplan: number;
      discipline: string;
      educational_context: string;
      education_sector: string;
      allgemeines_option: false | true | 'ai';
      methodik_option: false | true | 'ai';
      subject_families_option: boolean;
    };
    description: string;
    target_audience: string;
    created_at: string;
    version: string;
    author: string;
    category_analysis?: {
      document_categories: Array<{
        document_title: string;
        primary_sector: string;
        categories: string[];
      }>;
      sector_summaries: Record<string, string[]>;
    };
  };
}

export interface Topic {
  title: string;
  shorttitle: string;
  alternative_titles: {
    grundbildend?: string;
    allgemeinbildend?: string;
    berufsbildend?: string;
    akademisch?: string;
  };
  description: string;
  keywords: string[];
}