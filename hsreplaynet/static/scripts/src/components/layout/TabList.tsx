import React from "react";
import Tab from "./Tab";

interface Props extends React.ClassAttributes<TabList> {
	tab: string;
	setTab(tab?: string): void;
	tabFragment?: string;
}

export default class TabList extends React.Component<Props> {
	render() {
		const children = this.getValidChildren(this.props.children);

		if (!children.length) {
			return;
		}

		const canSwitch = typeof this.props.setTab === "function";

		const tabs = children.map((child: any) => {
			const { id, disabled, highlight } = child.props;
			const isActive = id === this.props.tab;

			const label = (
				<a
					href={`#${this.props.tabFragment || "tab"}=${id}`}
					onClick={event => {
						event.preventDefault();
						if (isActive || !canSwitch || disabled) {
							return;
						}
						this.props.setTab(id);
					}}
				>
					{child.props.label}
				</a>
			);

			const classNames = [];
			if (isActive) {
				classNames.push("active");
			}
			if (disabled) {
				classNames.push("disabled");
			}
			if (highlight) {
				classNames.push("highlight");
			}

			return (
				<li key={id} className={classNames.join(" ")}>
					{label}
				</li>
			);
		});

		const body = children.map((child: any) => {
			if (child.props.disabled) {
				return null;
			}
			const id = child.props.id;
			const classNames = ["tab-pane"];
			if (id === this.props.tab) {
				classNames.push("active");
			}
			return (
				<div
					id={id}
					key={id}
					role="tabpanel"
					className={classNames.join(" ")}
				>
					{child}
				</div>
			);
		});

		return (
			<div>
				<ul className="nav nav-tabs content-tabs">{tabs}</ul>
				<div className="tab-content">{body}</div>
			</div>
		);
	}

	componentDidMount() {
		this.ensureVisibleTab(this.props);
	}

	componentWillReceiveProps(nextProps) {
		this.ensureVisibleTab(nextProps);
	}

	private getValidChildren(
		children,
		excludeDisabled?: boolean,
		warn?: boolean
	): React.ReactChild[] {
		return React.Children.toArray(children).filter((child: any) => {
			if (child.type !== Tab) {
				if (warn) {
					console.warn(
						"TabList requires <Tab> components as children"
					);
				}
				return false;
			}
			if (!child.props) {
				return false;
			}
			if (child.props.hidden) {
				return false;
			}
			if (excludeDisabled && child.props.disabled) {
				return false;
			}
			return true;
		});
	}

	private ensureVisibleTab(props): void {
		if (typeof props.setTab !== "function") {
			// if we can't switch tab there's nothing we can do
			return;
		}

		const validChildren = this.getValidChildren(
			props.children,
			true,
			true
		) as any[];
		if (!validChildren.length) {
			// no valid tabs, nothing we can do
			return;
		}

		if (!validChildren.find(child => child.props.id === props.tab)) {
			// no selected child, manually select closest
			this.props.setTab(validChildren[0].props.id);
		}
	}
}
