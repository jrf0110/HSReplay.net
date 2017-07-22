// various global module definitions
// this file should be picked up automatically by the typescript compiler

declare var STATIC_URL: string;
declare var HEARTHSTONE_ART_URL: string;
declare var JOUST_STATIC_URL: string;
declare var SUNWELL_URL: string;
declare var JOUST_RAVEN_DSN_PUBLIC: string;
declare var JOUST_RAVEN_ENVIRONMENT: string;
declare var HEARTHSTONEJSON_URL: string;
declare var INFLUX_DATABASE_JOUST: string;

declare module "blob" {
	export default Blob;
}

declare module "clipboard" {
	export default class Clipboard {
		constructor(selector: any, options?: any);

		destroy(): void;

		on(event: string, func: any): any;
	}
}

declare module "joust" {
	export class Launcher {
		width(width: number): Launcher;

		height(height: number): Launcher;

		assets(assets: string|((asset: string) => string)): Launcher;

		cardArt(url: string|((cardId: string) => string)): Launcher;

		metadataSource(metadateSource: (build: number|"latest", locale: string) => string): Launcher;

		setOptions(opts: any): Launcher;

		onTurn(callback: (turn: number) => void): Launcher;

		onToggleReveal(callback: (reveal: boolean) => void): Launcher;

		onToggleSwap(callback: (swap: boolean) => void): Launcher;

		onFullscreen(callback: (fullscreen: boolean) => void): Launcher;

		startPaused(paused?: boolean): Launcher;

		startAtTurn(turn: number): Launcher;

		startRevealed(reveal: boolean): Launcher;

		startSwapped(swap: boolean): Launcher;

		fullscreen(fullscreen: boolean): Launcher;

		logger(logger: (message: string | Error) => void): Launcher;

		events(cb: (event: string, values: Object, tags?: Object) => void): Launcher;

		debug(enable?: boolean): Launcher;

		locale(locale?: string): Launcher;

		readonly build: number|null;

		readonly selectedLocale: string|null;

		play(): void;

		pause(): void;

		toggle(): void;

		rewind(): void;

		playing: boolean;

		enableKeybindings(): Launcher;

		disableKeybindings(): Launcher;

		addPlayerName(playerName: string): Launcher;

		fromUrl(url: string): void;

		readonly percentageWatched: number;

		readonly secondsWatched: number;

		readonly replayDuration: number;

		turn: number;
	}

	export function release(): string;

	export function launcher(target: string | HTMLElement): Launcher;
}

declare module "cookie_js" {
	import * as cookiejs from "cookiejs";
	export {cookiejs as cookie};
}

declare module "victory" {
	import * as React from "react";

	export interface VictoryAreaProps extends VictoryMultiLabeableProps {}

	export class Flyout extends React.Component<any, any> {}

	export class VictoryVoronoiContainer extends React.Component<any, any> {}

	export class VictoryClipContainer extends React.Component<any, any> {}

	export class VictoryPortal extends React.Component<any, any> {}

	export interface VictoryGroupProps extends VictoryDatableProps {}

	export class VictoryTooltip extends React.Component<any, any> {}

	export class VictoryVoronoiTooltip extends React.Component<any, any> {}

	export class VictoryZoom extends React.Component<any, any> {}

	export class VictoryLegend extends React.Component<any, any> {}
}

declare module "tether-shepherd" {
	class TetherEvents {
		on(eventName: string, handler, context?): void;

		off(eventName: string, handler?): void;

		once(eventName: string, handler, context?): void;
	}

	export class Step extends TetherEvents {
		options: StepOptions;

		show(): void;

		hide(): void;

		cancel(): void;

		complete(): void;

		scrollTo(): void;

		isOpen(): boolean;

		destroy(): void;
	}

	interface ButtonOptions {
		text: string;
		classes?: string;
		action?: () => any;
		events?: any;
	}

	interface StepOptions {
		text?: any;
		title?: string;
		attachTo?: any;
		beforeShowPromise?: any;
		classes?: string
		buttons?: ButtonOptions|ButtonOptions[];
		[other: string]: any;
	}

	interface TourOptions {
		steps?: Step[];
		defaults?: any;
	}

	export class Tour extends TetherEvents {
		constructor(options?: TourOptions);

		addStep(id?: string, options: StepOptions): void;

		getById(id: string): Step;

		next(): void;

		back(): void;

		cancel(): void;

		complete(): void;

		hide(): void;

		show(id?: string|number): void;

		start(): void;

		getCurrentStep(): Step;
	}
}

interface Window {
	hsreplaynet_load_premium_modal: (label?: string) => void;
	hsreplaynet_load_stripe: (targetElement: any) => void;
}

declare module "sunwell" {
	export class Sunwell {
		constructor(options?: any);
	}
}
