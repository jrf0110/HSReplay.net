import CheckoutProcess from "../checkout/CheckoutProcess";

const modal = document.getElementById("premium-modal");

const trackModalInteraction = (action: string, nonInteraction: boolean = false, label?: string) => {
	if (typeof ga !== "function") {
		return;
	}
	ga("send", {
		hitType: "event",
		eventCategory: "Premium Modal",
		eventAction: action,
		eventLabel: label,
		nonInteraction: nonInteraction,
		transport: "beacon",
	});
};

let modalIsOpen = null;
let lastFocus = null;
let lastLabel = null;

const openModal = (modalToOpen, label?: string) => {
	if (modalIsOpen === true) {
		return;
	}
	modalIsOpen = true;
	modalToOpen.style.display = "flex";

	// setup focus
	lastFocus = document.activeElement;
	const inner = modalToOpen.children[0];
	inner.setAttribute("tabindex", 0);
	inner.focus();

	lastLabel = label;

	trackModalInteraction("open", false, label);
};

const closeModal = (modalToClose) => {
	if (modalIsOpen === false) {
		return;
	}

	// reset focus
	if(lastFocus) {
		lastFocus.focus();
		lastFocus = null;
	}
	const inner = modalToClose.children[0];
	inner.setAttribute("tabindex", -1);

	modalIsOpen = false;
	modalToClose.style.display = "none";

	const label = lastLabel;
	lastLabel = null;

	trackModalInteraction("close", false, label);
};

// setup modal
const setupModal = (modal) => {
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

	// setup escape button
	modal.children[0].onkeydown = (event) => {
		if (event.keyCode === 27) {
			closeModal(modal);
		}
	};
};

setupModal(modal);

const getDataAttributes = (element: Element) => {
	const attributes = element.attributes;
	const dataAttributes = {};
	for (let i = 0; i < attributes.length; i++) {
		const attribute = attributes[i];
		const name = attribute.name;
		// exclude non-data attributes
		if (!name.startsWith("data-")) {
			continue;
		}
		// figure out key name
		const optionName = name.substr(5);
		if (optionName) {
			// camel case
			const camelName = optionName.replace(/-(.)/g, (match, letter) => letter.toUpperCase());
			// typecast to boolean if possible
			let value: any = attribute.value;
			if (value.toLowerCase() === "true") {
				value = true;
			}
			if (value.toLowerCase() === "false") {
				value = false;
			}
			// typecast to number if possible
			if (typeof value === "string" && !isNaN(+value)) {
				value = +value;
			}
			// save value
			dataAttributes[camelName] = value;
		}
	}

	return dataAttributes;
};

const submitCheckoutForm = (form: HTMLFormElement, token: StripeTokenResponse, additionalData?: any) => {
	const addFormValue = (name, value) => {
		const input = document.createElement("input");
		input.type = "hidden";
		input.name = name;
		input.value = value;
		form.appendChild(input);
	};

	// add callback parameters to form
	addFormValue("stripeToken", token.id);
	addFormValue("stripeEmail", (token as any).email);
	addFormValue("stripeTokenType", token.type);

	if (additionalData) {
		for (let key in additionalData) {
			addFormValue(key, additionalData[key]);
		}
	}

	form.submit();
};

const loadStripe = (): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		const script = document.createElement("script");
		script.type = "text/javascript";
		script.src = "https://checkout.stripe.com/checkout.js";
		script.onload = () => resolve();
		script.onerror = () => reject();
		document.body.appendChild(script);
	});
};

const configureStripe = (configuration): Promise<StripeCheckoutHandler> => {
	return new Promise((resolve, reject) => {
		resolve(StripeCheckout.configure(configuration));
	})
};

let setupDone = false;
let checkoutProcess: CheckoutProcess = null;

