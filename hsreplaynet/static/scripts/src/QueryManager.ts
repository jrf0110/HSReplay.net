interface Query {
	url: string;
	callback: (success: boolean, json: any) => void;
}

export default class QueryManager {
	private queue: Query[] = [];
	private duplicates: Query[] = [];
	private running: Query[]  = [];
	private throttle = false;
	private readonly poll: boolean;

	constructor(poll: boolean = false) {
		this.poll = poll;
	}

	public fetch(url: string, callback: (success: boolean, json: any) => void) {
		if (this.queue.every(q => q.url !== url) && this.running.every(q => q.url !== url)) {
			this.queue.push({url: url, callback: callback});
			this.tryFetchNext();
		}
		else {
			this.duplicates.push({url: url, callback: callback});
		}
	}

	private tryFetchNext() {
		if (this.queue.length && (!this.throttle || !this.running.length)) {
			const next = this.queue.pop();
			this.fetchInternal(next);
		}
	}

	private fetchInternal(query: Query) {
		this.running.push(query);
		fetch("https://dev.hsreplay.net" + query.url, {credentials: "include"}).then((response) => {
			if (this.poll && response.status === 202) {
				this.throttle = true;
				this.running.splice(this.running.indexOf(query), 1);
				this.queue.unshift(query);
				window.setTimeout(
					() => this.tryFetchNext(),
					15000
				);
				return undefined;
			}
			return response.json();
		}).then((json) => {
			if (json !== undefined) {
				query.callback(true, json);
			}
			return json;
		}).catch((reason) => {
			query.callback(false, null);
			return null;
		}).then((json) => {
			if (json !== undefined) {
				this.running.splice(this.running.indexOf(query), 1);
				this.duplicates.slice().forEach(dup => {
					if (dup.url == query.url) {
						this.duplicates.splice(this.duplicates.indexOf(dup), 1);
						dup.callback(json !== null, json);
					}
				});
				this.tryFetchNext();
			}
		});
	}
}
