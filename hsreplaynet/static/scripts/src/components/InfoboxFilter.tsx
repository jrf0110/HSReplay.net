import * as React from "react";

interface InfoboxFilterProps extends React.ClassAttributes<InfoboxFilter> {
	classNames?: string[];
	deselectable?: string;
	disabled?: boolean;
	locked?: boolean;
	onClick?: (newValue: string, sender: string) => void;
	selected?: boolean;
	value: string;
}

export default class InfoboxFilter extends React.Component<InfoboxFilterProps, void> {
	render(): JSX.Element {
		const onClick = () => {
			if (!this.props.disabled && !this.props.locked && (!this.props.selected || this.props.deselectable)) {
				this.props.onClick(this.props.selected ? null : this.props.value, this.props.value);
			}
		};

		const classNames = ["selectable"];
		if (this.props.classNames) {
			classNames.push(this.props.classNames.join(" "));
		}
		if (this.props.selected) {
			classNames.push("selected");
			if (!this.props.deselectable) {
				classNames.push("no-deselect");
			}
		}
		if(this.props.disabled) {
			classNames.push("disabled");
		}

		return <li className={classNames.join(" ")} onClick={onClick}>{this.props.children}</li>;
	}
}
