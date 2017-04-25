import * as React from "react"
import Tab from "./Tab";

interface TabListProps {
	tab?: string;
	setTab?(tab?: string): void;
}

export default class TabList extends React.Component<TabListProps, void> {
	render() {
		const children = this.getValidChildren(this.props.children);

		if (!children.length) {
			return;
		}

		const canSwitch = typeof this.props.setTab === "function";

		const tabs = children.map((child: any) => {
			const id = child.props.id;
			const isActive = id === this.props.tab;

			const label = (
				<a
					href={"#"}
					onClick={(event) => {
						event.preventDefault();
						if (isActive || !canSwitch) {
							return;
						}
						this.props.setTab(id);
					}}
				>
					{child.props.label}
				</a>
			);

			return (
				<li key={id} className={isActive ? "active" : null}>
					{label}
				</li>
			);
		});

		const body = children.map((child: any) => {
			const id = child.props.id;
			const classNames = ["tab-pane"];
			if (id === this.props.tab) {
				classNames.push("active");
			}
			return (
				<div id={id} key={id} role="tabpanel" className={classNames.join(" ")}>
					{child}
				</div>
			);
		})

		return (
			<div>
				<ul className="nav nav-tabs content-tabs">
					{tabs}
				</ul>
				<div className="tab-content">
					{body}
				</div>
			</div>
		)
	}

	componentDidMount() {
		this.ensureVisibleTab(this.props);
	}

	componentWillReceiveProps(nextProps) {
		this.ensureVisibleTab(nextProps);
	}

	private getValidChildren(children, warn?: boolean): React.ReactChild[] {
		return React.Children.toArray(children).filter((child: any) => {
			if (child.type !== Tab) {
				if (warn) {
					console.warn("TabList requires <Tab> components as children");
				}
				return false;
			}
			if (!child.props) {
				return false;
			}
			return typeof child.props.hidden !== "undefined" ? child.props.hidden: true;
		});
	}

	private ensureVisibleTab(props) {
		if (typeof props.setTab !== "function") {
			// if we can't switch tab there's nothing we can do
			return;
		}

		const validChildren = this.getValidChildren(props.children, true) as any[];
		if (!validChildren.length) {
			// no valid tabs, nothing we can do
			return;
		}

		if (!validChildren.find((child) => child.props.id === props.tab)) {
			// no selected child, manually select closest
			this.props.setTab(validChildren[0].props.id);
		}
	}
}
