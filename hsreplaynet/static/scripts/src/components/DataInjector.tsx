import * as React from "react";
import { cloneComponent } from "../helpers";
import { LoadingStatus } from "../interfaces";
import DataManager from "../DataManager";

interface Data {
	[key: string]: any;
}

interface Extractor {
	[prop: string]: (prop: any, props?: any) => any;
}

interface DataInjectorState {
	data: Data[];
	retryCount: number[];
	status: number[];
}

export interface Query {
	key?: string;
	url: string;
	params: any;
}

interface DataInjectorProps {
	query: Query | Query[];
	fetchCondition?: boolean;
	modify?: (data: any) => any;
	extract?: Extractor;
	onUpdated?: () => void;
}

const DEFAULT_DATA_KEY = "data";
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 15000;
const STATUS_LOADING = 0;
const STATUS_TIMEOUT = 1;
const STATUS_SUCCESS = 200;
const STATUS_PROCESSING = 202;
const STATUS_NO_DATA = 204;

export default class DataInjector extends React.Component<DataInjectorProps, DataInjectorState> {
	constructor(props: DataInjectorProps, state: DataInjectorState) {
		super(props, state);
		this.state = {
			data: [],
			retryCount: this.getQueryArray(props).map((query) => 0),
			status: this.getQueryArray(props).map((query) => STATUS_LOADING),
		};
	}

	getQueryArray(props: DataInjectorProps): Query[] {
		if (!Array.isArray(props.query)) {
			return [props.query];
		}
		return props.query;
	}

	componentDidMount() {
		this.getQueryArray(this.props).forEach((query, index) => {
			this.fetch(this.props, index);
		});
	}

	componentDidUpdate() {
		if (this.props.onUpdated) {
			this.props.onUpdated();
		}
	}

	paramsChanged(current: Query, next: Query) {
		const nextKeys = Object.keys(next.params);
		const currentKeys = Object.keys(current.params);
		if (nextKeys.length !== currentKeys.length) {
			return true;
		}
		return nextKeys.some((key) => currentKeys.indexOf(key) === -1
			|| next.params[key] !== current.params[key]);
	}

	queryEquals(q1: Query, q2: Query): boolean {
		return q1.url === q2.url && q1.key === q2.key && !this.paramsChanged(q1, q2);
	}

	componentWillReceiveProps(nextProps: DataInjectorProps) {
		const newStatus = Object.assign([], this.state.status);
		const queue = [];
		const allCurrent = this.getQueryArray(this.props);
		this.getQueryArray(nextProps).forEach((query, index) => {
			const current = allCurrent[index];
			if (!this.queryEquals(query, current) || nextProps.fetchCondition !== this.props.fetchCondition) {
				newStatus[index] = STATUS_LOADING;
				queue.push(index);
			}
		});
		this.setState({status: newStatus});
		queue.forEach((index) => this.fetch(nextProps, index));
	}

	fetch(props: DataInjectorProps, index: number) {
		if (props.fetchCondition === false) {
			return;
		}
		const query = this.getQueryArray(props)[index];
		DataManager.get(query.url, query.params || {})
			.then((json) => {
				const queries = this.getQueryArray(this.props);
				if (queries.some((q) => this.queryEquals(q, query))) {
					const newData = Object.assign([], this.state.data);
					const newStatus = Object.assign([], this.state.status);
					newData[query.key || DEFAULT_DATA_KEY] = props.modify ? props.modify(json) : json;
					newStatus[index] = STATUS_SUCCESS;
					this.setState({data: newData, status: newStatus});
				}
			}, (status) => {
				if (status === STATUS_PROCESSING) {
					if (this.state.retryCount[index] < MAX_RETRY_COUNT) {
						window.setTimeout(() => this.fetch(props, index), RETRY_DELAY);
						const newStatus = Object.assign([], this.state.status);
						const newRetryCount = Object.assign([], this.state.retryCount);
						newStatus[index] = STATUS_PROCESSING;
						newRetryCount[index] = newRetryCount[index] + 1;
						this.setState({status: newStatus, retryCount: newRetryCount});
					}
					else {
						const newStatus = Object.assign([], this.state.status);
						newStatus[index] = STATUS_TIMEOUT;
						this.setState({status: newStatus});
					}
				}
				else {
					const newStatus = Object.assign([], this.state.status);
					newStatus[index] = status;
					this.setState({status: newStatus});
				}
			}) ;
	}

	render(): JSX.Element {
		const getStatus = (status: number[]): LoadingStatus => {
			if (status.every((s) => s === STATUS_SUCCESS)) {
				return LoadingStatus.SUCCESS;
			}
			if (status.some((s) => [STATUS_SUCCESS, STATUS_LOADING, STATUS_PROCESSING, STATUS_NO_DATA].indexOf(s) === -1)) {
				return LoadingStatus.ERROR;
			}
			if (status.some((s) => s === STATUS_NO_DATA)) {
				return LoadingStatus.NO_DATA;
			}
			if (status.some((s) => s === STATUS_PROCESSING)) {
				return LoadingStatus.PROCESSING;
			}
			return LoadingStatus.LOADING;
		};

		const childProps = {status: getStatus(this.state.status)};
		this.getQueryArray(this.props).forEach((query) => {
			const key = query.key || DEFAULT_DATA_KEY;
			childProps[key] = this.state.data[key];
		});

		if (this.props.extract) {
			Object.keys(this.props.extract).forEach((prop) => {
				if (childProps[prop]) {
					const newProps = this.props.extract[prop](childProps[prop], childProps);
					delete childProps[prop];
					Object.assign(childProps, newProps);
				}
			});
		}

		return cloneComponent(this.props.children, childProps);
	}
}
