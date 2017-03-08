export function showModal() {
	const modal = document.getElementById("premium-modal");

	if(!modal) {
		console.error("Could not find premium modal");
		return;
	}

	// show modal
	modal.style.display = "flex";

	const loadStripe = window.hsreplaynet_load_premium_modal;
	loadStripe();
}
