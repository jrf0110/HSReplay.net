import * as React from "react";
import * as _ from "lodash";
import * as d3 from "d3";
import {ClusterMetaData, DeckData} from "../discover/ClassAnalysis";
import {hexToHsl, stringifyHsl} from "../../helpers";

interface ClusterChartState {
	dragging?: boolean;
	initialized?: boolean;
	scaling?: number;
	selectedDatum?: DeckData;
}

interface ClusterChartProps extends React.ClassAttributes<ClusterChart> {
	clusterIds: string[];
	colors: string[];
	data: DeckData[];
	height: number;
	highlightCards: string[];
	maxGames: number;
	onPointClicked: (data) => void;
	playerClass: string;
	width: number;
}

const PADDING = 50;
const MIN_POINT_SIZE = 5;
const MAX_POINT_SIZE = 45;
const STROKE_WIDTH = 1.5;
const STROKE_WIDTH_SELECTED = 2.5;

export default class ClusterChart extends React.Component<ClusterChartProps, ClusterChartState> {
	private container: SVGGElement;
	private decks: SVGGElement;
	private voronoi: SVGGElement;
	private svg: SVGSVGElement;

	constructor(props: ClusterChartProps, state: ClusterChartState) {
		super(props, state);
		this.state = {
			dragging: false,
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
			this.updatePosition(d3.select(this.decks).selectAll("circle").transition().duration(500));
			this.updateZoom();
			this.updateVoronoi();
		}
		if (!_.isEqual(prevProps.highlightCards, this.props.highlightCards)) {
			this.updateHighlightedCards();
		}
	}

	getData(): DeckData[] {
		// Duplicate coordinates in the dataset will cause the voronoi generation to error.
		return _.uniqBy(this.props.data, (d) => "" + d.x + d.y);
	}

	initialize() {
		this.renderChart();
		this.updatePosition(d3.select(this.decks).selectAll("circle").transition().duration(500));
		this.updateZoom();
		this.updateHighlightedCards();
	}

	renderChart() {
		const container = d3.select(this.decks);

		d3.select(this.svg).call(d3.zoom().transform, d3.zoomIdentity);
		d3.select(this.container).attr("transform", null);

		const decks = container.selectAll(".deck-circle").data(this.getData(), (d: any) => d.metadata.shortid);
		decks.exit().remove();
		decks.enter()
			.append("circle")
			.attr("class", "deck-circle")
			.attr("cx", this.props.width / 2)
			.attr("cy", this.props.height / 2)
			.attr("r", this.pointSize)
			.attr("fill", (d: any) => this.fillColor(d))
			.attr("stroke", (d: any) => this.strokeColor(d))
			.attr("stroke-width", this.state.scaling);

		container.select("#highlight").remove();
		container.append("circle")
			.attr("id", "highlight")
			.attr("r", 0)
			.attr("stroke-width", STROKE_WIDTH);

		this.updateVoronoi();
	}

	updateVoronoi() {
		const scale = this.scale();
		const voronoi = d3.voronoi()
			.extent([[-1, -1], [this.props.width + 1, this.props.height + 1]]);

		const getKey = (coordiantes: [number, number]) => {
			return "" + coordiantes[0] + coordiantes[1];
		};

		const dataLookup = {};
		this.getData().forEach((datum) => {
			dataLookup[getKey([scale.x(datum.x), scale.y(datum.y)])] = datum;
		});

		const findDatum = (coordinates: [number, number]) => {
			return dataLookup[getKey(coordinates)];
		};

		const onHover = (d: any) => {
			if (this.state.dragging) {
				return;
			}
			const datum = dataLookup[getKey(d.data)];
			const highlightRadius = (d1) => (this.pointSize(d1) + 5) * this.state.scaling;
			const highlight = d3.select("#highlight")
				.datum(datum)
				.transition().duration(100)
				.attr("r", highlightRadius)
				.attr("stroke-width", this.state.scaling);
			this.updatePosition(highlight)
				.on("end", () => this.props.onPointClicked(datum.metadata));
		};

		const onExit = (d: any) => {
			if (this.state.dragging) {
				return;
			}
			const datum = this.state.selectedDatum;
			const highlightRadius = (d1) => datum ? ((this.pointSize(d1) + 5) * this.state.scaling) : 0;
			const highlight = d3.select("#highlight")
				.datum(datum)
				.transition().delay(400).duration(100)
				.attr("r", highlightRadius)
				.attr("stroke-width", STROKE_WIDTH_SELECTED * this.state.scaling);
			if (this.state.selectedDatum) {
				this.updatePosition(highlight);
			}
			highlight.on("end", () => this.props.onPointClicked(datum ? datum.metadata : null));
		};

		const onClick = (d: any) => {
			const datum = dataLookup[getKey(d.data)];
			const {selectedDatum} = this.state;
			const newDatum = selectedDatum && selectedDatum.metadata.shortid === datum.metadata.shortid ? null : datum;
			d3.select("#highlight")
				.attr("stroke-width", (newDatum === null ? STROKE_WIDTH : STROKE_WIDTH_SELECTED) * this.state.scaling);
			this.setState({selectedDatum: newDatum});
		};

		const polygons = voronoi.polygons(this.getData().map((d: any) => {
			return [scale.x(d.x), scale.y(d.y)] as [number, number];
		}));
		const hoverGroups = d3.select(this.voronoi).selectAll("g")
			.data(polygons, (d: any) => getKey(d));

		hoverGroups.exit().remove();

		const newGroups = hoverGroups.enter().append("g");

		newGroups.append("path")
			.data(polygons, (d: any) => getKey(d))
				.attr("fill", "none")
				.attr("id", (d: any, i: number) => "cell-" + i)
				.attr("d", (d: any) => (d ? "M" + d.join("L") + "Z" : null));

		newGroups.append("clipPath")
			.attr("id", (d: any, i: number) => "clip-" + i)
			.append("use")
				.attr("xlink:href", (d: any, i: number) => "#cell-" + i);

		newGroups.append("circle")
			.attr("class", "group-circle")
			.attr("r", Math.min(this.props.height, this.props.width) * 0.035)
			.attr("cx", (d: any) => d.data[0])
			.attr("cy", (d: any) => d.data[1])
			.attr("fill", (d: any) => this.fillColor(findDatum(d.data)))
			.attr("stroke-width", this.state.scaling)
			.attr("opacity", 0)
			.on("mouseover", onHover)
			.on("mouseleave", onExit)
			.on("click", onClick)
			.transition().delay(400)
			.attr("stroke", (d: any) => this.strokeColor(findDatum(d.data)))
			.attr("opacity", 0.8)
			.attr("fill-opacity", 0.1)
			.attr("clip-path", (d: any, i: number) => `url(#clip-${i})`);
	}

