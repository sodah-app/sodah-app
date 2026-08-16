export interface CampaignContext {
  businessName?: string;
  businessType?: string;
  location?: string;
  audience?: string;
  goal?: string;
  tone?: string;
  offer?: string;
  website?: string;
  additionalInstructions?: string;
}

export interface GenerateCampaignRequest {
  context: CampaignContext;
}

export interface ImproveCampaignRequest {
  originalMessage: string;
  improvementInstruction?: string;
  context?: CampaignContext;
}

export interface CampaignAIResult {
  message: string;
  intent: string;
  subject: string;
  audience: string;
}