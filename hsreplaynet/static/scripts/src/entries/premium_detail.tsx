import React from "react";
import ReactDOM from "react-dom";
import UserData from "../UserData";
import ReferralsPromo from "../pages/ReferralsPromo";

UserData.create();

window.onload = function() {
	const root = document.getElementById("referrals");
	const reflink = root.getAttribute("data-reflink");
	if (root) {
		ReactDOM.render(
			<ReferralsPromo discount={"$1.00 USD"} url={reflink} />,
			root
		);
	}
};
