import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import {
	createSplitSignalSession,
	joinSplitSignalSession,
} from '../prototypes/split-signal/relay';
import { navigate } from '../router';
import { buildGameUrl, buildHostUrl, buildInvitationUrl } from './session-url';

interface SessionFlowProps {
	isHosting: boolean;
	playerId?: string;
	roomCode?: string;
}

interface HostedSession {
	roomCode: string;
	playerId: string;
}

export function SessionFlow({
	isHosting,
	playerId,
	roomCode,
}: SessionFlowProps) {
	const [name, setName] = useState('');
	const [hostedSession, setHostedSession] = useState<HostedSession | undefined>(
		isHosting && roomCode && playerId ? { roomCode, playerId } : undefined,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string>();
	const invitationUrl = hostedSession
		? buildInvitationUrl(window.location.origin, hostedSession.roomCode)
		: undefined;

	const submit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const sessionIdentity = name.trim();
		if (!sessionIdentity) {
			setError('Choose a Session Identity before continuing.');
			return;
		}

		setError(undefined);
		setIsLoading(true);
		try {
			if (isHosting) {
				const response = await createSplitSignalSession(sessionIdentity);
				const session = {
					roomCode: response.state.code,
					playerId: response.playerId,
				};
				setHostedSession(session);
				navigate(buildHostUrl(session.roomCode, session.playerId));
				return;
			}

			if (!roomCode) return;
			const response = await joinSplitSignalSession(roomCode, sessionIdentity);
			navigate(buildGameUrl(roomCode, response.playerId));
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: 'We could not connect to this Game Session.',
			);
		} finally {
			setIsLoading(false);
		}
	};

	const shareInvitation = async () => {
		if (!invitationUrl) return;
		try {
			if (navigator.share) {
				await navigator.share({
					title: 'Join my Gamebuds Game Session',
					text: 'Join my private Split Signal Game Session.',
					url: invitationUrl,
				});
				return;
			}
			await navigator.clipboard.writeText(invitationUrl);
		} catch {
			setError('Could not share the invitation. Copy the link below instead.');
		}
	};

	if (hostedSession && invitationUrl) {
		return (
			<main className="session-flow">
				<p className="session-eyebrow">Private Session ready</p>
				<h1>Invite your Play Group</h1>
				<p>
					Have each Player scan this QR code or open the link, choose a Session
					Identity, and join in their browser.
				</p>
				<div className="session-qr">
					<QRCodeSVG value={invitationUrl} size={216} level="M" includeMargin />
				</div>
				<p className="session-code">
					Room code: <strong>{hostedSession.roomCode}</strong>
				</p>
				<label className="session-link" htmlFor="session-link">
					Invitation link
				</label>
				<input
					id="session-link"
					value={invitationUrl}
					readOnly
					onFocus={(event) => event.currentTarget.select()}
				/>
				<div className="session-actions">
					<button type="button" onClick={() => void shareInvitation()}>
						Share invitation
					</button>
					<button
						type="button"
						className="session-secondary"
						onClick={() =>
							navigate(
								buildGameUrl(hostedSession.roomCode, hostedSession.playerId),
							)
						}
					>
						Enter Game Session
					</button>
				</div>
				{error && (
					<p className="session-error" role="alert">
						{error}
					</p>
				)}
			</main>
		);
	}

	const title = isHosting
		? 'Create a Private Session'
		: 'Join the Private Session';
	return (
		<main className="session-flow">
			<p className="session-eyebrow">Split Signal · 2–4 Players</p>
			<h1>{title}</h1>
			<p>
				{isHosting
					? 'Start a browser-based Game Session, then invite the Play Group with a QR code or link.'
					: `You’re joining room ${roomCode}. Pick the name your Play Group will see.`}
			</p>
			<form onSubmit={(event) => void submit(event)}>
				<label htmlFor="session-identity">Session Identity</label>
				<input
					id="session-identity"
					value={name}
					onChange={(event) => setName(event.target.value)}
					autoComplete="nickname"
					maxLength={30}
					placeholder="Your name"
					disabled={isLoading}
				/>
				<button type="submit" disabled={isLoading}>
					{isLoading
						? 'Connecting…'
						: isHosting
							? 'Create and invite'
							: 'Join Game Session'}
				</button>
			</form>
			{error && (
				<p className="session-error" role="alert">
					{error}
				</p>
			)}
		</main>
	);
}
