import * as React from "react";
import * as ReactDOM from "react-dom";
import {image, cardArt} from "../helpers";
import MyReplays from "../pages/MyReplays";
import UserData from "../UserData";

const user = new UserData();

ReactDOM.render(
	<MyReplays
		image={image}
		cardArt={cardArt}
		username={user.getUsername()}
	/>,
	document.getElementById("my-games-container")
);
