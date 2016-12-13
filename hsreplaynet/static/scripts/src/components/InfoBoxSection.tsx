import * as React from "react";

interface InfoBoxSectionState {
	collapsed?: boolean;
}

export type Size = "xs" | "sm" | "md" | "lg";

export interface InfoBoxSectionProps extends React.ClassAttributes<InfoBoxSection> {
	header: string;
	collapsedSizes?: Size[];
}

export default class InfoBoxSection extends React.Component<InfoBoxSectionProps, InfoBoxSectionState> {
	constructor(props: InfoBoxSectionProps, state: InfoBoxSectionState) {
		super(props, state);
		this.state = {
			collapsed: true,
		}
	}
	render(): JSX.Element {
		const collapsable = this.props.collapsedSizes && !!this.props.collapsedSizes.length;
		const contentClassNames = collapsable && this.state.collapsed ? this.props.collapsedSizes.map(x => "hidden-" + x).join(" ") : "";
		const buttonClassNames = collapsable && this.props.collapsedSizes.map(x => "visible-" + x).join(" ");
		return (
			<div>
				<h2>
					{this.props.header}
					{collapsable ?
						<a href="#" div className={"infobox-value " + buttonClassNames} onClick={() => this.setState({collapsed: !this.state.collapsed})}>
							{this.state.collapsed ? "show" : "hide"}
						</a> : null }
				</h2>
				<div className={contentClassNames}>
					{this.props.children}
				</div>
			</div>
		);
	}
}
