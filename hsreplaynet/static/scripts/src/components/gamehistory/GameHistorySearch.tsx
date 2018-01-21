import React from "react";

interface GameHistorySearchProps {
	query: string;
	setQuery: (query: string) => void;
}

interface GameHistorySearchState {
}

export default class GameHistorySearch extends React.Component<GameHistorySearchProps, GameHistorySearchState> {

	render(): JSX.Element {
		return (
			<div className="search-wrapper">
				<input
					type="search"
					placeholder="Search for players…"
					className="form-control"
					value={this.props.query || ""}
					onChange={(e: any) => this.props.setQuery(e.target.value)}
				/>
			</div>
		);
	}
}
