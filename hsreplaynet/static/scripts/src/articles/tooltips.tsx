import React from "react";
import ReactDOM from "react-dom";
import Card from "../components/Card";

const tooltip = document.createElement("div");
tooltip.classList.add("article-tooltip");
tooltip.classList.add("hidden");

const targets = document.querySelectorAll(
	"[data-toggle=card-tooltip]"
) as NodeListOf<HTMLElement>;

for (let target of targets) {
	target.addEventListener("mousemove", event => {
		const cardId = target.getAttribute("data-card-id");
		ReactDOM.render(
			<Card id={cardId} x={event.clientX} y={event.clientY} />,
			tooltip
		);
		document.body.appendChild(tooltip);
		tooltip.classList.remove("hidden");
	});

	target.addEventListener("mouseleave", () => {
		const parent = tooltip.parentElement;
		if (parent) {
			parent.removeChild(tooltip);
		}
		tooltip.classList.add("hidden");
	});
}
