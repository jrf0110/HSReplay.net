export function showModal() {
	const modal = document.getElementById("premium-modal");

	if(!modal) {
		console.error("Could not find premium modal");
		return;
	}

	const loadModal = window.hsreplaynet_load_premium_modal;

	if(!loadModal) {
		return;
	}

	loadModal();
}
