/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class MausritterActorSheet extends ActorSheet {
	/** @override */
	static get defaultOptions() {
		return mergeObject(ActorSheet.defaultOptions, {
			classes: ["mausritter", "sheet", "actor", "character"],
			template: "systems/mausritter/templates/actor/actor-sheet.html",
			width: 742,
			height: 800,
			tabs: [
				{
					navSelector: ".sheet-tabs",
					contentSelector: ".sheet-body",
					initial: "character",
				},
			],
		});
	}

	/* -------------------------------------------- */

	/** @override */
	getData() {
		const data = super.getData();
		data.dtypes = ["String", "Number", "Boolean"];

		const superData = data.data.system;

		// Prepare items.
		if (this.actor.type === "character") {
			this._prepareCharacterItems(data);
		}

		if (data.data.system.settings == null) {
			data.data.system.settings = {};
		}

		return data.data;
	}

	/**
	 * Organize and classify Items for Character sheets.
	 *
	 * @param {Object} actorData The actor to prepare.
	 *
	 * @return {undefined}
	 */
	_prepareCharacterItems(sheetData) {
		const actorData = sheetData.actor;

		// Initialize containers.
		const gear = [];

		// Iterate through items, allocating to containers
		// let totalWeight = 0;
		for (const i of sheetData.items) {
			const item = i.system;
			i.img = i.img || DEFAULT_TOKEN;

			// We'll handle the pip html here.
			if (item.pips == null) {
				item.pips = {
					value: 0,
					max: 0,
					html: "",
				};
			}
			let pipHtml = "";
			for (let i = 0; i < item.pips.max; i++) {
				if (i < item.pips.value) pipHtml += '<i class="fas fa-circle"></i>';
				else pipHtml += '<i class="far fa-circle"></i>';
			}
			item.pips.html = pipHtml;
			// End of the pip handler

			// Now we'll set tags
			if (i.type === "item") {
				item.isWeapon = false;
				item.isCondition = false;
			} else if (i.type === "weapon") {
				item.isWeapon = true;
				item.isCondition = false;

				if (item.weapon.dmg2 !== "") {
					item.weapon.canSwap = true;
				} else {
					item.weapon.canSwap = false;
				}
			}

			if (item.size === undefined) {
				item.size = {
					width: 1,
					height: 1,
					x: "9em",
					y: "9em",
				};
			}

			if (item.sheet.rotation === undefined) item.sheet.rotation = 0;

			item.size.aspect =
				item.sheet.rotation === -90
					? item.size.width > item.size.height
						? item.size.width / item.size.height
						: item.size.height / item.size.width
					: 1;

			item.sheet.curHeight =
				item.sheet.rotation === -90 ? item.size.width : item.size.height;
			item.sheet.curWidth =
				item.sheet.rotation === -90 ? item.size.height : item.size.width;

			item.size.x = `${item.sheet.curWidth * 8 + item.sheet.curWidth}em`;
			item.size.y = `${item.sheet.curHeight * 8 + item.sheet.curHeight}em`;

			const roundScale = 5;
			const xPos = Math.round(item.sheet.currentX / roundScale) * roundScale;
			const yPos = Math.round(item.sheet.currentY / roundScale) * roundScale;
			item.sheet.currentX = xPos;
			item.sheet.currentY = yPos;
			item.sheet.zIndex = xPos + yPos + 1000;

			if (i.type !== "storage") {
				item.store = null;
			}

			gear.push(i);
		}
		// Assign and return
		actorData.gear = gear;
	}

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);

		// Everything below here is only needed if the sheet is editable
		if (!this.options.editable) return;

		// Update Inventory Item
		html.find(".item-equip").click((ev) => {
			const li = $(ev.currentTarget).parents(".item");
			const item = duplicate(
				this.actor.getEmbeddedDocument("Item", li.dataset.itemId),
			);

			item.system.equipped = !item.system.equipped;
			this.actor.updateEmbeddedDocuments("Item", [item]);
		});

		// Add Inventory Item
		html.find(".item-create").click((ev) => {
			const creatableItems = [
				"item",
				"weapon",
				"spell",
				"armor",
				"condition",
				"storage",
			];
			let selectList = "";

			for (const type of creatableItems) {
				selectList += `<option value='${type}'>${type}</option>`;
			}

			//Select the stat of the roll.
			const t = new Dialog({
				title: "Select Stat",
				content: `<h2> Item Type </h2> <select style='margin-bottom:10px;'name='type' id='type'> ${selectList}</select> <br/>`,
				buttons: {
					roll: {
						icon: '<i class="fas fa-check"></i>',
						label: "Create",
						callback: async (html) => {
							this._onItemCreate(ev, html.find('[id="type"]')[0].value);
						},
					},
					cancel: {
						icon: '<i class="fas fa-times"></i>',
						label: "Cancel",
						callback: () => {},
					},
				},
				default: "roll",
				close: () => {},
			});
			t.render(true);
		});

		// Update Inventory Item
		html.find(".item-edit").click((ev) => {
			const li = $(ev.currentTarget).parents(".item");
			const item = this.actor.getEmbeddedDocument("Item", li.data("itemId"));
			item.sheet.render(true);
		});

		// Delete Inventory Item
		html.find(".item-delete").click((ev) => {
			const li = $(ev.currentTarget).parents(".item");
			this.actor.deleteEmbeddedDocuments("Item", [li.data("itemId")]);
			li.slideUp(200, () => this.render(false));
		});

		// Rotate Inventory Item
		html.find(".item-rotate").click((ev) => {
			const li = ev.currentTarget.closest(".item");
			const item = duplicate(
				this.actor.getEmbeddedDocument("Item", li.dataset.itemId),
			);
			if (item.system.sheet.rotation === -90) item.system.sheet.rotation = 0;
			else item.system.sheet.rotation = -90;
			this.actor.updateEmbeddedDocuments("Item", [item]);
		});

		// Rollable Attributes
		html.find(".stat-roll").click((ev) => {
			const div = $(ev.currentTarget);
			const statName = div.data("key");
			const attribute = this.actor.system.stats[statName];
			this.actor.rollStat(attribute);
		});

		// Rollable Item/Anything with a description that we want to click on.
		html.find(".item-roll").click((ev) => {
			const li = ev.currentTarget.closest(".item");
			this.actor.rollItem(li.dataset.itemId, {
				event: ev,
			});
		});

		// If we have an item input being adjusted from the character sheet.
		html.on("change", ".item-input", (ev) => {
			const li = ev.currentTarget.closest(".item");
			const item = duplicate(
				this.actor.getEmbeddedDocument("Item", li.dataset.itemId),
			);
			const input = $(ev.currentTarget);

			item[input[0].name] = input[0].value;

			this.actor.updateEmbeddedDocuments("Item", [item]);
		});

		html.on("mousedown", ".pip-button", (ev) => {
			const li = ev.currentTarget.closest(".item");
			const item = duplicate(
				this.actor.getEmbeddedDocument("Item", li.dataset.itemId),
			);

			const amount = item.system.pips.value;

			if (event.button === 0) {
				if (amount < item.system.pips.max) {
					item.system.pips.value = Number(amount) + 1;
				}
			} else if (event.button === 2) {
				if (amount > 0) {
					item.system.pips.value = Number(amount) - 1;
				}
			}

			this.actor.updateEmbeddedDocuments("Item", [item]);
		});

		html.on("mousedown", ".damage-swap", (ev) => {
			const li = ev.currentTarget.closest(".item");
			const item = duplicate(
				this.actor.getEmbeddedDocument("Item", li.dataset.itemId),
			);

			const d1 = item.system.weapon.dmg1;
			const d2 = item.system.weapon.dmg2;

			item.system.weapon.dmg1 = d2;
			item.system.weapon.dmg2 = d1;
			this.actor.updateEmbeddedDocuments("Item", [item]);
		});

		// Drag events for macros.
		if (this.actor.isOwner) {
			const handler = (ev) => this._onDragItemStart(ev);
			const dragEnd = (ev) => this._onDragOver(ev);

			html.find("li.dropitem").each((i, li) => {
				if (li.classList.contains("inventory-header")) return;
				li.setAttribute("draggable", true);
				li.addEventListener("dragstart", handler, false);
			});

			html.find("div.dropitem").each((i, div) => {
				if (div.classList.contains("inventory-header")) return;
				div.setAttribute("draggable", true);
				div.addEventListener("dragstart", handler, false);
				div.addEventListener("dragend", dragEnd, false);
			});

			// Item Card handler

			// html.find('div.dragItems').each((i, dragItem) => {

			//   const item = duplicate(this.actor.getEmbeddedDocument("Item", dragItem.dataset.itemId))
			//   // let dragItem = document.querySelector("#" + container.dataset.itemId);
			//   var curIndex = 1; //The current zIndex

			//   if (item.data.sheet == undefined) {
			//     item.data.sheet = {
			//       "active": false,
			//       "currentX": 0,
			//       "currentY": 0,
			//       "initialX": 0,
			//       "initialY": 0,
			//       "xOffset": 0,
			//       "yOffset": 0
			//     };
			//   }

			//   setTranslate(item.data.sheet.currentX, item.data.sheet.currentY, dragItem, true);
			//   dragItem.style.zIndex = item.data.sheet.currentX + 500;

			//   //this.actor.updateEmbeddedDocuments('Item', [item]);

			//   function setTranslate(xPos, yPos, el, round = false) {

			//     if (round) {
			//       let roundScale = 5;
			//       xPos = Math.round(xPos / roundScale) * roundScale;// - (item.data.size.width - 1) * 4;
			//       yPos = Math.round(yPos / roundScale) * roundScale;// - (item.data.size.height - 1) * 4;
			//     }
			//     el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
			//   }
			// });
		}
	}

	/* -------------------------------------------- */

	/**
	 * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
	 * @param {Event} event   The originating click event
	 * @private
	 */
	_onItemCreate(event, type) {
		event.preventDefault();
		const header = event.currentTarget;
		// Get the type of item to create.
		//const type = header.dataset.type;
		// Grab any data associated with this control.
		const data = duplicate(header.dataset);
		// Initialize a default name.
		const name = `New ${type.capitalize()}`;
		// Prepare the item object.
		const itemData = {
			name: name,
			type: type,
			data: data,
		};
		// Remove the type from the dataset since it's in the itemData.type prop.
		itemData.data.type = undefined;

		// Finally, create the item!
		return this.actor.createEmbeddedDocuments("Item", [itemData]);
	}

	/**
	 * Handle creating a new Owned skill for the actor using initial data defined in the HTML dataset
	 * @param {Event} event   The originating click event
	 * @private
	 */
	_onSkillCreate(event) {
		event.preventDefault();
		const header = event.currentTarget;
		// Get the type of item to create.
		const type = header.dataset.type;
		// Grab any data associated with this control.
		const data = duplicate(header.dataset);
		// Initialize a default name.
		const name = "New Skill";
		// Prepare the item object.
		const itemData = {
			name: name,
			type: type,
			data: data,
		};
		// Remove the type from the dataset since it's in the itemData.type prop.
		itemData.data.type = undefined;

		// Finally, create the item!
		return this.actor.createEmbeddedDocuments("Item", [itemData]);
	}

	/**
	 * Handle clickable rolls.
	 * @param {Event} event   The originating click event
	 * @private
	 */
	_onRoll(event) {
		event.preventDefault();
		const element = event.currentTarget;
		const dataset = element.dataset;

		if (dataset.roll) {
			const roll = new Roll(dataset.roll, this.actor.system);
			const label = dataset.label
				? `Rolling ${dataset.label} to score under ${dataset.target}`
				: "";
			roll.roll().toMessage({
				speaker: ChatMessage.getSpeaker({ actor: this.actor }),
				flavor: label,
			});
		}
	}

	async _updateObject(event, formData) {
		const actor = this.object;
		const updateData = expandObject(formData);

		await actor.update(updateData, {
			diff: false,
		});
	}

	//The onDragItemStart event can be subverted to let you package additional data what you're dragging
	_onDragItemStart(event) {
		const itemId = event.currentTarget.getAttribute("data-item-id");

		if (!itemId) return;

		const clickedItem = duplicate(
			this.actor.getEmbeddedDocument("Item", itemId),
		);

		const it = $(event.currentTarget);

		const width = it.outerWidth();
		const height = it.outerHeight();
		const x = event.pageX - it.offset().left - width / 2;
		const y = event.pageY - it.offset().top - height / 2;

		const i = $(`#${itemId}`);

		// i.fadeOut(150);

		// setTimeout(function(){
		//   $('#'+itemId)[0].style.visibility = "hidden";
		// }, 1);

		clickedItem.system.stored = "";
		const item = clickedItem;

		event.dataTransfer.setData(
			"text/plain",
			JSON.stringify({
				type: "Item",
				sheetTab: this.actor.flags._sheetTab,
				actorId: this.actor.id,
				itemId: itemId,
				fromToken: this.actor.isToken,
				offset: {
					x: x,
					y: y,
				},
				data: item,
				root: event.currentTarget.getAttribute("root"),
			}),
		);
	}

	//Call this when an item is dropped.
	_onDragOver(event) {
		// let itemId = event.currentTarget.getAttribute("data-item-id");
		// if(!itemId)
		//   return;
		// let item = $('#'+itemId);
		// if(item == null)
		//   return;
		// item.fadeIn(150);
		// setTimeout(function(){
		//   item.style.visibility = "visible";
		// }, 100);
	}

	/**
	 * Handle dropping of an item reference or item data onto an Actor Sheet
	 * @param {DragEvent} event     The concluding DragEvent which contains drop data
	 * @param {Object} data         The data transfer extracted from the event
	 * @return {Object}             A data object which describes the result of the drop
	 * @private
	 */
	async _onDropItem(event, data) {
		if (!this.actor.isOwner) return false;
		const item = await Item.fromDropData(data);
		const itemData = duplicate(item);
		// Handle item sorting within the same Actor
		const actor = this.actor;

		let it = $(event.target);
		if (it.attr("id") !== "drag-area") {
			it = it.parents("#drag-area");
		}

		let x = 0;
		let y = 0;

		if (it.length) {
			const width = it.outerWidth();
			const height = it.outerHeight();

			x = event.pageX - it.offset().left - width / 2;
			y = event.pageY - it.offset().top - height / 2;
		}
		// let width = $('#drag-area-' + actor.id).outerWidth();
		// let height = $('#drag-area-' + actor.id).outerHeight();

		// var x = event.pageX - $('#drag-area-' + actor.id).offset().left - width / 2;
		// var y = event.pageY - $('#drag-area-' + actor.id).offset().top - height / 2;

		// if (Math.abs(x) > Math.abs(width / 2) || Math.abs(y) > Math.abs(height / 2)) {
		//     x = 0;
		//     y = 0;
		// }

		const sameActor =
			data.actorId === actor.id ||
			(actor.isToken && data.tokenId === actor.token.id);
		if (sameActor && !event.ctrlKey) {
			const i = duplicate(actor.getEmbeddedDocument("Item", data.itemId));
			i.system.sheet = {
				currentX: x - data.offset.x,
				currentY: y - data.offset.y,
				initialX: x - data.offset.x,
				initialY: y - data.offset.y,
				xOffset: x - data.offset.x,
				yOffset: y - data.offset.y,
			};
			actor.updateEmbeddedDocuments("Item", [i]);
			return;
			//return this._onSortItem(event, itemData);
		}

		if (
			data.actorId &&
			!event.ctrlKey &&
			!data.fromToken &&
			!this.actor.isToken
		) {
			const oldActor = game.actors.get(data.actorId);
			oldActor.deleteEmbeddedDocuments("Item", [data.itemId]);
		}

		if (!data.offset) {
			data.offset = {
				x: 0,
				y: 0,
			};
		}
		itemData.system.sheet = {
			currentX: x - data.offset.x,
			currentY: y - data.offset.y,
			initialX: x - data.offset.x,
			initialY: y - data.offset.y,
			xOffset: x - data.offset.x,
			yOffset: y - data.offset.y,
		};

		// Create the owned item
		return this._onDropItemCreate(itemData);
	}
}
