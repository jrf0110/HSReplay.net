export function showModal() {
	const modal = document.getElementById("premium-modal");
	modal.ondblclick = () => modal.style["display"] = "none";
	modal.style["display"] = "flex";

	const btn = document.getElementById("premium-modal-checkout-button");
	if (!btn) {
		return;
	}

	const script = document.createElement("script");
	
	const transfer = (key: string) => {
		const attrib = btn.getAttribute(key);
		if (attrib) {
			script.setAttribute(key, attrib);
		}
	};

	const keys = [
		"key", "image", "name", "email", "locale",
		"description", "label", "panel-label"
	];
	keys.forEach(key => transfer("data-" + key))
	
	script.type="text/javascript";
	script.src="https://checkout.stripe.com/checkout.js";
	script.className = "stripe-button";

	btn.parentNode.replaceChild(script, btn);
}
