import * as React from "react";

interface InfoboxFilterGroupProps extends React.ClassAttributes<InfoboxFilterGroup> {
	deselectable?: boolean;
	locked?: boolean;
	onClick: (value: string) => void;
	selectedValue: string;
}

export default class InfoboxFilterGroup extends React.Component<InfoboxFilterGroupProps, void> {
	render(): JSX.Element {
		const cloneWidthProps = child => {
			return React.cloneElement(child, {
				selected: this.props.selectedValue === child.props.value,
				onClick: this.props.onClick,
				deselectable: this.props.deselectable,
				locked: this.props.locked,
				...child.props
			});
		};

		return <ul>{React.Children.map(this.props.children, cloneWidthProps)}</ul>;
	}
}
