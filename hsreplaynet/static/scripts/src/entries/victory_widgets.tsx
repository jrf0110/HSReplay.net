import * as React from "react";
import * as ReactDOM from "react-dom";
import ClassStackedBarChart from "../components/charts/ClassStackedBarChart";

const containers = document.getElementsByClassName("victory-container");

[].forEach.call(containers, (container) => {
	const type = container.getAttribute("data-chart-type");
	const url = container.getAttribute("data-url");
	if (type === "ClassStackedBarChart") {
		const hideControls = container.getAttribute("data-hide-controls");
		const hideLegends = container.getAttribute("data-hide-legends");
		const numVisibleBars = container.getAttribute("data-num-visible-bars");
		/*ReactDOM.render(
			<ClassStackedBarChart
				url={url}
				hideControls={hideControls && hideControls === "true"}
				hideLegend={hideLegends && hideLegends === "true"}
				numVisibleBars={numVisibleBars && +numVisibleBars} />,
			container
		)*/
	}
})
