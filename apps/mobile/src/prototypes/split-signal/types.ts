export type SplitSignalNodeId = 'amber' | 'violet' | 'cyan' | 'rose';
export type SplitSignalPhase =
	'lobby' | 'active' | 'round-reveal' | 'complete' | 'stopped';
export type SplitSignalActionType =
	'start' | 'next-round' | 'play-again' | 'stop' | 'ping' | 'repair';
export type SplitSignalPingTarget =
	| {
			targetPlayerId: string;
			targetNodeId?: never;
	  }
	| {
			targetPlayerId?: never;
			targetNodeId: SplitSignalNodeId;
	  };

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
		controlledNodeId?: SplitSignalNodeId;
	}>;
	nodes: Array<{
		id: SplitSignalNodeId;
		label: string;
		color: string;
	}>;
	round: number;
	totalRounds: number;
	stability: number;
	maximumStability: number;
	progress: SplitSignalNodeId[];
	reveal?: {
		round: number;
		order: SplitSignalNodeId[];
	};
	mistakes: number;
	events: Array<{
		id: number;
		kind: 'system' | 'ping' | 'repair' | 'mistake' | 'reveal' | 'collapse';
		playerId?: string;
		targetPlayerId?: string;
		targetNodeId?: SplitSignalNodeId;
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

export interface SplitSignalLogoutResponse {
	loggedOut: true;
}
