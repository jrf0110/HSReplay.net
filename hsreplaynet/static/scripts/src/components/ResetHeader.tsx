import * as React from "react";

interface ResetHeaderProps extends React.ClassAttributes<ResetHeader> {
	onReset: () => void;
	showReset: boolean;
}

export default class ResetHeader extends React.Component<ResetHeaderProps, void> {
	render(): JSX.Element {
		const classNames = ["reset-header"];
		if (this.props.showReset) {
			classNames.push("btn btn-danger btn-full")
		}
		return (
			<h1 className={classNames.join(" ")} onClick={() => this.props.onReset()}>
				{this.props.showReset ? "Reset all filters" : this.props.children}
			</h1>
		);
	}
}
