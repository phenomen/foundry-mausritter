//#region src/actor/create-character/foundry-client.js
async function getItemFromFoundry(item_id) {
	return await Item.fromDropData({
		type: "Item",
		uuid: item_id
	});
}
async function addItem(itemId, instant, slot) {
	const item = await getItemFromFoundry(itemId);
	if (!item) throw new Error(`Starting item not found: ${itemId}`);
	const itemData = item.toObject();
	delete itemData._id;
	itemData._stats ??= {};
	itemData._stats.compendiumSource = item.uuid;
	if (slot) itemData.system.sheet = {
		...itemData.system.sheet,
		...slot
	};
	return instant.createEmbeddedDocuments("Item", [itemData]);
}
async function attrRoll() {
	const roll = new Roll("3d6kh2");
	await roll.evaluate();
	return roll.total;
}
async function drawFromTable(tableName) {
	const table = (await game.packs.get("mausritter.tables")?.getDocuments())?.find((table) => table.name === tableName);
	if (!table) throw new Error(`Mausritter table not found: ${tableName}`);
	const result = (await table.roll()).results[0];
	if (!result) return "";
	if (result.name) return result.name;
	if (result.description) return result.description.replace(/<[^>]+>/g, "").trim();
	return "";
}
//#endregion
//#region src/macros.js
function itemMacroCommand(name) {
	return `game.mausritter.rollItemMacro(${JSON.stringify(name)})`;
}
async function createMausritterMacro(dropData, slot) {
	const item = await Item.implementation.fromDropData(dropData);
	if (!item?.parent || item.parent.documentName !== "Actor") return ui.notifications.warn("You can only create macro buttons for owned Items");
	const command = itemMacroCommand(item.name);
	const macro = game.macros.find((m) => m.name === item.name && m.command === command && m.isAuthor) ?? await Macro.create({
		name: item.name,
		img: item.img,
		type: "script",
		command,
		flags: { "mausritter.itemMacro": true }
	});
	return game.user.assignHotbarMacro(macro, slot);
}
function rollItemMacro(itemName) {
	const actor = ChatMessage.getSpeakerActor(ChatMessage.getSpeaker());
	const item = actor?.items.find((i) => i.name === itemName);
	if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);
	return actor.rollItem(item.id);
}
function rollStatMacro() {
	const actor = ChatMessage.getSpeakerActor(ChatMessage.getSpeaker());
	if (!actor?.system.stats) return ui.notifications.warn("Select an actor with attributes to roll.");
	return actor.rollStatSelect(Object.entries(actor.system.stats));
}
async function rollWeather() {
	const seasons = [
		"Summer",
		"Autumn",
		"Winter",
		"Spring"
	];
	const data = await foundry.applications.api.DialogV2.input({
		window: { title: "Select Season" },
		content: `<label>Season <select name="season">${seasons.map((s) => `<option>${s}</option>`).join("")}</select></label>`,
		rejectClose: false
	});
	if (!data || !seasons.includes(data.season)) return null;
	return ChatMessage.create({
		content: `<h2>Today's Weather:</h2><b>${foundry.utils.escapeHTML(await drawFromTable(`Weather ${data.season}`))}</b>`,
		whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id)
	});
}
async function generateHex() {
	const types = [
		"Countryside",
		"Forest",
		"River",
		"Human Town"
	];
	const data = await foundry.applications.api.DialogV2.input({
		window: { title: "Select Type" },
		content: `<label>Select or Roll Hex Type <select name="type">${["Random", ...types].map((s) => `<option>${s}</option>`).join("")}</select></label>`,
		rejectClose: false
	});
	if (!data) return null;
	const type = data.type === "Random" ? types[Math.floor(Math.random() * types.length)] : data.type;
	if (!types.includes(type)) throw new Error("Invalid hex type.");
	const landmark = await drawFromTable(`Hex - ${type}`);
	const details = await drawFromTable("Hex - Landmark Details");
	return ChatMessage.create({
		content: `<h2>${type}:</h2><p><b>Landmark:</b> ${foundry.utils.escapeHTML(landmark)}</p><p><b>Details:</b> <i>${foundry.utils.escapeHTML(details)}</i></p>`,
		whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id)
	});
}
async function generateNpc() {
	const tables = CONFIG.MAUSRITTER.tables;
	const description = { disposition: await drawFromTable(tables.npcBirthsign) };
	let notes = "";
	for (const [label, key] of [
		["Social position and Payment for service", "npcSocial"],
		["Appearance", "npcAppearance"],
		["Quirk", "npcQuirk"],
		["Wants", "npcWants"],
		["Relationship", "npcRelationship"]
	]) notes += `<p><b>${label}:</b> ${foundry.utils.escapeHTML(await drawFromTable(tables[key]))}</p>`;
	const name = `${await drawFromTable(tables.firstName)} ${await drawFromTable(tables.lastName)}`;
	const stats = {};
	for (const key of [
		"dexterity",
		"strength",
		"will"
	]) {
		const { total } = await new Roll("2d6").evaluate();
		stats[key] = {
			max: total,
			value: total
		};
	}
	const { total: health } = await new Roll("1d6").evaluate();
	const actor = await Actor.create({
		name,
		type: "hireling",
		system: {
			description,
			notes,
			stats,
			health: {
				max: health,
				value: health
			}
		}
	});
	await actor.sheet.render({ force: true });
	return actor;
}
//#endregion
//#region src/legacy-macros.json
var legacy_macros_default = [
	{
		"id": "EjAi7W1jOj8v6zws",
		"name": "Roll Weather",
		"original": "//Generate Weather\n\n/*\nsource: https://raw.githubusercontent.com/brunocalado/mestre-digital/master/Foundry%20VTT/Macros/Sistemas%20Diversos/Mausritter-Weather.js\n*/\n\nconst version = '1.1';\nconst compendium_label = 'Tables';\n\n(async () => {\n\n    // const summer = await drawFromTable('Weather Summer');\n    // const autumn = await drawFromTable('Weather Autumn');\n    // const winter = await drawFromTable('Weather Winter');\n    // const spring = await drawFromTable('Weather Spring');\n    \n    let seasonList = ['Summer', 'Autumn', 'Winter', 'Spring'];\n    let selectList = \"\";\n\n    seasonList.forEach(option => selectList += \"<option value='\" + option + \"'>\" + option + \"</option>\")\n\n    let d = new Dialog({\n        title: \"Select Season\",\n        content: \"<h2> Season </h2> <select style='margin-bottom:10px;'name='stat' id='stat'> \" + selectList + \"</select> <br/>\",\n        buttons: {\n            roll: {\n                icon: '<i class=\"fas fa-check\"></i>',\n                label: \"Roll\",\n                callback: (html) => drawFromTable('Weather '+html.find('[id=\\\"stat\\\"]')[0].value)\n            },\n            cancel: {\n                icon: '<i class=\"fas fa-times\"></i>',\n                label: \"Cancel\",\n                callback: () => { }\n            }\n        },\n        default: \"roll\",\n        close: () => { }\n    });\n    d.render(true);\n\n})()\n\n/* Functions */\nasync function drawFromTable(tableName) {\n  let list_compendium = await game.packs.filter(p=>p.documentName=='RollTable');      \n  let inside = await list_compendium.filter( p=>p.metadata.label==compendium_label)[0].getDocuments();      \n  let table = await inside.filter( p=>p.data['name']==tableName )[0];\n  \n  if (!table) {\n    ui.notifications.warn(`Table ${tableName} not found.`, {});\n    return;\n  }\n  \n  let weather = await table.roll(); \n  weather = weather.results[0].data.text;  \n  let message = \"<h2> Today's Weather: </h2><b style='font-size:120%;'>\"+weather+\"</br>\";\n  \n  let chatData = {\n    content: message,\n    whisper : ChatMessage.getWhisperRecipients(\"GM\")\n  };  \n\n  ChatMessage.create(chatData);  \n}",
		"command": "await game.mausritter.rollWeather();"
	},
	{
		"id": "GUSg73Vtn1Pck49h",
		"name": "Generate Hex",
		"original": "//Generate Hex\n\n/*\nsource: https://raw.githubusercontent.com/brunocalado/mestre-digital/master/Foundry%20VTT/Macros/Sistemas%20Diversos/Mausritter-Hex.js\n*/\n\nconst version = '1.0';\nconst compendium_label = 'Tables';\n\n(async () => {\n\n    let hexTypeList = ['Random', 'Countryside', 'Forest', 'River', 'Human Town'];\n    let selectList = \"\";\n\n    hexTypeList.forEach(option => selectList += \"<option value='\" + option + \"'>\" + option + \"</option>\")\n\n    let d = new Dialog({\n        title: \"Select Type\",\n        content: \"<h2> Select or Roll Hex Type </h2> <select style='margin-bottom:10px;'name='stat' id='stat'> \" + selectList + \"</select> <br/>\",\n        buttons: {\n            roll: {\n                icon: '<i class=\"fas fa-check\"></i>',\n                label: \"Roll\",\n                callback: (html) => hexType(html.find('[id=\\\"stat\\\"]')[0].value)\n            },\n            cancel: {\n                icon: '<i class=\"fas fa-times\"></i>',\n                label: \"Cancel\",\n                callback: () => { }\n            }\n        },\n        default: \"roll\",\n        close: () => { }\n    });\n    d.render(true);\n\n})()\n\nasync function hexType(hexType) {\n  let hexContents = \"\";\n  let hexDetails = \"\";\n  let buffer ='';\n  let randomHex = ['Countryside', 'Forest', 'River', 'Human Town'];\n  \n  if(hexType == \"Random\"){\n    const randomElement = \n    hexType = randomHex[Math.floor(Math.random() * randomHex.length)];\n  }\n\n  buffer = await drawFromTable(\"Hex - \" + hexType);\n  buffer = await buffer.roll(); \n  hexContents = buffer.results[0].data.text;\n\n  buffer = await drawFromTable(\"Hex - Landmark Details\");\n  buffer = await buffer.roll(); \n  hexDetails = buffer.results[0].data.text;\n\n\n  let message = \"\\\n  <h2> \"+hexType+\": </h2>\\\n  <b> Landmark: </b>\"+hexContents+\"</br>\\\n  <b> Details: </b><i>\"+hexDetails+\"</i></br>\";\n\n  let chatData = {\n    content: message,\n    whisper : ChatMessage.getWhisperRecipients(\"GM\")\n  };  \n\n  ChatMessage.create(chatData);\n\n}\n\n/* Functions */\nasync function drawFromTable(tableName) {\n  let list_compendium = await game.packs.filter(p=>p.documentName=='RollTable');      \n  let inside = await list_compendium.filter( p=>p.metadata.label==compendium_label )[0].getDocuments();      \n  let table = await inside.filter( p=>p.data['name']==tableName )[0];\n  \n  if (!table) {\n    ui.notifications.warn(`Table ${tableName} not found.`, {});\n    return;\n  }\n  return await table;\n}",
		"command": "await game.mausritter.generateHex();"
	},
	{
		"id": "LKs8P76vMJzk1Zx0",
		"name": "NPC Generator",
		"original": "/* Instant NPC - v0.3\n\nSource: https://raw.githubusercontent.com/brunocalado/mestre-digital/master/Foundry%20VTT/Macros/Sistemas%20Diversos/Mausritter-InstantNPC.js\nIcon: systems/mausritter/images/sample/Portrait_Rat.png\n*/\n//test stuff: console.log(canvas.tokens.controlled[0].actor);\n\nconst compendium_label = 'Tables';\n\n(async () => {\n  const Appearance = await drawFromTable('Non-player mice - Appearance');\n  const Birthsign = await drawFromTable('Non-player mice - Birthsign and Disposition');\n  const Quirk = await drawFromTable('Non-player mice - Quirk');\n  const Social = await drawFromTable('Non-player mice - Social position and Payment for service');\n  const Wants = await drawFromTable('Non-player mice - Wants');\n  const Relationship = await drawFromTable('Non-player mice - Relationship');\n  \n  const Birthname = await drawFromTable('Mousy Names - Birthname');  \n  const Matriname = await drawFromTable('Mousy Names - Matriname');\n  \n  const dexterity = attrRoll();\n  const strength = attrRoll();\n  const will = attrRoll();\n  const health = healthRoll();\n  \n  let msg = '';\n  msg += `<p><b>Social position and Payment for service:</b> ${Social}</p>`;  \n  msg += `<p><b>Appearance:</b> ${Appearance}</p>`;  \n  msg += `<p><b>Quirk:</b> ${Quirk}</p>`;  \n  msg += `<p><b>Wants:</b> ${Wants}</p>`;  \n  msg += `<p><b>Relationship:</b> ${Relationship}</p>`;  \n  \n  //let npchp = randomHP(4,10);\n  let instantNPC = await Actor.create({\n    name: Birthname + \" \" + Matriname,\n    type: \"hireling\",\n    data: {\n      description: {\n        disposition: Birthsign\n      },   \n      notes: msg,\n      stats: {\n        dexterity: {          \n          max: dexterity,\n          value: dexterity\n        },\n        strength: {          \n          max: strength,\n          value: strength\n        },\n        will: {          \n          max: will,\n          value: will\n        }        \n      },\n      health: {\n        max: health,\n        value: health\n      }        \n    }\n  });\n\n  await instantNPC.sheet.render(true);\n  \n})()\n\n/* Functions */\nasync function drawFromTable(tableName) {\n  let list_compendium = await game.packs.filter(p=>p.documentName=='RollTable');      \n  let inside = await list_compendium.filter( p=>p.metadata.label==compendium_label)[0].getDocuments();      \n  let table = await inside.filter( p=>p.data['name']==tableName )[0];\n  \n  if (!table) {\n    ui.notifications.warn(`Table ${tableName} not found.`, {});\n    return;\n  }\n  \n  let buffer = await table.roll(); \n \n  return buffer.results[0].data.text;  \n}\n\nfunction treasureCoins(min, max) {\n  return Math.floor(Math.random() * (max - min) ) + min;  \n}\n\nfunction attrRoll() {\n  return new Roll('2d6').roll({ async : false }).total;\n}\n\nfunction healthRoll() {\n  return new Roll('1d6').roll({ async : false }).total;\n}\n\nfunction randomHP(min, max) {\n  return Math.floor(Math.random() * (max - min) ) + min;  \n}",
		"command": "await game.mausritter.generateNpc();"
	}
];
//#endregion
//#region src/migration.js
var SHEET_IDS = {
	"mausritter.i": "mausritter.MausritterActorSheet",
	"mausritter.I": "mausritter.MausritterHirelingSheet",
	"mausritter.P": "mausritter.MausritterCreatureSheet",
	"mausritter.R": "mausritter.MausritterStorageSheet",
	"mausritter.V": "mausritter.MausritterItemSheet"
};
function remapSheetDefaults(defaults) {
	return Object.fromEntries(Object.entries(defaults).map(([type, sheets]) => [type, Object.fromEntries(Object.entries(sheets).map(([subtype, id]) => [subtype, SHEET_IDS[id] ?? id]))]));
}
async function migrateSheetReferences() {
	if (game.users.activeGM?.id !== game.user.id || game.settings.get("mausritter", "sheetMigrationVersion") >= 1) return;
	const defaults = remapSheetDefaults(game.settings.get("core", "sheetClasses"));
	await game.settings.set("core", "sheetClasses", defaults);
	foundry.applications.apps.DocumentSheetConfig.updateDefaultSheets(defaults);
	const migrate = async (document) => {
		const id = SHEET_IDS[document.getFlag("core", "sheetClass")];
		if (id) await document.setFlag("core", "sheetClass", id);
		for (const item of document.items ?? []) await migrate(item);
	};
	for (const document of [...game.actors, ...game.items]) await migrate(document);
	for (const scene of game.scenes) for (const token of scene.tokens) if (!token.actorLink && token.actor) await migrate(token.actor);
	for (const pack of game.packs) {
		if (!["Actor", "Item"].includes(pack.documentName) || !["world", "mausritter"].includes(pack.metadata.packageName)) continue;
		const documents = await pack.getDocuments();
		if (!documents.some((d) => SHEET_IDS[d.getFlag("core", "sheetClass")] || d.items?.some((i) => SHEET_IDS[i.getFlag("core", "sheetClass")]))) continue;
		const locked = pack.locked;
		try {
			if (locked) await pack.configure({ locked: false });
			for (const document of documents) await migrate(document);
		} finally {
			if (locked) await pack.configure({ locked: true });
		}
	}
	await game.settings.set("mausritter", "sheetMigrationVersion", 1);
}
function migratedMacroCommand(command) {
	return legacy_macros_default.find((macro) => macro.original === command)?.command;
}
async function migrateMacros() {
	if (game.users.activeGM?.id !== game.user.id || game.settings.get("mausritter", "macroMigrationVersion") >= 1) return;
	const migrate = async (macros) => {
		for (const macro of macros) {
			const command = migratedMacroCommand(macro.command);
			if (command) await macro.update({ command });
		}
	};
	await migrate(game.macros);
	for (const pack of game.packs) {
		if (pack.documentName !== "Macro" || !["world", "mausritter"].includes(pack.metadata.packageName)) continue;
		const macros = await pack.getDocuments();
		if (!macros.some((m) => migratedMacroCommand(m.command))) continue;
		const locked = pack.locked;
		try {
			if (locked) await pack.configure({ locked: false });
			await migrate(macros);
		} finally {
			if (locked) await pack.configure({ locked: true });
		}
	}
	await game.settings.set("mausritter", "macroMigrationVersion", 1);
}
//#endregion
//#region src/data-models.js
var { SchemaField, NumberField, StringField, BooleanField, HTMLField, AnyField } = foundry.data.fields;
var number = (initial = 0) => new NumberField({
	required: true,
	nullable: true,
	initial
});
var string = (initial = "") => new StringField({
	required: true,
	nullable: true,
	trim: false,
	initial
});
var html = () => new HTMLField({
	required: true,
	nullable: true,
	initial: ""
});
var MausritterData = class extends foundry.abstract.TypeDataModel {
	static _preCleanData(data, options, state) {
		super._preCleanData(data, options, state);
		options.prune = false;
	}
};
var ActorData = class extends MausritterData {
	static defineSchema() {
		return {
			health: new SchemaField({
				value: number(),
				min: number(),
				max: number()
			}),
			hits: new SchemaField({
				value: number(2),
				max: number(2)
			}),
			armor: number(),
			biography: html(),
			notes: html(),
			description: new SchemaField({ disposition: string() })
		};
	}
};
var CreatureData = class extends ActorData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			stats: new SchemaField(Object.fromEntries([
				"Strength",
				"Dexterity",
				"Will"
			].map((label) => [label.toLowerCase(), new SchemaField({
				value: number(),
				label: string(label),
				max: number()
			})])))
		};
	}
};
var CharacterData = class extends CreatureData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			description: new SchemaField({
				background: string("Description"),
				birthsign: string(),
				coat: string(),
				look: string()
			}),
			level: new SchemaField({
				value: number(1),
				xp: number()
			}),
			pips: new SchemaField({ value: number() }),
			grit: new SchemaField({
				value: number(),
				ignored: string()
			}),
			other: new SchemaField({ grit: new SchemaField({ value: number() }) })
		};
	}
};
var HirelingData = class extends CreatureData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			level: new SchemaField({
				value: number(),
				xp: number()
			}, { required: false }),
			grit: new SchemaField({ value: number() }, { required: false })
		};
	}
};
var StorageActorData = class extends ActorData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			size: new SchemaField({
				width: number(3),
				height: number(2)
			}),
			storeDiv: string()
		};
	}
};
var ItemData = class extends MausritterData {
	static defineSchema() {
		return {
			description: html(),
			color: string("white"),
			equipped: new BooleanField({
				required: false,
				initial: void 0
			}),
			sheet: new SchemaField({
				active: new BooleanField(),
				currentX: number(),
				currentY: number(),
				initialX: number(),
				initialY: number(),
				xOffset: number(),
				yOffset: number(),
				rotation: number(),
				curWidth: number(1),
				curHeight: number(1),
				zIndex: number(1)
			}),
			pips: new SchemaField({
				value: number(),
				max: number(),
				html: string()
			}),
			size: new SchemaField({
				width: number(1),
				height: number(1),
				x: string("9em"),
				y: string("9em"),
				aspect: number(1)
			})
		};
	}
};
var GearData = class extends ItemData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			weight: number(),
			cost: number(),
			tag: string()
		};
	}
};
var CarriedItemData = class extends GearData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			placement: string("hand")
		};
	}
};
var WeaponData = class extends CarriedItemData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			weapon: new SchemaField({
				dmg1: string("d6"),
				dmg2: string(),
				selected: number(),
				canSwap: new BooleanField()
			})
		};
	}
};
var ArmorData = class extends GearData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			armor: new SchemaField({ value: number(1) })
		};
	}
};
var StorageItemData = class extends GearData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			store: new SchemaField({
				value: new AnyField({
					required: true,
					nullable: true,
					initial: "0",
					validate: (value) => typeof value === "string" || typeof value === "number" && Number.isFinite(value)
				}),
				max: number(25)
			})
		};
	}
};
var ConditionData = class extends ItemData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			clear: string(),
			desc: string()
		};
	}
};
var SpellData = class extends ItemData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			tag: string(),
			isSpell: new BooleanField({ initial: true }),
			cost: new NumberField({
				required: false,
				nullable: true,
				initial: void 0
			})
		};
	}
};
var actorDataModels = {
	character: CharacterData,
	hireling: HirelingData,
	creature: CreatureData,
	storage: StorageActorData
};
var itemDataModels = {
	item: CarriedItemData,
	weapon: WeaponData,
	armor: ArmorData,
	storage: StorageItemData,
	condition: ConditionData,
	spell: SpellData
};
//#endregion
//#region src/actor/actor.js
var Die = foundry.dice.terms.Die;
var renderTemplate = foundry.applications.handlebars.renderTemplate;
/**
* Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
* @extends {Actor}
*/
var MausritterActor = class extends Actor {
	async _postChat(templateData, rolls = []) {
		const chatData = {
			author: game.user.id,
			speaker: ChatMessage.getSpeaker({ actor: this }),
			content: await renderTemplate("systems/mausritter/templates/chat/statroll.html", templateData),
			rolls
		};
		ChatMessage.applyMode(chatData);
		return ChatMessage.create(chatData);
	}
	async rollStatSelect(statList) {
		const options = statList.map(([key, stat]) => "<option value=\"" + foundry.utils.escapeHTML(key) + "\">" + foundry.utils.escapeHTML(game.i18n.localize("Maus." + stat.label)) + "</option>").join("");
		const data = await foundry.applications.api.DialogV2.input({
			window: { title: game.i18n.localize("Maus.RollSelectStat") },
			content: "<label>" + game.i18n.localize("Maus.RollSelectStat") + " <select name=\"stat\">" + options + "</select></label>",
			rejectClose: false
		});
		if (data && this.system.stats?.[data.stat]) return this.rollStat(this.system.stats[data.stat]);
	}
	async rollStat(attribute) {
		const data = await foundry.applications.api.DialogV2.input({
			window: { title: game.i18n.localize("Maus.RollSelectType") },
			content: "<label>" + game.i18n.localize("Maus.RollAdvantageDisadvantage") + " <select name=\"advantage\"><option value=\"none\">" + game.i18n.localize("Maus.RollNone") + "</option><option value=\"advantage\">" + game.i18n.localize("Maus.RollAdvantageDisadvantage") + "</option></select></label>",
			rejectClose: false
		});
		if (data) return this.rollAttribute(attribute, data.advantage);
	}
	async rollItem(itemId) {
		const document = this.items.get(itemId);
		if (!document) return ui.notifications.warn("The item is no longer in this inventory.");
		const item = document.toObject();
		if (item.type === "weapon") {
			const options = [
				"normal",
				"enhanced",
				"impaired"
			].map((value) => "<option value=\"" + value + "\">" + game.i18n.localize("Maus.Roll" + value[0].toUpperCase() + value.slice(1)) + "</option>").join("");
			const data = await foundry.applications.api.DialogV2.input({
				window: { title: game.i18n.localize("Maus.RollSelectType") },
				content: "<label>" + game.i18n.localize("Maus.RollDamage") + " <select name=\"state\">" + options + "</select></label>",
				rejectClose: false
			});
			if (data) return this.rollWeapon(item, data.state);
		} else if (item.type === "spell") return this.rollSpell(item);
		else return this.chatDesc(item);
	}
	async rollWeapon(item = "", state = "") {
		let die = item.system.weapon.selected === 0 ? item.system.weapon.dmg1 : item.system.weapon.dmg2;
		if (state === "impaired") die = "d4";
		if (state === "enhanced") die = "d12";
		const damageRoll = new Roll(die);
		await damageRoll.evaluate();
		const diceData = this.formatDice(damageRoll);
		let pipHtml = "<div style='margin-top: 5px;'>";
		for (let i = 0; i < item.system.pips.max; i++) if (i < item.system.pips.value) pipHtml += "<i class=\"fas fa-circle\">&nbsp;</i>";
		else pipHtml += "<i class=\"far fa-circle\">&nbsp;</i>";
		pipHtml += "</div>";
		const templateData = {
			actor: this,
			data: { diceTotal: {
				damageValue: damageRoll.total,
				damageRoll
			} },
			item,
			pip: pipHtml,
			rollTitle: game.i18n.localize("Maus.RollDamage"),
			rollText: damageRoll.total,
			damageDice: die,
			weaponState: game.i18n.localize(`Maus.Roll${state.charAt(0).toUpperCase()}${state.slice(1)}`),
			isWeapon: true,
			diceData
		};
		return this._postChat(templateData, [damageRoll]);
	}
	async rollSpell(item = "", power) {
		if (power !== void 0) {
			power = Number(power);
			if (!Number.isSafeInteger(power) || power < 1) throw new Error("Spell power must be a positive whole number.");
		}
		const document = this.items.get(item._id);
		if (document?.type !== "spell") return ui.notifications.warn("The spell is no longer in this inventory.");
		const maxUses = Number(document.system.pips.max);
		if (!Number.isSafeInteger(maxUses) || maxUses < 1) return ui.notifications.warn("Set the spell's maximum usage to a positive whole number before casting.");
		const maxPower = game.settings.get("mausritter", "limitSpellPowerToRemainingUses") ? Math.max(0, Math.floor(maxUses - Math.max(0, Number(document.system.pips.value) || 0))) : maxUses;
		if (maxPower === 0 || game.settings.get("mausritter", "blockExhaustedSpells") && document.system.pips.value >= maxUses) return ui.notifications.warn("This spell is exhausted. Clear a usage mark before casting again.");
		if (power === void 0) {
			const data = await foundry.applications.api.DialogV2.input({
				window: { title: game.i18n.localize("Maus.RollPowerDesc") },
				content: `<label>${game.i18n.localize("Maus.RollPowerDesc")} (1–${maxPower}) <range-picker name="power" min="1" max="${maxPower}" step="1" value="1"></range-picker></label>`,
				rejectClose: false
			});
			if (data) return this.rollSpell(item, data.power);
			return;
		}
		if (power > maxPower) return ui.notifications.warn(`Spell power cannot exceed its current limit (${maxPower}).`);
		const die = `${power}d6`;
		const damageRoll = new Roll(die);
		await damageRoll.evaluate();
		const diceData = this.formatDice(damageRoll);
		let rollDiv = "";
		let usage = 0;
		let miscast = 0;
		for (let i = 0; i < Number.parseInt(power, 10); i++) {
			if (i > 0) rollDiv += `, ${diceData.dice[i].result}`;
			else rollDiv += `${diceData.dice[i].result}`;
			if (diceData.dice[i].result >= 4) {
				usage++;
				if (diceData.dice[i].result === 6) miscast++;
			}
		}
		if (usage) {
			const value = Math.min(document.system.pips.max, Math.max(0, Number(document.system.pips.value) || 0) + usage);
			if (value !== document.system.pips.value) {
				if (!await document.update({ "system.pips.value": value })) throw new Error("The spell's usage marks could not be saved.");
			}
		}
		item = document.toObject();
		if (item.system.description == null) item.system.description = "";
		item.system.description = item.system.description.split(game.i18n.localize("Maus.RollDiceKeyword")).join(`<strong style='text-decoration:underline' class='red'>${power}</strong>`);
		item.system.description = item.system.description.split(game.i18n.localize("Maus.RollSumKeyword")).join(`<strong style='text-decoration:underline' class='red'>${damageRoll.total}</strong>`);
		item.system.description += `<h2>${game.i18n.localize("Maus.RollUsage")}: <strong>${usage}</strong></h2>`;
		if (miscast) {
			let miscastDesc = game.i18n.localize("Maus.RollMiscastDesc");
			miscastDesc = miscastDesc.replace("!miscast!", `${miscast}`);
			item.system.description += `<h2>${game.i18n.localize("Maus.RollMiscast")}: <strong>${miscast}</strong> </h2>${miscastDesc}`;
		}
		let pipHtml = "<div style='margin-top: 5px;'>";
		for (let i = 0; i < item.system.pips.max; i++) if (i < item.system.pips.value) pipHtml += "<i class=\"fas fa-circle\">&nbsp;</i>";
		else pipHtml += "<i class=\"far fa-circle\">&nbsp;</i>";
		pipHtml += "</div>";
		const templateData = {
			actor: this,
			data: {
				diceTotal: {
					damageValue: damageRoll.total,
					damageRoll
				},
				rollDiv
			},
			item,
			pip: pipHtml,
			isSpell: true,
			isWeapon: true,
			rollTitle: `${game.i18n.localize("Maus.RollSum")}|${game.i18n.localize("Maus.RollDice")}`,
			rollText: `${damageRoll.total}|${power}`,
			sum: damageRoll.total,
			dice: power,
			diceData
		};
		return this._postChat(templateData, [damageRoll]);
	}
	async rollAttribute(attribute, advantage, item = "", rollOver = false) {
		let attributeName = attribute.label?.charAt(0).toUpperCase() + attribute.label?.toLowerCase().slice(1);
		if (!attribute.label && Number.isNaN(attributeName)) attributeName = attribute.charAt(0)?.toUpperCase() + attribute.toLowerCase().slice(1);
		const diceformular = "1d20";
		const r = new Roll(diceformular, {});
		await r.evaluate();
		`${r.total}`.split("");
		const a = new Roll(diceformular, {});
		await a.evaluate();
		let damageRoll = 0;
		if (item?.type === "weapon") {
			damageRoll = new Roll(item.system.damage);
			await damageRoll.evaluate();
		}
		const diceData = this.formatDice(r);
		let mod = 0;
		if (attribute.mod > 0) mod = attribute.mod;
		const targetValue = attribute.value + mod + (item === "" ? 0 : item.system.bonus);
		let resultText = "";
		if (rollOver === true) resultText = r.total >= targetValue ? game.i18n.localize("Maus.RollSuccess") : game.i18n.localize("Maus.RollFailure");
		else resultText = r.total <= targetValue ? game.i18n.localize("Maus.RollSuccess") : game.i18n.localize("Maus.RollFailure");
		const templateData = {
			actor: this,
			stat: { name: game.i18n.localize(`Maus.${attributeName}`).toUpperCase() },
			data: {
				diceTotal: {
					value: r.total,
					advantageValue: a.total,
					damageValue: typeof damageRoll === "number" ? damageRoll : damageRoll.total,
					damageRoll
				},
				resultText: { value: resultText },
				isCreature: { value: this.type === "hireling" }
			},
			target: attribute.value,
			mod,
			item,
			targetValue,
			useSkill: item?.type === "skill",
			isWeapon: item?.type === "weapon",
			advantage: advantage === "advantage",
			diceData
		};
		return this._postChat(templateData, [
			r,
			...advantage === "advantage" ? [a] : [],
			...damageRoll instanceof Roll ? [damageRoll] : []
		]);
	}
	formatDice(diceRoll) {
		const diceData = { dice: [] };
		if (diceRoll != null) {
			const pushDice = (diceData, total, faces, color) => {
				let img = null;
				if ([
					4,
					6,
					8,
					10,
					12,
					20
				].indexOf(faces) > -1) img = `../icons/svg/d${faces}-grey.svg`;
				diceData.dice.push({
					img,
					result: total,
					dice: true,
					color
				});
			};
			for (let i = 0; i < diceRoll.terms.length; i++) if (diceRoll.terms[i] instanceof Die) {
				const pool = diceRoll.terms[i].results;
				const faces = diceRoll.terms[i].faces;
				for (const pooldie of pool) if (pooldie.discarded) pushDice(diceData, pooldie.result, faces, "#777");
				else pushDice(diceData, pooldie.result, faces, "white");
			} else if (typeof diceRoll.terms[i] === "string") {
				const parsed = Number.parseInt(diceRoll.terms[i], 10);
				if (!Number.isNaN(parsed)) diceData.dice.push({
					img: null,
					result: parsed,
					dice: false,
					color: "white"
				});
				else diceData.dice.push({
					img: null,
					result: diceRoll.terms[i],
					dice: false
				});
			} else if (typeof diceRoll.terms[i] === "number") {
				const parsed = Number.parseInt(diceRoll.terms[i], 10);
				if (!Number.isNaN(parsed)) diceData.dice.push({
					img: null,
					result: parsed,
					dice: false,
					color: "white"
				});
				else diceData.dice.push({
					img: null,
					result: diceRoll.terms[i],
					dice: false
				});
			}
		}
		return diceData;
	}
	chatDesc(item) {
		let itemName = item.name?.charAt(0).toUpperCase() + item.name?.toLowerCase().slice(1);
		if (!item.name && Number.isNaN(itemName)) itemName = item.charAt(0)?.toUpperCase() + item.toLowerCase().slice(1);
		let pipHtml = "<div style='margin-top: 5px;'>";
		for (let i = 0; i < item.system.pips.max; i++) if (i < item.system.pips.value) pipHtml += "<i class=\"fas fa-circle\">&nbsp;</i>";
		else pipHtml += "<i class=\"far fa-circle\">&nbsp;</i>";
		pipHtml += "</div>";
		if (item.system.description == null) item.system.description = "";
		else if (item.system.description.length > 0) item.system.description += "<br/>";
		if (item.type === "condition") item.system.description += `${item.system.desc}<br/><strong>Clear: </strong>${item.system.clear}`;
		const templateData = {
			actor: this,
			stat: { name: itemName.toUpperCase() },
			item,
			pip: pipHtml,
			onlyDesc: true
		};
		return this._postChat(templateData, []);
	}
};
//#endregion
//#region src/actor/inventory.js
/** Prepare a display copy; never persist layout HTML or mutate an Item during rendering. */
function prepareInventoryItem(data) {
	const item = data.system;
	data.img ||= "icons/svg/item-bag.svg";
	item.pips ??= {
		value: 0,
		max: 0
	};
	item.pips.html = Array.from({ length: Math.max(0, item.pips.max) }, (_, i) => `<i class="${i < item.pips.value ? "fas" : "far"} fa-circle"></i>`).join("");
	item.isWeapon = data.type === "weapon";
	item.isCondition = data.type === "condition";
	if (item.isWeapon) item.weapon.canSwap = Boolean(item.weapon.dmg2);
	item.size ??= {
		width: 1,
		height: 1
	};
	item.sheet ??= {};
	item.sheet.rotation ??= 0;
	const rotated = item.sheet.rotation === -90;
	item.size.aspect = rotated ? Math.max(item.size.width, item.size.height) / Math.min(item.size.width, item.size.height) : 1;
	item.sheet.curWidth = rotated ? item.size.height : item.size.width;
	item.sheet.curHeight = rotated ? item.size.width : item.size.height;
	item.size.x = `${item.sheet.curWidth * 9}em`;
	item.size.y = `${item.sheet.curHeight * 9}em`;
	for (const key of ["currentX", "currentY"]) item.sheet[key] = Math.round((Number(item.sheet[key]) || 0) / 5) * 5;
	item.sheet.zIndex = item.sheet.currentX + item.sheet.currentY + 1e3;
	if (data.type !== "storage") item.store = null;
	return data;
}
function inventoryPosition(event, rect, offset = {}, scale = 1) {
	if (![
		event.clientX,
		event.clientY,
		scale,
		Number(offset.x ?? 0),
		Number(offset.y ?? 0)
	].every(Number.isFinite) || scale <= 0) throw new Error("Invalid inventory drop coordinates.");
	const x = rect ? (event.clientX - rect.left - rect.width / 2) / scale : 0;
	const y = rect ? (event.clientY - rect.top - rect.height / 2) / scale : 0;
	const currentX = Math.round((x - (Number(offset.x) || 0)) / 5) * 5;
	const currentY = Math.round((y - (Number(offset.y) || 0)) / 5) * 5;
	return {
		currentX,
		currentY,
		initialX: currentX,
		initialY: currentY,
		xOffset: currentX,
		yOffset: currentY
	};
}
/** Create first so a refused or failed destination write cannot destroy the source. */
async function transferItem(actor, item, { copy = false, position = {} } = {}) {
	if (!actor.isOwner) throw new Error("You cannot edit the destination inventory.");
	if (item.parent?.uuid === actor.uuid && !copy) return item.update(Object.fromEntries(Object.entries(position).map(([key, value]) => [`system.sheet.${key}`, value])));
	const move = !copy && item.parent?.documentName === "Actor" && !item.parent.isToken && !actor.isToken && !item.inCompendium;
	if (move && !item.isOwner) throw new Error("You cannot move an item from an inventory you do not own. Use Ctrl-drag to copy it.");
	const data = item.toObject();
	delete data._id;
	delete data.folder;
	delete data.ownership;
	data._stats ??= {};
	data._stats.duplicateSource = item.uuid;
	if (item.inCompendium) data._stats.compendiumSource = item.uuid;
	data.system.sheet = {
		...data.system.sheet,
		...position
	};
	const [created] = await actor.createEmbeddedDocuments("Item", [data]);
	if (!created) throw new Error("The destination refused the item; the source is unchanged.");
	if (move) try {
		if (!await item.delete()) throw new Error("Source deletion was refused.");
	} catch (error) {
		throw new Error(`The item was copied but could not be removed from its source: ${error.message}`);
	}
	return created;
}
//#endregion
//#region src/actor/actor-sheet.js
var { HandlebarsApplicationMixin: HandlebarsApplicationMixin$1, DialogV2 } = foundry.applications.api;
var { ActorSheetV2 } = foundry.applications.sheets;
var MausritterBaseActorSheet = class extends HandlebarsApplicationMixin$1(ActorSheetV2) {
	static DEFAULT_OPTIONS = {
		classes: [
			"mausritter",
			"sheet",
			"actor",
			"themed",
			"theme-light"
		],
		window: { resizable: true },
		form: { submitOnChange: true },
		actions: {
			itemCreate: this._onItemCreate,
			itemEdit: this._onItemAction,
			itemDelete: this._onItemAction,
			itemRotate: this._onItemAction,
			itemEquip: this._onItemAction,
			itemRoll: this._onItemAction,
			damageSwap: this._onItemAction,
			pip: {
				handler: this._onItemAction,
				buttons: [0, 2]
			},
			statRoll: this._onStatRoll
		}
	};
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		return Object.assign(context, this.actor.toObject(), {
			owner: this.actor.isOwner,
			enriched: Object.fromEntries(await Promise.all(["notes", "biography"].map(async (field) => [field, await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.actor.system[field] ?? "", {
				secrets: this.actor.isOwner,
				relativeTo: this.actor
			})]))),
			gear: this.actor.items.map((item) => prepareInventoryItem(item.toObject()))
		});
	}
	async _onRender(context, options) {
		await super._onRender(context, options);
		this.changeTab(this.tabGroups.primary, "primary", { force: true });
		this.parts.body.addEventListener("keydown", (event) => {
			if (!["Enter", " "].includes(event.key) || !event.target.matches("[role=\"button\"], [role=\"tab\"]")) return;
			event.preventDefault();
			event.target.click();
		});
	}
	static async _onItemCreate() {
		if (!this.isEditable) return;
		const types = [
			"item",
			"weapon",
			"spell",
			"armor",
			"condition",
			"storage"
		];
		const data = await DialogV2.input({
			window: { title: game.i18n.localize("Maus.InventoryAddItem") },
			content: `<label>Item Type <select name="type">${types.map((type) => `<option value="${type}">${type}</option>`).join("")}</select></label>`,
			rejectClose: false
		});
		if (!data || !types.includes(data.type)) return;
		const [item] = await this.actor.createEmbeddedDocuments("Item", [{
			name: `New ${data.type}`,
			type: data.type
		}]);
		await item?.sheet.render({ force: true });
	}
	static async _onItemAction(event, target) {
		if (!this.isEditable) return;
		const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
		if (!item) return;
		switch (target.dataset.action) {
			case "itemEdit": return item.sheet.render({ force: true });
			case "itemDelete": return item.delete();
			case "itemRotate": return item.update({ "system.sheet.rotation": item.system.sheet.rotation === -90 ? 0 : -90 });
			case "itemEquip": return item.update({ "system.equipped": !item.system.equipped });
			case "itemRoll": return this.actor.rollItem(item.id, { event });
			case "damageSwap": return item.update({
				"system.weapon.dmg1": item.system.weapon.dmg2,
				"system.weapon.dmg2": item.system.weapon.dmg1
			});
			case "pip": return item.update({ "system.pips.value": Math.max(0, Math.min(item.system.pips.max, Number(item.system.pips.value) + (event.button === 2 ? -1 : 1))) });
		}
	}
	static async _onStatRoll(_event, target) {
		if (!this.isEditable) return;
		const stat = this.actor.system.stats?.[target.dataset.key];
		if (stat) return this.actor.rollStat(stat);
	}
	async _onChangeForm(formConfig, event) {
		const input = event.target;
		if (input.matches(".item-input")) {
			if (!this.isEditable) return;
			const item = this.actor.items.get(input.closest("[data-item-id]")?.dataset.itemId);
			const value = Number(input.value);
			if (!item || !Number.isFinite(value) || input.dataset.field !== "system.store.value") return;
			return item.update({ "system.store.value": value });
		}
		return super._onChangeForm(formConfig, event);
	}
	async _onDragStart(event) {
		const item = this.actor.items.get(event.currentTarget.dataset.itemId);
		if (!item) return super._onDragStart(event);
		const rect = event.currentTarget.getBoundingClientRect();
		const scale = this.position.scale || 1;
		const data = item.toDragData();
		data.mausritter = { offset: {
			x: (event.clientX - rect.left - rect.width / 2) / scale,
			y: (event.clientY - rect.top - rect.height / 2) / scale
		} };
		event.dataTransfer.setData("text/plain", JSON.stringify(data));
	}
	async _onDropItem(event, item) {
		if (!this.isEditable) return null;
		const payload = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
		const position = inventoryPosition(event, event.target.closest("#drag-area")?.getBoundingClientRect(), payload.mausritter?.offset, this.position.scale || 1);
		return transferItem(this.actor, item, {
			copy: event.ctrlKey,
			position
		});
	}
};
var MausritterActorSheet = class extends MausritterBaseActorSheet {
	static DEFAULT_OPTIONS = {
		classes: ["character"],
		position: {
			width: 742,
			height: 800
		}
	};
	static PARTS = { body: {
		template: "systems/mausritter/templates/actor/actor-sheet.html",
		scrollable: [".sheet-body"]
	} };
	static TABS = { primary: {
		initial: "drag",
		tabs: [{ id: "drag" }, { id: "notes" }]
	} };
};
//#endregion
//#region src/actor/create-character/additional-items-dialog-choice.js
async function showAdditionalItemsChoiceDialog(items) {
	const data = await foundry.applications.api.DialogV2.input({
		window: { title: game.i18n.localize("Maus.CC.AdditionalStartingItem") },
		content: await foundry.applications.handlebars.renderTemplate("systems/mausritter/templates/dialogs/additional-item-choice.html", { items }),
		rejectClose: false
	});
	return data ? items.findIndex((item) => item.id === data.items) : null;
}
//#endregion
//#region src/actor/create-character/additional-items-info-dialog.js
async function showAdditionalItemsInfoDialog(items) {
	return foundry.applications.api.DialogV2.prompt({
		window: { title: game.i18n.localize("Maus.CC.AdditionalStartingItem") },
		content: await foundry.applications.handlebars.renderTemplate("systems/mausritter/templates/dialogs/additional-item-info.html", { items }),
		rejectClose: false
	});
}
//#endregion
//#region src/actor/create-character/create-character-dialog.js
async function showCreateCharacterDialog() {
	return await foundry.applications.api.DialogV2.input({
		window: { title: game.i18n.localize("Maus.CC.WhatToCreate") },
		content: await foundry.applications.handlebars.renderTemplate("systems/mausritter/templates/dialogs/create-character.html", {}),
		rejectClose: false
	});
}
//#endregion
//#region src/actor/create-character/data.js
var ITEMS = {
	TORCHES: "Compendium.mausritter.gear.Item.IhV9bZ3WX8sQnJAp",
	RATIONS: "Compendium.mausritter.gear.Item.EuWZ26fjA7E0Gka0"
};
var BACKGROUNDS = [
	{
		name: "Test subject",
		items: ["Compendium.mausritter.spells.Item.Zk8WtKad1nbfOrCB", "Compendium.mausritter.armor.Item.kcKH7sBam6En635G"],
		hp: 1,
		pips: 1
	},
	{
		name: "Kitchen forager",
		items: ["Compendium.mausritter.armor.Item.MbCIEp6TzoK08akp", "Compendium.mausritter.gear.Item.OZrpQkk9qrfvE79X"],
		hp: 1,
		pips: 2
	},
	{
		name: "Cage dweller",
		items: ["Compendium.mausritter.spells.Item.u3fkvN7VxSVtEqSb", "Compendium.mausritter.gear.Item.3b4wBjFkoWHTZ4D1"],
		hp: 1,
		pips: 3
	},
	{
		name: "Hedge witch",
		items: ["Compendium.mausritter.spells.Item.CVKTeU3Sm6NRvDvj", "Compendium.mausritter.gear.Item.h3vmVonEywSKtdjg"],
		hp: 1,
		pips: 4
	},
	{
		name: "Leatherworker",
		items: ["Compendium.mausritter.armor.Item.MbCIEp6TzoK08akp", "Compendium.mausritter.gear.Item.QXn9R6uDfBWTnQsT"],
		hp: 1,
		pips: 5
	},
	{
		name: "Street tough",
		items: ["Compendium.mausritter.weapons.Item.w3BvIQul7s6pwkG8", "Compendium.mausritter.gear.Item.yAW0nmonxXHg34iB"],
		hp: 1,
		pips: 6
	},
	{
		name: "Mendicant priest",
		items: ["Compendium.mausritter.spells.Item.0bpvALvoKL2UbQU1", "Compendium.mausritter.gear.Item.is0vgpj8gTf7A8Dh"],
		hp: 2,
		pips: 1
	},
	{
		name: "Beetleherd",
		items: ["Compendium.mausritter.gear.Item.WbznGS06x1gFfJ0X", "Compendium.mausritter.gear.Item.vOqvTbPWoqUbB1yQ"],
		hp: 2,
		pips: 2
	},
	{
		name: "Ale brewer",
		items: ["Compendium.mausritter.gear.Item.t4KWOCDfm6L1AIFj", "Compendium.mausritter.gear.Item.Q8VPlUXtYVdzRUbS"],
		hp: 2,
		pips: 3
	},
	{
		name: "Fishermouse",
		items: ["Compendium.mausritter.gear.Item.0yCyJ6ADcFo6h08F", "Compendium.mausritter.weapons.Item.kZVwXUFnlj4xi7zi"],
		hp: 2,
		pips: 4
	},
	{
		name: "Blacksmith",
		items: ["Compendium.mausritter.weapons.Item.LIkXPQid5FNuX393", "Compendium.mausritter.gear.Item.EW1wFKynBHddyyGq"],
		hp: 2,
		pips: 5
	},
	{
		name: "Wireworker",
		items: ["Compendium.mausritter.gear.Item.TJEiqBJXGRuiOHEQ", "Compendium.mausritter.gear.Item.4earZoyzJPwEnauz"],
		hp: 2,
		pips: 6
	},
	{
		name: "Woodcutter",
		items: ["Compendium.mausritter.weapons.Item.2gK7hXzu3TDGllTK", "Compendium.mausritter.gear.Item.zd7a3t2PWGbTuMyt"],
		hp: 3,
		pips: 1
	},
	{
		name: "Bat cultist",
		items: ["Compendium.mausritter.spells.Item.PDHmM25EL2ywt157", "Compendium.mausritter.gear.Item.UYBlJt4TrBfa6cCV"],
		hp: 3,
		pips: 2
	},
	{
		name: "Tin miner",
		items: ["Compendium.mausritter.weapons.Item.HqrIfbl7JpRpC0tQ", "Compendium.mausritter.gear.Item.BtSLesZiZQOt9yhj"],
		hp: 3,
		pips: 3
	},
	{
		name: "Trash collector",
		items: ["Compendium.mausritter.weapons.Item.6tTCXWnqP2CK8IDe", "Compendium.mausritter.gear.Item.A8tlvt6vgRHmIN91"],
		hp: 3,
		pips: 4
	},
	{
		name: "Wall rover",
		items: ["Compendium.mausritter.gear.Item.zo3tuzkhjPuYkAOG", "Compendium.mausritter.gear.Item.e4SXeMrmG7TbLyRc"],
		hp: 3,
		pips: 5
	},
	{
		name: "Merchant",
		items: ["Compendium.mausritter.gear.Item.nuK5O2X68yGQQ3k3", "Compendium.mausritter.gear.Item.k4VMEXr5yyhlSF2c"],
		hp: 3,
		pips: 6
	},
	{
		name: "Raft crew",
		items: ["Compendium.mausritter.weapons.Item.LIkXPQid5FNuX393", "Compendium.mausritter.gear.Item.KppUOvvn8XrFP5yG"],
		hp: 4,
		pips: 1
	},
	{
		name: "Worm wrangler",
		items: ["Compendium.mausritter.gear.Item.vOqvTbPWoqUbB1yQ", "Compendium.mausritter.gear.Item.wDXdllAA6LjjCT6e"],
		hp: 4,
		pips: 2
	},
	{
		name: "Sparrow rider",
		items: ["Compendium.mausritter.gear.Item.zo3tuzkhjPuYkAOG", "Compendium.mausritter.gear.Item.KN1j3bP1rAYXwh1R"],
		hp: 4,
		pips: 3
	},
	{
		name: "Sewer guide",
		items: ["Compendium.mausritter.gear.Item.EW1wFKynBHddyyGq", "Compendium.mausritter.gear.Item.e4SXeMrmG7TbLyRc"],
		hp: 4,
		pips: 4
	},
	{
		name: "Prison guard",
		items: ["Compendium.mausritter.gear.Item.QgYJojJerwXayQQV", "Compendium.mausritter.weapons.Item.Ttuqe7BGihXRLziq"],
		hp: 4,
		pips: 5
	},
	{
		name: "Fungus farmer",
		items: ["Compendium.mausritter.gear.Item.TGNSgaCQsssts5os", "Compendium.mausritter.gear.Item.ZsmzHWLCNH9M2L15"],
		hp: 4,
		pips: 6
	},
	{
		name: "Dam builder",
		items: ["Compendium.mausritter.gear.Item.Ln1kjNNNetZBPJOd", "Compendium.mausritter.gear.Item.KppUOvvn8XrFP5yG"],
		hp: 5,
		pips: 1
	},
	{
		name: "Cartographer",
		items: ["Compendium.mausritter.gear.Item.8EMr2YGvQjhg3lej", "Compendium.mausritter.gear.Item.3VafgHWZBnAFj8M3"],
		hp: 5,
		pips: 2
	},
	{
		name: "Trap thief",
		items: ["Compendium.mausritter.gear.Item.EmOPMHKtWMua1zhF", "Compendium.mausritter.gear.Item.0kVNBhOCRAWetQGb"],
		hp: 5,
		pips: 3
	},
	{
		name: "Vagabond",
		items: ["Compendium.mausritter.gear.Item.vjwIDZpIeczbKbW3", "Compendium.mausritter.gear.Item.U8zT0oNputtkmoKZ"],
		hp: 5,
		pips: 4
	},
	{
		name: "Grain farmer",
		items: ["Compendium.mausritter.weapons.Item.Ttuqe7BGihXRLziq", "Compendium.mausritter.gear.Item.2ibdQuqqcDrkdvTs"],
		hp: 5,
		pips: 5
	},
	{
		name: "Message runner",
		items: ["Compendium.mausritter.gear.Item.8GMxZ1TCbhWQmwsv", "Compendium.mausritter.gear.Item.PUc63ut2mgqUyGKs"],
		hp: 5,
		pips: 6
	},
	{
		name: "Troubadour",
		items: ["Compendium.mausritter.gear.Item.k9kmk6zA3u9IbHqJ", "Compendium.mausritter.gear.Item.H72u8auTR4p0A1cU"],
		hp: 6,
		pips: 1
	},
	{
		name: "Gambler",
		items: ["Compendium.mausritter.gear.Item.V4ChlJOFAJg1TEtu", "Compendium.mausritter.gear.Item.A8tlvt6vgRHmIN91"],
		hp: 6,
		pips: 2
	},
	{
		name: "Sap tapper",
		items: ["Compendium.mausritter.gear.Item.Qx4VmVHXNmyacUkL", "Compendium.mausritter.gear.Item.KppUOvvn8XrFP5yG"],
		hp: 6,
		pips: 3
	},
	{
		name: "Bee keeper",
		items: ["Compendium.mausritter.gear.Item.vQIpvCoaRe23aq4g", "Compendium.mausritter.gear.Item.0yCyJ6ADcFo6h08F"],
		hp: 6,
		pips: 4
	},
	{
		name: "Librarian",
		items: ["Compendium.mausritter.gear.Item.jlvULohSiRf5ySqe", "Compendium.mausritter.gear.Item.8EMr2YGvQjhg3lej"],
		hp: 6,
		pips: 5
	},
	{
		name: "Pauper noblemouse",
		items: ["Compendium.mausritter.gear.Item.tBrL4wxGqs7pmLVi", "Compendium.mausritter.gear.Item.l1GnC3gatjidKix9"],
		hp: 6,
		pips: 6
	}
];
var WEAPONS_TO_ITEMS = {
	axe: ["Compendium.mausritter.weapons.Item.2gK7hXzu3TDGllTK"],
	bow: ["Compendium.mausritter.weapons.Item.3UYDZQVca8rmErbU", "Compendium.mausritter.gear.Item.eEh9d4ozBfoJJt7D"],
	cleaver: ["Compendium.mausritter.weapons.Item.4fi0j9IibcIrZluK"],
	dagger: ["Compendium.mausritter.weapons.Item.w3BvIQul7s6pwkG8"],
	hammer: ["Compendium.mausritter.weapons.Item.LIkXPQid5FNuX393"],
	hookarm: ["Compendium.mausritter.weapons.Item.6tTCXWnqP2CK8IDe"],
	mace: ["Compendium.mausritter.weapons.Item.tpoh5HciZgfppCAt"],
	needle: ["Compendium.mausritter.weapons.Item.kZVwXUFnlj4xi7zi"],
	pick: ["Compendium.mausritter.weapons.Item.HqrIfbl7JpRpC0tQ"],
	sling: ["Compendium.mausritter.weapons.Item.O7ZKkdJ5kmAzCOHr", "Compendium.mausritter.gear.Item.cp458bYOtIwPZp4Q"],
	spear: ["Compendium.mausritter.weapons.Item.Ttuqe7BGihXRLziq"],
	sword: ["Compendium.mausritter.weapons.Item.R0VejRjAELxknNbN"],
	warhammer: ["Compendium.mausritter.weapons.Item.uTBQtiPtEvUpntJH"]
};
var UPPER_ROW_Y = -150;
var LOWER_ROW_Y = -20;
var SLOTS = {
	MAIN_PAW: {
		currentX: -270,
		currentY: UPPER_ROW_Y
	},
	OFF_PAW: {
		currentX: -270,
		currentY: LOWER_ROW_Y
	},
	UPPER_BODY: {
		currentX: -140,
		currentY: UPPER_ROW_Y
	},
	LOWER_BODY: {
		currentX: -140,
		currentY: LOWER_ROW_Y
	},
	SLOT_1: {
		currentX: 10,
		currentY: UPPER_ROW_Y
	},
	SLOT_2: {
		currentX: 140,
		currentY: UPPER_ROW_Y
	},
	SLOT_3: {
		currentX: 270,
		currentY: UPPER_ROW_Y
	},
	SLOT_4: {
		currentX: 10,
		currentY: LOWER_ROW_Y
	},
	SLOT_5: {
		currentX: 140,
		currentY: LOWER_ROW_Y
	},
	SLOT_6: {
		currentX: 270,
		currentY: LOWER_ROW_Y
	}
};
//#endregion
//#region src/actor/create-character/weapon-choice.js
async function showWeaponChoiceDialog() {
	return (await foundry.applications.api.DialogV2.input({
		window: { title: game.i18n.localize("Maus.CC.WhatWeapon") },
		content: await foundry.applications.handlebars.renderTemplate("systems/mausritter/templates/dialogs/weapon-choice.html", {}),
		rejectClose: false
	}))?.weapons ?? null;
}
//#endregion
//#region src/actor/create-character/create-character.js
async function autoCreateCharacter() {
	const options = await showCreateCharacterDialog();
	if (!options) return null;
	let weaponItems;
	if (options.items) {
		const weapon = await showWeaponChoiceDialog();
		if (!weapon) return null;
		weaponItems = WEAPONS_TO_ITEMS[weapon];
		if (!weaponItems) throw new Error("Invalid starting weapon.");
	}
	return createCharacter(options, weaponItems);
}
async function createCharacter(options, additionalWeaponsItems) {
	const background = options.background ? getRandomBackground() : void 0;
	const characterStats = await createStats(background, options.stats, options.details);
	const characterActor = await Actor.create(characterStats);
	if (options.background && options.items) await addItemsFromBackground(characterActor, background);
	if (options.items) await addStatingItems(characterActor);
	if (additionalWeaponsItems !== void 0) {
		const slots = [SLOTS.MAIN_PAW, SLOTS.UPPER_BODY];
		for (const [idx, itemId] of additionalWeaponsItems.entries()) await addItem(itemId, characterActor, slots[idx]);
	}
	await characterActor.sheet.render({ force: true });
	const highestAttrValue = getHighestAttrValue(characterActor.system.stats);
	if (highestAttrValue <= 7 && options.items && options.background) await getBackgroundItems(getRandomBackgroundDifferentThan(background)).then(async (items) => {
		const slots = [SLOTS.SLOT_2, SLOTS.SLOT_5];
		for (const [idx, item] of items.entries()) await addItem(item.uuid, characterActor, slots[idx]);
		await showAdditionalItemsInfoDialog(items);
	});
	else if (highestAttrValue <= 9 && options.items && options.background) {
		const additionalItemsBackground = getRandomBackgroundDifferentThan(background);
		const itemCompendiumIds = additionalItemsBackground.items;
		await getBackgroundItems(additionalItemsBackground).then(async (items) => {
			const selectedIndex = await showAdditionalItemsChoiceDialog(items);
			if (selectedIndex !== null && selectedIndex >= 0) await addItem(itemCompendiumIds[selectedIndex], characterActor, SLOTS.SLOT_2);
		});
	}
	return characterActor;
}
function getRandomBackgroundDifferentThan(current) {
	const background = getRandomBackground();
	return background.name === current.name ? getRandomBackgroundDifferentThan(current) : background;
}
async function getBackgroundItems(background) {
	return await Promise.all(background.items.map(async (itemId) => {
		return await getItemFromFoundry(itemId);
	}));
}
async function createStats(background, basicStats, details) {
	const dexterity = basicStats ? await attrRoll() : 0;
	const strength = basicStats ? await attrRoll() : 0;
	const will = basicStats ? await attrRoll() : 0;
	const backgroundName = background ? game.i18n.localize(`Maus.Background.${background.name}`) : "";
	const pips = background ? background.pips : 0;
	const hp = background ? background.hp : 0;
	const birthSign = details ? await drawFromTable(CONFIG.MAUSRITTER.tables.birthsign) : "";
	const look = details ? await drawFromTable(CONFIG.MAUSRITTER.tables.physicalDetail) : "";
	const coat = details ? `${await drawFromTable(CONFIG.MAUSRITTER.tables.coatPattern)} ${await drawFromTable(CONFIG.MAUSRITTER.tables.coatColor)}` : "";
	return {
		name: await getRandomName(),
		type: "character",
		system: {
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
			pips: { value: pips },
			description: {
				background: backgroundName,
				birthsign: birthSign,
				coat,
				look
			}
		}
	};
}
function getRandomBackground() {
	return BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
}
async function addStatingItems(instant) {
	await addItem(ITEMS.TORCHES, instant, SLOTS.SLOT_3);
	await addItem(ITEMS.RATIONS, instant, SLOTS.SLOT_6);
}
async function addItemsFromBackground(instant, background) {
	const slots = [SLOTS.SLOT_1, SLOTS.SLOT_4];
	for (const [idx, itemId] of background.items.entries()) await addItem(itemId, instant, slots[idx]);
}
function getHighestAttrValue(stats) {
	return Math.max(...[
		stats.dexterity.max,
		stats.will.max,
		stats.strength.max
	]);
}
async function getRandomName() {
	return `${await drawFromTable(CONFIG.MAUSRITTER.tables.firstName)} ${await drawFromTable(CONFIG.MAUSRITTER.tables.lastName)}`;
}
//#endregion
//#region src/actor/creature-sheet.js
var MausritterCreatureSheet = class extends MausritterBaseActorSheet {
	static DEFAULT_OPTIONS = {
		classes: ["creature"],
		position: {
			width: 680,
			height: 620
		}
	};
	static PARTS = { body: {
		template: "systems/mausritter/templates/actor/creature-sheet.html",
		scrollable: [""]
	} };
	static TABS = { primary: {
		initial: "notes",
		tabs: [{ id: "notes" }]
	} };
};
//#endregion
//#region src/actor/hireling-sheet.js
var MausritterHirelingSheet = class extends MausritterBaseActorSheet {
	static DEFAULT_OPTIONS = {
		classes: ["hireling"],
		position: {
			width: 680,
			height: 620
		}
	};
	static PARTS = { body: {
		template: "systems/mausritter/templates/actor/hireling-sheet.html",
		scrollable: [""]
	} };
	static TABS = { primary: {
		initial: "notes",
		tabs: [{ id: "notes" }]
	} };
};
//#endregion
//#region src/actor/storage-sheet.js
var MausritterStorageSheet = class extends MausritterBaseActorSheet {
	static DEFAULT_OPTIONS = {
		classes: ["storage"],
		position: {
			width: 475,
			height: 500
		},
		window: { resizable: false }
	};
	static PARTS = { body: {
		template: "systems/mausritter/templates/actor/storage-sheet.html",
		scrollable: [".sheet-body"]
	} };
	static TABS = { primary: {
		initial: "storage",
		tabs: [
			{ id: "storage" },
			{ id: "notes" },
			{ id: "options" }
		]
	} };
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		const { width, height } = context.system.size;
		context.system.size.divWidth = width * 130 + 35;
		context.system.size.divHeight = height * 130 + 35;
		context.system.storeDiv = "";
		for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) context.system.storeDiv += `<div class="item-slot-dashed" style="transform:translate3d(${x * 130 - (width - 1) * 65}px,${y * 130 - (height - 1) * 65}px,0)"><div class="item-bag-text">${y * width + x + 1}</div></div>`;
		return context;
	}
	_prepareSubmitData(event, form, formData, updateData) {
		const data = super._prepareSubmitData(event, form, formData, updateData);
		for (const axis of ["width", "height"]) {
			if (!(axis in (data.system?.size ?? {}))) continue;
			const value = Number(data.system.size[axis]);
			if (!Number.isSafeInteger(value) || value < 1) throw new Error("Storage dimensions must be positive whole numbers.");
			data.system.size[axis] = value;
		}
		return data;
	}
	async _onRender(context, options) {
		await super._onRender(context, options);
		this.setPosition({
			width: context.system.size.width * 130 + 80,
			height: context.system.size.height * 130 + 230
		});
	}
};
//#endregion
//#region src/item/item.js
/** Public document class retained for existing Mausritter integrations. */
var MausritterItem = class extends Item {};
//#endregion
//#region src/item/item-sheet.js
var { HandlebarsApplicationMixin } = foundry.applications.api;
var { ItemSheetV2 } = foundry.applications.sheets;
var MausritterItemSheet = class extends HandlebarsApplicationMixin(ItemSheetV2) {
	static DEFAULT_OPTIONS = {
		classes: [
			"mausritter",
			"sheet",
			"item",
			"themed",
			"theme-light"
		],
		position: {
			width: 520,
			height: 480
		},
		window: { resizable: true },
		form: { submitOnChange: true }
	};
	static PARTS = { body: {
		template: "systems/mausritter/templates/item/item-item-sheet.html",
		scrollable: [".sheet-body"]
	} };
	static TABS = { primary: {
		initial: "description",
		tabs: [{ id: "description" }]
	} };
	_configureRenderParts(options) {
		const parts = super._configureRenderParts(options);
		parts.body.template = `systems/mausritter/templates/item/item-${this.item.type}-sheet.html`;
		return parts;
	}
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		return Object.assign(context, this.item.toObject(), {
			owner: this.item.isOwner,
			enriched: { description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.item.system.description ?? "", {
				secrets: this.item.isOwner,
				relativeTo: this.item
			}) }
		});
	}
	async _onRender(context, options) {
		await super._onRender(context, options);
		this.changeTab(this.tabGroups.primary, "primary", { force: true });
	}
};
//#endregion
//#region src/settings.js
var registerSettings = () => {
	game.settings.register("mausritter", "limitSpellPowerToRemainingUses", {
		name: "Maus.Settings.LimitSpellPowerToRemainingUses",
		hint: "Maus.Settings.LimitSpellPowerToRemainingUsesHint",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
	game.settings.register("mausritter", "blockExhaustedSpells", {
		name: "Maus.Settings.BlockExhaustedSpells",
		hint: "Maus.Settings.BlockExhaustedSpellsHint",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
};
//#endregion
//#region src/mausritter.js
var Actors = foundry.documents.collections.Actors;
var Items = foundry.documents.collections.Items;
Hooks.once("init", async () => {
	game.mausritter = {
		MausritterActor,
		MausritterItem,
		rollItemMacro,
		rollStatMacro,
		autoCreateCharacter,
		rollWeather,
		generateHex,
		generateNpc
	};
	registerSettings();
	game.settings.register("mausritter", "sheetMigrationVersion", {
		scope: "world",
		config: false,
		type: Number,
		default: 0
	});
	game.settings.register("mausritter", "macroMigrationVersion", {
		scope: "world",
		config: false,
		type: Number,
		default: 0
	});
	CONFIG.Actor.documentClass = MausritterActor;
	CONFIG.Item.documentClass = MausritterItem;
	Object.assign(CONFIG.Actor.dataModels, actorDataModels);
	Object.assign(CONFIG.Item.dataModels, itemDataModels);
	CONFIG.MAUSRITTER = {};
	CONFIG.MAUSRITTER.tables = {
		tables: "Tables",
		birthsign: "Birthsign",
		physicalDetail: "Physical detail",
		coatPattern: "Mousy Coat Pattern",
		coatColor: "Mousy Coat Color",
		firstName: "Mousy Names - Birthname",
		lastName: "Mousy Names - Matriname",
		npcAppearance: "Non-player mice - Appearance",
		npcBirthsign: "Non-player mice - Birthsign and Disposition",
		npcQuirk: "Non-player mice - Quirk",
		npcSocial: "Non-player mice - Social position and Payment for service",
		npcWants: "Non-player mice - Wants",
		npcRelationship: "Non-player mice - Relationship"
	};
	Actors.registerSheet("mausritter", MausritterActorSheet, {
		types: ["character"],
		makeDefault: true,
		themes: null
	});
	Actors.registerSheet("mausritter", MausritterHirelingSheet, {
		types: ["hireling"],
		makeDefault: true,
		themes: null
	});
	Actors.registerSheet("mausritter", MausritterCreatureSheet, {
		types: ["creature"],
		makeDefault: true,
		themes: null
	});
	Actors.registerSheet("mausritter", MausritterStorageSheet, {
		types: ["storage"],
		makeDefault: true,
		themes: null
	});
	Items.registerSheet("mausritter", MausritterItemSheet, {
		makeDefault: true,
		themes: null
	});
	Handlebars.registerHelper("toLowerCase", (str) => str.toLowerCase());
	CONFIG.Combat.initiative = {
		formula: "-1d20+@stats.dexterity.value",
		decimals: 2
	};
});
/**
* Set default values for new actors' tokens
*/
Hooks.on("preCreateActor", (document, data) => {
	const defaults = {
		name: data.name,
		bar1: { attribute: "health" },
		bar2: { attribute: "stats.strength" },
		displayName: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
		displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
		disposition: data.type === "creature" ? CONST.TOKEN_DISPOSITIONS.HOSTILE : CONST.TOKEN_DISPOSITIONS.NEUTRAL
	};
	if (data.type === "character") Object.assign(defaults, {
		sight: { enabled: true },
		actorLink: true
	});
	document.updateSource({ prototypeToken: foundry.utils.mergeObject(defaults, data.prototypeToken ?? {}) });
});
Hooks.once("ready", async () => {
	game.mausritter.ready = migrateSheetReferences().then(migrateMacros);
	game.mausritter.ready.catch((error) => {
		console.error("Mausritter migration failed", error);
		ui.notifications.error("Mausritter could not migrate saved sheets or bundled macros. See console; it will retry next launch.");
	});
	Hooks.on("hotbarDrop", (_bar, data, slot) => {
		if (data.type === "Item") {
			createMausritterMacro(data, slot).catch((error) => ui.notifications.error(error.message));
			return false;
		}
	});
});
//#endregion

//# sourceMappingURL=mausritter.js.map