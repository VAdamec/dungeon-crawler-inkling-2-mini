# Dungeon Crawler Development Documentation

## How to Add New Enemies

1. Add a new monster definition to the `MONSTER_TYPES` array in `js/game.js`:
   ```javascript
   { name: 'NewMonster', sprite: 'newmonster', hp: 25, atk: 10, def: 3, xp: 30 }
   ```
   
2. Add a sprite definition to the `SPRITES` object in `js/sprites.js`:
   ```javascript
   "newmonster": [
     "................................",
     "............kkkkkk..............",
     "...........ksssssskk............",
     // ... pixel grid data for your monster
     "................................"
   ]
   ```

3. Add a color palette definition to `SPRITE_PALETTES` in `js/sprites.js`:
   ```javascript
   "newmonster": {
     "k": "#131b26",
     "s": "#687f92",
     // ... color mappings for your sprite
   }
   ```

## How to Animate New Enemies

The game uses a motion system with automatic interpolation:
- Movement animations are handled automatically by `moveActorTo()` function
- Sprite animation is managed through cached frames in `state.art.sprites`
- Walking, wing, and flame poses are generated automatically based on sprite type
- Animation timing is capped at 30fps using `motionFrame()` and `requestMotionFrame()`

## How to Add New Items/Drops/Obstacles

### Adding New Items:
1. Add an item definition to the `ITEM_TABLE` array in `js/game.js`:
   ```javascript
   { name: 'NewItem', sprite: 'newitem', gold: 50, kind: 'weapon', atk: 5, str: 2 }
   ```

### Adding New Obstacles:
1. Add to the obstacle generation logic in `generateObstacles()` function
2. Define obstacle types in the obstacle creation code

## How to Add New Levels

Level generation happens automatically in `genLevel()` function:
- Boss levels are generated when depth % 5 == 0 or depth == 10
- Regular floors use room-based procedural generation with corridors
- Arena layouts for boss fights ensure no obstacles in the center
- Floor objects (stairs, potions, treasures) are placed automatically

## How to Tweak Difficulty

Difficulty scaling is handled automatically:
- Monster stats scale with depth using formulas like `maxHp: Math.round(t.hp * (1 + (state.depth - 1) * 0.2))`
- Damage dealt and received scales with depth
- Number of monsters increases with depth
- Bosses become stronger at higher depths

## How to Create New Animations and Sounds for Bosses

### Animation System:
1. Boss defeat animations are handled separately with distinct phases:
   - Mimic: snap, coins, collapse animation
   - Dragon: roar, fall, legacy animation
   
2. Boss animations use `startBossDefeat()` function to trigger the appropriate sequence

3. Animations are driven by `bossDefeatScene()` and `advanceBossDefeat()` functions

### Sound System:
1. Audio is managed through a global audio system in `state.audio`
2. Sounds are played using `playSound()` function
3. Music and effects use separate gain buses for volume control
4. All sound effects are stored as audio clips (not implemented in current codebase)