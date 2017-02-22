export interface QueryMap {
	[prop: string]: string;
}

export function parseQuery(query: string): QueryMap {
	if (!query) {
		return {};
	}
	const map = {} as QueryMap;
	query.split("&").forEach(v => {
		const kvp = v.split("=");
		if(kvp.length === 2 && kvp[0] && kvp[1]) {
			map[decodeURIComponent(kvp[0])] = decodeURIComponent(kvp[1]);
		}
	});
	return map;
}

export function toQueryString(map: QueryMap): string {
	const keys = Object.keys(map);
	if (!keys.length) {
		return "";
	}
	const terms = [];
	keys.forEach(key => {
		if (key && map[key]) {
			terms.push(encodeURIComponent(key) + "=" + encodeURIComponent(map[key]))
		}
	})
	return terms.join("&");
}
