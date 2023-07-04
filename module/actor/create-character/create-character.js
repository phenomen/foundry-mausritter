import {
    BACKGROUNDS,
    FIRST_NAMES,
    ITEMS,
    LAST_NAMES,
    SLOTS,
    WEAPONS_TO_ITEMS,
    TAKE_ONE_OF_ADDITIONAL_ITEMS,
    TAKE_BOTH_ADDITIONAL_ITEMS
} from "./data.js";
import {showCreateCharacterDialog} from "./create-character-dialog.js";
import {showWeaponChoiceDialog} from "./weapon-choice.js";
import {addItem, attrRoll, drawFromTable, getItemFromFoundry} from "./foundry-clinet.js";
import {showAdditionalItemsInfoDialog} from "./additional-items-info-dialog.js";
import {showAdditionalItemsChoiceDialog} from "./additional-items-dialog-choice.js";

export async function autoCreateCharacter() {
    await showCreateCharacterDialog((options) => {
        if (options.items) {
            showWeaponChoiceDialog((value) => {
                const weaponItems = WEAPONS_TO_ITEMS[value];
                createCharacter(options, weaponItems)
            })
        } else {
            createCharacter(options)
        }
    })
}

export async function createCharacter(options, additionalWeaponsItems) {
    const background = options.background ? getRandomBackground() : undefined
    const characterStats = await createStats(background, options.stats, options.details);
    const characterActor = await Actor.create(characterStats);

    if (options.background && options.items) {
        await addItemsFromBackground(characterActor, background);
    }

    if (options.items) {
        await addStatingItems(characterActor)
    }

    if (additionalWeaponsItems !== undefined) {
        const slots = [SLOTS.MAIN_PAW, SLOTS.UPPER_BODY]
        for (const [idx, itemId] of additionalWeaponsItems.entries()) {
            await addItem(itemId, characterActor, slots[idx]);
        }
    }

    await characterActor.sheet.render(true)

    const highestAttrValue = getHighestAttrValue(characterStats.data.stats);
    if (highestAttrValue <= TAKE_BOTH_ADDITIONAL_ITEMS && options.items && options.background) {
        const additionalItemsBackground = getRandomBackgroundDifferentThan(background);
        getBackgroundItems(additionalItemsBackground)
            .then(async (items) => {
                const slots = [SLOTS.SLOT_2, SLOTS.SLOT_5]
                for (const [idx, item] of items.entries()) {
                    await addItem(item.uuid, characterActor, slots[idx]);
                }

                await showAdditionalItemsInfoDialog(items)
            })

    } else {

        if (highestAttrValue <= TAKE_ONE_OF_ADDITIONAL_ITEMS && options.items && options.background) {
            const additionalItemsBackground = getRandomBackgroundDifferentThan(background);
            const itemCompendiumIds = additionalItemsBackground.items;
            getBackgroundItems(additionalItemsBackground)
                .then(async (items) => {
                    await showAdditionalItemsChoiceDialog(items, async (selectedIndex) => {
                        await addItem(itemCompendiumIds[selectedIndex], characterActor, SLOTS.SLOT_2)
                    })
                })
        }
    }
}

function getRandomBackgroundDifferentThan(current) {
    const background = getRandomBackground()
    return background.name === current.name ? getRandomBackgroundDifferentThan(current) : background;
}

async function getBackgroundItems(background) {
    return await Promise.all(
        background.items.map(async (itemId) => {
            return await getItemFromFoundry(itemId)
        })
    )
}

async function createStats(background, basicStats, details) {
    const dexterity = !!basicStats ? attrRoll() : 0;
    const strength = !!basicStats ? attrRoll() : 0;
    const will = !!basicStats ? attrRoll() : 0;

    const backgroundName = !!background ? background.name : "";
    const pips = !!background ? background.pips : 0;
    const hp = !!background ? background.hp : 0;

    const birthSign = details ? await drawFromTable("Birthsign") : '';
    const look = details ? await drawFromTable("Physical detail") : '';
    const coat = details ? await drawFromTable("Mousy Coat Pattern") + " " + await drawFromTable("Mousy Coat Color") : '';

    const name = getRandomName();

    return {
        name: name,
        type: "character",
        data: {
            stats: {
                dexterity: {
                    max: dexterity,
                    value: dexterity
                },
                strength: {
                    max: strength,
                    value: strength
                },
                will: {
                    max: will,
                    value: will
                }
            },
            health: {
                max: hp,
                value: hp
            },
            pips: {
                value: pips
            },
            description: {
                background: backgroundName,
                birthsign: birthSign,
                coat: coat,
                look: look
            }
        }
    };
}

function getRandomBackground() {
    const random = Math.floor(Math.random() * BACKGROUNDS.length);
    return BACKGROUNDS[random]
}


async function addStatingItems(instant) {
    await addItem(ITEMS.TORCHES, instant, SLOTS.SLOT_3)
    await addItem(ITEMS.RATIONS, instant, SLOTS.SLOT_6)
}

async function addItemsFromBackground(instant, background) {
    const slots = [SLOTS.SLOT_1, SLOTS.SLOT_4]
    for (const [idx, itemId] of background.items.entries()) {
        await addItem(itemId, instant, slots[idx]);
    }
}

function getHighestAttrValue(stats) {
    return Math.max(...[stats.dexterity.max, stats.will.max, stats.strength.max])
}

function getRandomName() {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
    return firstName + " " + lastName
}