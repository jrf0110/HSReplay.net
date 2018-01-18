import * as React from "react";
import { withLoading } from "./loading/Loading";
import StreamThumbnail from "./StreamThumbnail";

interface Stream {
	twitch: {
		_id: number;
		name: string,
		display_name: string
	};
}

interface TwitchStream {
	language: string;
	thumbnail_url: string;
	title: string;
	user_id: string;
	viewer_count: number;
}

interface Props extends React.ClassAttributes<StreamList> {
	streams?: Stream[];
}

interface State {
	metadata: TwitchStream[] | null;
}

class StreamList extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			metadata: null,
		};
	}

	componentDidMount() {
		this.fetchMetadata();
	}

	async fetchMetadata() {
		const params = this.props.streams.map((stream) => `user_login=${stream.twitch.name}`);
		const response = await fetch(`https://api.twitch.tv/helix/streams?${params.join("&")}`, {
			headers: {
				"Client-ID": "k0lqdqxso1o3knvydfheacq3jbqidg",
			}
		});
		const json = await response.json();
		this.setState({metadata: json.data});
	}

	render() {
		if (
			!this.props.streams ||
			!Array.isArray(this.props.streams)
		) {
			return null;
		}

		if (this.state.metadata === null) {
			return <h3 className="message-wrapper">Loading...</h3>;
		}

		return (
			<ul className="stream-list">
				{this.state.metadata.map((twitchStream: TwitchStream) => {
					const stream = this.props.streams.find((toCompare: Stream) => "" + toCompare.twitch._id === twitchStream.user_id);
					const url = `https://www.twitch.tv/${stream.twitch.name}`;
					return (
						<li>
							<StreamThumbnail
								displayName={stream.twitch.display_name}
								url={url}
								thumbnailUrl={twitchStream.thumbnail_url}
								thumbnailWidth={400}
								thumbnailHeight={225}
								title={twitchStream.title}
								viewerCount={twitchStream.viewer_count}
							/>
						</li>
					);
				})}
			</ul>
		)
	}
}

export default withLoading(["streams"])(StreamList);
