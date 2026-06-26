export interface Member {
  name: string;
  role: string;
  image: string;
  email: string;
  description: string;
  links: Record<string, string>;
  section?: "current" | "alumni" | "students";
  /** For thesis students: supervisor name(s) */
  supervisors?: string[];
  /** For thesis students: Bachelor/Master thesis title */
  thesis?: string;
}

export interface Project {
  name: string;
  description: string;
  url: string;
  website?: string;
  language: string;
  license: string;
  tags: string[];
  image?: string;
}

export interface Publication {
  title: string;
  authors: string[];
  journal: string;
  year: number;
  volume: string;
  pages: string;
  doi: string;
  tags: string[];
}
