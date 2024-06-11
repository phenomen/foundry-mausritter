export async function showAdditionalItemsInfoDialog(items) {
	const template =
		"systems/mausritter/templates/dialogs/additional-item-info.html";
	const html = await renderTemplate(template, { items: items });
	const d = new Dialog({
		title: game.i18n.localize("Maus.CC.AdditionalStartingItem"),
		content: html,
		buttons: {
			ok: {
				icon: '<i class="fas fa-check"></i>',
				label: game.i18n.localize("Maus.OK"),
				callback: (html) => {},
			},
		},
		default: "ok",
		close: () => {},
	});
	d.render(true);
}
