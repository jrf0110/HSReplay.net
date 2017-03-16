const modal = document.getElementById("premium-modal");

const trackModalInteraction = (action: string, nonInteraction: boolean = false) => {
	if (typeof ga !== "function") {
		return;
	}
	ga("send", {
		hitType: "event",
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
const loadStripe = (targetElement) => {
	if (stripeLoaded) {
		return;
	}

	stripeLoaded = true;

	const script = document.createElement("script");

	const transfer = (key: string) => {
		const attrib = targetElement.getAttribute(key);
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

	targetElement.parentNode.replaceChild(script, targetElement);
};

window.hsreplaynet_load_stripe = (targetElement) => {
	loadStripe(targetElement);
};

window.hsreplaynet_load_premium_modal = () => {
	// show modal
	openModal(modal);
	// find button
	const modalButton = document.getElementById("premium-modal-checkout-button");
	if (!modalButton) {
		return;
	}
	// init stripe
	loadStripe(modalButton);
};

if (modal.getAttribute("data-stripe-load") === "1") {
	// find button
	const modalButton = document.getElementById("premium-modal-checkout-button");
	if (modalButton) {
		loadStripe(modalButton);
		trackModalInteraction("open", true);
	}
}
