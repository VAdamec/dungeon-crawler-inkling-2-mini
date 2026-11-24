# Implementation Plan for Dungeon Crawler

This document outlines the implementation approach for adding companion selection and teleportation scenario checking to the Dungeon Crawler game.

## Overview

The implementation will focus on two main features:
1. **Companion Selection** - Allow players to choose which companion joins at the start of a new game
2. **Teleportation Scenario Testing** - Add better testing capabilities for town teleportation systems

## Implementation Approach

### Phase 1: Companion Selection Feature

#### 1. Data Structure Updates
- Add `COMPANIONS` constant with companion definitions
- Update game state initialization to include `selectedCompanion` and `availableCompanions`
- Modify `FLOOR_FIELDS` to save companion selection

#### 2. Logic Implementation  
- Implement `joinSelectedCompanion()` function
- Update `enterFloor()` to use selected companion instead of default Marmalade
- Maintain backward compatibility with existing entrance cat logic

#### 3. UI Integration
- Add companion selection interface in game start flow
- Display current companion stats and description
- Update equipment panel to show selected companion

### Phase 2: Teleportation Scenario Testing

#### 1. Town Scroll Verification
- Confirm Town Scrolls are properly integrated into loot system
- Verify availability through merchant purchases
- Test drop mechanics from treasure items

#### 2. Console Command Addition
- Add `teleportTown` command to instantly return player to town
- Add `addScrolls <count>` command for debugging and testing
- Update help text with new commands

#### 3. Enhanced Logging and Testing
- Implement detailed teleportation event logging
- Create comprehensive test scenarios for edge cases
- Validate portal creation, usage, and invalid tile handling

## Technical Considerations

### Compatibility
- Maintain full backward compatibility with existing gameplay
- Ensure all current companion functionality works as before
- Preserve existing save/load behavior

### Performance
- Keep teleportation logic efficient 
- Minimal impact on game performance during normal play
- Optimized validation functions for return points

### Testing Strategy
- Unit tests for individual teleportation functions
- Integration tests for complete teleportation workflows  
- Edge case testing for invalid tiles and portal conflicts
- Regression testing to ensure no existing functionality is broken

## Files to Modify

1. **`js/game.js`** - Core game logic, state management, teleportation functions
2. **`index.html`** - UI elements for companion selection (if needed)
3. **`style.css`** - Styling for new UI components (if needed)

## Timeline Estimate

### Phase 1: Companion Selection (~4-6 hours)
- Data structure implementation: 1 hour
- Logic implementation: 2 hours  
- UI integration: 1 hour
- Testing and debugging: 2 hours

### Phase 2: Teleportation Testing (~3-4 hours)
- Town scroll verification: 1 hour
- Console command implementation: 1 hour
- Enhanced logging and testing: 2 hours

## Success Criteria

### Companion Selection
- Players can select companions at game start
- Selected companions work identically to existing ones  
- Boss companions can still be adopted after defeat
- All existing gameplay remains functional

### Teleportation Testing
- Town Scrolls available in loot pools and merchant stock
- `teleportTown` command works without requiring scroll consumption
- `addScrolls` command provides debugging capability
- All teleportation scenarios tested and working properly
- Error handling for invalid return points implemented

This implementation plan will enhance the game's flexibility while maintaining all existing functionality.