import * as React from "react";

interface NoDecksMessageProps {
}

export default class NoDecksMessage extends React.Component<NoDecksMessageProps, void> {
	render(): JSX.Element {
		return (
			<div className="message-wrapper">
				<h2>None of your decks are here :(</h2><br />
				<h3>We can fix that!</h3>
				<p>Step 1: If you haven't already, <a href="/downloads/">download Hearthstone Deck Tracker</a></p>
				<p>Step 2: Play some games with it and your decks will show up here!</p><br />
				<p><em>Protip: There is a "Copy deck to Hearthstone" button on every deck page!</em></p><br />
				{this.props.children}
			</div>
		);
	}
}
