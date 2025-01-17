export async function showCreateCharacterDialog(callback) {
	const template = "systems/mausritter/templates/dialogs/create-character.html";
	const html = await renderTemplate(template);
	const d = new Dialog({
		title: game.i18n.localize("Maus.CC.WhatToCreate"),
		content: html,
		buttons: {
			roll: {
				icon: '<i class="fas fa-check"></i>',
				label: game.i18n.localize("Maus.OK"),
				callback: (html) => {
					const formElement = html[0].querySelector("fieldset");
					const formData = new FormDataExtended(formElement);
					const options = formData.object;
					callback(options);
				},
			},
			cancel: {
				icon: '<i class="fas fa-times"></i>',
				label: game.i18n.localize("Maus.Cancel"),
				callback: () => {},
			},
		},
		default: "roll",
		close: () => {},
	});
	d.render(true);
}
