const modal = document.getElementById("premium-modal");

const closeModal = (modal) => {
	modal.style["display"] = "none";
};

// setup click on X
const closeButton = document.getElementById("premium-modal-close");
closeButton.style["display"] = "block";
closeButton.onclick = (e) => {
	e.preventDefault();
	closeModal(modal);
};

// setup click on background
modal.onclick = (e) => {
	if(e.target && e.target !== modal) {
		return;
	}
	e.preventDefault();
	closeModal(modal);
};

//
const loadStripe = () => {
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
	keys.forEach(key => transfer("data-" + key));

	script.type="text/javascript";
	script.src="https://checkout.stripe.com/checkout.js";
	script.className = "stripe-button";

	btn.parentNode.replaceChild(script, btn);
};

window["hsreplaynet_load_premium_modal"] = () => loadStripe();

if(modal.getAttribute("data-stripe-load") == "1") {
	loadStripe();
}
