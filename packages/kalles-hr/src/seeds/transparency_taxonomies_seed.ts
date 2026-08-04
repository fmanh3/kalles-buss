import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // 1. Seed Job Levels (SSYK-inspired)
  await knex("job_levels").insert([
    { level: 1, description: "Entry level, manual tasks" },
    { level: 2, description: "Skilled work, vocational training" },
    { level: 3, description: "Specialized skilled work / Junior Professional" },
    { level: 4, description: "Professional / Middle Management" },
    { level: 5, description: "Advanced Professional / Expert" },
    { level: 6, description: "Senior Management" },
    { level: 7, description: "Strategic Executive" }
  ]).onConflict('level').ignore();

  const levels = await knex("job_levels").select("id", "level");

  // 2. Seed Job Definitions (The Job Architecture)
  await knex("job_definitions").insert([
    { 
      job_code: "DRV_URBAN", 
      title: "Urban Bus Driver", 
      job_level_id: levels.find(l => l.level === 2).id,
      salary_range_min: 28000,
      salary_range_max: 35000
    },
    { 
      job_code: "MECH_SNR", 
      title: "Senior Mechanic (HV)", 
      job_level_id: levels.find(l => l.level === 4).id,
      salary_range_min: 35000,
      salary_range_max: 48000
    },
    { 
      job_code: "CLEAN_DEP", 
      title: "Depot Sanitarian", 
      job_level_id: levels.find(l => l.level === 1).id,
      salary_range_min: 24000,
      salary_range_max: 29000
    }
  ]).onConflict('job_code').ignore();

  // 3. Seed Pay Types (Standard Swedish)
  await knex("pay_types").insert([
    { code: "101", name: "Månadslön", category: "BASE" },
    { code: "201", name: "OB-tillägg (Kväll)", category: "ALLOWANCE" },
    { code: "202", name: "OB-tillägg (Natt)", category: "ALLOWANCE" },
    { code: "301", name: "Bilförmån", category: "BENEFIT", is_pensionable: false },
    { code: "401", name: "Fackavgift", category: "DEDUCTION", is_pensionable: false, is_taxable: false }
  ]).onConflict('code').ignore();
}
