import * as React from "react";
import * as ReactDOM from "react-dom";
import {cardArt, image} from "../helpers";
import MyReplays from "../pages/MyReplays";
import UserData from "../UserData";
import Fragments from "../components/Fragments";

UserData.create();
let username = UserData.getUsername();

// override username from url if available
const query = location.search;
const parts = query.split("&");
for (let part of parts) {
	const matches = part.match(/\??username=(.*)/);
	if (matches) {
		username = decodeURIComponent(matches[1]);
		break;
	}
}

ReactDOM.render(
	<Fragments
		defaults={{
			name: "",
			mode: "",
			format: "",
			result: "",
			hero: "ALL",
			opponent: "ALL",
		}}
		debounce={"name"}
	>
		<MyReplays
			image={image}
			cardArt={cardArt}
			username={username}
		/>
	</Fragments>,
	document.getElementById("my-games-container"),
);
