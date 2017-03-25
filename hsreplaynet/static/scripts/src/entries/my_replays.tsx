import * as React from "react";
import * as ReactDOM from "react-dom";
import {image, cardArt} from "../helpers";
import MyReplays from "../pages/MyReplays";
import UserData from "../UserData";

const user = new UserData();
let username = user.getUsername();

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
	<MyReplays
		image={image}
		cardArt={cardArt}
		username={username}
	/>,
	document.getElementById("my-games-container")
);
