import React from "react";
import AnimatedListItem from "./AnimatedListItem";
import * as _ from "lodash";

const enum Step {
	WAITING,
	EXPAND,
	SORT,
	TRIM
}

interface Indices {
	[key: string]: number;
}

export interface AnimatedListObject {
	key: string;
	item: JSX.Element;
}

interface AnimatedListState {
	indices?: Indices;
	items?: AnimatedListObject[];
	nextItems?: AnimatedListObject[];
	step?: Step;
}

interface AnimatedListProps extends React.ClassAttributes<AnimatedList> {
	rowHeight: number;
	items: AnimatedListObject[];
}

const ROW_PADDING = 2;

export default class AnimatedList extends React.Component<
	AnimatedListProps,
	AnimatedListState
> {
	constructor(props: AnimatedListProps, state: AnimatedListState) {
		super(props, state);
		const { items } = this.props;
		this.state = {
			indices: this.generateIndices(items),
			items,
			nextItems: [],
			step: Step.WAITING
		};
	}

	componentWillReceiveProps(nextProps: AnimatedListProps) {
		const currentKeys = this.props.items.map(x => x.key);
		const nextKeys = nextProps.items.map(x => x.key);
		if (currentKeys.length === 0 || _.isEqual(currentKeys, nextKeys)) {
			const indices = this.generateIndices(nextProps.items);
			this.setState({ items: nextProps.items, indices });
		} else {
			this.setState({ nextItems: nextProps.items, step: Step.EXPAND });
		}
	}

	generateIndices(items: AnimatedListObject[]): Indices {
		const indices: Indices = {};
		items.forEach(({ key }, index) => {
			indices[key] = index;
		});
		return indices;
	}

	componentDidUpdate() {
		switch (this.state.step) {
			case Step.EXPAND:
				this.expandList();
				break;
			case Step.SORT:
				setTimeout(() => this.sortList(), 200);
				break;
			case Step.TRIM:
				this.trimList();
				break;
		}
	}

	expandList() {
		const indices = Object.assign({}, this.state.indices);
		const { items, nextItems } = this.state;
		const newItems = items.slice();

		nextItems.forEach(item => {
			const index = items.findIndex(x => x.key === item.key);
			if (index === -1) {
				newItems.push(item);
				indices[item.key] = newItems.length - 1;
			} else {
				// update existing values on items that didn't move
				newItems[index] = item;
			}
		});

		this.setState({ items: newItems, indices, step: Step.SORT });
	}

	sortList() {
		const { items, nextItems } = this.state;
		const indices = {};

		nextItems.forEach(({ key }, index) => {
			indices[key] = index;
		});

		items
			.filter(({ key }) => nextItems.every(x => x.key !== key))
			.forEach(({ key }, index) => {
				indices[key] = index + nextItems.length;
			});

		this.setState({ indices, step: Step.TRIM });
	}

	trimList() {
		setTimeout(() => {
			if (this.state.step === Step.TRIM) {
				this.setState({
					items: this.state.nextItems.slice(),
					step: Step.WAITING
				});
			}
		}, 1000);
	}

	render(): JSX.Element {
		const { rowHeight } = this.props;
		const { items } = this.state;
		const style = {
			height: this.props.items.length * (rowHeight + ROW_PADDING) + "px"
		};

		const listItems = items.map(({ key, item }) => (
			<AnimatedListItem
				key={key}
				index={this.state.indices[key]}
				height={this.props.rowHeight + ROW_PADDING}
			>
				{item}
			</AnimatedListItem>
		));
		return (
			<div className="animated-list" style={style}>
				{listItems}
			</div>
		);
	}
}
