import React from "react";
import { withLoading } from "./loading/Loading";
import StreamThumbnail from "./StreamThumbnail";
import UserData from "../UserData";

export interface Stream {
	deck: number[];
	hero: number;
	format: number;
	twitch: {
		_id: number;
		name: string;
		display_name: string;
	};
}

export interface TwitchStream {
	language: string;
	thumbnail_url: string;
	title: string;
	user_id: string;
	viewer_count: number;
}

interface Props extends React.ClassAttributes<StreamList> {
	streams?: Stream[];
	verifyExtension?: boolean;
}

interface State {
	metadata: TwitchStream[] | null;
}

class StreamList extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			metadata: null
		};
	}

	componentDidMount() {
		Promise.all([
			StreamList.fetchMetadata(this.props.streams),
			this.props.verifyExtension
				? StreamList.fetchEnabled()
				: Promise.resolve(null)
		]).then(([streamsForDeck, streamsWithExtension]): void => {
			let eligibleStreams;
			if (streamsWithExtension !== null) {
				eligibleStreams = streamsForDeck.filter(
					streamForDeck =>
						!!streamsWithExtension.find(
							(streamWithExtension): boolean =>
								streamWithExtension.id === streamForDeck.user_id
						)
				);
			} else {
				eligibleStreams = streamsForDeck;
			}
			this.setState({ metadata: eligibleStreams });
		});
	}

	static async fetchMetadata(streams: Stream[]): Promise<TwitchStream[]> {
		const user_params = streams.map(
			stream => `user_login=${stream.twitch.name}`
		);
		let resultSet = [];
		let cursor = null;
		do {
			const params = user_params.slice();
			if (cursor !== null) {
				params.push(`after=${cursor}`);
			}
			const response = await fetch(
				`https://api.twitch.tv/helix/streams?${params.join("&")}`,
				{
					headers: {
						"Client-ID": "k0lqdqxso1o3knvydfheacq3jbqidg"
					}
				}
			);
			const { pagination, data } = await response.json();
			cursor = pagination ? pagination.cursor : null;
			if (data) {
				resultSet = resultSet.concat(data);
			}
		} while (cursor);
		return resultSet;
	}

	static async fetchEnabled(): Promise<{ id: string }[]> {
		let resultSet = [];
		let cursor = null;
		do {
			let url = `https://api.twitch.tv/extensions/${"apwln3g3ia45kk690tzabfp525h9e1"}/live_activated_channels`;
			if (cursor) {
				url += `?cursor=${cursor}`;
			}
			const response = await fetch(url, {
				headers: {
					"Client-ID": "k0lqdqxso1o3knvydfheacq3jbqidg"
				}
			});
			const json = await response.json();
			resultSet = resultSet.concat(json.channels);
			cursor = json.cursor;
		} while (cursor);
		return resultSet;
	}

	render() {
		if (!this.props.streams || !Array.isArray(this.props.streams)) {
			return null;
		}

		if (this.state.metadata === null) {
			return <h3 className="message-wrapper">Loading...</h3>;
		}

		return (
			<ul className="stream-list">
				{this.state.metadata.map((twitchStream: TwitchStream) => {
					const stream = this.props.streams.find(
						(toCompare: Stream) =>
							"" + toCompare.twitch._id === twitchStream.user_id
					);
					const url = `https://www.twitch.tv/${stream.twitch.name}`;
					return (
						<li key={twitchStream.user_id}>
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
				<li>
					<StreamThumbnail
						title="Add your own stream to HSReplay.net…"
						displayName="Using our Twitch Extension for Hearthstone Deck Tracker."
						url={"https://hsdecktracker.net/twitch/setup/"}
						thumbnailWidth={400}
						thumbnailHeight={225}
					/>
				</li>
			</ul>
		);
	}
}

export default withLoading(["streams"])(StreamList);
