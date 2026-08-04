import express from 'express';
import Knex from 'knex';
import config from '../knexfile.cjs';
import { PubSubClient, tracingMiddleware, Logger } from '@kalles-buss/shared-utils';
import { ChargerAgent } from './domain/charging/charger-agent';
import { AssetLifecycleService } from './domain/asset/asset-lifecycle-service';
import { MaintenanceService } from './domain/maintenance/maintenance-service';
import { InventoryService } from './domain/inventory/inventory-service';
import { RepairNegotiatorAgent } from './domain/negotiator/repair-negotiator';
import { InventoryAgent } from './domain/negotiator/inventory-agent';
import { TelematicsListener } from './domain/maintenance/telematics-listener';
import { OppChargeSimulator } from './domain/charging/oppcharge-simulator';
import { EnergyValidationListener } from './domain/charging/energy-validation-listener';
import * as dotenv from 'dotenv';

dotenv.config();

async function start() {
  const dbConfig = process.env.NODE_ENV === 'production' ? config.production : config.development;
  const db = Knex(dbConfig!);
  const pubsub = new PubSubClient();

  const chargerAgent = new ChargerAgent(db);
  const assetLifecycleService = new AssetLifecycleService(db);
  const maintenanceService = new MaintenanceService(db);
  const inventoryService = new InventoryService(db);
  const repairNegotiator = new RepairNegotiatorAgent(db, inventoryService);
  const inventoryAgent = new InventoryAgent(db);
  const telematicsListener = new TelematicsListener(pubsub, db, maintenanceService);

  const oppChargeSimulator = new OppChargeSimulator();
  const energyValidationListener = new EnergyValidationListener(pubsub, oppChargeSimulator);

  await telematicsListener.startListening();
  await energyValidationListener.startListening();
  await inventoryAgent.start();

  const app = express();
  app.use(express.json());
  app.use(tracingMiddleware);

  const port = process.env.PORT || 8081;

  app.get('/', (req, res) => res.json({ status: 'UP', service: 'kalles-energy-depot', message: 'MRO Asset Lifecycle is live! 🔧' }));

  // --- SANDBOX & TESTING ---
  app.post('/api/sandbox/reset', async (req, res) => {
    Logger.warn('[Depot] Sandbox Reset Triggered - PURGING DATA');
    try {
      await db('work_order_labor').del();
      await db('work_order_parts').del();
      await db('work_order_meters').del();
      await db('work_order_lines').del();
      await db('work_orders').del();
      await db('tool_checkouts').del();
      await db('meters').del();
      await db('defects').del();
      await db('pm_schedules').del();
      await db('inventory_transfers').del();
      await db('inventory_stock_rules').del();
      await db('inventory_transactions').del();
      await db('part_vendors').del();
      await db('parts').del();
      await db('inventory_locations').del();
      await db('depot_point_reservations').del();
      await db('depot_points').del();
      await db('depots').del();
      await db('asset_warranties').del();
      await db('warranty_claims').del();
      await db('warranty_terms').del();
      await db('assets').del();
      await db('asset_models').del();
      await db('asset_categories').del();
      await db('vmrs_failure_codes').del();
      await db('vmrs_systems').del();
      await db('staff_mirror').del();
      
      res.json({ message: 'Depot Domain Purged' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sandbox/seed', async (req, res) => {
    const { fleet } = req.body;
    Logger.info(`[Depot] Seeding sandbox with ${fleet?.length || 0} vehicles`);
    try {
      const vehicleCat = await db('asset_categories').where({ code: 'VEHICLE' }).first();
      const model = await db('asset_models').first();
      
      if (fleet && fleet.length > 0) {
        const assets = fleet.map((v: any) => ({
          asset_tag: v.id,
          serial_number: `VIN-${v.id}`,
          asset_model_id: model.id,
          asset_category_id: vehicleCat.id,
          status: v.status || 'AVAILABLE',
          home_depot_id: 'DEPOT-NT'
        }));
        await db('assets').insert(assets).onConflict('asset_tag').merge();
      }
      
      res.json({ status: 'SUCCESS' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ceo/status', async (req, res) => {
    try {
      const vehicleCat = await db('asset_categories').where({ code: 'VEHICLE' }).first();
      if (!vehicleCat) throw new Error('VEHICLE category not defined');

      const totalVehicles = await db('assets').where({ asset_category_id: vehicleCat.id }).count('id as count').first();
      const inMaintenance = await db('assets').where({ asset_category_id: vehicleCat.id, status: 'IN_MAINTENANCE' }).count('id as count').first();
      
      const totalCount = parseInt(totalVehicles?.count as string || '0');
      const maintCount = parseInt(inMaintenance?.count as string || '0');
      const availability = totalCount > 0 ? Math.round(((totalCount - maintCount) / totalCount) * 100) : 100;

      res.json({
        domain: 'DEPOT',
        status: availability > 90 ? 'GREEN' : 'YELLOW',
        metrics: {
          availability,
          inMaintenance: maintCount,
          totalFleet: totalCount
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- INVENTORY / EAM API ---
  app.get('/api/inventory/stock', async (req, res) => {
    try {
      const stock = await db('current_inventory_balances')
        .join('parts', 'current_inventory_balances.part_id', 'parts.id')
        .join('inventory_locations', 'current_inventory_balances.location_id', 'inventory_locations.id')
        .select(
          'parts.id as sku',
          'parts.part_number',
          'parts.description as name',
          'parts.uom_code as category',
          'current_inventory_balances.current_quantity as on_hand',
          'inventory_locations.id as location_id',
          'inventory_locations.code as location_name'
        );
      
      const enrichedStock = await Promise.all(stock.map(async s => {
        const lastTx = await db('inventory_transactions')
          .where({ part_id: s.sku })
          .whereNotNull('unit_cost')
          .orderBy('created_at', 'desc')
          .first();
        
        return {
          ...s,
          on_hand: parseFloat(s.on_hand),
          reserved: 0,
          reorder_point: 5,
          unit_price: lastTx ? parseFloat(lastTx.unit_cost) : 150
        };
      }));

      res.json(enrichedStock);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/inventory/parts', async (req, res) => {
    try {
      const parts = await db('parts').select('id as sku', 'part_number', 'description as name');
      res.json(parts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/inventory/parts', async (req, res) => {
    const { partNumber, description, uomCode } = req.body;
    try {
      const [newPart] = await db('parts').insert({
        part_number: partNumber,
        description: description,
        uom_code: uomCode || 'EACH'
      }).returning('*');
      res.json(newPart);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/inventory/parts/:id', async (req, res) => {
    const { partNumber, description, uomCode } = req.body;
    try {
      const [updatedPart] = await db('parts')
        .where({ id: req.params.id })
        .update({
          part_number: partNumber,
          description: description,
          uom_code: uomCode
        })
        .returning('*');
      res.json(updatedPart);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/inventory/locations', async (req, res) => {
    try {
      const locations = await db('inventory_locations').select('id', 'code as name');
      res.json(locations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/depot/staff', async (req, res) => {
    try {
      const staff = await db('staff')
        .leftJoin('depots', 'staff.home_depot_id', 'depots.id')
        .select(
          'staff.*',
          'depots.name as home_depot_name'
        );
      res.json(staff);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VMRS TAXONOMY API ---
  app.get('/api/registry/vmrs/systems', async (req, res) => {
    try {
      const systems = await db('vmrs_systems').select('*').orderBy('code', 'asc');
      res.json(systems);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/registry/vmrs/tree', async (req, res) => {
    try {
      const systems = await db('vmrs_systems').select('*').orderBy('code', 'asc');
      const assemblies = await db('vmrs_assemblies').select('*').orderBy('code', 'asc');
      const components = await db('vmrs_components').select('*').orderBy('code', 'asc');

      const tree = systems.map(sys => ({
        ...sys,
        type: 'SYSTEM',
        children: assemblies
          .filter(asm => asm.vmrs_system_id === sys.id)
          .map(asm => ({
            ...asm,
            type: 'ASSEMBLY',
            children: components
              .filter(comp => comp.vmrs_assembly_id === asm.id)
              .map(comp => ({
                ...comp,
                type: 'COMPONENT'
              }))
          }))
      }));
      res.json(tree);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/registry/vmrs/systems/:systemId/assemblies', async (req, res) => {
    try {
      const assemblies = await db('vmrs_assemblies')
        .where({ vmrs_system_id: req.params.systemId })
        .orderBy('code', 'asc');
      res.json(assemblies);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/registry/vmrs/assemblies/:id/components', async (req, res) => {
    try {
      const components = await db('vmrs_components')
        .where({ vmrs_assembly_id: req.params.id })
        .orderBy('code', 'asc');
      res.json(components);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/registry/vmrs/components', async (req, res) => {
    try {
      const components = await db('vmrs_components').select('*').orderBy('code', 'asc');
      res.json(components);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/registry/vmrs/systems', async (req, res) => {
    const { code, description } = req.body;
    try {
      const [newSys] = await db('vmrs_systems').insert({ code, description }).returning('*');
      res.json(newSys);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/registry/vmrs/assemblies', async (req, res) => {
    const { systemId, code, description } = req.body;
    try {
      const [newAsm] = await db('vmrs_assemblies').insert({ vmrs_system_id: systemId, code, description }).returning('*');
      res.json(newAsm);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/registry/vmrs/components', async (req, res) => {
    const { assemblyId, code, description } = req.body;
    try {
      const [newComp] = await db('vmrs_components').insert({ vmrs_assembly_id: assemblyId, code, description }).returning('*');
      res.json(newComp);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  app.post('/api/inventory/receive', async (req, res) => {
    const { sku, locationId, quantity, referenceId, unitPrice, vendorId } = req.body;
    try {
      const [tx] = await db('inventory_transactions').insert({
        part_id: sku,
        location_id: locationId,
        transaction_type: 'PO_RECEIPT',
        quantity: quantity,
        unit_cost: unitPrice || 0,
        reference_document: referenceId,
        created_by: '00000000-0000-0000-0000-000000000000'
      }).returning('*');

      await pubsub.publish('depot-events', {
        eventType: 'GoodsReceived',
        receipt: {
          id: tx.id,
          vendorId: vendorId || null,
          sku: sku,
          quantity: quantity,
          unitCost: unitPrice || 0,
          reference: referenceId
        }
      });

      res.json({ message: 'Success', transactionId: tx.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/inventory/consume', async (req, res) => {
    const { sku, locationId, quantity, workOrderId } = req.body;
    try {
      await inventoryService.consumePart(locationId, sku, quantity, workOrderId, '00000000-0000-0000-0000-000000000000');
      res.json({ message: 'Success' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/inventory/transfer/ship', async (req, res) => {
    const { fromLocationId, toLocationId, partId, quantity } = req.body;
    try {
      const transfer = await inventoryService.shipTransfer(fromLocationId, toLocationId, partId, quantity, '00000000-0000-0000-0000-000000000000');
      res.json(transfer);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/agent/inventory/optimize', async (req, res) => {
    const { partId, locationId } = req.body;
    try {
      const result = await inventoryAgent.negotiateReplenishment(partId, locationId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(port, () => Logger.info(`[Energy-Depot] API listening on port ${port}`));

  // Pub/Sub Listeners
  await pubsub.subscribe('finance-events', 'depot-vendor-sync-sub', async (event: any) => {
    try {
      if (event.eventType === 'VendorCreated') {
        Logger.info(`[Depot] Syncing vendor from Finance: ${event.vendor.name}`);
        await db('vendors').insert({
          id: event.vendor.id,
          name: event.vendor.name,
          is_active: event.vendor.isActive
        }).onConflict('id').merge();
      }
    } catch (err) {
      Logger.error('[Depot] Error syncing vendor:', err);
    }
  });

  await pubsub.subscribe('finance-events', 'depot-optimization-sub', async (eventData: any) => {
    try {
      if (eventData.type === 'EnergyOptimizationStrategy') {
        await chargerAgent.applyOptimizationStrategy(eventData.strategy);
      }
    } catch (err) {
      Logger.error('[Energy-Depot] Fel vid hantering av optimeringsorder:', err);
    }
  });

  await pubsub.subscribe('hr-events', 'depot-staff-sync-sub', async (event: any) => {
    try {
      if (event.eventType === 'StaffCreated') {
        Logger.info(`[Depot] Syncing staff member from HR: ${event.staff.name}`);
        await db('staff').insert({
          id: event.staff.id,
          name: event.staff.name,
          role: event.staff.role,
          home_depot_id: event.staff.home_depot_id,
          skills: JSON.stringify(event.staff.skills || []),
          status: 'AVAILABLE'
        }).onConflict('id').merge();
      }
    } catch (err) {
      Logger.error('[Depot] Error syncing staff:', err);
    }
  });
}

start().catch(console.error);
