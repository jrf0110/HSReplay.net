import * as React from "react";
import {LoadingStatus} from "../interfaces";
import {fetchCSRF} from "../helpers";
import DataManager from "../DataManager";
import LoadingSpinner from "./LoadingSpinner";

interface TrainingData {
	id?: number;
	deck: number;
	is_validation_deck: boolean;
}

interface ArchetypeTrainingSettingsState {
	working?: boolean;
	trainingData?: TrainingData;
}

interface ArchetypeTrainingSettingsProps {
	deckData?: any;
	deckId: string;
	playerClass: string;
	status?: LoadingStatus;
	trainingData?: TrainingData;
}

export default class ArchetypeTrainingSettings extends React.Component<ArchetypeTrainingSettingsProps, ArchetypeTrainingSettingsState> {
	constructor(props: ArchetypeTrainingSettingsProps, state: ArchetypeTrainingSettingsState) {
		super(props, state);
		this.state = {
			trainingData: props.trainingData,
			working: false,
		};
	}

	isTrainingDeck() {
		return this.state.trainingData !== undefined;
	}

	isValidationDeck() {
		return this.state.trainingData ? this.state.trainingData.is_validation_deck : false;
	}

	render(): JSX.Element {
		return (
			<div className="training-data">
				<label className={this.state.working ? "disabled" : undefined}>
					<input
						type="checkbox"
						checked={this.isTrainingDeck()}
						disabled={this.state.working}
						onChange={() => this.onIsTrainingDeckChanged(this.state.trainingData === undefined)}
					/>
					&nbsp;Training Deck
				</label>
				<label className={this.state.working ? "disabled" : undefined}>
					<input
						type="checkbox"
						checked={this.isValidationDeck()}
						disabled={this.state.working}
						onChange={() =>
							this.onIsValidationDeckChanged(!this.state.trainingData || !this.state.trainingData.is_validation_deck)
						}
					/>
					&nbsp;Validation Deck
				</label>
				<LoadingSpinner active={this.state.working}/>
			</div>
		);
	}

	onSelectedArchetypeChanged(id: number) {
		if (id === null && this.state.trainingData && this.state.trainingData.id) {
			this.delete(this.state.trainingData.id);
		}
		else {
			this.createOrUpdate({archetype: id});
		}
	}

	onIsTrainingDeckChanged(isTrainingDeck: boolean) {
		if (isTrainingDeck) {
			this.createOrUpdate();
		}
		else if (this.state.trainingData) {
			this.delete(this.state.trainingData.id);
		}
	}

	onIsValidationDeckChanged(isValidationDeck: boolean) {
		this.createOrUpdate({is_validation_deck: isValidationDeck});
	}

	delete(id: number) {
		this.fetch("DELETE", undefined, id);
	}

	createOrUpdate(diff?: any) {
		this.getNumericDeckId().then((deck: number) => {
			const data = {
				deck,
				id: this.state.trainingData && this.state.trainingData.id,
				is_validation_deck: this.isValidationDeck(),
			};
			if (diff) {
				Object.assign(data, diff);
			}
			if (this.state.trainingData) {
				this.fetch("PATCH", data, this.state.trainingData.id);
			}
			else {
				this.fetch("POST", data);
			}
		}).catch((reason) => console.error("Creating/updating training data failed", reason));
	}

	getNumericDeckId(): Promise<number> {
		return new Promise((resolve, reject) => {
			if (this.isTrainingDeck()) {
				resolve(this.state.trainingData.deck);
			}
			return DataManager.get(`/api/v1/decks/${this.props.deckId}/`).then((data) => {
				resolve(data.id);
			}).catch((reason) => {
				console.error("Error fetching numeric deck id", reason);
				reject(reason);
			});
		});
	}

	fetch(method: "PATCH"|"POST"|"DELETE", data?: TrainingData, id?: number) {
		this.setState({working: true});

		const headers = new Headers();
		headers.set("content-type", "application/json");
		let url = "/api/v1/archetype-training/";
		if (id) {
			url += id + "/";
		}

		fetchCSRF(url, {
			body: data && JSON.stringify(data),
			credentials: "include",
			headers,
			method,
		}).then((response) => {
			if (response.ok) {
				response.json().then((trainingData: TrainingData) => {
					this.setState({trainingData});
				}).catch(() => {
					this.setState({trainingData: undefined});
				});
			}
		}).catch((reason) => {
			console.error("Fetch failed", reason);
		}).then(() => this.setState({working: false}));
	}
}
