import { Logger } from '@kalles-buss/shared-utils';
import { z } from 'zod';

export const CandidateEvaluationSchema = z.object({
  candidateName: z.string(),
  status: z.enum(['APPROVED', 'REJECTED', 'NEEDS_INTERVIEW']),
  goldenBaseLayerValid: z.boolean().describe('Does the candidate have a valid Körkort D and YKB?'),
  missingSkills: z.array(z.string()).describe('Specific type ratings or line knowledge missing'),
  justification: z.string()
});

export type CandidateEvaluation = z.infer<typeof CandidateEvaluationSchema>;

export class RecruitmentSwarm {
  /**
   * The "AdWriter" Agent
   * In a real implementation, this invokes an LLM to generate copy.
   */
  async generateJobAd(role: string, location: string): Promise<string> {
    Logger.info(`[AdWriter Agent] Skapar säljande annons för ${role} i ${location}...`);
    
    // Simulate LLM Generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return `
      🌟 Bli en del av Kalles Buss i ${location}! 🌟
      Vi söker nu en engagerad ${role}. Hos oss får du köra marknadens modernaste elbussar
      och vara en del av ett autonomt, framtidsdrivet team.
      Krav: Körkort D och YKB.
      Ansök idag!
    `;
  }

  /**
   * The "Screener" Agent
   * In a real implementation, this sends raw CV text to an LLM and strictly enforces the CandidateEvaluationSchema output.
   */
  async screenCandidates(cvTexts: string[]): Promise<CandidateEvaluation[]> {
    Logger.info(`[Screener Agent] Granskar ${cvTexts.length} inkomna ansökningar...`);
    
    // Simulate LLM Processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulated Structured Output from an LLM
    const mockLlmOutput: CandidateEvaluation[] = [
      {
        candidateName: 'Anna Andersson',
        status: 'APPROVED',
        goldenBaseLayerValid: true,
        missingSkills: ['LINE_KNOWLEDGE_676', 'DOUBLE_DECKER_EV'],
        justification: 'Kandidaten har giltigt Körkort D och YKB. Flerårig erfarenhet. Behöver dock internutbildning för dubbeldäckare.'
      },
      {
        candidateName: 'Bertil Bengtsson',
        status: 'REJECTED',
        goldenBaseLayerValid: false,
        missingSkills: ['YKB'],
        justification: 'Kandidatens YKB gick ut för 2 år sedan. Går ej att anställa direkt för operativ tjänst.'
      }
    ];

    // Verify that the LLM output matches our strict schema (Guardrail)
    return mockLlmOutput.map(c => CandidateEvaluationSchema.parse(c));
  }
}
