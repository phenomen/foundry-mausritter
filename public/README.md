## Mausritter local fork for Foundry VTT v14.367

Version **0.7.0-local.5**. Build, validation, installation and rollback instructions are in [MIGRATION.md](MIGRATION.md).

Choose spell power with a slider and a number display that updates while dragging. Spell casting caps power at remaining unmarked uses and automatically marks one use per d6 showing 4, 5 or 6. In **Configure Settings → Mausritter**, the GM can disable **Limit spell power to remaining uses** to restore the total-maximum cap. This setting and **Block casting exhausted spells** are enabled by default. Exhausted spells can cast only when both settings are disabled. Usage marks never exceed the maximum.

Based on [phenomen/foundry-mausritter](https://github.com/phenomen/foundry-mausritter), with the installed local artwork and add-ons preserved. Install the local packages rather than the upstream manifest URL.

# Mausritter RPG for Foundry VTT
#### This is an unofficial version of the Mausritter RPG system, which is the property of Isaac Williams & Losing Games.
Mausritter can be purchased here: https://mausritter.com/
```
- The official game Weapon, Item, and Spell Icons by Isaac Williams are licensed under CC-BY.
- The sample Rat portrait from the official book was allowed to be used with permission from Isaac Williams
```
# Features:
## Styled character sheets
Character, Creature, and NPC sheets were built to resemble the standard print sheets.


## Draggable & Transferrable Item Cards
Inventory is handled through item cards, which can be moved around freely, moved between sheets, or copied with CTRL+Drag.

Cards are styled to resemble the official game cards, with automated rolls, usage dots, and more being included.

For usage, left click the dots to increase, and right click to decrease. You can also swap medium weapon damage between one handed and two by clicking the damage value.

## Item Compendiums
Every Item, Weapon, Condition, and Spell from the game has been included inside of the system's compendiums.

## Storage Sheets with Adjustable Dimensions
Have a cart, chest, bank, etc that players want to store items in? Or maybe you have a treasure horde that you want to allow players to peruse through. You can create 'Storage' actors with adjustable slot counts.

## Automated Skill Rolls
You can roll your stats using the built in advantage/disadvantage system

## Macro Support for Weapons, Items, and Skills
For items, you can simply drag them into the hotbar, or use this script:

```
game.mausritter.rollItemMacro("itemName");
```
For Skills, create a new macro with this
```
game.mausritter.rollStatMacro();
```

# Screenshots
![Alt text](https://i.imgur.com/4PYBj8X.jpg "Game Example")

_Mausritter ©2020 Isaac Williams & Losing Games_

# Legal note
Images used:
- [Icons - Flaticon](https://www.flaticon.com)
