import * as React from "react";
import {capitalize} from "./helpers";

interface FragmentMap {
	[key: string]: any;
}

interface FragmentProps extends React.ClassAttributes<Fragments> {
	defaults: FragmentMap;
	debounce?: string | string[];
	delay?: number;
}

interface FragmentState {
	map: FragmentMap;
}

/**
 * This component maps url fragments (such as index.html#a=1&b=2) to it's child's props.
 * A default key pageNumber:1 will result in the props pageNumber:1 and setPageNumber:(newPageNumber).
 */
export default class Fragments extends React.Component<FragmentProps, FragmentState> {

	private listener: any | null;
	private revision: number;
	private lastSeen: number;
	private timeout: any | null;

	constructor(props: FragmentProps, context: any) {
		super(props, context);
		this.state = {map: {}};
		this.listener = null;
		this.revision = 0;
		this.lastSeen = 0;
		this.timeout = null;
	}

	render(): any {

		let props = {};

		const values = Object.assign({}, this.props.defaults, this.state.map);
		for (let key in values) {
			const suffix = capitalize(key);
			// prepare the callback
			const callback = (value: any) => this.onChange(key, value);
			const callbackKey = "set" + suffix;
			// assign the props
			props[key] = values[key];
			props[callbackKey] = callback;
			props["default" + suffix] = this.props.defaults[key];
			props["custom" + suffix] = typeof this.state.map[key] !== "undefined" ? this.state.map : null;
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
		if (this.timeout) {
			clearTimeout(this.timeout);
		}

		if (this.props.debounce) {
			let debounce = this.props.debounce;
			if (!Array.isArray(debounce)) {
				debounce = [debounce];
			}
			for (let i in debounce) {
				const key = debounce[i];
				if (prevState.map[key] === this.state.map[key]) {
					continue;
				}
				const delay = typeof this.props.delay === "number" ? this.props.delay : 100;
				this.timeout = setTimeout(() => this.commitFragment(), delay);
				return;
			}
		}

		this.commitFragment();
	}

	commitFragment() {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
		this.setFragment(this.state.map);
	}

	componentDidMount() {
		this.loadHash();
		this.commitFragment();
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
			parts[parts.length] = encodeURIComponent(key) + "=" + encodeURIComponent(map[key]);
		}

		let hash = "#_";

		if (parts.length) {
			hash = "#" + parts.join("&");
		}
		else if (!document.location.hash) {
			// don't write empty placeholder to empty hash
			return;
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
