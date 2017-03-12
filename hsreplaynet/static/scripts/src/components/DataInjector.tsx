import * as React from "react";
import CardData from "../CardData";
import DataManager from "../DataManager";
import { cloneComponent } from "../helpers";
import { LoadingStatus } from "../interfaces";

interface DataInjectorState {
	data: any;
	retryCount: number;
	status: number;
}

interface DataInjectorProps extends React.ClassAttributes<DataInjector> {
	data?: any;
	url: string;
	dataManager: DataManager;
	fetchCondition?: boolean;
	modify?: (data: any) => any;
	params?: {};
}

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 15000;
const STATUS_LOADING = 0;
const STATUS_TIMEOUT = 1;
const STATUS_SUCCESS = 200;
const STATUS_PROCESSING = 202;

export default class DataInjector extends React.Component<DataInjectorProps, DataInjectorState> {
	constructor(props: DataInjectorProps, state: DataInjectorState) {
		super(props, state);
		this.state = {
			data: null,
			retryCount: 0,
			status: STATUS_LOADING,
		};
	}

	componentDidMount() {
		this.fetch(this.props);
	}

	componentWillReceiveProps(nextProps: DataInjectorProps) {
		if (nextProps.url !== this.props.url
			|| nextProps.fetchCondition !== this.props.fetchCondition
			|| Object.keys(this.props.params || {}).some((key) => nextProps.params[key] !== this.props.params[key])) {
			this.setState({status: STATUS_LOADING});
			this.fetch(nextProps);
		}
	}

	fetch(props: DataInjectorProps) {
		if (props.fetchCondition === false) {
			return;
		}
		this.props.dataManager.get(props.url, props.params || {})
			.then((json) => {
				const data = props.modify ? props.modify(json) : json;
				this.setState({data, status: STATUS_SUCCESS});
			}, (status) => {
				if (status === STATUS_PROCESSING) {
					if (this.state.retryCount < MAX_RETRY_COUNT) {
						window.setTimeout(() => this.fetch(props), 15000);
						this.setState({status, retryCount: this.state.retryCount + 1});
					}
					else {
						this.setState({status: STATUS_TIMEOUT});
					}
				}
				else {
					this.setState({status});
				}
			});
	}

	render(): JSX.Element {
		const getStatus = (status: number): LoadingStatus => {
			switch (status) {
				case STATUS_LOADING:
					return "loading";
				case STATUS_SUCCESS:
					return "success";
				case STATUS_PROCESSING:
					return "processing";
				default:
					return "error";
			}
		};

		const childProps = {data: this.state.data, status: getStatus(this.state.status)};
		if (this.props.data) {
			childProps["data1"] = this.props.data;
		}

		return cloneComponent(this.props.children, childProps);
	}
}
