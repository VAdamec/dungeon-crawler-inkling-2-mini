# Companion Selection Feature Plan

## Current State Analysis

Based on my analysis of `js/game.js`, I understand that:
1. **Companions are currently limited to one at a time**
2. **The first companion is Marmalade (a cat) that joins automatically when entering the dungeon for the first time**
3. **Bosses can later join as companions after defeating them**
4. **Companion behavior is defined in `joinEntranceCat()`, `adoptBossCompanion()`, and related functions**

## Feature Requirements

The companion selection feature should allow players to:
1. Choose which companion joins at the start of a new game
2. Select different companions based on depth or availability
3. Replace current companion with a new one (if applicable)
4. Maintain compatibility with existing boss companion adoption system

## Implementation Plan

### Phase 1: Data Structure Changes

First, I need to add data structures for managing companions:

1. **Add Companion Database** in `js/game.js`:
```javascript
// Add to global constants
const COMPANIONS = {
  cat: { 
    name: 'Marmalade', 
    sprite: 'catCompanion', 
    kind: 'cat', 
    scale: CAT_COMPANION_SCALE, 
    damage: 1, 
    batBonus: CAT_BAT_BONUS,
    description: 'A sarcastic cat who follows you for meat and money'
  },
  // Add other potential companions here
};

const MAX_COMPANIONS = 20; // Limit number of companions that can be collected
```

### Phase 2: Modify Game State

Update the `newGame()` function to include companion selection:

```javascript
function newGame() {
  // ... existing code ...
  
  state = {
    // ... existing state properties ...
    selectedCompanion: null,
    availableCompanions: ['cat'], // Start with cat only
    // ... rest of existing state ...
  };
  
  // ... rest of existing code ...
}
```

### Phase 3: Companion Selection Logic

Add new functions to handle companion selection:

```javascript
function showCompanionSelection() {
  // Display UI for selecting companion
  // This would be implemented with HTML/CSS/JS in the actual game
}

function selectCompanion(companionName) {
  if (state.availableCompanions.includes(companionName)) {
    state.selectedCompanion = companionName;
    return true;
  }
  return false;
}
```

### Phase 4: Update Entrance Cat Logic

Replace current entrance cat logic with a more flexible system:

```javascript
function joinEntranceCat(auto) {
  // If we have selected a companion, use that instead of default cat
  if (state.selectedCompanion && !state.companion) {
    return joinSelectedCompanion();
  }
  
  // Keep existing Marmalade behavior for backward compatibility
  if (!state.entranceCat || state.entranceCat.recruited || state.entranceCat.retired || state.companion) return false;
  const cat = entranceCatActor();
  state.companion = { name: 'Marmalade', sprite: 'catCompanion', kind: 'cat', scale: CAT_COMPANION_SCALE, damage: 1, batBonus: CAT_BAT_BONUS,
    x: cat ? cat.x : state.player.x, y: cat ? cat.y : state.player.y };
  if (cat) cat.hidden = true;
  state.entranceCat.recruited = true;
  state.companionSpeech = null;
  state.companionSpeechReadyAt = state.activeTime;
  state.companionAttackAt = state.activeTime + 3;
  placeCompanionNearPlayer();
  log(auto ? 'Marmalade hops in before you can leave. "Someone has to buy the meat."' : 'Marmalade agrees to join you. "The wife and children are counting on this."');
  return true;
}
```

### Phase 5: Integration with Existing Systems

1. **Update `enterFloor()` function** to use selected companion:
```javascript
function enterFloor(depth, fromBelow, fresh = false, arrivalTile = null) {
  // ... existing code ...
  
  if (state.area === 'town' && state.entranceCat && !state.entranceCat.entered) {
    joinSelectedCompanion(); // Replace the old joinEntranceCat logic
    state.entranceCat.entered = true;
  }
  
  // ... rest of existing code ...
}
```

2. **Update Boss Companion Adoption** to work with new system:
```javascript
function adoptBossCompanion(m) {
  // If player has a companion, replace it with the boss companion
  // Keep existing logic but make sure it works with new data structure
}
```

### Phase 6: Save/Load Compatibility

Update save/load functions to preserve companion selection:

```javascript
// Add to FLOOR_FIELDS array
const FLOOR_FIELDS = ['map', 'rooms', 'potions', 'stairs', 'upstairs', 'treasures', 'merchant', 'prisoner',
  'princess', 'visited', 'monsterSpawns', 'bossDefeated', 'floorKey', 'obstacles', 'hazards', 'hazardTime', 'biome', 'props',
  'selectedCompanion', 'availableCompanions']; // Add these new fields
```

## UI Updates

1. **Update game interface** to show companion selection:
   - Add a companion selection option in the equipment panel or start screen
   - Show currently selected companion stats