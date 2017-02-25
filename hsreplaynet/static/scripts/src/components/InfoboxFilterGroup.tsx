import * as React from "react";

interface InfoboxFilterGroupProps extends React.ClassAttributes<InfoboxFilterGroup> {
	classNames?: string[];
	deselectable?: boolean;
	locked?: boolean;
	onClick: (value: string, sender: string) => void;
	selectedValue: string | string[];
}

export default class InfoboxFilterGroup extends React.Component<InfoboxFilterGroupProps, void> {
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

		return (
			<ul className={this.props.classNames && this.props.classNames.join(" ")}>
				{React.Children.map(this.props.children, cloneWidthProps)}
			</ul>
		);
	}
}
