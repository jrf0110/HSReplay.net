import React from "react";

interface LoadingSpinnerProps extends React.ClassAttributes<LoadingSpinner> {
	active?: boolean;
	glyphicon?: string;
}

export default class LoadingSpinner extends React.Component<
	LoadingSpinnerProps,
	{}
> {
	render(): JSX.Element {
		if (!this.props.active) {
			return null;
		}
		const glyphiconClassName =
			"glyphicon " + (this.props.glyphicon || "glyphicon-refresh");
		return (
			<div className="loading-spinner">
				<span className={glyphiconClassName} />
			</div>
		);
	}
}
