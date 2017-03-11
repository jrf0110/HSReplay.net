const modal = document.getElementById("premium-modal");

const trackModalInteraction = (action: string, nonInteraction: boolean = false) => {
	if (!ga) {
		return;
	}
	ga("send", {
		eventType: "event",
		eventCategory: "Modal",
		eventAction: action,
		evenLabel: "Premium Modal",
		nonInteraction: nonInteraction,
	});
};

const openModal = (modalToOpen) => {
	modalToOpen.style.display = "flex";
	trackModalInteraction("open");
};

const closeModal = (modalToClose) => {
	modalToClose.style.display = "none";
	trackModalInteraction("close");
};

// setup click on X
const closeButton = document.getElementById("premium-modal-close");
closeButton.style.display = "block";
closeButton.onclick = (e) => {
	e.preventDefault();
	closeModal(modal);
};

// setup click on background
modal.onclick = (e) => {
	if (e.target && e.target !== modal) {
		return;
	}
	e.preventDefault();
	closeModal(modal);
};

let stripeLoaded = false;

// inject stripe JS
const loadStripe = () => {
	if (stripeLoaded) {
		return;
	}

	stripeLoaded = true;

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
		"key", "image", "name", "description", "amount", "locale", "zip-code",
		"billing-address", "currency", "panel-label", "shipping-address",
		"email", "label", "allow-remember-me", "bitcoin", "alipay",
		"alipay-reusable",
	];
	keys.forEach((key) => transfer("data-" + key));

	script.type = "text/javascript";
	script.src = "https://checkout.stripe.com/checkout.js";
	script.className = "stripe-button";

	btn.parentNode.replaceChild(script, btn);
};

window.hsreplaynet_load_premium_modal = () => {
	// show modal
	openModal(modal);
	// init stripe
	loadStripe();
};

if (modal.getAttribute("data-stripe-load") === "1") {
	loadStripe();
	trackModalInteraction("open", true);
}
