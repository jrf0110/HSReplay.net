import * as $ from "jquery";
import { cookie } from "cookie_js";
import UserData from "../UserData";

if (
	window &&
	window.navigator &&
	window.navigator.userAgent &&
	/Edge\/1[0-4]\./.test(window.navigator.userAgent)
) {
	// Fix for bug in Microsoft Edge: https://github.com/Microsoft/ChakraCore/issues/1415#issuecomment-246424339
	Function.prototype.call = function(t) {
		return this.apply(t, Array.prototype.slice.apply(arguments, [1]));
	};
}

if (
	document.location.pathname.match(/\/(replay|games|articles|decks|cards)\//)
) {
	UserData.create();
	document.addEventListener("DOMContentLoaded", () => {
		// locate the premium navbar item
		const premiumLink = document.getElementById("navbar-link-premium");
		if (!premiumLink) {
			return;
		}

		// do not show if feature is disabled
		if (!UserData.hasFeature("reflinks")) {
			return;
		}

		// do not show when logged out
		if (!UserData.isAuthenticated()) {
			return;
		}

		// do not show if hidden
		if (cookie.get("refer-popup-closed", "0") !== "0") {
			return;
		}

		($(premiumLink) as any).popover({
			animation: true,
			trigger: "manual",
			placement: "bottom",
			html: true,
			title:
				'Refer a Friend! <a href="#" id="referral-popover-close" class="popover-close" aria-hidden="true">&times;</a>',
			content:
				"Tell a friend about HSReplay.net for a cheaper Premium subscription!"
		});
		($(premiumLink) as any).on("shown.bs.popover", () => {
			$("#referral-popover-close").click(evt => {
				evt.preventDefault();
				($(premiumLink) as any).popover("destroy");
				cookie.set("refer-popup-closed", "1", {
					path: "/",
					expires: 90
				});
			});
		});
		setTimeout(() => ($(premiumLink) as any).popover("show"), 500);
	});
}
