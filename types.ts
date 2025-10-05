export enum LogoPosition {
  TopLeft = 'top-left',
  TopRight = 'top-right',
  BottomLeft = 'bottom-left',
  BottomRight = 'bottom-right',
  Center = 'center',
}

export enum CopywritingFramework {
  Auto = 'auto',
  AIDA = 'aida',
  PAS = 'pas',
  Storytelling = 'storytelling',
}

export enum AiProvider {
  Gemini = 'gemini',
  OpenAI = 'openai',
}

export enum OpenAIModel {
  GPT4oMini = 'gpt-4o-mini',
  GPT4o = 'gpt-4o',
  GPT4Turbo = 'gpt-4-turbo',
  GPT35Turbo = 'gpt-3.5-turbo',
}

export interface FacebookPage {
  id: number;
  url: string;
  contactInfo: string;
}

export interface SavedFacebookPage {
  url: string;
  contactInfo: string;
}

export interface GeneratedPost {
  url: string;
  finalCaption: string;
}