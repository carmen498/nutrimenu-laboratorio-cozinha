import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			staleTime: 2 * 60 * 1000,
			gcTime: 15 * 60 * 1000,
			retry: 1,
		},
	},
});