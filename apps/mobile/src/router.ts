import { useEffect, useState } from 'react';

export interface RouteLocation {
	pathname: string;
	search: string;
}

type Listener = () => void;

const listeners = new Set<Listener>();

function getLocation(): RouteLocation {
	return {
		pathname: window.location.pathname,
		search: window.location.search,
	};
}

export function navigate(path: string): void {
	window.history.pushState(null, '', path);
	listeners.forEach((listener) => listener());
}

export function useLocation(): RouteLocation {
	const [location, setLocation] = useState(getLocation);

	useEffect(() => {
		const handleChange = (): void => setLocation(getLocation());
		listeners.add(handleChange);
		window.addEventListener('popstate', handleChange);
		return () => {
			listeners.delete(handleChange);
			window.removeEventListener('popstate', handleChange);
		};
	}, []);

	return location;
}
