import * as React from "react"

interface SelectionState {
	selected?: string;
}

interface SelectionProps extends React.ClassAttributes<Selection> {
	name: string;
	visibleOptions: string[];
	collapsedOptions?: string[];
	defaultSelection?: string;
}

export default class Selection extends React.Component<SelectionProps, SelectionState> {
	constructor(props: SelectionProps, state: SelectionState) {
		super(props, state);
		this.state = {
			selected: this.props.defaultSelection || this.props.visibleOptions[0],
		}
	}

	render(): JSX.Element {
		const visible = [];
		this.props.visibleOptions.forEach(name => {
			const className = "btn btn-" + (name === this.state.selected ? "primary" : "default")
			visible.push(<button type="button" className={className} onClick={() => this.onClick(name)}>{name}</button>);
		});
		let dropDown = null;
		if (this.props.collapsedOptions) {
			const items = [];
			this.props.collapsedOptions && this.props.collapsedOptions.forEach(name => {
				items.push(
					<li>
						<a href="#" style={{display: "inline"}} onClick={() => this.onClick(name)}>{name}</a>
						<span className="glyphicon glyphicon-lock" style={{color: "black", float:"right"}}/>
					</li>
				);
			})
			const className = "btn btn-" + (this.props.collapsedOptions.indexOf(this.state.selected) === -1 ? "default" : "primary") + " dropdown-toggle";
			dropDown = [
				<button type="button" className={className} data-toggle="dropdown">
					<span className="caret"/>
				</button>,
				<ul className="dropdown-menu dropdown-menu-right">
					{items}
				</ul>
			]
		}
		return <div className="input-group">
			<span className="input-group-addon">{this.props.name}</span>
			{visible}
			{dropDown}
		</div>
	}

	onClick(name: string) {
		this.setState({selected: name});
	}
}
