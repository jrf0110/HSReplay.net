import * as React from "react";

interface RowHeaderProps extends React.ClassAttributes<RowHeader> {
}

interface RowHeaderState {
}

export default class RowHeader extends React.Component<RowHeaderProps, RowHeaderState> {
	render() {
		return (
			<th>Quest Rogue</th>
		);
	}
}