const setupCheckout = (target: HTMLFormElement|HTMLButtonElement) => {
	// only run once
	if (setupDone) {
		return;
	}
	setupDone = true;

	// find form (that's where the config is)
	let form: HTMLFormElement = null;
	if (target["form"]) {
		form = target["form"];
	}
	else {
		form = target as HTMLFormElement;
	}

	// ensure all checkout buttons have .wait and :disabled
	const buttons: NodeListOf<HTMLButtonElement> = form.getElementsByClassName("checkout-button") as any;
	for (let i = 0; i < buttons.length; i++) {
		buttons[i].setAttribute("disabled", "disabled");
		buttons[i].classList.add("wait");
	}

	loadStripe().then(() => {
		const configuration = getDataAttributes(form);
		return configureStripe(configuration);
	}).then((handler: StripeCheckoutHandler) => {
		// hook up buttons
		for (let i = 0; i < buttons.length; i++) {
			const button = buttons[i];
			let plan = null;
			if (button.hasAttribute("data-plan")) {
				plan = button.getAttribute("data-plan");
				button.removeAttribute("data-plan");
			}
			let configuration = getDataAttributes(button);
			button.onclick = () => {
				// prevent overwriting an existing process
				if (checkoutProcess) {
					return;
				}

				// update button
				button.setAttribute("data-original-label", button.textContent);
				button.textContent = "Nearly there…";
				button.classList.add("wait");

				// hide other buttons
				for (let i = 0; i < buttons.length; i++) {
					const buttonToHide = buttons[i];
					if (buttonToHide !== button) {
						buttonToHide.style.display = "none";
					}
				}

				// disable elements
				const inputs = form.querySelectorAll("input, button.checkout-button");
				for (let input of inputs) {
					input.setAttribute("disabled", "disabled");
				}

				// start checkout process
				checkoutProcess = new CheckoutProcess(plan, handler);
				checkoutProcess.onstart = () => {
					button.textContent = "Waiting for payment";
				};

				const planData = {};
				let options = {};
				if (plan) {
					planData["plan"] = plan;
				}
				else {
					const selectedPlan = form.querySelector('input[name="plan"]:checked');
					if (!selectedPlan) {
						throw new Error("Cannot determine selected plan");
					}
					configuration = getDataAttributes(selectedPlan);
				}

				checkoutProcess.checkout(configuration).then((token: StripeTokenResponse) => {
					// checkout complete, submit the form
					button.textContent = "Confirming…";

					// enable inputs so values are sent, but keep button disabled
					const inputs = form.querySelectorAll("input");
					for (let i = 0; i < inputs.length; i++) {
						const input = inputs[i];
						input.removeAttribute("disabled");
						input.setAttribute("readonly", "readonly");
					}

					// submit form
					submitCheckoutForm(form, token, planData);

					// prevent the user user from clicking around
					for (let input of inputs) {
						input.setAttribute("disabled", "disabled");
					}
				}).catch((error) => {
					button.classList.remove("wait");

					if(error) {
						console.error(error);
						button.textContent = "Something went wrong :(";
						return;
					}

					// checkout was cancelled, reset the button
					button.textContent = button.getAttribute("data-original-label");

					// show buttons again
					for (let i = 0; i < buttons.length; i++) {
						buttons[i].style.removeProperty("display");
					}

					// reset the rest of the input elements
					for (let i = 0; i < inputs.length; i++) {
						const input = inputs[i];
						input.removeAttribute("disabled");
					}

					// clear the running checkout process
					checkoutProcess = null;
				});

				// track start of checkout
				const label = lastLabel;
				lastLabel = null;
				trackModalInteraction("checkout", false, label);
			};
			// enable button
			button.removeAttribute("disabled");
			button.classList.remove("wait");
		}
	});

	const learnMore = document.getElementById("premium-modal-learn-more");
	if(learnMore) {
		learnMore.onclick = () => trackModalInteraction("details");
	}
};

window.hsreplaynet_load_stripe = (targetElement: HTMLFormElement|HTMLButtonElement) => {
	setupCheckout(targetElement);
};

window.hsreplaynet_load_premium_modal = (label?: string) => {
	// show modal
	openModal(modal, label);
	// find button
	const modalForm = document.getElementById("premium-modal-checkout-form") as HTMLFormElement;
	if (!modalForm) {
		return;
	}
	// init stripe
	setupCheckout(modalForm);
};

if (modal.getAttribute("data-stripe-load") === "1") {
	// find button
	const modalForm = document.getElementById("premium-modal-checkout-form") as HTMLFormElement;
	if (modalForm) {
		setupCheckout(modalForm);
		modalIsOpen = true;
		trackModalInteraction("open", true);
	}
}
