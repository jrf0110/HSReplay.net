export function showModal() {
	const modal = document.getElementById("premium-modal");

	// show modal
	modal.style["display"] = "flex";

	const loadStripe = window["hsreplaynet_load_premium_modal"];
	loadStripe();
}
