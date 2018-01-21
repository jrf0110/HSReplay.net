import React from "react";
import ReactDOM from "react-dom";
import Lightbox from "../components/Lightbox";

let container = null;
const targets = document.querySelectorAll("[data-toggle=lightbox]");

const setupLightbox = () => {
	container = document.createElement("div");

	// add to body
	document.body.insertBefore(container, document.body.children[0]);
};

const renderLightbox = (target, page?, hidden?) => {
	const group = target.getAttribute("data-lightbox-group");
	const relatedTargets = document.querySelectorAll("[data-lightbox-group=" + group + "]");
	if (typeof page === "undefined") {
		page = 1;
		for (let i = 0; i < relatedTargets.length; i++) {
			if (relatedTargets.item(i).isEqualNode(target)) {
				page = i + 1;
				break;
			}
		}
	}
	else {
		target = relatedTargets.item(Math.max(page - 1, 0));
	}
	ReactDOM.render(<Lightbox
		body={{
			__html: target ? target.innerHTML : null,
		}}
		hidden={hidden}
		currentPage={page}
		setCurrentPage={(page) => {
			renderLightbox(target, page);
		}}
		pageCount={relatedTargets.length || 1}
		close={() => {
			renderLightbox(target, page, true);
		}}
	/>, container);
};

for (let target of targets) {
	target.addEventListener("click", (event) => {
		// prevent following the link
		event.preventDefault();

		if (!container) {
			container = document.createElement("div");
			container.classList.add("lightbox-container");
			document.body.insertBefore(container, document.body.children[0]);
		}

		renderLightbox(target);
	});
	if (!target.classList.contains("zoomable")) {
		target.classList.add("zoomable");
	}
}
