import * as React from "react";

interface NoDecksMessageProps extends React.ClassAttributes<NoDecksMessage> {
}

export default class NoDecksMessage extends React.Component<NoDecksMessageProps, void> {
	render(): JSX.Element {
		return (
			<div className="message-wrapper">
				<h2>None of your decks are here :(</h2><br />
				<h3>We can fix that!</h3>
				<p>Step 1: If you haven't already, <a href="/downloads/">download Hearthstone Deck Tracker</a></p>
				<p>Step 2: Play some games with it and your decks will show up here!</p><br />
				<p><i>Protip: We have a "Copy deck to HDT" button on every deck page!</i></p><br />
				{this.props.children}
			</div>
		);
	}
}
