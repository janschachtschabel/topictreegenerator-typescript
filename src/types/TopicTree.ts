// Topic Tree Types
export interface Properties {
  ccm_collectionshorttitle: string[];
  ccm_taxonid: string[];
  cm_title: string[];
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
    description: string;
    target_audience: string;
    created_at: string;
    version: string;
    author: string;
  };
}

export interface Topic {
  title: string;
  shorttitle: string;
  description: string;
  keywords: string[];
}