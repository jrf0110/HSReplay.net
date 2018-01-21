import React from "react";

interface NoDecksMessageProps {
}

export default class NoDecksMessage extends React.Component<NoDecksMessageProps, {}> {
	render(): JSX.Element {
		return (
			<div className="message-wrapper">
				<h2>No decks found</h2>
				{this.props.children}
			</div>
		);
	}
}
