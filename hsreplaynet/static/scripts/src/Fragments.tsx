import * as React from "react";
import {capitalize} from "./helpers";

interface FragmentMap {
	[key: string]: any;
}

interface FragmentProps extends React.ClassAttributes<Fragments> {
	defaults: FragmentMap;
}

interface FragmentState {
	map: FragmentMap;
}

/**
 * This component maps url fragments (such as index.html#a=1&b=2) to it's child's props.
 * A default key pageNumber:1 will result in the props pageNumber:1 and setPageNumber:(newPageNumber).
 */
export default class Fragments extends React.Component<FragmentProps, FragmentState> {

	private listener: any;
	private revision: number;
	private lastSeen: number;

	constructor(props: FragmentProps, context: any) {
		super(props, context);
		this.state = {map: {}};
		this.listener = null;
		this.revision = 0;
		this.lastSeen = 0;
	}

	render(): any {

		let props = {};

		const values = Object.assign({}, this.props.defaults, this.state.map);
		for (let key in values) {
			// prepare the callback
			const callback = (value: any) => this.onChange(key, value);
			const callbackKey = "set" + capitalize(key);
			// assign the props
			props[key] = values[key];
			props[callbackKey] = callback;
		}

		props = Object.assign({}, props, {
			canBeReset: Object.keys(this.state.map).length > 0,
			reset: () => this.setState({map: {}}),
		});

		return React.cloneElement(this.props.children as any, props);
	}

	onChange(key: string, value: any): void {
		const defaultValue = this.props.defaults[key];

		if (typeof defaultValue === "undefined") {
			console.error(`Attempted to change undefined fragment key "${key}"`);
			return;
		}

		let map = {};
		if (!value) {
			map = Object.assign(map, this.state.map);
			delete map[key];
		}
		else {
			map = Object.assign(map, this.state.map, {[key]: value});
		}

		this.setState({map});
	}

	componentDidUpdate(prevProps: FragmentProps, prevState: FragmentState) {
		this.setFragment(this.state.map);
	}

	componentDidMount() {
		this.loadHash();
		this.listener = window.addEventListener("hashchange", () => {
			if (this.lastSeen < this.revision) {
				this.lastSeen = this.revision;
				return;
			}
			this.loadHash();
		}, false);
	}

	componentWillUnmount() {
		window.removeEventListener("hashchange", this.listener);
		this.listener = null;
	}

	loadHash(): void {
		this.setState({map: Object.assign({}, this.getFragment())});
	}

	getFragment(): FragmentMap {
		let fragment = document.location.hash;
		const result = {};
		if (fragment.startsWith("#") && fragment.indexOf("=") !== -1) {
			fragment = fragment.substr(1);
			fragment.split("&").forEach((part) => {
				const atoms = part.split("=");
				const key = decodeURIComponent(atoms[0]);
				const value = decodeURIComponent(atoms.slice(1).join(""));
				result[key] = value;
			});
		}
		return result;
	}

	setFragment(map: FragmentMap): void {
		const parts = [];
		for (let key in map) {
			if (key) {

			}
			parts[parts.length] = encodeURIComponent(key) + "=" + encodeURIComponent(map[key]);
		}

		let hash = "#_";

		if (parts.length) {
			hash = "#" + parts.join("&");
		}

		if (hash === document.location.hash) {
			return;
		}

		this.revision++;

		document.location.hash = hash;

		if (!parts.length && typeof history !== "undefined") {
			// hide the hash in the url if supported
			history.pushState("", document.title, window.location.pathname + window.location.search);
		}
	}
}
