import * as React from "react";
import * as _ from "lodash";
import * as d3 from "d3";
import {DeckData} from "../discover/ClassAnalysis";

interface ClusterChartState {
	initialized?: boolean;
	scaling?: number;
	selectedDatum?: DeckData;
}

interface ClusterChartProps extends React.ClassAttributes<ClusterChart> {
	clusterIds: string[];
	colors: string[];
	data: DeckData[];
	height: number;
	maxGames: number;
	onPointClicked: (data) => void;
	playerClass: string;
	width: number;
}

const PADDING = 20;
const MIN_POINT_SIZE = 5;
const MAX_POINT_SIZE = 45;
const STROKE_WIDTH = 1.5;
const STROKE_WIDTH_SELECTED = 2.5;

export default class ClusterChart extends React.Component<ClusterChartProps, ClusterChartState> {
	private container: SVGGElement;
	private svg: SVGSVGElement;

	constructor(props: ClusterChartProps, state: ClusterChartState) {
		super(props, state);
		this.state = {
			initialized: false,
			scaling: 1,
			selectedDatum: null,
		};
	}

	componentWillReceiveProps(nextProps: ClusterChartProps) {
		if (nextProps.playerClass !== this.props.playerClass) {
			this.setState({scaling: 1, selectedDatum: null});
		}
	}

	componentDidUpdate(prevProps: ClusterChartProps, prevState: ClusterChartState) {
		if (prevProps.playerClass !== this.props.playerClass) {
			this.initialize();
		}
		if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
			if (!this.state.initialized) {
				this.initialize();
				this.setState({initialized: true});
			}
			this.updatePosition(d3.select(this.container).selectAll("circle").transition().duration(300));
			this.updateZoom();
		}
		if (prevState.scaling !== this.state.scaling) {
			this.updateInteraction();
		}
	}

	initialize() {
		this.reset();
		this.updatePosition(d3.select(this.container).selectAll("circle").transition().duration(300));
		this.updateZoom();
		this.updateInteraction();
	}

	reset() {
		const container = d3.select(this.container);

		d3.select(this.svg).call(d3.zoom().transform, d3.zoomIdentity);
		container.attr("transform", null);

		const decks = container.selectAll(".deck-circle").data(this.props.data);
		decks.exit().remove();
		decks.enter()
			.append("circle")
			.attr("class", "deck-circle")
			.attr("cursor", "pointer")
			.attr("stroke", "black")
			.attr("cx", this.props.width / 2)
			.attr("cy", this.props.height / 2);

		const {colors, clusterIds} = this.props;
		container.selectAll(".deck-circle")
			.attr("r", this.pointSize)
			.attr("fill", (p: any) => colors[clusterIds.indexOf("" + p.metadata.cluster_id)] || "gray")
			.attr("stroke-width", this.state.scaling);

		container.select("#highlight").remove();
		container.append("circle")
			.attr("id", "highlight")
			.attr("r", 0)
			.attr("stroke", "black")
			.attr("fill", "rgba(49,138,185,.2)")
			.attr("pointer-events", "none")
			.attr("stroke-width", STROKE_WIDTH);
	}

	updateInteraction() {
		const container = d3.select(this.container);
		const highlightRadius = (d) => (this.pointSize(d) + 5) * this.state.scaling;

		const onMouseOver = (datum: any) => {
			const highlight = container.select("#highlight")
				.datum(datum)
				.transition().duration(100)
				.attr("r", highlightRadius)
				.attr("stroke-width", this.state.scaling);
			this.updatePosition(highlight)
				.on("end", () => this.props.onPointClicked(datum.metadata));
		};

		const onMouseLeave = (datum: any) => {
			const {selectedDatum} = this.state;
			if (!selectedDatum) {
				return;
			}
			const highlight = container.select("#highlight")
				.datum(selectedDatum)
				.transition().delay(400).duration(100)
				.attr("r", highlightRadius)
				.attr("stroke-width", STROKE_WIDTH_SELECTED * this.state.scaling);
			this.updatePosition(highlight)
				.on("end", () => this.props.onPointClicked(selectedDatum.metadata));
		};

		const onClick = (datum: any) => {
			const {selectedDatum} = this.state;
			const newDatum = selectedDatum && selectedDatum.metadata.shortid === datum.metadata.shortid ? null : datum;
			container.select("#highlight")
				.attr("stroke-width", (newDatum === null ? STROKE_WIDTH : STROKE_WIDTH_SELECTED) * this.state.scaling);
			this.setState({selectedDatum: newDatum});
		};

		container.selectAll(".deck-circle")
			.on("mouseover", onMouseOver)
			.on("mouseleave", onMouseLeave)
			.on("click", onClick)
			.on("touchstart", onClick);
	}

	updateZoom() {
		const container = d3.select(this.container);
		const zoom = d3.zoom()
			.scaleExtent([1, 40])
			.translateExtent([[0, 0], [this.props.width, this.props.height]])
			.on("zoom", () => {
				container.attr("transform", d3.event.transform);
				const scaling = 1 / d3.event.transform.k;
				container.selectAll(".deck-circle")
					.attr("r", (d) => this.pointSize(d) * scaling)
					.attr("stroke-width", scaling);
				container.select("#highlight")
					.attr("r", (d) => d ? (this.pointSize(d) + 5) * scaling : 0)
					.attr("stroke-width",  STROKE_WIDTH * scaling);
				this.setState({scaling});
			});
		d3.select(this.svg).call(zoom);
	}

	updatePosition(selection: any): any {
		const {height, width} = this.props;
		const xValues = this.props.data.map((d) => d.x);
		const yValues = this.props.data.map((d) => d.y);
		const xDomain = [d3.min(xValues), d3.max(xValues)];
		const yDomain = [d3.min(yValues), d3.max(yValues)];
		const x = d3.scaleLinear().domain(xDomain).range([PADDING, width - PADDING]);
		const y = d3.scaleLinear().domain(yDomain).range([height - PADDING, PADDING]);
		return selection
			.attr("cx", (p: any) => p ? x(p.x) : width / 2)
			.attr("cy", (p: any) => p ? y(p.y) : height / 2);
	}

	pointSize = (p) => {
		const value = p.metadata.games / this.props.maxGames;
		return ((1 - Math.exp(-value)) * (MAX_POINT_SIZE - MIN_POINT_SIZE) + MIN_POINT_SIZE);
	}

	shouldComponentUpdate(nextProps: ClusterChartProps, nextState: ClusterChartState) {
		return (
			nextProps.playerClass !== this.props.playerClass
			|| nextProps.width !== this.props.width
			|| nextProps.height !== this.props.height
			|| nextState.scaling !== this.state.scaling
		);
	}

	render(): JSX.Element {
		return (
			<svg
				width={this.props.width}
				height={this.props.height}
				className="cluster-chart-wrapper"
				ref={(svg) => this.svg = svg}
			>
				<g ref={(container) => this.container = container}/>
			</svg>
		);
	}
}
