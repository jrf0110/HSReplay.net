import * as React from "react";
import ArchetypeMatrix from "./ArchetypeMatrix";

interface ArchetypeHeadToHeadProps extends React.ClassAttributes<ArchetypeHeadToHead> {
}

interface ArchetypeHeadToHeadState {
}

export default class ArchetypeHeadToHead extends React.Component<ArchetypeHeadToHeadProps, ArchetypeHeadToHeadState> {
	render() {
		return (
			<ArchetypeMatrix />
		);
	}
}
