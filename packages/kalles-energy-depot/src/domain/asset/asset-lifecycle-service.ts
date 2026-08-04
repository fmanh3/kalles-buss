import type { Knex } from 'knex';
import { Logger } from '@kalles-buss/shared-utils';

export class AssetLifecycleService {
  constructor(private db: Knex) {}

  /**
   * Registers a new physical vehicle into the Depot.
   */
  async registerAsset(assetTag: string, vin: string, assetModelId?: string, homeDepotId?: string) {
    const [asset] = await this.db('assets').insert({
      asset_tag: assetTag,
      vin,
      asset_model_id: assetModelId,
      home_depot_id: homeDepotId,
      status: 'AVAILABLE'
    }).returning('*');

    Logger.info(`[Depot] Asset registered: ${assetTag} (VIN: ${vin})`);
    return asset;
  }

  /**
   * Swaps a component on a vehicle.
   * In EAM, this means updating the parent_asset_id.
   */
  async swapComponent(parentAssetId: string, oldChildAssetId: string, newChildAssetId: string) {
    return this.db.transaction(async (trx) => {
      // 1. Remove old component (send to inventory/repair)
      await trx('assets')
        .where({ id: oldChildAssetId, parent_asset_id: parentAssetId })
        .update({ parent_asset_id: null, status: 'IN_REPAIR' });

      // 2. Install new component
      const [newComponent] = await trx('assets').where({ id: newChildAssetId }).update({
        parent_asset_id: parentAssetId,
        status: 'AVAILABLE'
      }).returning('*');

      Logger.info(`[Depot] Component swap completed on asset ${parentAssetId}. Removed: ${oldChildAssetId}, Installed: ${newChildAssetId}`);
      
      // In a real scenario, emit event to Traffic if this impacts capacity (e.g. smaller battery)
      
      return newComponent;
    });
  }

  // Statutory inspections will be handled by the robust PM Triggers system moving forward.
}
