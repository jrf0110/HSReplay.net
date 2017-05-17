import * as React from "react";
import {translate} from "react-i18next";

interface ResetHeaderProps {
	onReset: () => void;
	showReset: boolean;
}

class ResetHeader extends React.Component<ResetHeaderProps, void> {
	render(): JSX.Element {
		const t = (this.props as any).t;
		const classNames = ["reset-header"];
		if (this.props.showReset) {
			classNames.push("btn btn-danger btn-full")
		}
		return (
			<h1
				className={classNames.join(" ")}
				onClick={() => this.props.onReset()}
				onKeyPress={(event) => {
					if(event.which !== 13) {
						return;
					}
					if(event.target) {
						(event.target as any).blur();
					}
					this.props.onReset();
				}}
				tabIndex={this.props.showReset ? 0 : -1}
			>
				{this.props.showReset ? t("Reset all filters") : this.props.children}
			</h1>
		);
	}
}

export default translate()(ResetHeader);
