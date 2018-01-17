import * as React from "react";
import { commaSeparate } from "../helpers";

interface Props extends React.ClassAttributes<StreamThumbnail> {
	url?: string;
	displayName?: string;
	thumbnailUrl?: string;
	thumbnailWidth: number;
	thumbnailHeight: number;
	target?: string;
	title?: string;
	viewerCount?: number | string;
}

export default class StreamThumbnail extends React.Component<Props> {
	static defaultProps = {
		target: "_blank",
	};

	render() {
		const thumbnail_url = this.props.thumbnailUrl
			.replace("{width}", "" + this.props.thumbnailWidth)
			.replace("{height}", "" + this.props.thumbnailHeight);

		return (
			<a className="stream-thumbnail" href={this.props.url} target={this.props.target}>
				<figure>
					<img
						src={thumbnail_url}
						alt={this.props.displayName}
						height={this.props.thumbnailHeight}
						width={this.props.thumbnailWidth}
					/>
					<figcaption>
						<strong title={this.props.title}>{this.props.title}</strong>
						<span>{commaSeparate(this.props.viewerCount)} {this.props.viewerCount === 1 ? "viewer" : "viewers"}</span>
						{this.props.displayName}
					</figcaption>
				</figure>
			</a>
		);
	}
}
