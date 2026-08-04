import type { Knex } from 'knex';
import { Logger, PubSubClient } from '@kalles-buss/shared-utils';
import { RecruitmentSwarm, CandidateEvaluation } from './recruitment-swarm';
import { v4 as uuidv4 } from 'uuid';

export class OnboardingService {
  private swarm: RecruitmentSwarm;

  constructor(private db: Knex, private pubsub: PubSubClient) {
    this.swarm = new RecruitmentSwarm();
  }

  /**
   * Orchestrates the entire agent-driven recruitment flow
   */
  async executeRecruitmentCampaign(role: string, location: string) {
    Logger.info(`[Chief HR Agent] Startar rekryteringskampanj för ${role} i ${location}.`);

    // 1. AdWriter Agent
    const adText = await this.swarm.generateJobAd(role, location);
    Logger.info(`[Chief HR Agent] Annons publicerad.`);

    // 2. Screener Agent (Simulated CV pile)
    const mockCVs = ['CV_1.pdf', 'CV_2.pdf'];
    const evaluations = await this.swarm.screenCandidates(mockCVs);

    // 3. Onboarding Bot (Dumb-Flow Automation)
    for (const candidate of evaluations) {
      if (candidate.status === 'APPROVED' && candidate.goldenBaseLayerValid) {
        Logger.info(`[Screener Agent] Kandidat godkänd: ${candidate.candidateName}. Motivering: ${candidate.justification}`);
        await this.onboardCandidate(candidate, role, location);
      } else {
        Logger.warn(`[Screener Agent] Kandidat nekad: ${candidate.candidateName}. Motivering: ${candidate.justification}`);
      }
    }

    return { status: 'CAMPAIGN_COMPLETED', generatedAd: adText, evaluations };
  }

  private async onboardCandidate(candidate: CandidateEvaluation, role: string, location: string) {
    const driverId = `DRIVER-${Math.floor(Math.random() * 1000)}`;

    return this.db.transaction(async (trx) => {
      // 1. Create DB Record
      await trx('drivers').insert({
        id: driverId,
        name: candidate.candidateName,
        employment_type: 'FULL_TIME',
        hourly_rate: 185.00
      });
      Logger.info(`[OnboardingBot] Databaspost skapad för ${driverId}. IAM-konto aktiverat.`);

      // 2. Schedule missing trainings automatically
      if (candidate.missingSkills.length > 0) {
        for (const skill of candidate.missingSkills) {
          const [training] = await trx('trainings').insert({
            title: `Onboarding Training: ${skill}`,
            type_rating_target: skill,
            scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // In 7 days
            status: 'PLANNED'
          }).returning('*');

          await trx('driver_trainings').insert({
            training_id: training.id,
            driver_id: driverId,
            result: 'ENROLLED'
          });
          Logger.info(`[OnboardingBot] Automatisk utbildning inbokad för ${driverId}: ${skill}`);
        }
      }

      // 3. Emit Event to Traffic
      await this.pubsub.publish('hr-events', {
        eventType: 'EmployeeOnboarded',
        employeeId: driverId,
        role: role,
        name: candidate.candidateName,
        baseLocation: location,
        missingCompliance: candidate.missingSkills
      });
    });
  }
}
