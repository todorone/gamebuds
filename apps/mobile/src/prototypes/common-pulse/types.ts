export type CommonPulseChannelId = 'rise' | 'ease' | 'steady' | 'surge';
export type CommonPulsePhase = 'lobby' | 'active' | 'complete';

export interface CommonPulseState {
	code: string;
	phase: CommonPulsePhase;
	minimumPlayers: number;
	maximumPlayers: number;
	round: number;
	level: number;
	targetCenter: number;
	targetWidth: number;
	bandMin: number;
	bandMax: number;
	levelMin: number;
	levelMax: number;
	inBand: boolean;
	stability: number;
	goalStability: number;
	elapsedSeconds: number;
	players: Array<{
		id: string;
		name: string;
		slot: number;
		isHost: boolean;
		channelId: CommonPulseChannelId;
		channelLabel: string;
		channelColor: string;
		held: boolean;
	}>;
	channels: Array<{
		id: CommonPulseChannelId;
		label: string;
		color: string;
		role: string;
	}>;
	events: Array<{
		id: number;
		kind: 'system' | 'emote' | 'milestone';
		playerId?: string;
		message: string;
	}>;
	you: {
		id: string;
		name: string;
		isHost: boolean;
		channelId: CommonPulseChannelId;
		channelLabel: string;
		channelColor: string;
		channelRole: string;
		held: boolean;
		hint: string;
	};
}

export interface CommonPulseResponse {
	state: CommonPulseState;
}

export interface CommonPulseJoinResponse extends CommonPulseResponse {
	playerId: string;
}

export interface CommonPulseLogoutResponse {
	loggedOut: true;
}
