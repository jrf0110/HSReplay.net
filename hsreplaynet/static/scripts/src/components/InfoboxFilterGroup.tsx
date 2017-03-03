import * as React from "react";

interface InfoboxFilterGroupProps extends React.ClassAttributes<InfoboxFilterGroup> {
	classNames?: string[];
	collapsed?: boolean;
	collapsible?: boolean;
	deselectable?: boolean;
	header?: string;
	locked?: boolean;
	onClick: (value: string, sender: string) => void;
	selectedValue: string | string[];
}

interface InfoboxFilterGroupState {
	collapsed?: boolean;
}

export default class InfoboxFilterGroup extends React.Component<InfoboxFilterGroupProps, InfoboxFilterGroupState> {
	constructor(props: InfoboxFilterGroupProps, state: InfoboxFilterGroupState) {
		super(props, state);
		this.state = {
			collapsed: props.collapsed,
		}
	}

	render(): JSX.Element {
		const selected = value => {
			if (!this.props.selectedValue) {
				return false;
			}
			if (typeof this.props.selectedValue === "string") {
				return this.props.selectedValue === value;
			}
			return this.props.selectedValue.indexOf(value) !== -1;
		}

		const cloneWidthProps = child => {
			return React.cloneElement(child, {
				selected: selected(child.props.value),
				onClick: this.props.onClick,
				deselectable: this.props.deselectable,
				locked: this.props.locked,
				...child.props
			});
		};

		let header = null;
		if (this.props.header) {
			let icon = null;
			let headerClassName = null;
			if (this.props.collapsed || this.props.collapsible) {
				headerClassName = "collapsible";
				if (this.state.collapsed) {
					icon = <span className="glyphicon glyphicon-menu-down"/>
				}
				else {
					icon = <span className="glyphicon glyphicon-menu-up"/>
				}
			}
			header = (
				<h2 className={headerClassName} onClick={() => this.setState({collapsed: !this.state.collapsed})}>
					{icon}
					{this.props.header}
				</h2>
			);
		}

		return (
			<ul className={this.props.classNames && this.props.classNames.join(" ")}>
				{header}
				{!this.state.collapsed && React.Children.map(this.props.children, cloneWidthProps)}
			</ul>
		);
	}
}
