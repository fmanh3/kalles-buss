Feature: Depot Agent - Inventory & Auto-Procurement (MRP)
  As the Depot Agent,
  I want to monitor spare part inventory levels,
  So that I can automatically procure parts before they run out, minimizing vehicle downtime.

  Background:
    Given the SKU Catalog contains "PART-WIPER-01" with a lead time of 3 days
    And "Norrtälje Depot" has an inventory level for "PART-WIPER-01" with a safety stock of 5

  Scenario: Auto-Procurement on Stock Breach
    Given the current stock of "PART-WIPER-01" at "Norrtälje Depot" is 5
    When a mechanic consumes 1 unit of "PART-WIPER-01" for a Work Order
    Then the current stock drops to 4
    And the system should automatically emit a `PurchaseOrderCreated` event
    And a Purchase Order should be recorded for "Norrtälje Depot" with the predefined reorder quantity
    And the expected delivery date should be calculated based on the 3-day lead time
