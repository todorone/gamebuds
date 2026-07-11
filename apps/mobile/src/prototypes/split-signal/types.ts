export type SplitSignalNodeId = 'amber' | 'violet' | 'cyan' | 'rose';
export type SplitSignalPhase = 'lobby' | 'active' | 'complete';

export interface SplitSignalState {
	code: string;
	phase: SplitSignalPhase;
	minimumPlayers: number;
	maximumPlayers: number;
	players: Array<{
		id: string;
		name: string;
		slot: number;
		isHost: boolean;
		controlledNodeId: SplitSignalNodeId;
	}>;
	nodes: Array<{
		id: SplitSignalNodeId;
		label: string;
		color: string;
	}>;
	progress: SplitSignalNodeId[];
	mistakes: number;
	events: Array<{
		id: number;
		kind: 'system' | 'ping' | 'repair' | 'mistake';
		playerId?: string;
		message: string;
	}>;
	you: {
		id: string;
		name: string;
		isHost: boolean;
		controlledNodeId: SplitSignalNodeId;
		clue: string;
	};
}

export interface SplitSignalResponse {
	state: SplitSignalState;
}

export interface SplitSignalJoinResponse extends SplitSignalResponse {
	playerId: string;
}
