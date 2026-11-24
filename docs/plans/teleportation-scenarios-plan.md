# Teleportation Scenarios Plan

## Current State Analysis

Based on my analysis of `js/game.js`, I understand that:
1. **Town teleportation is handled through Town Scrolls** (`useTownScroll()` function)
2. **The system tracks return points in `state.townExit`** and portal status in `state.townPortalOpen`
3. **Players can use scrolls to create a return portal at the town gate**
4. **There are different mechanisms for returning to town: retreat, scrolls, or entering from town**

## Current Teleportation System Components

### Key Functions:
1. **`useTownScroll()`** - Consumes scroll and creates portal
2. **`returnThroughTownPortal()`** - Uses existing portal to return
3. **`enterDungeonFromTown()`** - Handles portal-based return logic
4. **`safeTownExitTile()`** - Validates and finds safe return tiles
5. **`confirmRetreat()`** - Retreats to town with cooldown

### State Variables:
- `state.townExit` - Tracks return point (depth, x, y, reason)
- `state.townPortalOpen` - Boolean tracking portal status
- `state.townScrolls` - Count of available scrolls

## Town Scroll Availability Check

From examining the code, I can see that:
1. **Town Scrolls are defined in ITEM_TABLE** (line 30) with `kind: 'scroll'` and `scroll: 'town'`
2. **They appear in loot pools** via `lootPool()` function which filters items by depth
3. **They're available for purchase at the town merchant** through the `buyFromMerchant()` function  
4. **They can be found as treasure drops** in the `treasureAt()` function

## Implementation Plan

### Phase 1: Verify Town Scroll Availability

Check that Town Scrolls are properly integrated:
- Confirm they appear in loot pools (lootWeight: 1)
- Verify they're available for purchase from merchants (minDepth: 1) 
- Test drop mechanics through `treasureAt()` function

### Phase 2: Add Teleport Cheat Command

Add "teleportTown" command to console for better testing:

```javascript
// In submitConsole function, add:
else if (command === 'teleporttown') {
  enterTown();
  log('Teleported to town.');
}
```

### Phase 3: Enhanced Testing Framework

#### Add Comprehensive Teleportation Tests:
1. **Scroll Availability Test**: Verify scrolls appear in loot pools
2. **Merchant Stock Test**: Verify scrolls are available for purchase  
3. **Portal Creation Test**: Test scroll usage and portal creation
4. **Return Validation Test**: Test that return points are properly validated
5. **Edge Case Tests**: Invalid tiles, concurrent portals, etc.

#### Add to Console Commands:
```javascript
// In submitConsole function, add new commands:
else if (command === 'teleporttown') {
  enterTown();
  log('Teleported to town.');
}
else if (command === 'addscrolls') {
  const count = parseInt(args[0]) || 1;
  state.townScrolls += count;
  log(`Added ${count} Town Scroll(s). You now have ${state.townScrolls}.`);
}
```

### Phase 4: Enhanced Teleportation Logging

Add detailed logging to track teleportation events:
```javascript
function logTeleportEvent(event, details) {
  const timestamp = new Date().toISOString();
  console.log(`[TELEPORT ${timestamp}] ${event}:`, details);
  // Add to game logs as well for debugging
}

// Use throughout teleportation functions:
function useTownScroll() {
  logTeleportEvent('USE_SCROLL', { 
    depth: state.depth, 
    x: state.player.x, 
    y: state.player.y,
    scrollsBefore: state.townScrolls 
  });
  // ... existing code ...
}
```

### Phase 5: Validate Town Scroll System

#### Check Implementation Details:
1. **Loot Pool Generation**: Town scrolls are included in loot pools with `lootWeight: 1`
2. **Merchant Stock**: Scrolls can be purchased from merchants at any depth (minDepth: 1)
3. **Inventory Tracking**: `state.townScrolls` tracks how many the player has
4. **Portal Management**: `townExit` and `townPortalOpen` state variables manage portal lifecycle

### Phase 6: Test Coverage

Create comprehensive test scenarios:
1. **Normal Flow Test**: 
   - Enter dungeon
   - Find scroll in loot
   - Use scroll to create portal
   - Return through portal

2. **Debug Flow Test**:
   - Use `addScrolls` command
   - Use `teleportTown` command
   - Verify teleportation works without needing to find scrolls

3. **Edge Case Tests**:
   - Invalid return tiles
   - Multiple portals  
   - Town exit clearing

## Testing Scenarios

### Scenario 1: Normal Scroll Usage
1. Player enters dungeon
2. Finds Town Scroll in loot (treasureAt)
3. Uses scroll via J key
4. Portal opens at town gate
5. Player returns to dungeon through portal

### Scenario 2: Merchant Purchase
1. Player enters town 
2. Visits merchant
3. Buys Town Scroll
4. Uses scroll to create portal
5. Returns to dungeon through portal

### Scenario 3: Debug Testing
1. Use `addscrolls` command to get scrolls
2. Use `teleporttown` command to instantly return to town
3. Test various teleportation scenarios without gameplay progression

### Scenario 4: Invalid Tile Handling
1. Create portal at valid location
2. Block the return tile (monster, hazard, obstacle)
3. Attempt to return through portal
4. System should find alternative safe tile or fail gracefully

## Expected Behavior Verification

The teleportation system should:
- Allow players to create portals with Town Scrolls
- Validate return points and find alternatives when needed  
- Handle multiple concurrent portals appropriately
- Maintain proper cooldowns for retreat functionality
- Provide clear feedback on portal status
- Preserve game state during teleportation operations