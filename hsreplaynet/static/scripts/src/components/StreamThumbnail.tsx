import React from "react";
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
		target: "_blank"
	};

	render() {
		let thumbnail = null;
		if (this.props.thumbnailUrl) {
			const thumbnail_url = this.props.thumbnailUrl
				.replace("{width}", "" + this.props.thumbnailWidth)
				.replace("{height}", "" + this.props.thumbnailHeight);
			thumbnail = (
				<img
					src={thumbnail_url}
					alt={this.props.displayName}
					height={this.props.thumbnailHeight}
					width={this.props.thumbnailWidth}
				/>
			);
		} else {
			thumbnail = (
				<div
					className={"stream-thumbnail-default-image"}
					style={{
						paddingBottom: `${100 /
							(this.props.thumbnailWidth /
								this.props.thumbnailHeight)}%`
					}}
				>
					<div>
						<span className="glyphicon glyphicon-plus" />
					</div>
				</div>
			);
		}

		let viewers = null;
		if (this.props.viewerCount !== undefined) {
			viewers = (
				<span>
					{commaSeparate(this.props.viewerCount)}{" "}
					{this.props.viewerCount === 1 ? "viewer" : "viewers"}
				</span>
			);
		}

		return (
			<a
				className="stream-thumbnail"
				href={this.props.url}
				target={this.props.target}
			>
				<figure>
					{thumbnail}
					<figcaption>
						<strong title={this.props.title}>
							{this.props.title}
						</strong>
						{viewers}
						{this.props.displayName}
					</figcaption>
				</figure>
			</a>
		);
	}
}
