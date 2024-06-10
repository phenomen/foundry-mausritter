/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class MausritterItem extends Item {
	/**
	 * Augment the basic Item data model with additional dynamic data.
	 */
	prepareData() {
		super.prepareData();
		const actorData = this.actor ? this.actor.system : {};
		const data = this.system;
	}

	static chatListeners(html) {
		html.on(
			"click",
			".use-skill",
			MausritterItem._onChatUseSkill.bind(MausritterItem),
		);
	}

	static async _onChatUseSkill(event) {
		const token = event.currentTarget.closest(".mausritter");
		const actor = MausritterItem._getChatCardActor(token);
		if (!actor) return;

		const div = event.currentTarget.children[0];
		const skillId = div.dataset.itemId;
		actor.rollSkill(skillId);
	}
}