	updateHighlightedCards() {
		d3.select(this.container).selectAll(".deck-circle")
			.attr("opacity", (d: any) => this.containsHighlightCard(d.metadata) ? 1 : 0.1);
	}

	fillColor(d: any) {
		return this.props.colors[this.props.clusterIds.indexOf("" + d.metadata.cluster_id || "gray")];
	}

	strokeColor(d: any) {
		const fill = this.fillColor(d);
		const hsl = hexToHsl(fill);
		return stringifyHsl(hsl[0], hsl[1], hsl[2] * 0.5);
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
				const minDimension = Math.min(this.props.height, this.props.width) / Math.sqrt(d3.event.transform.k);
				container.selectAll(".group-circle")
					.attr("stroke-width", scaling)
					.attr("r", minDimension * 0.035);
				this.setState({scaling});
			})
			.on("start", () => this.setState({dragging: true}))
			.on("end", () => this.setState({dragging: false}));
		d3.select(this.svg).call(zoom);
	}

	updatePosition(selection: any): any {
		const scale = this.scale();
		return selection
			.attr("cx", (p: any) => p ? scale.x(p.x) : this.props.width / 2)
			.attr("cy", (p: any) => p ? scale.y(p.y) : this.props.height / 2);
	}

	scale(): {x: d3.ScaleLinear<number, number>, y: d3.ScaleLinear<number, number>} {
		return {
			x: this.scaleDimension("x"),
			y: this.scaleDimension("y"),
		};
	}

	scaleDimension(dimension: "x" | "y"): d3.ScaleLinear<number, number> {
		const domain = d3.extent(this.getData().map((d) => d[dimension]));
		const range = dimension === "x" ? [PADDING, this.props.width - PADDING] : [this.props.height - PADDING, PADDING];
		return d3.scaleLinear().domain(domain).range(range);
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
			|| !_.isEqual(nextProps.highlightCards, this.props.highlightCards)
			|| nextState.scaling !== this.state.scaling
		);
	}

	containsHighlightCard(metadata: ClusterMetaData): boolean {
		const {highlightCards} = this.props;
		if (!highlightCards.length || !metadata || !metadata.deck_list) {
			return true;
		}
		let cardList = [];
		JSON.parse(metadata.deck_list).forEach((c: any[]) => {
			for (let i = 0; i < c[1]; i++) {
				cardList.push("" + c[0]);
			}
		});
		return highlightCards.every((dbfId) => {
			const index = cardList.indexOf("" + dbfId);
			if (index === -1) {
				return false;
			}
			cardList = cardList.splice(index, 1);
			return true;
		});
	}

	render(): JSX.Element {
		return (
			<svg
				width={this.props.width}
				height={this.props.height}
				className="cluster-chart-wrapper"
				ref={(svg) => this.svg = svg}
			>
				<g ref={(ref) => this.container = ref}>
					<g ref={(ref) => this.decks = ref}/>
					<g ref={(ref) => this.voronoi = ref}/>
				</g>
			</svg>
		);
	}
}
