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
		const metaoverview = document.getElementById("navbar-link-meta");
		if (!metaoverview) {
			return;
		}

		// do not show if feature is disabled
		if (!UserData.hasFeature("archetypes-announcement-tooltip")) {
			return;
		}

		// do not show if hidden
		if (cookie.get("knows-about-archetypes", "0") !== "0") {
			return;
		}

		($(metaoverview) as any).popover({
			animation: true,
			trigger: "manual",
			placement: "bottom",
			html: true,
			title:
				'Archetypes & Meta <a href="#" id="archetypes-popover-close" class="popover-close" aria-hidden="true">&times;</a>',
			content:
				"We now have detailed statistics about archetypes and the current meta!"
		});
		($(metaoverview) as any).on("shown.bs.popover", () => {
			$("#archetypes-popover-close").click(evt => {
				evt.preventDefault();
				($(metaoverview) as any).popover("destroy");
				cookie.set("knows-about-archetypes", "1", {
					path: "/",
					expires: 365
				});
			});
		});
		setTimeout(() => ($(metaoverview) as any).popover("show"), 500);
	});
}
