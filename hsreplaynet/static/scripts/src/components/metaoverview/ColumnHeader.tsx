import * as React from "react";

interface ColumnHeaderProps extends React.ClassAttributes<ColumnHeader> {
}

interface ColumnHeaderState {
}

export default class ColumnHeader extends React.Component<ColumnHeaderProps, ColumnHeaderState> {
	render() {
		return (
			<th>Quest Rogue</th>
		);
	}
}
