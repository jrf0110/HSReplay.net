import * as React from "react";
import * as _ from "lodash";
import {capitalize} from "../helpers";

interface FragmentMap {
	[key: string]: any;
}

interface FragmentsProps extends React.ClassAttributes<Fragments> {
	defaults: FragmentMap;
	debounce?: string | string[];
	immutable?: string | string[];
	delay?: number;
	keepDefaults?: boolean;
}

interface FragmentsState {
	childProps: FragmentMap;
	intermediate: FragmentMap;
}

/**
 * This component maps url fragments (such as index.html#a=1&b=2) to it's child's props.
 * A default key pageNumber:1 will result in the props pageNumber:1 and setPageNumber:(newPageNumber).
 */
export default class Fragments extends React.Component<FragmentsProps, FragmentsState> {

	private listener: any | null;
	private timeout: any | null;

	constructor(props: FragmentsProps, context: any) {
		super(props, context);
		this.state = {
			childProps: this.getParts(), // populate with initial url parts
			intermediate: {},
		};
		this.listener = null;
		this.timeout = null;
	}

	render(): any {
		let props = {};

		const values = Object.assign({}, this.props.defaults, this.state.childProps);
		for (let key in values) {
			const suffix = capitalize(key);
			// prepare the callback
			const callback = (value: any) => this.onChange(key, value);
			const callbackKey = "set" + suffix;
			// assign the props
			props[key] = typeof this.state.intermediate[key] !== "undefined" ? this.state.intermediate[key] : values[key];
			props[callbackKey] = callback;
			props["default" + suffix] = this.props.defaults[key];
			props["custom" + suffix] = typeof this.state.childProps[key] !== "undefined" ? this.state.childProps[key] : null;
		}

		props = Object.assign({}, props, {
			canBeReset: Object.keys(this.state.childProps).length > 0,
			reset: () => this.setState({childProps: {}}),
		});

		return React.cloneElement(this.props.children as any, props);
	}

	onChange(key: string, value: any, debounce?: boolean): void {
		if (!this.isValidKey(key)) {
			console.error(`Attempted to change undefined fragment key "${key}"`);
			return;
		}

		if (this.isImmutable(key)) {
			return;
		}

		if (typeof debounce === "undefined") {
			debounce = this.isDebounced(key);
		}

		if (!this.props.keepDefaults && value === this.props.defaults[key]) {
			value = null;
		}

		if (debounce) {
			const intermediate = Object.assign({}, this.state.intermediate, {[key]: value});
			this.setState({intermediate});
			if (this.timeout) {
				clearTimeout(this.timeout);
			}
			this.timeout = setTimeout(() => {
				this.timeout = null;
				for (let key in this.state.intermediate) {
					this.onChange(key, this.state.intermediate[key], false);
				}
			}, this.props.delay || 100);
		}
		else {
			let map = {};
			if (!value) {
				map = Object.assign(map, this.state.childProps);
				delete map[key];
			}
			else {
				map = Object.assign(map, this.state.childProps, {[key]: value});
			}
			this.setState({childProps: map, intermediate: {}});
		}
	}

	isDebounced(key: string): boolean {
		let keys = this.props.debounce;
		if (!Array.isArray(keys)) {
			keys = [keys];
		}
		return keys.indexOf(key) !== -1;
	}

	isImmutable(key: string): boolean {
		let keys = this.props.immutable;
		if (!Array.isArray(keys)) {
			keys = [keys];
		}
		return keys.indexOf(key) !== -1;
	}

	componentDidMount() {
		this.listener = window.addEventListener("hashchange", () => {
			this.setState({childProps: this.getParts()})
		});
	}

	componentWillUnmount() {
		window.removeEventListener("hashchange", this.listener);
		this.listener = null;
	}

	shouldComponentUpdate(nextProps: FragmentsProps, nextState: FragmentsState) {
		return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
	}

	componentDidUpdate(prevProps: FragmentsProps, prevState: FragmentsState) {
		const parts = Object.assign({}, Fragments.parseFragmentString(document.location.hash));

		// find ones that we're added or changed
		for (let key of Object.keys(this.state.childProps)) {
			const value = this.state.childProps[key];
			if (value) {
				parts[key] = value;
			}
			else {
				delete parts[key];
			}
		}

		// find ones that were removed
		for (let key of Object.keys(prevState.childProps)) {
			if (typeof this.state.childProps[key] === "undefined" && typeof parts[key] !== "undefined") {
				delete parts[key];
			}
		}

		const hasData = Object.keys(parts).length > 0;
		const fragments = Fragments.encodeFragmentString(parts);

		if (fragments === document.location.hash) {
			return;
		}

		if (!hasData && !document.location.hash) {
			return;
		}

		document.location.hash = fragments;

		if (!hasData && typeof history !== "undefined") {
			// hide the hash in the url if supported
			history.pushState("", document.title, window.location.pathname + window.location.search);
		}
	}

	isValidKey(key: string): boolean {
		return typeof this.props.defaults[key] !== "undefined";
	}

	getPart(key: string): string {
		if (!this.isValidKey(key)) {
			console.error(`Refusing to return fragment part "${key}"`);
			return;
		}
		const parts = Fragments.parseFragmentString(document.location.hash);
		return parts[key];
	}

	// returns the parts of the fragment that are relevant
	getParts(): FragmentMap {
		const parts = Fragments.parseFragmentString(document.location.hash);
		const map = {};
		for (let key of Object.keys(parts)) {
			if (!this.isValidKey(key)) {
				continue;
			}
			if (this.isImmutable(key)) {
				continue;
			}
			map[key] = parts[key];
		}
		return map;
	}

	static parseFragmentString(fragment: string): FragmentMap {
		const result = {};
		if (fragment.startsWith("#") && fragment.indexOf("=") !== -1) {
			fragment = fragment.substr(1);
			for (let part of fragment.split("&")) {
				const atoms = part.split("=");
				const key = decodeURIComponent(atoms[0]);
				const value = decodeURIComponent(atoms.slice(1).join(""));
				result[key] = value;
			}
		}
		return result;
	}

	static encodeFragmentString(map: FragmentMap): string {
		let fragment = "#_";

		const parts = [];
		for (let key in map) {
			parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(map[key]));
		}

		if (parts.length) {
			fragment = "#" + parts.join("&");
		}

		return fragment;
	}
}
